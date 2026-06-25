from __future__ import annotations

import pytest
from fastapi.testclient import TestClient

from alfabetia_rural.domain.models import GraphEdge, GraphNode, MentalModel, Segment
from alfabetia_rural.services.orchestrator import Orchestrator
from alfabetia_rural.services.segmentation import recalculate_and_save_segments
from alfabetia_rural.llm.stub import StubLLMClient
from alfabetia_rural.api.app import app
import alfabetia_rural.api.app as api_app


def _model(pid, data_sensitivity, interest):
    return MentalModel(
        pid=pid,
        nodes=[GraphNode(id="datos", label="Datos"), GraphNode(id="riesgo", label="Riesgo")],
        edges=[GraphEdge(source="datos", target="riesgo", relation="can_raise", weight=data_sensitivity)],
        values={"data_sensitivity": data_sensitivity, "interest_recommendations": interest},
        literacy={"C1": 0.15, "C2": 0.30, "C3": 0.20, "C4": 0.15, "C5": 0.10, "C6": 0.10},
        preferences={"prefers_audio": data_sensitivity > 0.4},
        confidence=0.8,
    )


def test_clear_segments_empties_table(store):
    segment = Segment(
        segment_id="SEG-99",
        label="prueba",
        member_ids=["p1"],
        summary="resumen",
        centroid_pid="p1",
        stability_score=0.9,
        coverage={"n": 1.0, "prefers_audio_fraction": 1.0, "mean_confidence": 0.8},
    )
    store.save_segment(segment)
    assert len(store.list_segments()) == 1

    store.clear_segments()
    assert len(store.list_segments()) == 0


def test_recalculate_and_save_segments(context, store):
    # Inicializar orquestador stub
    orch = Orchestrator(
        store=store, 
        codebook=context.codebook, 
        l0=context.l0, 
        policies=context.policies, 
        llm=StubLLMClient()
    )

    # 1. Guardar modelos mentales
    m1 = _model("p1", 0.8, 0.1)
    m2 = _model("p2", 0.75, 0.15)
    m3 = _model("p3", 0.1, 0.8)
    
    store.save_mental_model(m1)
    store.save_mental_model(m2)
    store.save_mental_model(m3)

    # 2. Guardar un segmento obsoleto
    old_segment = Segment(
        segment_id="SEG-OLD",
        label="viejo",
        member_ids=["p99"],
        summary="obsoleto",
        centroid_pid="p99",
        stability_score=0.1,
        coverage={"n": 1.0},
    )
    store.save_segment(old_segment)

    # 3. Recalcular
    segments = recalculate_and_save_segments(orch, store, threshold=0.30)
    
    # 4. Aseverar resultados
    assert len(segments) >= 1
    stored_segments = store.list_segments()
    assert len(stored_segments) == len(segments)
    
    # Verificar que el segmento antiguo fue borrado
    assert not any(s.segment_id == "SEG-OLD" for s in stored_segments)

    # Verificar que se generaron las rutas de centroide y revisiones curriculares
    for seg in stored_segments:
        if seg.centroid_pid:
            route = store.latest_route(seg.centroid_pid)
            assert route is not None
            assert route.segment_id == seg.segment_id
            
            # Verificar revisión curricular asociada
            reviews = store.list_reviews()
            assert any(r.stage == "M_CURR" and r.payload.get("pid") == seg.centroid_pid for r in reviews)


def test_api_recalculate_endpoint(store, context):
    # Mockear el store y el orquestador global de la API para usar el entorno de pruebas
    orch = Orchestrator(
        store=store, 
        codebook=context.codebook, 
        l0=context.l0, 
        policies=context.policies, 
        llm=StubLLMClient()
    )
    
    # Inyectar mocks en la app API
    original_store = api_app.store
    original_orch = api_app.orchestrator
    
    api_app.store = store
    api_app.orchestrator = orch
    
    try:
        # Registrar modelos de prueba
        m1 = _model("p1", 0.8, 0.1)
        store.save_mental_model(m1)

        client = TestClient(app)
        response = client.post("/segments/recalculate?use_stub=true")
        assert response.status_code == 200
        
        data = response.json()
        assert isinstance(data, list)
        assert len(data) == 1
        assert data[0]["segment_id"] == "SEG-01"
        assert data[0]["centroid_pid"] == "p1"
        
    finally:
        # Restaurar originales
        api_app.store = original_store
        api_app.orchestrator = original_orch
