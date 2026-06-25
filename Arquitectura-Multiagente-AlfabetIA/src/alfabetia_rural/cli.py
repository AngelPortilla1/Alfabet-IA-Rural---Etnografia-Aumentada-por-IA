from __future__ import annotations

import json
from pathlib import Path

import typer
import uvicorn

from alfabetia_rural.bootstrap import build_orchestrator, build_store
from alfabetia_rural.config import DATA_DIR, get_settings
from alfabetia_rural.domain.enums import ConsentScope, ReviewStatus
from alfabetia_rural.llm.factory import build_llm
from alfabetia_rural.services.cold_start import run_cold_start
from alfabetia_rural.storage.crypto import LocalCipher
from alfabetia_rural.utils.loaders import load_yaml
from alfabetia_rural.utils.serializers import pretty_dumps

app = typer.Typer(help="CLI de AlfabetIA Rural")


@app.command("init-db")
def init_db() -> None:
    store = build_store()
    store.init_db()
    typer.echo(f"Base inicializada en: {store.db_path}")


@app.command("seed")
def seed() -> None:
    store = build_store()
    store.set_setting("codebook_seed", load_yaml(DATA_DIR / "codebook_seed.yaml"))
    store.set_setting("l0_curriculum", load_yaml(DATA_DIR / "l0_curriculum.yaml"))
    store.set_setting("policies_seed", load_yaml(DATA_DIR / "policies_seed.yaml"))
    typer.echo("Semillas cargadas en la base.")


@app.command("gen-key")
def gen_key() -> None:
    typer.echo(LocalCipher.generate_key())


@app.command("demo-cold-start")
def demo_cold_start(
    output: Path = typer.Option(Path("examples/cold_start_output.json"), "--output"),
    stub_llm: bool = typer.Option(True, help="Usa StubLLM para demo reproducible. Ponga --no-stub-llm para usar el proveedor LLM configurado."),
) -> None:
    output.parent.mkdir(parents=True, exist_ok=True)
    store = build_store()
    orchestrator = build_orchestrator(store=store, force_stub_llm=stub_llm)
    report = run_cold_start(orchestrator, store)
    output.write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding="utf-8")
    typer.echo(f"Corrida en frío completada. Resultado guardado en {output}")


@app.command("inspect")
def inspect() -> None:
    store = build_store()
    report = {
        "events": store.list_events(),
        "mental_models": [m.model_dump(mode="json") for m in store.list_mental_models()],
        "routes": [r.model_dump(mode="json") for r in store.list_routes()],
        "segments": [s.model_dump(mode="json") for s in store.list_segments()],
        "reviews": [r.model_dump(mode="json") for r in store.list_reviews()],
        "deltas": [d.model_dump(mode="json") for d in store.list_deltas()],
        "audit": store.list_audit(),
    }
    typer.echo(pretty_dumps(report))


@app.command("revoke")
def revoke(pid: str, scope: ConsentScope | None = None, reason: str | None = None) -> None:
    store = build_store()
    record = store.revoke_pid(pid, scope=scope, reason=reason)
    typer.echo(pretty_dumps(record.model_dump(mode="json")))


@app.command("approve-review")
def approve_review(review_id: str, resolved_by: str = "human", note: str | None = None) -> None:
    store = build_store()
    store.update_review_status(review_id, ReviewStatus.approved, resolved_by=resolved_by, note=note)
    typer.echo(f"Revisión aprobada: {review_id}")


@app.command("run-api")
def run_api(host: str = "127.0.0.1", port: int = 8000) -> None:
    settings = get_settings()
    typer.echo(f"API en {host}:{port} | DB={settings.db_path} | LLM={settings.llm_provider}")
    uvicorn.run("alfabetia_rural.api.app:app", host=host, port=port, reload=False)


@app.command("ping-llm")
def ping_llm() -> None:
    settings = get_settings()
    typer.echo(f"Conectando con el proveedor LLM configurado: {settings.llm_provider}")
    
    try:
        llm = build_llm(settings)
        typer.echo(f"Instancia creada: {llm.provider_name}")
        typer.echo("Enviando un pequeño prompt JSON de prueba...")
        response = llm.complete_json(
            task="Responde con un JSON que tenga una llave 'status' y valor 'ok'",
            payload={"ping": "pong"}
        )
        typer.echo(f"Respuesta exitosa:\n{pretty_dumps(response)}")
    except Exception as e:
        typer.echo(f"Error al conectar con el LLM: {e}", err=True)


if __name__ == "__main__":
    app()
