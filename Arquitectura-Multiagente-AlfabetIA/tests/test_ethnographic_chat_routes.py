import pytest
from alfabetia_rural.services.orchestrator import Orchestrator
from alfabetia_rural.domain.models import ConsentState

class MockContrastingLLMClient:
    provider_name = "mock"
    def __init__(self):
        self.mode = "similar"
        
    def complete_json(self, task: str, payload: dict) -> dict:
        if task == "ethnographic_chat":
            values_delta = {}
            if self.mode == "similar_1":
                values_delta = {
                    "conceptual_need": {"value": 0.8},
                    "data_sensitivity": {"value": 0.3}
                }
            elif self.mode == "similar_2":
                values_delta = {
                    "conceptual_need": {"value": 0.85},
                    "data_sensitivity": {"value": 0.35}
                }
            elif self.mode == "similar_3":
                values_delta = {
                    "conceptual_need": {"value": 0.75},
                    "data_sensitivity": {"value": 0.25}
                }
            elif self.mode == "contrast_1":
                # Alta desconfianza digital (C7)
                values_delta = {
                    "privacy_concern": {"value": 0.9},
                    "data_sensitivity": {"value": 0.8}
                }
            elif self.mode == "contrast_2":
                # Conocimiento empírico alto (C3)
                values_delta = {
                    "local_heuristic_value": {"value": 0.9}
                }
            elif self.mode == "contrast_3":
                # Barrera de conectividad alta (C1)
                values_delta = {
                    "offline_urgency": {"value": 0.9}
                }
            elif self.mode == "contrast_4":
                # Sesgo y equidad + experimentación (C5, C6)
                values_delta = {
                    "fairness_concern": {"value": 0.8},
                    "experimentation_readiness": {"value": 0.8}
                }
            
            return {
                "assistant_message": f"Respuesta de prueba para modo {self.mode}",
                "conversation_control": {
                    "phase": "beliefs",
                    "should_continue": True,
                    "stop_reason": None
                },
                "memory_update": {
                    "values_vector_delta": values_delta,
                    "episodic_summary_delta": [f"Prueba {self.mode}"]
                }
            }
        
        # Stub fallbacks
        if task == "probe":
            return {"question": "?", "justification": "", "sensitive": False, "uncertainty": 0.1}
        if task == "codes":
            return {"codes": []}
        if task == "explanation":
            return {"explanation": "test"}
        return {}


def test_contrasting_routes_from_chat(context, store):
    mock_llm = MockContrastingLLMClient()
    orch = Orchestrator(
        store=store, 
        codebook=context.codebook, 
        l0=context.l0, 
        policies=context.policies, 
        llm=mock_llm
    )
    
    consent = ConsentState(
        allow_raw_capture=True,
        allow_semantic_processing=True,
        allow_graph_derivative=True,
        allow_curriculum_derivatives=True
    ).model_dump(mode="json")
    
    # Pruebas similares (1, 2, 3)
    similar_routes = []
    for i in range(1, 4):
        pid = f"pid_similar_{i}"
        mock_llm.mode = f"similar_{i}"
        
        orch.process_chat_turn(pid=pid, text=f"Hola similar {i}", consent_data=consent)
        
        # Recuperar el modelo mental y generar ruta
        model = store.load_mental_model(pid)
        route = orch.planning.propose_route(model)
        similar_routes.append(route)
        
    # Pruebas distintas (1, 2, 3, 4)
    contrast_routes = []
    for i in range(1, 5):
        pid = f"pid_contrast_{i}"
        mock_llm.mode = f"contrast_{i}"
        
        orch.process_chat_turn(pid=pid, text=f"Hola contrast {i}", consent_data=consent)
        
        model = store.load_mental_model(pid)
        route = orch.planning.propose_route(model)
        contrast_routes.append(route)
        
    # VERIFICACIONES
    
    # 1. Las 3 rutas similares deben tener los mismos tags (por lo tanto, mismas competencias detectadas)
    assert set(similar_routes[0].needs) == set(similar_routes[1].needs) == set(similar_routes[2].needs)
    assert "aclarar conceptos mínimos de IA, datos, modelo y recomendación" in similar_routes[0].needs
    
    # 2. Las 4 rutas distintas deben tener enfoques (needs) diferentes a las similares
    for route in contrast_routes:
        assert set(route.needs) != set(similar_routes[0].needs)
        
    # 3. Y entre las rutas distintas, deben variar significativamente
    # contrast_1: digital_distrust
    assert any("desconfianza" in need for need in contrast_routes[0].needs)
    
    # contrast_2: empirical_knowledge
    assert any("saber empírico" in need for need in contrast_routes[1].needs)
    
    # contrast_3: connectivity_barrier
    assert any("conectividad" in need for need in contrast_routes[2].needs)
    
    # contrast_4: bias_fairness (equidad)
    assert any("sesgo" in need or "daño" in need for need in contrast_routes[3].needs)

