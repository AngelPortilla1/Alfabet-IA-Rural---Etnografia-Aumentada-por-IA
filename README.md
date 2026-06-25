# AlfabetIA Rural — Prototipo de Arquitectura Multiagente para Alfabetización Digital Rural

> **Trabajo de Grado** · Ingeniería de Sistemas · Versión 4 — Arquitectura Prototipo  
> Autor: Angel Fuhrer · Universidad · 2026

---

## 📌 Descripción General

**AlfabetIA Rural** es un sistema de apoyo decisional *human-in-the-loop* que transforma narrativas orales y escritas de comunidades rurales en:

- **Modelos mentales** estructurados del perfil de alfabetización digital de cada participante
- **Segmentos comunitarios** agrupados por similitud pedagógica
- **Rutas de aprendizaje** personalizadas y revisables por el equipo curricular
- **Briefs curriculares** trazables con aprobación humana obligatoria

El sistema está fundamentado en principios de **soberanía de datos**, **consentimiento informado granular**, **auditoría inmutable** y **gobernanza offline-first**. Los modelos de lenguaje (LLM) son encapsulados como adaptadores periféricos; el núcleo determinista retiene el control del dominio.

```
relato consentido → AGOV → AING → AETHNO → ACODE → AMIND → AFAIR → APLAN → AEXPL → ASUP/ASYNC
```

---

## 🗂️ Estructura del Repositorio

```text
ProyectoAgentesEtnografia/
├── Arquitectura-Multiagente-AlfabetIA/   # Backend Python — núcleo multiagente
│   ├── src/alfabetia_rural/
│   │   ├── agents/       # 10 agentes deterministas especializados
│   │   ├── api/          # FastAPI — 20+ endpoints REST
│   │   ├── domain/       # Contratos Pydantic, enums y modelos de dominio
│   │   ├── llm/          # Adaptadores LLM (Stub, Ollama, LangChain opcional)
│   │   ├── services/     # Orquestador, agrupamiento, cold-start, observabilidad
│   │   ├── storage/      # SQLite + Fernet + auditoría hash-chain + revocaciones
│   │   └── utils/        # Hashing, distancias híbridas de grafos
│   ├── data/             # Datos semilla YAML (L0, C0, Pi0)
│   ├── docs/             # Documentación técnica, roadmap, seguridad, validación
│   ├── tests/            # Suite de pruebas (10 archivos de test)
│   └── pyproject.toml    # Configuración del paquete Python (v0.3.0)
│
├── fronted-alfabetia/                    # Frontend React — interfaz web
│   ├── src/
│   │   ├── pages/        # 14 páginas (P0 Home … P7 Auditoría + Chat + Dashboard)
│   │   ├── components/   # Componentes reutilizables (Header, Layout, Agentes)
│   │   ├── hooks/        # Custom hooks de estado y API
│   │   └── api/          # Cliente HTTP al backend
│   └── package.json      # Dependencias Node.js
│
└── runtime/                              # Base de datos SQLite activa
    └── alfabetia_rural.db
```

---

## 🤖 Agentes del Sistema

| Agente | Nombre completo | Rol |
|--------|----------------|-----|
| `AGOV` | `GovernanceAgent` | Compuerta de gobernanza y consentimiento |
| `AING` | `IngestionAgent` | Captura y normalización de narrativas |
| `AETHNO` | `EthnographyAgent` | Análisis etnográfico asistido por LLM |
| `ACODE` | `CodingAgent` | Codificación cualitativa con codebook semilla |
| `AMIND` | `MentalModelAgent` | Construcción del modelo mental $M_i = (G_i, v_i, \ell_i, q_i)$ |
| `AFAIR` | `FairnessRiskAgent` | Evaluación de riesgos y equidad |
| `APLAN` | `PlanningAgent` | Propuesta de ruta pedagógica determinista |
| `AEXPL` | `ExplanationAgent` | Justificaciones estructuradas (LLM) |
| `ASUP` | `SupervisorAgent` | Supervisión y apertura de revisiones curriculares |
| `ASYNC` | `AsyncSyncAgent` | Cola offline y sincronización de deltas |

---

## 🧠 Memorias del Sistema

| Memoria | Tabla SQLite | Descripción |
|---------|-------------|-------------|
| **M_raw** | `events` | Eventos crudos con tombstones de revocación y política de retención |
| **M_sem** | `normalized_segments` | Códigos cualitativos y evidencia permitida |
| **M_graph** | `mental_models` | Grafos causales versionados con revisión por contradicción |
| **M_policy** | `revocations` | Ajustes y revocaciones físicas controladas por AGOV |
| **M_audit** | `audit` | Bitácora hash-chain inmutable (append-only + HMAC) |
| **M_curr** | `routes` / `reviews` | Rutas pedagógicas con aprobación humana obligatoria |

---

## ✅ Qué está Implementado

### Backend (`Arquitectura-Multiagente-AlfabetIA`)

- ✅ **Eventos tipados** `EventEnvelope` con consentimiento granular, proveniencia, incertidumbre, versión y hash de contenido
- ✅ **10 agentes deterministas** y auditables orquestados por flujo explícito de eventos
- ✅ **Adaptadores LLM encapsulados** — Ollama (HTTP local) y Stub de desarrollo; LangChain/LangGraph como extras opcionales
- ✅ **Memorias desacopladas** (`M_raw`, `M_sem`, `M_graph`, `M_policy`, `M_audit`, `M_curr`) en SQLite
- ✅ **Bitácora hash-chain** con deltas firmados HMAC y tombstones para el derecho al olvido
- ✅ **Modelo mental** $M_i = (G_i, v_i, \ell_i, q_i)$ — relaciones causales, valores, nivel de alfabetización e incertidumbre
- ✅ **Agrupamiento comunitario** por distancia híbrida (grafo + valores + vector de alfabetización)
- ✅ **Planificador pedagógico** determinista con trazas necesidad→competencia→módulo→mediación→actividad→evaluación
- ✅ **API FastAPI** con 20+ endpoints REST y CORS configurado para el frontend
- ✅ **CLI Typer** (`alfabetia`) para administración del sistema
- ✅ **Datos semilla** YAML (L0 — codebook regional, C0 — currículo base, Pi0 — participantes semilla)
- ✅ **Suite de pruebas** con 10 archivos de test (consentimiento, auditoría, chat, segmentos, revocación, etc.)
- ✅ **Chat etnográfico** multi-turno con recopilación de consentimiento integrada
- ✅ **Cifrado local Fernet** opcional para datos sensibles

### Frontend (`fronted-alfabetia`)

- ✅ **Dashboard de Resumen** — métricas clave del sistema (P_DashboardResumen)
- ✅ **Gestión de Consentimiento** — recopilación y auditoría granular (P_GestionConsentimiento)
- ✅ **Registro de Relatos** — captura de narrativas con metadatos de proveniencia (P1_RegistrarRelato)
- ✅ **Chat Etnográfico** — interfaz conversacional multi-turno con agente (P_ChatEtnografico)
- ✅ **Modelo Mental** — visualización interactiva de redes conceptuales con force-graph (P2_ModeloMental)
- ✅ **Análisis de Modelos Mentales** — comparativa comunitaria (MentalModelsAnalysis)
- ✅ **Rutas Pedagógicas** — planificación y trayectorias de aprendizaje (P3_RutaPedagogica)
- ✅ **Cola de Revisiones** — aprobación/rechazo humano de decisiones (P4_ColadeRevisiones)
- ✅ **Segmentos Comunitarios** — agrupamiento y análisis de poblaciones (P5_Segmentos)
- ✅ **Aprobación Curricular** — revisión formal del equipo curricular (P6_AprobacionCurricular)
- ✅ **Auditoría Arquitectónica** — trazabilidad hash-chain (P7_Auditoria)
- ✅ **Documentación interna** — referencia técnica integrada en el sistema (P_Documentacion)

---

## 🚀 Inicio Rápido

### Prerrequisitos

- Python ≥ 3.11
- Node.js ≥ 16
- [Ollama](https://ollama.com/) (opcional — para LLM local real)

### 1. Backend

```bash
cd Arquitectura-Multiagente-AlfabetIA

# Crear entorno virtual e instalar
python -m venv .venv
.venv\Scripts\activate          # Windows
# source .venv/bin/activate     # Linux/macOS

pip install -e ".[dev,ollama]"

# Copiar y editar variables de entorno
copy .env.example .env

# Inicializar la base de datos
alfabetia init-db

# Cargar datos semilla (codebook, currículo, participantes)
alfabetia seed

# Arrancar el servidor API (puerto 8000)
alfabetia run-api
```

**Alternativa rápida con Stub LLM** (sin necesidad de Ollama):
```bash
# En .env o como variable de entorno:
set alfabetia_FORCE_STUB_LLM=1
alfabetia run-api
```

### 2. LLM Local con Ollama (opcional)

```bash
ollama serve
ollama pull qwen3:8b

# Variables de entorno
set alfabetia_LLM_PROVIDER=ollama
set alfabetia_OLLAMA_MODEL=qwen3:8b
set alfabetia_OLLAMA_BASE_URL=http://localhost:11434
```

### 3. Frontend

```bash
cd fronted-alfabetia
npm install
npm run dev
# → http://localhost:5173
```

---

## 🔑 Configuración y Variables de Entorno

Las variables se configuran en `Arquitectura-Multiagente-AlfabetIA/.env`:

| Variable | Descripción | Ejemplo |
|---------|-------------|---------|
| `alfabetia_LLM_PROVIDER` | Proveedor LLM (`stub` / `ollama`) | `stub` |
| `alfabetia_OLLAMA_MODEL` | Modelo Ollama a usar | `qwen3:8b` |
| `alfabetia_OLLAMA_BASE_URL` | URL del servidor Ollama | `http://localhost:11434` |
| `alfabetia_FERNET_KEY` | Llave de cifrado local (opcional) | `<base64>` |
| `alfabetia_AUDIT_SECRET` | Secreto para firmas HMAC | `<secreto>` |
| `alfabetia_FORCE_STUB_LLM` | Forzar Stub para pruebas | `1` |
| `VITE_API_BASE` | URL del backend (frontend) | `http://localhost:8000` |

**Generar llave de cifrado:**
```bash
alfabetia gen-key
```

---

## 🌐 API REST — Endpoints Principales

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
| `POST` | `/reviews/{id}/approve` | Aprobar revisión humana |
| `POST` | `/reviews/{id}/reject` | Rechazar revisión humana |
| `GET` | `/audit` | Bitácora hash-chain inmutable |
| `GET` | `/deltas` | Deltas pendientes para sincronización offline |
| `POST` | `/demo/cold-start` | Ejecutar demostración de arranque en frío |

Documentación interactiva disponible en: **`http://localhost:8000/docs`**

---

## 🧪 Pruebas

```bash
cd Arquitectura-Multiagente-AlfabetIA
pytest
```

| Archivo de Test | Qué valida |
|----------------|-----------|
| `test_consent.py` | Consentimiento granular y revocación |
| `test_ethnographic_chat.py` | Flujo de chat multi-turno |
| `test_grouping.py` | Algoritmo de agrupamiento comunitario |
| `test_orchestrator.py` | Orquestador de agentes |
| `test_planner.py` | Planificador pedagógico determinista |
| `test_regional_codes.py` | Codificación cualitativa regional |
| `test_revocation_audit.py` | Auditoría de revocaciones y hash-chain |
| `test_security_audit.py` | Integridad de la bitácora de seguridad |
| `test_segment_recalculation.py` | Recalculation de segmentos comunitarios |

---

## 🛠️ Stack Tecnológico

### Backend
| Capa | Tecnología | Versión |
|------|-----------|---------|
| Lenguaje | Python | ≥ 3.11 |
| API | FastAPI + Uvicorn | 0.136.x |
| Modelos de datos | Pydantic v2 | ≥ 2.12 |
| CLI | Typer | 0.24.x |
| Persistencia | SQLite (stdlib) | — |
| Cifrado | cryptography (Fernet) | 46.x |
| Grafos | NetworkX | 3.6.x |
| HTTP client | httpx | 0.28.x |
| LLM local | Ollama | 0.6.x |
| LLM orquestación (opcional) | LangChain + LangGraph | extras |
| Linting | Ruff | 0.15.x |
| Tipos | mypy (strict) | 1.20.x |
| Tests | pytest | 9.x |

### Frontend
| Capa | Tecnología | Versión |
|------|-----------|---------|
| UI | React | 19.x |
| Bundler | Vite | 8.x |
| Enrutamiento | React Router | 7.x |
| Estilos | Tailwind CSS | 4.x |
| Grafos visuales | React Force Graph 2D | 1.29.x |
| Linting | ESLint | 10.x |

---

## 📚 Documentación Técnica

Toda la documentación detallada se encuentra en `Arquitectura-Multiagente-AlfabetIA/docs/`:

| Documento | Descripción |
|-----------|-------------|
| [`ARQUITECTURA.md`](Arquitectura-Multiagente-AlfabetIA/docs/ARQUITECTURA.md) | Diagrama y descripción de capas del sistema |
| [`MODELO_MENTAL_Y_AGRUPAMIENTO.md`](Arquitectura-Multiagente-AlfabetIA/docs/MODELO_MENTAL_Y_AGRUPAMIENTO.md) | Formalización matemática del modelo mental y clustering |
| [`CODEBOOK_Y_CURRICULUM.md`](Arquitectura-Multiagente-AlfabetIA/docs/CODEBOOK_Y_CURRICULUM.md) | Codebook semilla y estructura curricular base |
| [`SEGURIDAD_GOBERNANZA.md`](Arquitectura-Multiagente-AlfabetIA/docs/SEGURIDAD_GOBERNANZA.md) | Consentimiento, revocación, cifrado y HMAC |
| [`AUDITORIA_ARQUITECTONICA.md`](Arquitectura-Multiagente-AlfabetIA/docs/AUDITORIA_ARQUITECTONICA.md) | Diseño de la bitácora hash-chain |
| [`VALIDACION_RIGUROSA.md`](Arquitectura-Multiagente-AlfabetIA/docs/VALIDACION_RIGUROSA.md) | Plan de validación empírica y piloto longitudinal |
| [`ROADMAP_IMPLEMENTACION.md`](Arquitectura-Multiagente-AlfabetIA/docs/ROADMAP_IMPLEMENTACION.md) | Hoja de ruta y próximas iteraciones |
| [`DECISIONES_TECNOLOGICAS.md`](Arquitectura-Multiagente-AlfabetIA/docs/DECISIONES_TECNOLOGICAS.md) | Justificación de decisiones de diseño |
| [`OLLAMA_LOCAL.md`](Arquitectura-Multiagente-AlfabetIA/docs/OLLAMA_LOCAL.md) | Configuración detallada de Ollama |
| [`casos_prueba_auditoria.md`](Arquitectura-Multiagente-AlfabetIA/docs/casos_prueba_auditoria.md) | Casos de prueba de auditoría documentados |

---

## ⚖️ Estado Epistemológico

| Componente | Estado | Nota |
|-----------|--------|------|
| Eventos, consentimiento, auditoría, cola offline | ✅ Implementado | Núcleo determinista listo para MVP técnico |
| Cifrado local Fernet | ✅ Implementado (opcional) | Requiere `alfabetia_FERNET_KEY`; sin llave opera en modo desarrollo |
| Chat etnográfico multi-turno | ✅ Implementado | Con recopilación de consentimiento integrada |
| Codificación cualitativa | ⚠️ Heurística + LLM opcional | Debe calibrarse con codebook co-diseñado e intercodificación humana |
| Modelo mental y grafos | ⚠️ Hipótesis computacional | No debe tratarse como diagnóstico psicológico ni evidencia primaria |
| Agrupamiento comunitario | ⚠️ Heurístico transparente | Requiere análisis de sensibilidad y validación participativa |
| Rutas pedagógicas | ⚠️ Borradores revisables | Cualquier ruta en `M_curr` requiere aprobación humana obligatoria |
| Evidencia empírica | 🔄 Pendiente | El piloto longitudinal debe medir aprendizaje, confianza y validez ecológica |

---

## 🏛️ Decisión de Diseño: ¿Por qué no LangChain/LangGraph como núcleo?

LangChain, LangGraph y `langchain-ollama` están declarados como **dependencias de extras opcionales** para pruebas de laboratorio, no como columna vertebral del sistema.

El núcleo de AlfabetIA Rural permanece escrito en **Python y Pydantic explícito** porque:

- La gestión de consentimiento granular y su revocación física son lógica crítica de dominio
- Las auditorías hash-chain inmutables requieren control determinista total
- La reconciliación offline no puede delegarse a abstracciones de caja negra
- La trazabilidad pedagógica y la aprobación humana deben ser verificables por cualquier auditor externo

---

## 📄 Licencia

MIT — ver los archivos de cada submódulo para detalles.

---

> *"El sistema sugiere, organiza, alerta y documenta; la comunidad, el facilitador, el auditor y el equipo curricular retienen la autoridad final."*  
> — Tesis operacional de AlfabetIA Rural
