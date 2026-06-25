from alfabetia_rural.llm.stub import StubLLMClient
from alfabetia_rural.services.orchestrator import Orchestrator
from alfabetia_rural.domain.models import ConsentState

def test_ethnographic_chat_turn(context, store):
    orch = Orchestrator(store=store, codebook=context.codebook, l0=context.l0, policies=context.policies, llm=StubLLMClient())
    
    pid = "chat_test_01"
    session_id = "sess_01"
    consent = ConsentState().model_dump(mode="json")
    
    # Turn 1
    res1 = orch.process_chat_turn(
        pid=pid,
        text="Hola, soy productor de café y me preocupa que los datos de mi finca sean públicos.",
        channel="text",
        session_id=session_id,
        consent_data=consent
    )
    
    assert res1["status"] == "ok"
    assert "assistant_message" in res1
    assert res1["conversation_control"]["phase"] == "beliefs"
    
    # Check that dialogue turn was saved in db
    history = store.get_dialogue_transcript(pid)
    assert len(history) == 3  # greeting, user and assistant messages
    assert history[0]["role"] == "assistant"
    assert history[1]["role"] == "user"
    assert history[2]["role"] == "assistant"
    
    # Check that model is updated
    model = store.load_mental_model(pid)
    assert model is not None
    assert len(model.nodes) > 0
    assert "C1" in model.literacy
    assert "C7" in model.literacy


def test_ethnographic_chat_consent_refusal(context, store):
    orch = Orchestrator(store=store, codebook=context.codebook, l0=context.l0, policies=context.policies, llm=StubLLMClient())
    
    pid = "chat_test_refusal"
    session_id = "sess_refusal"
    consent = ConsentState().model_dump(mode="json")
    
    # User replies "No" to the consent question
    res = orch.process_chat_turn(
        pid=pid,
        text="No",
        channel="text",
        session_id=session_id,
        consent_data=consent
    )
    
    assert res["status"] == "ok"
    assert res["conversation_control"]["should_continue"] is False
    assert res["conversation_control"]["stop_reason"] == "consent_refused"
    
    # Verify that consent is revoked in the database
    db_consents = store.list_participant_consents()
    pid_consent = next((c for c in db_consents if c["pid"] == pid), None)
    assert pid_consent is not None
    assert pid_consent["full_revoke_at"] is not None
    
    # Try to process another chat turn, it should be blocked by AGOV
    res_blocked = orch.process_chat_turn(
        pid=pid,
        text="Quiero intentar de nuevo",
        channel="text",
        session_id=session_id,
        consent_data=consent
    )
    assert res_blocked["status"] == "blocked"
    assert res_blocked["stage"] == "AGOV"
