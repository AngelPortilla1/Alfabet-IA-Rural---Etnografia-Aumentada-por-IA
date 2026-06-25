# Codebook semilla, currículo L0 y políticas — Referencia completa

> **Estado metodológico:** semilla de co-diseño. Todos los archivos son puntos de partida
> que **deben validarse con las comunidades y el equipo curricular** antes de cualquier
> uso formativo real.

---

## 1. Codebook semilla — `data/codebook_seed.yaml`

**Versión:** `C0-2026-05`

El codebook define los códigos que ACODE puede asignar heurísticamente o sugerir vía LLM.
Cada código incluye: `code` (ID), `label`, `keywords` (lista de tokens en español en
minúsculas para coincidencia), y `description` (semántica del constructo).

### 1.1 Códigos base (universales)

| Código | Label | Dominio L0 | Descripción |
|---|---|---|---|
| `basic_concepts` | Conceptos básicos de IA y datos | C1 | Necesidad de aclarar IA, dato, modelo, automatización y recomendación. |
| `data_governance` | Datos, consentimiento y gobernanza | C2 | Preocupación por control, permisos, uso secundario o sensibilidad de datos productivos. |
| `ai_recommendations` | Recomendaciones de IA | C3 | Interés o cautela frente a recomendaciones algorítmicas en decisiones productivas. |
| `human_review` | Revisión humana y mediación | C4 | Preferencia por decisión humano-en-el-bucle, asesoría técnica o mediación comunitaria. |
| `bias_fairness` | Sesgo, cobertura y daño | C5 | Preocupación por daño, discriminación, subrepresentación, brechas de canal o conectividad. |
| `experimentation` | Prueba segura y reversible | C6 | Disposición a ensayar de manera gradual, documentada y reversible. |

### 1.2 Códigos regionales (Nororiente — incorporados en `C0-2026-05`)

Estos tres códigos fueron añadidos tras trabajo de campo en la región nororiente. Activan
compuertas o modelos mentales específicos y requieren módulos propios en L0.

| Código | Label | Dominio L0 | Descripción |
|---|---|---|---|
| `digital_distrust` | Desconfianza en sistemas digitales | C7 | Desconfianza por experiencias previas con fraudes o fallas de red en zonas rurales. Activa compuerta de gobernanza. |
| `empirical_knowledge` | Saberes productivos empíricos | C3 | Reconocimiento del conocimiento tradicional como base para la alfabetización. No requiere revisión humana obligatoria. |
| `connectivity_barrier` | Barrera de conectividad o acceso | C1 | Limitaciones físicas de infraestructura que obligan a rutas offline. Alerta al orquestador. Requiere revisión humana. |

**Nota sobre `digital_distrust`:** en AMIND genera el `mental_model_shift`
`increase_privacy_concern` y sube `privacy_concern` (+0.42) y `governance_need` (+0.25).
Activa el módulo `MOD-C7-NS-01`.

**Nota sobre `connectivity_barrier`:** en AMIND fuerza `offline_urgency` (+0.50) con
polaridad negativa (−1), lo que indica que la conectividad *bloquea* el acceso. El
planificador (APLAN) lo mapea al dominio C1 con actividad de simulación offline.

---

## 2. Currículo L0 — `data/l0_curriculum.yaml`

**Versión:** `L0-2026-04`

### 2.1 Dominios de competencia

| Dominio | Descripción |
|---|---|
| C1 | Comprensión conceptual de IA, automatización, dato, modelo y recomendación |
| C2 | Datos, consentimiento, derechos, usos secundarios y gobernanza comunitaria |
| C3 | Interpretación crítica de recomendaciones algorítmicas |
| C4 | Decisión humano-en-el-bucle en contextos productivos |
| C5 | Sesgo, equidad, cobertura y justicia de datos |
| C6 | Experimentación local segura con herramientas digitales |
| **C7** | **Desconfianza, seguridad y soberanía tecnológica rural** *(dominio regional añadido)* |

> C7 se introdujo en la versión `L0-2026-04` para dar soporte curricular al código regional
> `digital_distrust`. El perfil composicional de alfabetización en AMIND (`_base_literacy`)
> **inicializa los 7 dominios (C1–C7) con fracción igual (1/7)** de manera estándar.
> La normalización en `_normalize_composition` garantiza que los 7 dominios se mantengan
> consistentes y balanceados cuando se aplican actualizaciones dinámicas sobre el modelo mental.


### 2.2 Rutas de arranque (`startup_routes`)

Cuando un participante tiene revisión ≤ 1 y no hay `segment_id`, APLAN produce una ruta
de tipo `startup`. El L0 define tres rutas predefinidas:

| Ruta | Tags asociados | Cuándo aplicar |
|---|---|---|
| `A_normative` | `data_governance`, `basic_concepts`, `human_review` | Domina preocupación normativa, consentimiento o soberanía informacional |
| `B_productive_cautious` | `basic_concepts`, `ai_recommendations`, `human_review` | Hay utilidad productiva con cautela y necesidad de contraste técnico |
| `C_experimentation` | `bias_fairness`, `experimentation`, `human_review` | Grupo listo para probar con salvaguardas y evaluación de daño |

> **Importante:** estas rutas de arranque son *etiquetas orientadoras* para el equipo
> curricular. APLAN no lee directamente `startup_routes` del YAML; usa `_tags_for_model`
> para derivar los tags activos y selecciona módulos de `modules`. El YAML documenta la
> intención de diseño, no el algoritmo de selección.

### 2.3 Módulos curriculares

| ID | Título | Dominio | Tags | Audio | Duración |
|---|---|---|---|---|---|
| MOD-C1-01 | IA, dato, modelo y recomendación en agricultura | C1 | `basic_concepts` | ✓ | 30 min |
| MOD-C2-01 | Datos, consentimiento y derechos | C2 | `data_governance` | ✓ | 35 min |
| MOD-C2-02 | Gobernanza comunitaria de datos productivos | C2 | `data_governance` | ✗ | 50 min |
| MOD-C3-01 | Cómo leer críticamente una recomendación de IA | C3 | `ai_recommendations` | ✓ | 40 min |
| MOD-C4-01 | Cuándo aceptar, revisar o rechazar una recomendación | C4 | `human_review`, `ai_recommendations` | ✓ | 45 min |
| MOD-C5-01 | Sesgo, cobertura y daño potencial | C5 | `bias_fairness` | ✗ | 40 min |
| MOD-C6-01 | Experimentos pequeños y reversibles en campo | C6 | `experimentation` | ✓ | 45 min |
| **MOD-C7-NS-01** | **Por qué desconfío — Toma de decisiones y seguridad** | **C7** | `digital_distrust`, `data_governance` | ✓ | 35 min |

> `MOD-C7-NS-01` es el único módulo que cubre C7. Su sufijo `-NS-` indica origen en
> trabajo de campo del Nororiente (Norte de Santander). La mediación es conversación
> facilitada con casos de la vereda; el assessment requiere que el participante exprese
> una duda legítima y reconozca su derecho a no usar la herramienta.

---

## 3. Políticas — `data/policies_seed.yaml`

**Versión:** `Pi0-2026-04`

Todos los umbrales deben calibrarse durante el piloto. Los valores actuales son heurísticos.

| Parámetro | Valor | Usado por | Descripción |
|---|---|---|---|
| `review_uncertainty_threshold` | 0.55 | AING | Incertidumbre de transcripción/normalización que abre revisión |
| `uncertainty_review_threshold` | 0.60 | AGOV | Umbral general de incertidumbre para exigir revisión |
| `code_review_confidence_threshold` | 0.50 | ACODE | Confianza mínima de un código para no requerir revisión humana |
| `model_confidence_review_threshold` | 0.55 | AMIND | Confianza del modelo mental para disparar revisión |
| `fairness_channel_min_fraction` | 0.10 | AFAIR | Fracción mínima de un canal para no activar alerta de subrepresentación |
| `fairness_concern_threshold` | 0.55 | AFAIR | Nivel de `fairness_concern` para emitir alerta |
| `fairness_review_threshold` | 0.35 | AFAIR | Nivel de riesgo para abrir revisión (sin bloqueo) |
| `fairness_block_threshold` | 0.80 | AFAIR | Nivel de riesgo para bloquear la ruta |
| `minimum_models_for_segment_planning` | 3 | Orquestador / Cold Start | Modelos mentales mínimos para producir rutas de segmento |
| `route_score_review_threshold` | 0.45 | APLAN | Score mínimo de ruta para no marcar revisión automática |
| `allow_secondary_use_default` | `false` | AGOV | Por defecto, uso secundario de datos está desactivado |
| `allow_llm_coding` | `true` | ACODE | Habilita sugerencias LLM en ACODE (solo si el proveedor no es `stub`) |
| `m_curr_requires_human_approval` | `true` | ASUP / Orquestador | Toda ruta que modifica M_curr **siempre** abre revisión curricular |
| `raw_retention_days_default` | 365 | ASYNC | Días de retención por defecto para eventos crudos |
| `export_requires_auditor_approval` | `true` | ASYNC / API | Las exportaciones requieren aprobación de auditor |

---

## 4. Relación entre YAMLs, agentes y memoria

```
codebook_seed.yaml ──► ACODE (heurística de keywords)
                   ──► ACODE._llm_suggestions (allowed_codes)
                   ──► AMIND._code_spec (specs por código)

l0_curriculum.yaml ──► APLAN.propose_route (selección de módulos)
                   ──► APLAN._choose_module (scoring audio/duración)
                   ──► APLAN._tags_for_model (tags → módulos)

policies_seed.yaml ──► AGOV (umbrales de consentimiento)
                   ──► ACODE (code_review_confidence_threshold)
                   ──► AFAIR (todos los umbrales fairness_*)
                   ──► APLAN (route_score_review_threshold)
                   ──► ASYNC (raw_retention_days_default)
```

Los tres YAMLs se cargan en `bootstrap.py` mediante `load_yaml`. Si existe
configuración almacenada en SQLite (`store.get_setting`), esa configuración tiene
precedencia sobre el archivo en disco, lo que permite actualizaciones en caliente
sin reiniciar el servicio.
