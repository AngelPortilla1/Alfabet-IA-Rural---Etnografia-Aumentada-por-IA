# Arquitectura implementada

## Tesis operacional

AlfabetIA Rural es un sistema de apoyo decisional human-in-the-loop. El sistema sugiere, organiza, alerta y documenta; comunidad, facilitador, auditor y equipo curricular retienen autoridad final.

## Capas

1. **Adquisición territorial:** AING captura y normaliza narrativas.
2. **Control normativo:** AGOV, ASUP, AFAIR y ASYNC aplican compuertas, revisión, persistencia y sincronización.
3. **Interpretación netnográfica:** AETHNO, ACODE y AMIND reconstruyen hipótesis de modelo mental.
4. **Apoyo pedagógico-curricular:** APLAN y AEXPL proponen rutas y explicaciones.

## Contrato entre agentes

No hay conversación libre entre agentes. El flujo usa eventos tipados, memorias separadas y compuertas:

```text
relato consentido -> AGOV -> AING -> AETHNO -> ACODE -> AMIND -> AFAIR -> APLAN -> AEXPL -> ASUP/ASYNC
```

## Memorias

| Memoria | Implementación | Control |
|---|---|---|
| M_raw | `events` | cifrado opcional, tombstone, retención |
| M_sem | `normalized_segments`, códigos en auditoría | evidencia permitida, incertidumbre |
| M_graph | `mental_models` versionados | revisión por contradicción |
| M_policy | settings + revocations | AGOV/auditor |
| M_audit | `audit` hash-chain | append-only lógico |
| M_curr | `routes` y reviews | aprobación humana obligatoria |

## Revisión humana

Toda ruta candidata abre review `M_CURR`. Los estados de revisión no son decorativos: sin aprobación humana, las rutas permanecen como borradores revisables.

## Observabilidad

El servicio `ObservabilityService` (en `services/observability.py`) es transversal al pipeline.
Cada agente reporta `report_start` y `report_end` con su estado (`IDLE`, `WORKING`,
`WAITING_REVIEW`, `ERROR`). El estado del sistema se expone en `/agents/status`.

## API — Endpoints disponibles

| Método | Ruta | Descripción |
|---|---|---|
| GET | `/health` | Estado del servicio y proveedor LLM activo |
| GET | `/agents/status` | Estado de todos los agentes en tiempo real |
| GET | `/dashboard/summary` | Resumen de métricas para el dashboard principal |
| POST | `/events` | Ingestar un evento (`EventEnvelope`) para procesar |
| POST | `/participants/{pid}/chat` | Turno de chat etnográfico |
| GET | `/participants/{pid}/chat/history` | Historial de conversación del participante |
| GET | `/participants` | Listar participantes con modelo mental activo |
| GET | `/participants/{pid}/mental-model` | Modelo mental de un participante |
| GET | `/participants/{pid}/route` | Última ruta propuesta para un participante |
| POST | `/participants/{pid}/route/generate` | Generar propuesta de ruta pedagógica a partir del modelo mental |
| POST | `/participants/{pid}/revoke` | Revocar consentimiento (total o por alcance) |
| GET | `/participants/consents` | Listar consentimientos de todos los participantes |
| GET | `/segments` | Listar segmentos generados |
| POST | `/segments/recalculate` | Recalcular agrupamiento comunitario |
| GET | `/reviews` | Listar revisiones pendientes (filtrable por estado) |
| POST | `/reviews/{id}/approve` | Aprobar una revisión humana |
| POST | `/reviews/{id}/reject` | Rechazar una revisión humana |
| GET | `/audit` | Listar registros de auditoría |
| GET | `/deltas` | Listar deltas offline pendientes |
| POST | `/demo/cold-start` | Ejecutar cold-start sintético (admite `?use_stub=true`) |

CORS está habilitado para `http://localhost:5173` y `http://127.0.0.1:5173` (frontend Angular/Vite).

## Cold Start sintético

El cold start (`services/cold_start.py`) ejecuta 5 eventos sintéticos predefinidos,
agrupa los modelos mentales resultantes y genera rutas de segmento. Está diseñado
para validar el pipeline completo sin datos reales y para arrancar con datos de
anclaje antes del piloto. Ver `docs/CODEBOOK_Y_CURRICULUM.md` para los detalles
de los YAMLs que alimentan el pipeline.
