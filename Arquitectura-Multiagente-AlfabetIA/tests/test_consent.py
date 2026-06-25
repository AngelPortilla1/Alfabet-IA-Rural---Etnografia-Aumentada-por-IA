from alfabetia_rural.agents.agov import GovernanceAgent
from alfabetia_rural.domain.enums import Channel, ConsentScope, GateDecision
from alfabetia_rural.domain.models import ConsentState, EventEnvelope


def test_governance_blocks_revoked(context):
    agent = GovernanceAgent(context)
    event = EventEnvelope(sid="s1", pid="p1", channel=Channel.text, content="hola", consent=ConsentState(revoked=True))
    result = agent.validate(event)
    assert result.decision == GateDecision.block
    assert "consentimiento revocado" in result.reasons


def test_governance_reviews_restricted_curriculum_scope(context):
    agent = GovernanceAgent(context)
    event = EventEnvelope(
        sid="s2",
        pid="p1",
        channel=Channel.text,
        content="relato suficiente para procesar",
        consent=ConsentState(allow_curriculum_derivatives=False),
    )
    result = agent.validate(event)
    assert result.decision == GateDecision.review
    assert ConsentScope.curriculum_derivative in result.restricted_scopes


def test_revocation_tombstones_raw_events(store):
    event = EventEnvelope(sid="s3", pid="p9", channel=Channel.text, content="relato", consent=ConsentState())
    store.save_event(event)
    assert len(store.list_events()) == 1
    store.revoke_pid("p9", scope=ConsentScope.raw_capture, reason="solicitud comunitaria")
    assert store.list_events() == []
    assert len(store.list_events(include_tombstoned=True)) == 1


def test_governance_enforces_database_revocations(context):
    agent = GovernanceAgent(context)
    event = EventEnvelope(sid="s_dev", pid="p_dev", channel=Channel.text, content="relato normal", consent=ConsentState())
    result = agent.validate(event)
    assert result.decision == GateDecision.accept

    context.store.revoke_pid("p_dev", scope=ConsentScope.graph_derivative, reason="retirar modelo mental")

    event2 = EventEnvelope(sid="s_dev2", pid="p_dev", channel=Channel.text, content="otro relato", consent=ConsentState())
    result2 = agent.validate(event2)
    assert result2.decision == GateDecision.review
    assert ConsentScope.graph_derivative in result2.restricted_scopes

