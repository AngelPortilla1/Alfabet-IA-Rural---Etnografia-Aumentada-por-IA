from __future__ import annotations

from alfabetia_rural.domain.enums import RouteType
from alfabetia_rural.services.grouping import group_models
from alfabetia_rural.domain.models import Segment

def recalculate_and_save_segments(orchestrator, store, threshold: float = 0.30) -> list[Segment]:
    """Recalcula los segmentos comunitarios usando todos los modelos mentales actuales.
    
    Limpia los segmentos anteriores, calcula los nuevos grupos, guarda los segmentos
    y genera/propone una ruta pedagógica para el centroide de cada nuevo segmento,
    creando la correspondiente revisión curricular.
    """
    models = store.list_mental_models()
    if not models:
        return []
    
    # Limpiar segmentos existentes
    store.clear_segments()
    
    # Agrupar modelos mentales
    segments = group_models(models, threshold=threshold)
    for segment in segments:
        store.save_segment(segment)
        
    # Proponer y registrar rutas pedagógicas para cada centroide
    for segment in segments:
        centroid = store.load_mental_model(segment.centroid_pid) if segment.centroid_pid else None
        if not centroid:
            continue
            
        fairness = orchestrator.fairness.evaluate(centroid)
        route = orchestrator.planning.propose_route(
            centroid, 
            fairness=fairness, 
            segment_id=segment.segment_id, 
            route_type=RouteType.segment
        )
        route = orchestrator.explanation.explain(centroid, route)
        store.save_route(route)
        
        orchestrator.supervisor.open_curricular_review(
            pid=centroid.pid,
            reason=f"ruta de segmento {segment.segment_id} requiere aprobación curricular (recalculado dinámicamente)",
            payload=route.model_dump(mode="json"),
        )
        
    return segments
