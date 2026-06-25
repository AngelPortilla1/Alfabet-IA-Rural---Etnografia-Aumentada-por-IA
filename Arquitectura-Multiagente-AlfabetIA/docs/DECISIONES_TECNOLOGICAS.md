# Decisiones tecnológicas

## Decisión principal

El backbone es Python explícito, no LangGraph/LangChain. La razón es metodológica y de seguridad: consentimiento, revocación, auditoría, sincronización offline y aprobación curricular son invariantes del dominio, no efectos secundarios de un framework agentic.

## Stack

- Python 3.11+.
- Pydantic v2 para contratos.
- FastAPI para API.
- Typer para CLI.
- SQLite para persistencia local controlada.
- NetworkX/distancias propias para grafos.
- Cryptography/Fernet para cifrado local opcional.
- HTTPX para Ollama local.
- LangChain/LangGraph solo como extras opcionales de laboratorio.

## Agente por agente

| Agente | Naturaleza | Tecnología |
|---|---|---|
| AGOV | normativa determinista | reglas Python + Pydantic |
| ASUP | supervisión determinista | revisiones explícitas |
| AING | adquisición | normalización local |
| AETHNO | interpretativo asistido | Ollama o Stub |
| ACODE | cualitativo asistido | heurística + Ollama opcional |
| AMIND | analítico | grafos Pydantic |
| AFAIR | riesgo/equidad | reglas auditables |
| APLAN | pedagógico | scoring determinista sobre L0 |
| AEXPL | explicación | plantilla + Ollama opcional |
| ASYNC | offline-first | SQLite + hashes + HMAC |

## Uso de LangChain/LangGraph

Aceptable para:

- structured output experimental;
- comparación de orquestadores;
- pruebas de checkpoints;
- prototipos que no modifiquen el núcleo.

No aceptable para:

- gobernanza de consentimiento;
- revocación;
- auditoría;
- aprobación curricular;
- verdad del modelo mental.
