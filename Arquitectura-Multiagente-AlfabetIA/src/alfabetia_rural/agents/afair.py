from __future__ import annotations

from collections import Counter

from alfabetia_rural.agents.base import AgentContext
from alfabetia_rural.domain.enums import GateDecision, MemoryLayer
from alfabetia_rural.domain.models import AuditRecord, FairnessDecision, MentalModel


class FairnessRiskAgent:
    """Riesgo/equidad determinista: cobertura, canal, confianza, contradicción."""

    def __init__(self, context: AgentContext):
        self.context = context

    def evaluate(self, model: MentalModel) -> FairnessDecision:
        reasons: list[str] = []
        risk_score = 0.0
        uncertainty_score = max(model.uncertainty_sources.values(), default=0.0)

        if model.confidence < float(self.context.policies.get("model_confidence_review_threshold", 0.55)):
            reasons.append("baja confianza del modelo mental")
            risk_score += 0.25
        if model.contradiction_flags:
            reasons.append("contradicciones semánticas pendientes")
            risk_score += min(0.30, 0.10 * len(model.contradiction_flags))
        if model.values.get("fairness_concern", 0.0) >= float(self.context.policies.get("fairness_concern_threshold", 0.55)):
            reasons.append("preocupación alta por sesgo, cobertura desigual o daño")
            risk_score += 0.20
        if uncertainty_score >= float(self.context.policies.get("uncertainty_review_threshold", 0.60)):
            reasons.append("incertidumbre acumulada alta")
            risk_score += 0.20

        coverage = self._coverage()
        min_fraction = float(self.context.policies.get("fairness_channel_min_fraction", 0.10))
        audio_fraction = coverage.get("prefers_audio_fraction", 0.0)
        if 0.0 < audio_fraction < min_fraction:
            reasons.append("posible subrepresentación de participantes con preferencia por audio")
            risk_score += 0.15
        if coverage.get("n_models", 0.0) < float(self.context.policies.get("minimum_models_for_segment_planning", 3)):
            reasons.append("baja densidad de evidencia para decisiones de segmento")
            risk_score += 0.10

        if risk_score >= float(self.context.policies.get("fairness_block_threshold", 0.80)):
            decision = GateDecision.block
            recommended_action = "bloquear planeación y auditar permisos/cobertura"
        elif risk_score >= float(self.context.policies.get("fairness_review_threshold", 0.35)):
            decision = GateDecision.review
            recommended_action = "abrir revisión humana antes de devolución o M_curr"
        else:
            decision = GateDecision.accept
            recommended_action = "continuar con ruta candidata revisable"

        out = FairnessDecision(
            decision=decision,
            reasons=reasons,
            coverage=coverage,
            risk_score=round(risk_score, 3),
            uncertainty_score=round(uncertainty_score, 3),
            recommended_action=recommended_action,
        )
        self.context.store.append_audit(
            AuditRecord(
                agent="AFAIR",
                pid=model.pid,
                action="evaluate_fairness",
                memory_layer=MemoryLayer.audit,
                payload=out.model_dump(mode="json"),
            )
        )
        return out

    def _coverage(self) -> dict[str, float]:
        models = self.context.store.list_mental_models()
        total = len(models)
        if total == 0:
            return {"n_models": 0.0, "prefers_audio_fraction": 0.0, "facilitated_fraction": 0.0}
        channels = Counter()
        for model in models:
            if model.preferences.get("prefers_audio"):
                channels["audio"] += 1
            if model.preferences.get("prefers_facilitated"):
                channels["facilitated"] += 1
        return {
            "n_models": float(total),
            "prefers_audio_fraction": round(channels["audio"] / total, 3),
            "facilitated_fraction": round(channels["facilitated"] / total, 3),
        }
