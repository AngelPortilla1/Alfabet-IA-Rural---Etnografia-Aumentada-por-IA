# Rediseño incremental y hoja de ruta

## MVP 1 — Núcleo normativo y captura

**Objetivo:** no perder eventos, no procesar sin consentimiento, dejar trazabilidad.

Implementado:
- eventos tipados;
- consentimiento granular;
- SQLite local;
- bitácora hash-chain;
- revocación/tombstone;
- cola de deltas.

Criterio de avance:
- 100% de eventos con estado de consentimiento;
- pruebas de revocación pasan;
- auditoría reconstruible por hash-chain.

## MVP 2 — Codificación asistida y revisión humana

**Objetivo:** ayudar al facilitador sin reemplazar interpretación cualitativa.

Implementado:
- codebook semilla `C0-2026-05` con 9 códigos: 6 base + 3 regionales
  (`digital_distrust`, `empirical_knowledge`, `connectivity_barrier`);
- códigos heurísticos por keywords;
- sugerencias LLM opcionales vía Ollama (`allow_llm_coding: true` en policies);
- revisión si confianza < `code_review_confidence_threshold` (0.50) o LLM interviene;
- integración de códigos regionales en AMIND (`_code_spec`) y APLAN (`TAG_MAP`).

Pendiente:
- protocolo intercoder;
- tablero de correcciones;
- métricas kappa/alpha o acuerdo cualitativo justificado;
- validación participativa del codebook con comunidades del nororiente.

## MVP 3 — Modelo mental y equidad

**Objetivo:** construir `Mi=(Gi,vi,li,qi)` como hipótesis revisable.

Implementado:
- nodos/aristas, polaridad, peso, evidencia directa/inferida;
- incertidumbre por fuente;
- contradicciones;
- AFAIR con baja densidad, canal y riesgo;
- specs de modelo mental para los 3 códigos regionales en AMIND.

Deuda técnica conocida:
- `_base_literacy` solo inicializa C1-C6 en proporciones iguales (1/6);
  C7 se agrega dinámicamente solo si `digital_distrust` está presente,
  pero la normalización `_normalize_composition` solo garantiza C1-C6 como base;
  esto puede producir composiciones con C7 no normalizado uniformemente.

Pendiente:
- calibración experta de pesos de aristas;
- devolución participativa de grafos;
- estrés con narrativas contradictorias reales;
- inicializar C7 en `_base_literacy` cuando se detecten participantes en contextos
  de desconfianza digital.

## MVP 4 — Planeación pedagógica y `M_curr`

**Objetivo:** producir rutas y briefs revisables.

Implementado:
- L0 robustecido;
- rutas de arranque, adaptadas y de segmento;
- traza necesidad-competencia-módulo-mediación-actividad-evaluación;
- revisión humana obligatoria para `M_curr`.

Pendiente:
- editor de briefs curriculares;
- rúbricas co-diseñadas;
- comparación de decisión algorítmica vs decisión final humana.

## Piloto longitudinal

Duración sugerida: 6-8 semanas.

Medición:
- pre/post de alfabetización crítica en IA;
- cambios en modelos mentales;
- comprensión de explicaciones;
- confianza y gobernanza de datos;
- carga del facilitador;
- cobertura por canal y subgrupo consentido;
- trazabilidad de decisiones curriculares.

## Endurecimiento para despliegue

Requerido antes de producción:
- cifrado obligatorio;
- rotación de llaves;
- RBAC real;
- respaldo cifrado;
- borrado físico verificable;
- auditoría externa;
- empaquetado Docker/edge;
- pruebas de sincronización con latencia y conflictos.
