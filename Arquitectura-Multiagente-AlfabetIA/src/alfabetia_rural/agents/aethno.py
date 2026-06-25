from __future__ import annotations

from typing import Any

from alfabetia_rural.agents.base import AgentContext
from alfabetia_rural.domain.enums import MemoryLayer
from alfabetia_rural.domain.models import AuditRecord, NormalizedSegment, ProbeSuggestion
from alfabetia_rural.llm.base import LLMClientProtocol


class EthnographyAgent:
    def __init__(self, context: AgentContext, llm: LLMClientProtocol):
        self.context = context
        self.llm = llm

    def suggest_probe(self, segment: NormalizedSegment) -> ProbeSuggestion | None:
        if segment.needs_review:
            return None
        try:
            data = self.llm.complete_json("probe", {"normalized_text": segment.normalized_text, "channel": segment.channel.value})
        except Exception as exc:
            data = {"justification": f"Fallback local por indisponibilidad de LLM: {type(exc).__name__}"}
        probe = ProbeSuggestion(
            question=data.get(
                "question",
                "¿Puede contar un caso concreto donde una recomendación automática le generó confianza o desconfianza?",
            ),
            justification=data.get("justification", "Probe prudente para ampliar evidencia contextual."),
            sensitive=bool(data.get("sensitive", False)),
            uncertainty=float(data.get("uncertainty", 0.25)),
        )
        self.context.store.append_audit(
            AuditRecord(
                agent="AETHNO",
                pid=segment.pid,
                sid=segment.sid,
                action="suggest_probe",
                memory_layer=MemoryLayer.semantic,
                payload={**probe.model_dump(mode="json"), "llm_provider": self.llm.provider_name},
            )
        )
        return probe

    def handle_turn(
        self,
        participant_id: str,
        session_id: str,
        turn_id: str,
        message: str,
        channel: str,
        consent_state: dict[str, Any]
    ) -> dict[str, Any]:
        import json
        import hashlib

        # 1. Recuperar memoria acumulada
        summary = self.context.store.get_dialogue_summary(participant_id)
        
        # 2. Recuperar extractos relevantes del historial (ultimos 4 turnos)
        raw_transcript = self.context.store.get_dialogue_transcript(participant_id)
        relevant_excerpts = [
            f"{t['role']}: {t['text']}" for t in raw_transcript[-4:]
        ]
        
        # 3. Recuperar el modelo mental vigente
        mental_model = self.context.store.load_mental_model(participant_id)
        mental_model_json = mental_model.model_dump(mode="json") if mental_model else {}
        
        # ── Optimización AGRESIVA de tokens ──────────────────────────────

        # El método _hydrate_evidence_refs() inyecta 2 objetos EvidenceRef
        # (con el texto completo del turno) por CADA turno de diálogo previo.
        # En el turno 15, eso son ~30 objetos con texto duplicado enviados
        # al LLM. DEBEMOS eliminarlos antes de serializar.
        #
        # Campos que se eliminan (no afectan la inferencia del LLM):
        #   - evidence_refs (raíz):  duplica todo el historial de diálogo
        #   - contradiction_flags:   metadatos internos de auditoría
        #   - uncertainty_sources:   metadatos de pipeline
        #   - revision_hash, previous_revision_hash, consent_snapshot_hash
        #   - updated_at:            timestamp interno
        
        # 1. Eliminar campo raíz evidence_refs (el más pesado)
        mental_model_json.pop("evidence_refs", None)
        
        # 2. Eliminar metadatos internos que no aportan a la inferencia
        mental_model_json.pop("contradiction_flags", None)
        mental_model_json.pop("uncertainty_sources", None)
        mental_model_json.pop("revision_hash", None)
        mental_model_json.pop("previous_revision_hash", None)
        mental_model_json.pop("consent_snapshot_hash", None)
        mental_model_json.pop("updated_at", None)
        mental_model_json.pop("revision", None)
        mental_model_json.pop("confidence", None)
        
        # 3. Limpiar evidence_refs de nodos y aristas (strings cortos pero innecesarios)
        for node in (mental_model_json.get("nodes") or []):
            node.pop("evidence_refs", None)
        for edge in (mental_model_json.get("edges") or []):
            edge.pop("evidence_refs", None)
            edge.pop("evidence", None)
        
        # 4. Recuperar brechas y riesgos
        open_gaps = self.context.store.get_open_gaps(participant_id)
        risk_flags = self.context.store.get_risk_flags(participant_id)
        
        # 5. Inyectar payload para la inferencia
        payload = {
            "participant_id": participant_id,
            "session_id": session_id,
            "turn_id": turn_id,
            "channel": channel,
            "consent_state": consent_state,
            "conversation_memory_summary": summary,
            "relevant_transcript_excerpts": relevant_excerpts,
            "current_mental_model": mental_model_json,
            "open_gaps": open_gaps[-5:],      # Solo las 5 brechas más recientes
            "risk_flags": risk_flags[-3:],     # Solo las 3 alertas más recientes
            "recent_user_message": message,
        }
        
        # 6. Llamar al cliente LLM con el task dual
        response = self.llm.complete_json("ethnographic_chat", payload)
        
        # 7. Registrar auditoría de la decisión
        control_payload = response.get("conversation_control", {})
        control_str = json.dumps(control_payload, sort_keys=True)
        control_hash = hashlib.sha256(control_str.encode("utf-8")).hexdigest()
        
        self.context.store.append_audit(
            AuditRecord(
                agent="AETHNO-LLM",
                pid=participant_id,
                sid=session_id,
                action="probe_selected",
                memory_layer=MemoryLayer.audit,
                payload={
                    "conversation_control": control_payload,
                    "audit_note": response.get("memory_update", {}).get("audit_note", "")
                },
                payload_hash=control_hash
            )
        )
        return response
