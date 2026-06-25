# Uso local de LLM con Ollama

## Principio

Toda capacidad generativa debe ejecutarse localmente si se activa LLM. El sistema no incluye proveedor cloud por defecto ni dependencia OpenAI.

## Instalación rápida

```bash
ollama serve
ollama pull qwen3:8b
python -m venv .venv
source .venv/bin/activate
pip install -e ".[ollama,dev]"
```

## Variables

```bash
export alfabetia_LLM_PROVIDER=ollama
export alfabetia_OLLAMA_MODEL=qwen3:8b
export alfabetia_OLLAMA_BASE_URL=http://localhost:11434
```

También existe `alfabetia_LLM_PROVIDER=langchain-ollama` para usar el adaptador opcional basado en `langchain-ollama`, pero el backbone permanece fuera de LangChain/LangGraph.

## Tareas LLM permitidas

- `AETHNO`: sugerir probes prudentes.
- `ACODE`: sugerir códigos, siempre como inferencias revisables.
- `AEXPL`: redactar explicación trazable.

## Tareas LLM no permitidas

- aprobar consentimiento;
- modificar `M_policy`;
- aprobar `M_curr`;
- resolver conflictos de sincronización;
- borrar datos;
- convertir inferencias en evidencia primaria.

## Modo reproducible (Stub LLM)

El sistema incluye un proveedor `stub` que devuelve respuestas predefinidas sin necesidad
de Ollama. Es útil para pruebas, demos y defensa metodológica.

### Vía CLI

```bash
export alfabetia_FORCE_STUB_LLM=1
AlfabetIA demo-cold-start
```

### Vía API (endpoint `/demo/cold-start`)

```bash
# Con Ollama (proveedor configurado en .env)
curl -X POST http://127.0.0.1:8000/demo/cold-start

# Forzando stub (respuesta rápida, sin LLM)
curl -X POST "http://127.0.0.1:8000/demo/cold-start?use_stub=true"
```

Cuando `use_stub=true`, `app.py` construye un **orquestador temporal** con
`force_stub_llm=True` pasado a `build_orchestrator`. Esto no afecta el orquestador
global que procesa eventos reales.

### Parámetro `force_stub_llm` en `bootstrap.py`

```python
build_orchestrator(store=store, force_stub_llm=True)
```

Si `force_stub_llm` es `None`, se usa el valor de `settings.force_stub_llm`
(variable de entorno `alfabetia_FORCE_STUB_LLM`). Si es `True`, siempre usa stub
independientemente del `.env`.
