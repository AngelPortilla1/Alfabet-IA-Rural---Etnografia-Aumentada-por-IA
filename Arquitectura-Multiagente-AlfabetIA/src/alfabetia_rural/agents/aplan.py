from __future__ import annotations

from alfabetia_rural.agents.base import AgentContext
from alfabetia_rural.domain.enums import ApprovalStatus, EvidenceKind, GateDecision, MemoryLayer, RouteType
from alfabetia_rural.domain.models import (
    AuditRecord,
    CurriculumTrace,
    FairnessDecision,
    LiteracyRoute,
    MentalModel,
    RouteStep,
    clamp01,
)


class PlanningAgent:
    """Planificador determinista multiobjetivo sobre L0.

    Produce rutas candidatas, no decisiones curriculares finales.
    """

    TAG_MAP: dict[str, tuple[str, str, str]] = {
        "basic_concepts": (
            "aclarar conceptos mínimos de IA, datos, modelo y recomendación",
            "distinguir IA, automatización, dato, modelo y recomendación en ejemplos agrícolas",
            "C1",
        ),
        "data_governance": (
            "comprender qué datos compartir y bajo qué condiciones",
            "reconocer consentimiento, derechos, datos sensibles y usos secundarios",
            "C2",
        ),
        "ai_recommendations": (
            "leer críticamente recomendaciones de IA en decisiones productivas",
            "comparar recomendación algorítmica con criterio humano y evidencia local",
            "C3",
        ),
        "human_review": (
            "integrar revisión humana antes de decidir",
            "justificar cuándo aceptar, revisar o rechazar una recomendación",
            "C4",
        ),
        "bias_fairness": (
            "identificar sesgo, cobertura desigual y daño potencial",
            "detectar cuándo una herramienta representa mal a un grupo, canal o cultivo",
            "C5",
        ),
        "experimentation": (
            "ensayar herramientas digitales mediante pruebas pequeñas y reversibles",
            "diseñar una prueba segura, documentada y reversible en campo",
            "C6",
        ),
        # ── Códigos regionales ──────────────────────────
        "digital_distrust": (
            "abordar la desconfianza digital y fortalecer la toma de decisiones seguras",
            "identificar riesgos percibidos en herramientas digitales y aplicar criterios de seguridad",
            "C7",
        ),
        "empirical_knowledge": (
            "validar y conectar el saber empírico local con herramientas digitales",
            "articular heurísticas locales y contrastarlas con recomendaciones algorítmicas",
            "C3",
        ),
        "connectivity_barrier": (
            "adaptar la ruta formativa a restricciones de conectividad e infraestructura",
            "usar herramientas en modo offline y gestionar recursos sin conexión permanente",
            "C1",
        ),
    }

    def __init__(self, context: AgentContext):
        self.context = context

    def propose_route(
        self,
        model: MentalModel,
        fairness: FairnessDecision | None = None,
        segment_id: str | None = None,
        route_type: RouteType | None = None,
    ) -> LiteracyRoute:
        modules = self.context.l0.get("modules", [])
        selected_tags = self._tags_for_model(model)
        modality = "audio" if model.preferences.get("prefers_audio") else "facilitated"
        route_kind = route_type or (RouteType.segment if segment_id else RouteType.adapted)
        if model.revision <= 1 and not segment_id:
            route_kind = RouteType.startup

        needs: list[str] = []
        competencies: list[str] = []
        steps: list[RouteStep] = []
        trace: list[CurriculumTrace] = []
        evidence_refs = [ref.evidence_id for ref in model.evidence_refs[-10:]]

        for tag in selected_tags:
            need, competence, domain = self.TAG_MAP[tag]
            if need not in needs:
                needs.append(need)
            if competence not in competencies:
                competencies.append(competence)
            candidates = [m for m in modules if tag in m.get("tags", []) or m.get("domain") == domain]
            if not candidates:
                continue
            module = self._choose_module(candidates, modality)
            med = self._choose_mediation(module, modality)
            activity = str(module.get("activity", self._default_activity(tag)))
            assessment = str(module.get("assessment", self._default_assessment(tag)))
            rationale = (
                f"Seleccionado por necesidad '{need}', dominio {domain}, modalidad {med} y evidencia trazable; "
                "requiere revisión humana antes de pasar a M_curr."
            )
            step = RouteStep(
                module_id=str(module["module_id"]),
                title=str(module["title"]),
                domain=str(module.get("domain", domain)),
                modality=med,
                duration_minutes=int(module.get("duration_minutes", 40)),
                need=need,
                competence=competence,
                mediation=med,
                activity=activity,
                assessment=assessment,
                rationale=rationale,
                evidence_refs=evidence_refs,
                requires_curricular_review=True,
            )
            if step.module_id not in {s.module_id for s in steps}:
                steps.append(step)
                trace.append(
                    CurriculumTrace(
                        need=need,
                        competence=competence,
                        module_id=step.module_id,
                        mediation=med,
                        activity=activity,
                        assessment=assessment,
                        evidence_kind=EvidenceKind.inferred,
                        evidence_refs=evidence_refs,
                    )
                )

        objective_terms = self._objective_terms(model, fairness, steps)
        score = clamp01(
            0.35 * objective_terms["fit"]
            + 0.20 * objective_terms["equity"]
            + 0.20 * objective_terms["feasibility"]
            - 0.15 * objective_terms["risk"]
            - 0.10 * objective_terms["cost"]
            + 0.35
        )
        risks: list[str] = []
        if fairness and fairness.decision != GateDecision.accept:
            risks.extend(fairness.reasons)
        if model.contradiction_flags:
            risks.append("contiene contradicciones interpretativas; no usar como diagnóstico final")
        if not steps:
            risks.append("L0 no cubre las necesidades detectadas; se requiere diseño curricular humano")

        review_required = True
        approval = ApprovalStatus.needs_human_review
        route = LiteracyRoute(
            pid=model.pid,
            segment_id=segment_id,
            route_type=route_kind,
            needs=needs,
            competencies=competencies,
            steps=steps,
            score=round(score, 3),
            objective_terms={k: round(v, 3) for k, v in objective_terms.items()},
            risks=risks,
            constraints={
                "preferred_modality": modality,
                "offline_first": True,
                "human_authority": "facilitator_and_curriculum_team",
            },
            trace=trace,
            human_review_required=review_required,
            m_curr_update_required=True,
            approval_status=approval,
            version=1,
        )
        self.context.store.append_audit(
            AuditRecord(
                agent="APLAN",
                pid=model.pid,
                action="propose_route",
                memory_layer=MemoryLayer.curriculum,
                payload=route.model_dump(mode="json"),
            )
        )
        return route

    def _tags_for_model(self, model: MentalModel) -> list[str]:
        tags: list[str] = []
        if model.values.get("conceptual_need", 0.0) > 0.15 or model.confidence < 0.55:
            tags.append("basic_concepts")
        if model.values.get("data_sensitivity", 0.0) >= 0.25 or model.values.get("governance_need", 0.0) >= 0.20:
            tags.append("data_governance")
        if model.values.get("interest_recommendations", 0.0) >= 0.25:
            tags.append("ai_recommendations")
        if model.values.get("trust_human", 0.0) >= 0.20:
            tags.append("human_review")
        if model.values.get("fairness_concern", 0.0) >= 0.20:
            tags.append("bias_fairness")
        if model.values.get("experimentation_readiness", 0.0) >= 0.18:
            tags.append("experimentation")
        # ── Códigos regionales ──────────────────────────
        if model.values.get("privacy_concern", 0.0) >= 0.25:
            tags.append("digital_distrust")
        if model.values.get("local_heuristic_value", 0.0) >= 0.20:
            tags.append("empirical_knowledge")
        if model.values.get("offline_urgency", 0.0) >= 0.25:
            tags.append("connectivity_barrier")
        if not tags:
            tags = ["basic_concepts", "data_governance", "human_review"]
        # Orden de seguridad: conceptos y gobernanza antes de experimentación.
        order = [
            "basic_concepts", "data_governance", "ai_recommendations",
            "human_review", "bias_fairness", "experimentation",
            "digital_distrust", "empirical_knowledge", "connectivity_barrier",
        ]
        return [tag for tag in order if tag in set(tags)][:4]

    def _choose_module(self, candidates: list[dict], modality: str) -> dict:
        def score(module: dict) -> tuple[int, int]:
            supports = int(bool(module.get("modality_audio", False)) and modality == "audio")
            shorter = -int(module.get("duration_minutes", 999))
            return (supports, shorter)

        return sorted(candidates, key=score, reverse=True)[0]

    def _choose_mediation(self, module: dict, modality: str) -> str:
        if modality == "audio" and module.get("modality_audio", False):
            return "audio + facilitación humana"
        return str(module.get("default_mediation", "sesión facilitada offline"))

    def _default_activity(self, tag: str) -> str:
        return {
            "basic_concepts": "tarjetas visuales con ejemplos agrícolas de dato, modelo y recomendación",
            "data_governance": "deliberación guiada sobre qué datos compartir, con quién y bajo qué condiciones",
            "ai_recommendations": "comparar una recomendación algorítmica con evidencia del lote y criterio técnico",
            "human_review": "matriz práctica para aceptar, revisar o rechazar una recomendación",
            "bias_fairness": "mapa de riesgos para identificar exclusión por canal, cultivo o conectividad",
            "experimentation": "diseñar una prueba pequeña, reversible y documentada",
            "digital_distrust": "deliberación guiada: ¿por qué desconfío? — análisis de riesgos percibidos y criterios de seguridad",
            "empirical_knowledge": "taller de validación del saber local: contrastar heurísticas campesinas con recomendaciones algorítmicas",
            "connectivity_barrier": "simulación offline: usar la herramienta sin conexión y planificar sincronización",
        }.get(tag, "actividad facilitada de contextualización")

    def _default_assessment(self, tag: str) -> str:
        return {
            "basic_concepts": "explica oralmente qué puede y qué no puede hacer la herramienta",
            "data_governance": "identifica dato sensible, uso permitido y condición de revocación",
            "ai_recommendations": "justifica si la recomendación coincide o no con evidencia local",
            "human_review": "argumenta una decisión humano-en-el-bucle",
            "bias_fairness": "detecta un caso de daño o subrepresentación potencial",
            "experimentation": "presenta una bitácora de prueba segura y reversible",
            "digital_distrust": "describe al menos dos criterios para decidir si confiar en una herramienta digital",
            "empirical_knowledge": "compara una práctica local con una recomendación algorítmica y justifica su decisión",
            "connectivity_barrier": "demuestra el uso de la herramienta en modo offline y explica el plan de sincronización",
        }.get(tag, "evaluación formativa oral/práctica")

    def _objective_terms(self, model: MentalModel, fairness: FairnessDecision | None, steps: list[RouteStep]) -> dict[str, float]:
        fit = min(1.0, 0.25 + 0.15 * len(steps) + model.confidence * 0.35)
        equity = 1.0 - (fairness.risk_score if fairness else 0.0)
        feasibility = 1.0 if sum(step.duration_minutes for step in steps) <= 150 else 0.65
        risk = (fairness.risk_score if fairness else 0.0) + min(0.3, len(model.contradiction_flags) * 0.1)
        cost = min(1.0, sum(step.duration_minutes for step in steps) / 240)
        return {
            "fit": clamp01(fit),
            "equity": clamp01(equity),
            "feasibility": clamp01(feasibility),
            "risk": clamp01(risk),
            "cost": clamp01(cost),
        }
