from __future__ import annotations

from typing import Any, Dict

from fastapi import FastAPI, HTTPException, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel

from alfabetia_rural.bootstrap import build_orchestrator, build_store
from alfabetia_rural.domain.enums import ConsentScope, ReviewStatus, ReviewRole
from alfabetia_rural.domain.models import EventEnvelope
from alfabetia_rural.services.cold_start import run_cold_start
from alfabetia_rural.services.segmentation import recalculate_and_save_segments

store = build_store()
orchestrator = build_orchestrator(store=store)
app = FastAPI(
    title="AlfabetIA Rural", 
    version="0.3.0",
    swagger_ui_parameters={"syntaxHighlight": False}
)

import os

origins_env = os.environ.get("ALFABETIA_CORS_ORIGINS")
if origins_env:
    origins = [orig.strip() for orig in origins_env.split(",") if orig.strip()]
else:
    origins = [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,     # Permite los orígenes definidos arriba
    allow_credentials=True,
    allow_methods=["*"],       # Permite todos los métodos (GET, POST, OPTIONS, etc.)
    allow_headers=["*"],       # Permite todos los encabezados
)

def get_cors_headers(request: Request) -> Dict[str, str]:
    origin = request.headers.get("origin")
    headers: Dict[str, str] = {}
    if origin and origin in origins:
        headers["Access-Control-Allow-Origin"] = origin
        headers["Access-Control-Allow-Credentials"] = "true"
        headers["Access-Control-Allow-Methods"] = "*"
        headers["Access-Control-Allow-Headers"] = "*"
    return headers

@app.exception_handler(Exception)
def global_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    import traceback
    traceback.print_exc()
    return JSONResponse(
        status_code=500,
        content={"detail": f"Internal Server Error: {str(exc)}"},
        headers=get_cors_headers(request)
    )

@app.exception_handler(HTTPException)
def http_exception_handler(request: Request, exc: HTTPException) -> JSONResponse:
    return JSONResponse(
        status_code=exc.status_code,
        content={"detail": exc.detail},
        headers=get_cors_headers(request)
    )

@app.exception_handler(RequestValidationError)
def validation_exception_handler(request: Request, exc: RequestValidationError) -> JSONResponse:
    return JSONResponse(
        status_code=422,
        content={"detail": exc.errors()},
        headers=get_cors_headers(request)
    )

@app.get("/health")
def health() -> dict:
    llm = orchestrator.explanation.llm
    provider = llm.provider_name if hasattr(llm, "provider_name") else "unknown"
    model = getattr(llm, "model", "stub")
    return {"status": "ok", "llm_provider": provider, "llm_model": model}


class ChatRequest(BaseModel):
    message: str
    channel: str = "text"
    session_id: str | None = None
    consent: dict[str, Any] | None = None

@app.get("/agents/status")
def agents_status() -> dict:
    status = orchestrator.observability.get_system_status()
    return status.model_dump(mode="json")


@app.post("/events")
def ingest_event(event: EventEnvelope) -> dict:
    return orchestrator.process_event(event)


@app.post("/participants/{pid}/chat")
def chat_turn(pid: str, req: ChatRequest) -> dict:
    return orchestrator.process_chat_turn(
        pid=pid,
        text=req.message,
        channel=req.channel,
        session_id=req.session_id,
        consent_data=req.consent
    )


@app.get("/participants/{pid}/chat/history")
def chat_history(pid: str) -> list[dict]:
    return store.get_dialogue_transcript(pid)


@app.get("/participants")
def list_participants() -> list[dict]:
    """Lista todos los participantes con modelo mental activo."""
    models = store.list_mental_models()
    result = []
    seen = set()
    for m in models:
        if m.pid not in seen:
            seen.add(m.pid)
            result.append({
                "pid": m.pid,
                "revision": m.revision,
                "confidence": m.confidence,
                "nodes": len(m.nodes),
                "edges": len(m.edges),
            })
    return result


@app.get("/participants/{pid}/mental-model")
def get_model(pid: str) -> dict:
    model = store.load_mental_model(pid)
    if not model:
        raise HTTPException(status_code=404, detail="Modelo mental no encontrado")
    return model.model_dump(mode="json")


@app.get("/participants/{pid}/route")
def get_route(pid: str) -> dict:
    route = store.latest_route(pid)
    if not route:
        raise HTTPException(status_code=404, detail="Ruta no encontrada")
    return route.model_dump(mode="json")

@app.post("/participants/{pid}/route/generate")
def generate_route(pid: str) -> dict:
    # 1. Intentar generar la ruta explícitamente a partir del modelo mental del chat
    model = store.load_mental_model(pid)
    if not model:
        raise HTTPException(status_code=404, detail="Modelo mental no encontrado para generar la ruta")
    
    # 2. Evaluar riesgos y equidad (AFAIR)
    fairness = orchestrator.fairness.evaluate(model)
    
    # 3. Proponer ruta (APLAN)
    route = orchestrator.planning.propose_route(model, fairness=fairness)
    
    # 4. Generar justificación (AEXPL)
    route = orchestrator.explanation.explain(model, route)
    
    # 5. Guardar ruta
    store.save_route(route)
    
    # 6. Registrar revisión curricular en cola (ASUP)
    orchestrator.supervisor.open_curricular_review(
        pid=pid,
        reason="ruta candidata generada dinámicamente a partir de chat etnográfico requiere revisión humana",
        payload=route.model_dump(mode="json"),
        role=ReviewRole.curriculum_team,
    )
    return route.model_dump(mode="json")


@app.get("/segments")
def list_segments() -> list[dict]:
    return [s.model_dump(mode="json") for s in store.list_segments()]


@app.get("/reviews")
def list_reviews(status: ReviewStatus | None = None) -> list[dict]:
    return [r.model_dump(mode="json") for r in store.list_reviews(status=status)]


@app.post("/reviews/{review_id}/approve")
def approve_review(review_id: str, resolved_by: str = "human") -> dict:
    try:
        store.update_review_status(review_id, ReviewStatus.approved, resolved_by=resolved_by)
    except KeyError:
        raise HTTPException(status_code=404, detail="Revisión no encontrada") from None
    return {"review_id": review_id, "status": "approved"}


@app.post("/reviews/{review_id}/reject")
def reject_review(review_id: str, resolved_by: str = "human", note: str | None = None) -> dict:
    try:
        store.update_review_status(review_id, ReviewStatus.rejected, resolved_by=resolved_by, note=note)
    except KeyError:
        raise HTTPException(status_code=404, detail="Revisión no encontrada") from None
    return {"review_id": review_id, "status": "rejected"}


@app.post("/participants/{pid}/revoke")
def revoke(pid: str, scope: ConsentScope | None = None, reason: str | None = None) -> dict:
    record = store.revoke_pid(pid, scope=scope, reason=reason)
    return record.model_dump(mode="json")


@app.get("/audit")
def audit() -> list[dict]:
    return store.list_audit()


@app.get("/participants/consents")
def list_consents() -> list[dict]:
    return store.list_participant_consents()


@app.get("/deltas")
def deltas() -> list[dict]:
    return [d.model_dump(mode="json") for d in store.list_deltas()]


@app.post("/demo/cold-start")
def demo(use_stub: bool = False) -> dict:
    global orchestrator
    if use_stub:
        # Actualiza el orquestador global forzando el uso de stubs
        orchestrator = build_orchestrator(store=store, force_stub_llm=True)
        return run_cold_start(orchestrator, store)
    else:
        # Actualiza el orquestador global para usar el proveedor real (ej. Ollama)
        orchestrator = build_orchestrator(store=store, force_stub_llm=False)
        return run_cold_start(orchestrator, store)


@app.post("/segments/recalculate")
def recalculate_segments(use_stub: bool = False) -> list[dict]:
    global orchestrator
    orchestrator = build_orchestrator(store=store, force_stub_llm=use_stub)
    segments = recalculate_and_save_segments(orchestrator, store)
    return [s.model_dump(mode="json") for s in segments]


@app.get("/dashboard/summary")
def dashboard_summary() -> dict:
    return store.get_dashboard_summary()
