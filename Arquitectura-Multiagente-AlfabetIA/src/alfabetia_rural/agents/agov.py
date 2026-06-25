from __future__ import annotations

from alfabetia_rural.agents.base import AgentContext
from alfabetia_rural.domain.enums import ConsentScope, GateDecision, MemoryLayer
from alfabetia_rural.domain.models import AgentDecision, AuditRecord, EventEnvelope


class GovernanceAgent:
    """Compuerta normativa determinista.

    AGOV no interpreta semántica. Solo evalúa consentimiento, revocación,
    alcance y permisos por capa.
    """

    REQUIRED_SCOPES: tuple[ConsentScope, ...] = (
        ConsentScope.raw_capture,
        ConsentScope.semantic_processing,
        ConsentScope.graph_derivative,
        ConsentScope.curriculum_derivative,
    )

    def __init__(self, context: AgentContext):
        self.context = context

    def validate(self, event: EventEnvelope) -> AgentDecision:
        reasons: list[str] = []
        allowed: list[ConsentScope] = []
        restricted: list[ConsentScope] = []

        # Consultar base de datos para verificar revocaciones previas
        db_consents = self.context.store.list_participant_consents()
        pid_consent = next((c for c in db_consents if c["pid"] == event.pid), None)

        is_revoked = event.consent.revoked
        allowed_scopes = {
            scope: event.consent.allows(scope)
            for scope in self.REQUIRED_SCOPES + (ConsentScope.secondary_use, ConsentScope.export)
        }

        # Sobreescribir permisos basados en las revocaciones guardadas en BD
        if pid_consent:
            if pid_consent.get("full_revoke_at") is not None:
                is_revoked = True
            for scope_str, allowed_val in pid_consent.get("consent", {}).items():
                try:
                    scope_enum = ConsentScope(scope_str)
                    if not allowed_val:
                        allowed_scopes[scope_enum] = False
                except ValueError:
                    pass

        if is_revoked:
            reasons.append("consentimiento revocado")
        if not event.consent.primary_use:
            reasons.append("uso primario no autorizado")
        if not event.consent.participant_ack:
            reasons.append("acuse de consentimiento no registrado")

        for scope in self.REQUIRED_SCOPES + (ConsentScope.secondary_use, ConsentScope.export):
            if allowed_scopes.get(scope, False):
                allowed.append(scope)
            else:
                restricted.append(scope)

        if reasons or ConsentScope.raw_capture in restricted or ConsentScope.semantic_processing in restricted:
            decision = GateDecision.block
        elif ConsentScope.graph_derivative in restricted or ConsentScope.curriculum_derivative in restricted:
            decision = GateDecision.review
            reasons.append("procesamiento derivado restringido; requiere revisión de alcance")
        else:
            decision = GateDecision.accept

        output = AgentDecision(decision=decision, reasons=reasons, allowed_scopes=allowed, restricted_scopes=restricted)
        self.context.store.append_audit(
            AuditRecord(
                agent="AGOV",
                pid=event.pid,
                sid=event.sid,
                action="validate_consent",
                memory_layer=MemoryLayer.policy,
                payload=output.model_dump(mode="json"),
            )
        )
        return output
