from __future__ import annotations

from uuid import uuid4

from alfabetia_rural.domain.enums import Channel, RouteType
from alfabetia_rural.domain.models import ConsentState, EventEnvelope
from alfabetia_rural.services.grouping import group_models


def synthetic_events() -> list[EventEnvelope]:
    payloads = [
        ("p1", Channel.audio, "Me preocupa compartir datos de mi finca y no saber quién más los usa. Prefiero que el técnico revise antes de decidir."),
        ("p2", Channel.text, "Si la IA recomienda fertilización quiero comparar la recomendación con el criterio del asesor y con datos del lote."),
        ("p3", Channel.audio, "Antes de compartir datos necesito consentimiento claro y saber para qué sirve. También quiero probar pequeño antes de confiar."),
        ("p4", Channel.facilitated, "Me interesa usar recomendaciones si puedo revisarlas con calma y ver si hay sesgo o daño para algunos productores."),
        ("p5", Channel.kiosk, "Quiero entender primero qué es IA y qué datos usa antes de aceptar una recomendación."),
    ]
    return [
        EventEnvelope(sid=str(uuid4()), pid=pid, channel=channel, content=content, consent=ConsentState())
        for pid, channel, content in payloads
    ]


def run_cold_start(orchestrator, store, threshold: float = 0.30) -> dict:
    outcomes = [orchestrator.process_event(event) for event in synthetic_events()]
    models = store.list_mental_models()
    segments = group_models(models, threshold=threshold)
    for segment in segments:
        store.save_segment(segment)

    segment_routes = {}
    for segment in segments:
        centroid = store.load_mental_model(segment.centroid_pid) if segment.centroid_pid else None
        if not centroid:
            continue
        fairness = orchestrator.fairness.evaluate(centroid)
        route = orchestrator.planning.propose_route(centroid, fairness=fairness, segment_id=segment.segment_id, route_type=RouteType.segment)
        route = orchestrator.explanation.explain(centroid, route)
        store.save_route(route)
        orchestrator.supervisor.open_curricular_review(
            pid=centroid.pid,
            reason=f"ruta de segmento {segment.segment_id} requiere aprobación curricular",
            payload=route.model_dump(mode="json"),
        )
        segment_routes[segment.segment_id] = route.model_dump(mode="json")

    return {
        "outcomes": outcomes,
        "mental_models": [m.model_dump(mode="json") for m in models],
        "segments": [s.model_dump(mode="json") for s in segments],
        "segment_routes": segment_routes,
        "reviews": [r.model_dump(mode="json") for r in store.list_reviews()],
        "deltas": [d.model_dump(mode="json") for d in store.list_deltas()],
        "audit": store.list_audit(),
    }
