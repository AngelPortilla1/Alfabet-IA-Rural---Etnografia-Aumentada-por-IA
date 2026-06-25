from __future__ import annotations

from typing import Any

from alfabetia_rural.agents.acode import CodingAgent
from alfabetia_rural.agents.aethno import EthnographyAgent
from alfabetia_rural.agents.aexpl import ExplanationAgent
from alfabetia_rural.agents.afair import FairnessRiskAgent
from alfabetia_rural.agents.agov import GovernanceAgent
from alfabetia_rural.agents.aing import IngestionAgent
from alfabetia_rural.agents.amind import MentalModelAgent
from alfabetia_rural.agents.aplan import PlanningAgent
from alfabetia_rural.agents.asup import SupervisorAgent
from alfabetia_rural.agents.async_sync import AsyncSyncAgent
from alfabetia_rural.agents.base import AgentContext
from alfabetia_rural.domain.enums import ConsentScope, GateDecision, ReviewRole, ReviewStatus
from alfabetia_rural.domain.models import EventEnvelope, ReviewItem
from alfabetia_rural.domain.observability import AgentState
from alfabetia_rural.llm.base import LLMClientProtocol
from alfabetia_rural.services.observability import ObservabilityService
from alfabetia_rural.storage.sqlite_store import SQLiteStore


class Orchestrator:
    def __init__(
        self,
        store: SQLiteStore,
        codebook: dict[str, Any],
        l0: dict[str, Any],
        policies: dict[str, Any],
        llm: LLMClientProtocol,
        observability: ObservabilityService | None = None,
    ):
        self.observability = observability or ObservabilityService(store)
        context = AgentContext(store=store, codebook=codebook, l0=l0, policies=policies, observability=self.observability)
        self.context = context
        self.supervisor = SupervisorAgent(context)
        self.governance = GovernanceAgent(context)
        self.ingestion = IngestionAgent(context)
        self.ethnography = EthnographyAgent(context, llm=llm)
        self.coding = CodingAgent(context, llm=llm)
        self.mental = MentalModelAgent(context)
        self.fairness = FairnessRiskAgent(context)
        self.planning = PlanningAgent(context)
        self.explanation = ExplanationAgent(context, llm=llm)
        self.persistence = AsyncSyncAgent(context)

    def process_event(self, event: EventEnvelope) -> dict[str, Any]:
        # 1. AGOV
        self.observability.report_start("AGOV", "Validando gobernanza y consentimiento")
        governance = self.governance.validate(event)
        if governance.decision == GateDecision.block:
            self.observability.report_end("AGOV", state=AgentState.IDLE, task="Bloqueado por política")
            return {"status": "blocked", "stage": "AGOV", "reasons": governance.reasons}
        if governance.decision == GateDecision.review:
            has_approved = any(
                r.pid == event.pid and r.stage == "AGOV" and r.status == ReviewStatus.approved
                for r in self.context.store.list_reviews()
            )
            if not has_approved:
                self.supervisor.open_review(
                    ReviewItem(
                        pid=event.pid,
                        stage="AGOV",
                        reason="alcance de consentimiento restringido",
                        payload={**governance.model_dump(mode="json"), "event": event.model_dump(mode="json")},
                        required_role=ReviewRole.data_auditor,
                    )
                )
                self.observability.report_end("AGOV", state=AgentState.WAITING_REVIEW, task="Esperando validación de consentimiento")
                return {"status": "review", "stage": "AGOV", "governance": governance.model_dump(mode="json")}
        self.observability.report_end("AGOV")

        # 2. AING
        self.observability.report_start("AING", f"Normalizando relato de {event.pid}")
        segment = self.ingestion.normalize(event)
        if segment.needs_review:
            has_approved = any(
                r.pid == event.pid and r.stage == "AING" and r.status == ReviewStatus.approved
                for r in self.context.store.list_reviews()
            )
            if not has_approved:
                review = self.supervisor.open_review(
                    ReviewItem(
                        pid=event.pid,
                        stage="AING",
                        reason="baja confianza de transcripción/normalización",
                        payload={**segment.model_dump(mode="json"), "event": event.model_dump(mode="json")},
                        required_role=ReviewRole.facilitator,
                    )
                )
                self.observability.report_end("AING", state=AgentState.WAITING_REVIEW, task="Esperando revisión de normalización")
                return {"status": "review", "stage": "AING", "review_id": review.review_id, "segment": segment.model_dump(mode="json")}
        self.observability.report_end("AING")

        # 3. AETHNO
        self.observability.report_start("AETHNO", "Generando hipótesis y probes")
        probe = self.ethnography.suggest_probe(segment)
        if probe and probe.sensitive:
            has_approved = any(
                r.pid == event.pid and r.stage == "AETHNO" and r.status == ReviewStatus.approved
                for r in self.context.store.list_reviews()
            )
            if not has_approved:
                review = self.supervisor.open_review(
                    ReviewItem(
                        pid=event.pid,
                        stage="AETHNO",
                        reason="probe sensible requiere validación humana",
                        payload={**probe.model_dump(mode="json"), "event": event.model_dump(mode="json")},
                        required_role=ReviewRole.facilitator,
                    )
                )
                self.observability.report_end("AETHNO", state=AgentState.WAITING_REVIEW, task="Esperando aprobación de probe")
                return {"status": "review", "stage": "AETHNO", "review_id": review.review_id, "probe": probe.model_dump(mode="json")}
        self.observability.report_end("AETHNO")

        # 4. ACODE
        self.observability.report_start("ACODE", "Asignando códigos etnográficos")
        codes = self.coding.assign_codes(segment, probe)
        if any(code.requires_review for code in codes):
            self.supervisor.open_review(
                ReviewItem(
                    pid=event.pid,
                    stage="ACODE",
                    reason="códigos de baja confianza o generados por LLM requieren revisión",
                    payload={"codes": [c.model_dump(mode="json") for c in codes]},
                    required_role=ReviewRole.facilitator,
                )
            )
            self.observability.report_end("ACODE", state=AgentState.WAITING_REVIEW, task="Códigos bajo revisión")
        else:
            self.observability.report_end("ACODE")

        # 5. AMIND / 6. AFAIR / 7. APLAN / 8. AEXPL / 9. ASUP
        model = None
        fairness = None
        route = None
        curriculum_review = None

        if ConsentScope.graph_derivative in governance.allowed_scopes:
            # 5. AMIND
            self.observability.report_start("AMIND", "Actualizando modelo mental")
            model = self.mental.update_model(event.pid, codes)
            self.observability.report_end("AMIND")

            # 6. AFAIR
            self.observability.report_start("AFAIR", "Evaluando riesgos y equidad")
            fairness = self.fairness.evaluate(model)
            if fairness.decision == GateDecision.block:
                review = self.supervisor.open_review(
                    ReviewItem(
                        pid=event.pid,
                        stage="AFAIR",
                        reason="bloqueo por riesgo/equidad",
                        payload=fairness.model_dump(mode="json"),
                        required_role=ReviewRole.data_auditor,
                    )
                )
                self.observability.report_end("AFAIR", state=AgentState.ERROR, task="Bloqueado por riesgo")
                return {
                    "status": "blocked",
                    "stage": "AFAIR",
                    "review_id": review.review_id,
                    "mental_model": model.model_dump(mode="json"),
                    "fairness": fairness.model_dump(mode="json"),
                }
            if fairness.decision == GateDecision.review:
                self.supervisor.open_review(
                    ReviewItem(
                        pid=event.pid,
                        stage="AFAIR",
                        reason="alerta de riesgo/equidad o baja densidad",
                        payload=fairness.model_dump(mode="json"),
                        required_role=ReviewRole.data_auditor,
                    )
                )
                self.observability.report_end("AFAIR", state=AgentState.WAITING_REVIEW, task="Riesgo bajo revisión")
            else:
                self.observability.report_end("AFAIR")

            if ConsentScope.curriculum_derivative in governance.allowed_scopes:
                # 7. APLAN
                self.observability.report_start("APLAN", "Proponiendo ruta pedagógica")
                route = self.planning.propose_route(model, fairness=fairness)
                self.observability.report_end("APLAN")

                # 8. AEXPL
                self.observability.report_start("AEXPL", "Generando explicación curricular")
                route = self.explanation.explain(model, route)
                self.observability.report_end("AEXPL")

                # 9. ASUP (Curricular Review)
                self.observability.report_start("ASUP", "Abriendo revisión curricular")
                curriculum_review = self.supervisor.open_curricular_review(
                    pid=event.pid,
                    reason="toda ruta candidata que modifica M_curr requiere revisión humana",
                    payload=route.model_dump(mode="json"),
                    role=ReviewRole.curriculum_team,
                )
                self.observability.report_end("ASUP")

        # 10. ASYNC
        self.observability.report_start("ASYNC", "Sincronizando y persistiendo cambios")
        delta_id = self.persistence.persist_all(event, model, route)
        self.observability.report_end("ASYNC")

        return {
            "status": "ok" if (not fairness or fairness.decision == GateDecision.accept) else "ok_with_review",
            "delta_id": delta_id,
            "curriculum_review_id": curriculum_review.review_id if curriculum_review else None,
            "mental_model": model.model_dump(mode="json") if model else None,
            "route": route.model_dump(mode="json") if route else None,
            "fairness": fairness.model_dump(mode="json") if fairness else None,
        }

    def process_chat_turn(
        self,
        pid: str,
        text: str,
        channel: str = "text",
        session_id: str | None = None,
        consent_data: dict[str, Any] | None = None
    ) -> dict[str, Any]:
        import uuid
        import hashlib
        from alfabetia_rural.domain.models import EventEnvelope, ConsentState
        from alfabetia_rural.domain.enums import Channel, GateDecision
        
        sid = session_id or f"sid_{uuid.uuid4()}"
        
        # Load or build consent
        if consent_data:
            consent = ConsentState.model_validate(consent_data)
        else:
            db_consents = self.context.store.list_participant_consents()
            pid_consent = next((c for c in db_consents if c["pid"] == pid), None)
            if pid_consent:
                consent = ConsentState(
                    allow_raw_capture=pid_consent["consent"].get("raw_capture", True),
                    allow_semantic_processing=pid_consent["consent"].get("semantic_processing", True),
                    allow_graph_derivative=pid_consent["consent"].get("graph_derivative", True),
                    allow_curriculum_derivatives=pid_consent["consent"].get("curriculum_derivative", True),
                )
            else:
                consent = ConsentState()

        # Build EventEnvelope for AGOV validation
        event = EventEnvelope(
            event_id=str(uuid.uuid4()),
            sid=sid,
            pid=pid,
            channel=Channel(channel),
            content=text,
            consent=consent
        )

        # 1. AGOV
        self.observability.report_start("AGOV", "Validando gobernanza y consentimiento de chat")
        governance = self.governance.validate(event)
        if governance.decision == GateDecision.block:
            self.observability.report_end("AGOV", task="Bloqueado por política de consentimiento")
            return {"status": "blocked", "stage": "AGOV", "reasons": governance.reasons}
        self.observability.report_end("AGOV")

        # Prepend initial greeting to dialogue turns if history is empty
        db_history = self.context.store.get_dialogue_transcript(pid)
        if not db_history:
            asst_greet_id = f"trn_greet_{uuid.uuid4()}"
            greet_text = "Antes de conversar, necesito confirmar que usted está de acuerdo. La conversación es voluntaria y busca entender sus necesidades de aprendizaje sobre tecnología e inteligencia artificial. ¿Me autoriza a continuar?"
            greet_hash = hashlib.sha256(greet_text.encode("utf-8")).hexdigest()
            self.context.store.append_dialogue_turn(
                turn_id=asst_greet_id,
                participant_id=pid,
                session_id=sid,
                role="assistant",
                text=greet_text,
                channel=channel,
                consent_scope="raw_capture",
                turn_hash=greet_hash
            )

        # Append user message to transcript (M_raw_dialogue)
        turn_id = f"trn_{uuid.uuid4()}"
        turn_hash = hashlib.sha256(text.encode("utf-8")).hexdigest()
        self.context.store.append_dialogue_turn(
            turn_id=turn_id,
            participant_id=pid,
            session_id=sid,
            role="user",
            text=text,
            channel=channel,
            consent_scope="raw_capture",
            turn_hash=turn_hash
        )

        # 2. AETHNO-LLM Inferencia Dual
        self.observability.report_start("AETHNO", f"Generando respuesta etnográfica para {pid}")
        chat_response = self.ethnography.handle_turn(
            participant_id=pid,
            session_id=sid,
            turn_id=turn_id,
            message=text,
            channel=channel,
            consent_state=consent.model_dump(mode="json")
        )
        self.observability.report_end("AETHNO")

        assistant_msg = chat_response.get("assistant_message", "")
        memory_update = chat_response.get("memory_update", {})
        control = chat_response.get("conversation_control", {})

        # Append assistant message to transcript (M_raw_dialogue)
        asst_turn_id = f"trn_{uuid.uuid4()}"
        asst_hash = hashlib.sha256(assistant_msg.encode("utf-8")).hexdigest()
        self.context.store.append_dialogue_turn(
            turn_id=asst_turn_id,
            participant_id=pid,
            session_id=sid,
            role="assistant",
            text=assistant_msg,
            channel=channel,
            consent_scope="raw_capture",
            turn_hash=asst_hash
        )

        # 3. Consolidación de memorias
        summary_delta = memory_update.get("episodic_summary_delta", [])
        if summary_delta:
            current_summary = self.context.store.get_dialogue_summary(pid)
            new_summary = (current_summary + "\n" + "\n".join(summary_delta)).strip()
            self.context.store.update_dialogue_summary(pid, new_summary)

        # ACODE Hechos Semánticos
        facts_delta = memory_update.get("semantic_facts_delta", [])
        if facts_delta:
            self.observability.report_start("ACODE", "Consolidando hechos cualitativos")
            self.coding.ingest_candidate_facts(pid, sid, facts_delta)
            self.observability.report_end("ACODE")

        # AMIND Grafo Mental y Alfabetización
        graph_delta = memory_update.get("graph_delta", {})
        if graph_delta:
            self.observability.report_start("AMIND", "Actualizando relaciones del grafo")
            self.mental.apply_graph_delta(pid, graph_delta)
            self.observability.report_end("AMIND")

        values_delta = memory_update.get("values_vector_delta", {})
        if values_delta:
            self.observability.report_start("AMIND", "Actualizando vector de valores")
            self.mental.update_values_vector(pid, values_delta)
            self.observability.report_end("AMIND")

        literacy_delta = memory_update.get("literacy_profile_delta", {})
        if literacy_delta:
            self.observability.report_start("AMIND", "Re-calculando brechas C1-C7")
            self.mental.update_literacy_profile(pid, literacy_delta)
            self.observability.report_end("AMIND")

        preferences_delta = memory_update.get("preferences_delta", {})
        if preferences_delta:
            self.observability.report_start("AMIND", "Actualizando preferencias de canal")
            self.mental.update_preferences(pid, preferences_delta)
            self.observability.report_end("AMIND")

        # Brechas y banderas — fusionar con existentes en vez de sobreescribir
        gaps_update = memory_update.get("open_gaps_update", [])
        if gaps_update:
            existing_gaps = self.context.store.get_open_gaps(pid)
            existing_descs = {g.get("gap", "") for g in existing_gaps}
            merged_gaps = list(existing_gaps)
            for new_gap in gaps_update:
                if new_gap.get("gap", "") not in existing_descs:
                    merged_gaps.append(new_gap)
            self.context.store.update_open_gaps(pid, merged_gaps[-20:])

        risk_flags_update = memory_update.get("risk_flags", [])
        if risk_flags_update:
            existing_flags = self.context.store.get_risk_flags(pid)
            existing_descs = {f.get("description", "") for f in existing_flags}
            merged_flags = list(existing_flags)
            for new_flag in risk_flags_update:
                if new_flag.get("description", "") not in existing_descs:
                    merged_flags.append(new_flag)
            self.context.store.update_risk_flags(pid, merged_flags[-20:])
            
            # Escalación si corresponde
            self.observability.report_start("ASUP", "Registrando alertas en la cola de revisión")
            from alfabetia_rural.domain.models import ReviewItem
            from alfabetia_rural.domain.enums import ReviewRole
            self.supervisor.open_review(
                ReviewItem(
                    pid=pid,
                    stage="AETHNO_RISK",
                    reason="Riesgos identificados en conversación etnográfica",
                    payload={"risk_flags": risk_flags_update, "turn_id": turn_id},
                    required_role=ReviewRole.data_auditor
                )
            )
            self.observability.report_end("ASUP")

        # Manejo de revocación por rechazo de consentimiento
        if control.get("should_continue") is False and control.get("stop_reason") == "consent_refused":
            self.context.store.revoke_pid(pid, reason="consent_refused")

        # Cargar estado actualizado
        updated_model = self.context.store.load_mental_model(pid)
        updated_gaps = self.context.store.get_open_gaps(pid)

        return {
            "status": "ok",
            "assistant_message": assistant_msg,
            "conversation_control": control,
            "mental_model": updated_model.model_dump(mode="json") if updated_model else None,
            "open_gaps": updated_gaps,
            "risk_flags": risk_flags_update
        }
