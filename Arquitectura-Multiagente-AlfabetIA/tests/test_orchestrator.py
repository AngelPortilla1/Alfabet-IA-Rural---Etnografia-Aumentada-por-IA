from alfabetia_rural.llm.stub import StubLLMClient
from alfabetia_rural.services.orchestrator import Orchestrator
from alfabetia_rural.domain.enums import Channel
from alfabetia_rural.domain.models import ConsentState, EventEnvelope


def test_orchestrator_cold_path_creates_review_route_and_delta(context, store):
    orch = Orchestrator(store=store, codebook=context.codebook, l0=context.l0, policies=context.policies, llm=StubLLMClient())
    event = EventEnvelope(
        sid="s1",
        pid="p1",
        channel=Channel.text,
        content="Me preocupa compartir datos de mi finca y prefiero que el técnico revise la recomendación.",
        consent=ConsentState(),
    )
    out = orch.process_event(event)
    assert out["status"] in {"ok", "ok_with_review"}
    assert store.load_mental_model("p1") is not None
    assert store.latest_route("p1") is not None
    assert store.list_deltas()
    assert any(r.stage == "M_CURR" for r in store.list_reviews())
