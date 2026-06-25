from alfabetia_rural.domain.models import GraphEdge, GraphNode, MentalModel
from alfabetia_rural.services.grouping import group_models
from alfabetia_rural.utils.graphs import fisher_rao_distance, hybrid_distance


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


def test_fisher_rao_zero_for_equal_compositions():
    p = {"C1": 0.5, "C2": 0.5}
    assert fisher_rao_distance(p, p) == 0.0


def test_hybrid_distance_symmetric():
    a = _model("p1", 0.8, 0.1)
    b = _model("p2", 0.75, 0.15)
    assert hybrid_distance(a, b) == hybrid_distance(b, a)


def test_group_models_returns_segments():
    models = [_model("p1", 0.8, 0.1), _model("p2", 0.75, 0.15), _model("p3", 0.1, 0.8)]
    segments = group_models(models, threshold=0.25)
    assert len(segments) >= 2
    assert all(segment.centroid_pid for segment in segments)
