from __future__ import annotations

from alfabetia_rural.agents.base import AgentContext
from alfabetia_rural.domain.enums import MemoryLayer
from alfabetia_rural.domain.models import AuditRecord, LiteracyRoute, MentalModel
from alfabetia_rural.llm.base import LLMClientProtocol


class ExplanationAgent:
    def __init__(self, context: AgentContext, llm: LLMClientProtocol):
        self.context = context
        self.llm = llm

    def explain(self, model: MentalModel, route: LiteracyRoute) -> LiteracyRoute:
        llm_ok = False
        raw: dict = {}
        try:
            raw = self.llm.complete_json(
                "explanation",
                {
                    "route": route.model_dump(mode="json"),
                    "model_values": model.values,
                    "uncertainty": model.uncertainty_sources,
                    "llm_rule": "No presentar inferencia como evidencia primaria.",
                },
            )
            # Solo se considera éxito si hay texto real y no hubo error reportado
            if raw.get("explanation") and not raw.get("error"):
                llm_ok = True
        except Exception:
            raw = {}

        if llm_ok:
            text = raw["explanation"]
            source = "llm"
        else:
            text = self._fallback(model, route)
            source = "llm_error" if raw.get("error") else "heuristic"

        route.explanation = text
        route.explanation_source = source
        self.context.store.append_audit(
            AuditRecord(
                agent="AEXPL",
                pid=model.pid,
                action="explain_route",
                memory_layer=MemoryLayer.curriculum,
                payload={
                    "explanation": text,
                    "explanation_source": source,
                    "llm_provider": self.llm.provider_name,
                },
            )
        )
        return route

    def _fallback(self, model: MentalModel, route: LiteracyRoute) -> str:
        if not route.steps:
            return (
                "La ruta queda en revisión: todavía no hay evidencia suficiente o L0 no cubre la necesidad. "
                "No se debe convertir en M_curr sin decisión del equipo curricular."
            )
        needs = "; ".join(route.needs[:3])
        first = route.steps[0]
        risk_note = " Riesgos pendientes: " + "; ".join(route.risks) if route.risks else ""
        return (
            f"Ruta candidata {route.route_type.value}: inicia con '{first.title}' porque la evidencia permitida sugiere: {needs}. "
            f"La inferencia procede del modelo mental revisión {model.revision}, no de evidencia primaria nueva. "
            f"Toda modificación de M_curr requiere aprobación humana. Puntaje={route.score:.2f}.{risk_note}"
        )
