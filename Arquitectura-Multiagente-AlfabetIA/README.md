# AlfabetIA Rural — Caracterización Alfabetizacional en Comunidades Rurales

Este repositorio es una implementación optimizada e instalable de referencia para **AlfabetIA Rural**: una arquitectura multiagente, offline-first, auditable y human-in-the-loop diseñada para transformar narrativas rurales consentidas en modelos mentales, segmentos comunitarios, rutas de alfabetización y briefs curriculares revisables.

El sistema **no es un chatbot monolítico** y **no usa LangChain/LangGraph como columna vertebral**. El núcleo conserva control explícito del dominio: contratos Pydantic, agentes deterministas para gobernanza, persistencia SQLite, cola offline, bitácora hash-chain, revisión humana y rutas pedagógicas trazables. Los LLM quedan encapsulados detrás de adaptadores; por defecto se programa el consumo local vía **Ollama**.

---

## Tesis Operacional

AlfabetIA Rural es un sistema de apoyo decisional human-in-the-loop. El sistema sugiere, organiza, alerta y documenta; la comunidad, el facilitador, el auditor y el equipo curricular retienen la autoridad final.

---

## Capas y Flujo del Sistema

1. **Adquisición territorial:** El agente `AING` captura y normaliza las narrativas locales.
2. **Control normativo:** Los agentes `AGOV`, `ASUP`, `AFAIR` y `ASYNC` aplican compuertas de consentimiento, revisión, persistencia local y sincronización.
3. **Interpretación netnográfica:** Los agentes `AETHNO`, `ACODE` y `AMIND` reconstruyen la hipótesis de modelo mental en base a un codebook semilla y LLM local.
4. **Apoyo pedagógico-curricular:** Los agentes `APLAN` y `AEXPL` proponen rutas pedagógicas y explicaciones estructuradas.

### Contrato entre agentes

No hay conversación libre entre agentes. El flujo usa eventos tipados, memorias separadas y compuertas deterministas:

```text
relato consentido -> AGOV -> AING -> AETHNO -> ACODE -> AMIND -> AFAIR -> APLAN -> AEXPL -> ASUP/ASYNC
```

---

## Memorias

| Memoria | Implementación | Control |
|---|---|---|
| **M_raw** | Tabla `events` | Cifrado local opcional, tombstones de revocación, política de retención. |
| **M_sem** | Tabla `normalized_segments` y códigos | Evidencia permitida, mapeo de codebook, cálculo de incertidumbre. |
| **M_graph** | Tabla `mental_models` versionados | Grafo causal y vectorial, revisión por contradicción. |
| **M_policy** | Ajustes y revocaciones físicas | Controlado por `AGOV` y el Auditor. |
| **M_audit** | Tabla `audit` (hash-chain) | Registro inmutable de solo adición (append-only). |
| **M_curr** | Tabla `routes` y revisiones de planes | Aprobación humana obligatoria del equipo curricular. |

---

## Qué quedó implementado

- Eventos tipados `EventEnvelope` con consentimiento granular, proveniencia, incertidumbre, versión y hash de contenido.
- Agentes deterministas y auditables: `AGOV` (gobernanza), `ASUP` (supervisión), `AFAIR` (equidad) y `ASYNC` (sincronización).
- Adaptadores encapsulados para LLM: `AETHNO`, `ACODE` y `AEXPL` con cliente local Ollama (vía HTTP) o Stub para desarrollo.
- Memorias desacopladas y estructuradas (`M_raw`, `M_sem`, `M_graph`, `M_policy`, `M_audit`, `M_curr`) en SQLite.
- Bitácora inmutable con hash-chain, deltas firmados digitalmente (HMAC) y tombstones para revocación del derecho al olvido.
- Modelo mental estructurado $M_i = (G_i, v_i, \ell_i, q_i)$ que captura relaciones causales, valores, nivel de alfabetización digital e incertidumbre.
- Algoritmo de agrupamiento comunitario mediante distancia híbrida (grafo + valores + vector de alfabetización) para generación de segmentos.
- Planificador pedagógico determinista con trazas completas de necesidad-competencia-módulo-mediación-actividad-evaluación.
- API FastAPI, CLI Typer para administración del sistema, datos semilla y suite de pruebas automatizadas.

---

## Estado Epistemológico

| Capa | Estado | Nota |
|---|---|---|
| Eventos, consentimiento, auditoría, cola offline | Implementado | Núcleo determinista listo para MVP técnico. |
| Cifrado local | Implementado opcional | Requiere `alfabetia_FERNET_KEY`; sin llave opera en modo desarrollo. |
| Codificación cualitativa | Heurística + LLM opcional | Debe calibrarse con codebook co-diseñado e intercodificación humana. |
| Modelo mental y grafos | Hipótesis computacional | No debe tratarse como diagnóstico psicológico ni evidencia primaria. |
| Agrupamiento | Heurístico transparente | Requiere análisis de sensibilidad y validación participativa. |
| Rutas pedagógicas | Borradores revisables | Cualquier modificación de `M_curr` requiere aprobación humana obligatoria. |
| Evidencia empírica | Pendiente | El piloto longitudinal debe medir aprendizaje, confianza, gobernanza y validez ecológica. |

---

## Instalación y Configuración

```bash
python -m venv .venv
source .venv/bin/activate
pip install -e ".[dev,ollama]"
```

### Configuración de Ollama Local

```bash
ollama serve
ollama pull qwen3:8b
export alfabetia_LLM_PROVIDER=ollama
export alfabetia_OLLAMA_MODEL=qwen3:8b
export alfabetia_OLLAMA_BASE_URL=http://localhost:11434
```

Para demostraciones y pruebas rápidas sin invocar modelos generativos reales:
```bash
export alfabetia_FORCE_STUB_LLM=1
```

### Seguridad y Llaves Locales

```bash
# Generar llave Fernet para cifrado local
AlfabetIA gen-key
export alfabetia_FERNET_KEY="<llave-generada>"
export alfabetia_AUDIT_SECRET="<secreto-para-firmas-hmac>"
```

---

## Uso del CLI

```bash
# Inicializar Base de Datos SQLite
AlfabetIA init-db

# Cargar datos semilla
AlfabetIA seed

# Ejecutar demostración de arranque en frío
AlfabetIA demo-cold-start --output examples/cold_start_output.json

# Inspeccionar estado de la base de datos
AlfabetIA inspect

# Iniciar servidor API FastAPI
AlfabetIA run-api --host 127.0.0.1 --port 8000
```

### Endpoints principales de la API:

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| `GET` | `/health` | Estado del sistema y proveedor LLM activo |
| `GET` | `/agents/status` | Estado de observabilidad de los 10 agentes |
| `GET` | `/dashboard/summary` | Métricas consolidadas del sistema |
| `POST` | `/events` | Ingestar relato con consentimiento granular |
| `POST` | `/participants/{pid}/chat` | Turno de chat etnográfico |
| `GET` | `/participants/{pid}/chat/history` | Historial de conversación |
| `GET` | `/participants` | Listar participantes con modelo mental activo |
| `GET` | `/participants/{pid}/mental-model` | Modelo mental actual del participante |
| `GET` | `/participants/{pid}/route` | Ruta de aprendizaje propuesta |
| `POST` | `/participants/{pid}/route/generate` | Generar propuesta de ruta pedagógica evaluando riesgos |
| `POST` | `/participants/{pid}/revoke` | Revocación de consentimiento (parcial o total) |
| `GET` | `/participants/consents` | Listar todos los consentimientos |
| `GET` | `/segments` | Segmentos comunitarios calculados |
| `POST` | `/segments/recalculate` | Recalcular agrupamiento comunitario |
| `GET` | `/reviews` | Cola de revisiones pedagógicas pendientes |
| `POST` | `/reviews/{review_id}/approve` | Aprobar revisión humana |
| `POST` | `/reviews/{review_id}/reject` | Rechazar revisión humana |
| `GET` | `/audit` | Bitácora hash-chain inmutable |
| `GET` | `/deltas` | Deltas pendientes para sincronización offline |
| `POST` | `/demo/cold-start` | Ejecutar demostración de arranque en frío |

---

## Estructura del Proyecto

```text
src/alfabetia_rural/
  agents/        # AGOV, ASUP, AING, AETHNO, ACODE, AMIND, AFAIR, APLAN, AEXPL, ASYNC
  api/           # FastAPI
  domain/        # Contratos Pydantic, modelos y enums de dominio
  llm/           # Adaptadores y clientes LLM (Stub, Ollama, LangChain opcional)
  services/      # Servicios de orquestación, agrupamiento y cold-start
  storage/       # SQLite, cifrado Fernet, auditoría hash-chain y revocaciones
  utils/         # Hashing y cálculo de distancias híbridas de grafos

data/            # L0, C0 y Pi0 semilla (YAMLs)
docs/            # Auditoría, roadmap, validación, seguridad y configuración
tests/           # Suite de pruebas unitarias y de integración
examples/        # Archivos de ejemplo generados (cold-start)
```

---

## Decisión de diseño sobre LangChain/LangGraph

LangChain, LangGraph y `langchain-ollama` están declarados como dependencias de extras opcionales para pruebas de laboratorio. El núcleo de AlfabetIA Rural permanece escrito en Python y Pydantic explícito porque la gestión de consentimiento, auditorías inmutables, revocación física y reconciliación offline son lógica de negocio crítica del dominio que no debe delegarse en la magia o caja negra de frameworks agentic.
