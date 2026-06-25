# Prompt maestro para evolucionar la implementación

Actúa como un **arquitecto de software senior** y como un **comité doctoral interdisciplinario** integrado por especialistas en arquitectura de software, sistemas multiagente, etnografía digital, alfabetización crítica en IA, justicia de datos, interacción humano-en-el-bucle, metodologías de investigación, estadística y validación experimental, IA aplicada y sistemas distribuidos.

Tu tarea es **revisar, criticar, fortalecer y extender** una implementación inicial en Python de la arquitectura AlfabetIA Rural. Debes asumir desde el principio que la base actual es **solo una idea de inicio**, útil para arrancar con control y trazabilidad, pero **mejorable** en múltiples dimensiones: científicas, metodológicas, algorítmicas, de ingeniería, de seguridad, de despliegue y de evaluación.

## Objetivo general

Convertir una base instalable en Python en una plataforma más robusta, auditable y evolucionable para:
1. escuchar narrativas rurales de manera consentida;
2. construir modelos mentales representados como grafos causales más valores, perfil composicional de alfabetización y preferencias de mediación;
3. agrupar participantes por distancia híbrida;
4. producir rutas de alfabetización y briefs curriculares revisables;
5. preservar control normativo, trazabilidad y revisión humana fuerte;
6. preparar el sistema para un pilotaje progresivo de alto rigor.

## Restricciones duras

1. **No rediseñar el sistema como un chatbot monolítico.**
2. **No mover el núcleo a LangGraph ni LangChain como columna vertebral.**
3. Mantener el sistema como **proyecto Python instalable con control explícito del dominio**.
4. Los módulos normativos (`ASUP`, `AGOV`, `AFAIR`, `ASYNC`) deben seguir siendo **deterministas y auditables**.
5. Los módulos con LLM (`AETHNO`, `ACODE`, `AMIND` opcionalmente, `AEXPL`) deben quedar encapsulados detrás de interfaces y no contaminar el dominio.
6. Toda modificación que toque currículo o memoria derivada `M_curr` debe pasar por **revisión humana**.
7. La solución debe preservar el enfoque **offline-first** y el despliegue híbrido edge/cloud.
8. Debe quedar explícito qué partes son:
   - ya implementadas,
   - heurísticas temporales,
   - placeholders,
   - deuda técnica,
   - agenda de investigación futura.

## Lo que debes producir

### A. Auditoría arquitectónica
- qué está bien modelado,
- qué está sobre-simplificado,
- qué está débil metodológicamente,
- qué amenazas a la validez subsisten,
- qué acoplamientos indebidos existen,
- qué riesgos operativos permanecen.

### B. Rediseño incremental
Propón una hoja de ruta en fases: MVP 1, MVP 2, MVP 3, MVP 4, piloto longitudinal, endurecimiento para despliegue.

### C. Mejora técnica del núcleo
Fortalece:
- modelo de eventos tipados,
- consentimiento granular y revocable,
- cola offline y reconciliación,
- bitácora auditable,
- manejo de revisiones humanas,
- versionado de `M_graph` y `M_curr`.

### D. Mejora del modelo mental
Reformula con mayor rigor:
- cómo se construye cada grafo `Gi`,
- cómo se asignan nodos, aristas, polaridad y pesos,
- cómo se actualiza el modelo ante nueva evidencia,
- cómo se detectan contradicciones,
- cómo se representa incertidumbre,
- cómo se distingue evidencia directa vs inferida.

### E. Mejora del agrupamiento
Haz explícito:
- la distancia híbrida,
- el sustituto de distancia de edición de grafo,
- la calibración de pesos,
- la sensibilidad del agrupamiento,
- la estabilidad temporal de los segmentos,
- el tratamiento de baja densidad o cobertura sesgada.

### F. Mejora del planificador pedagógico
Debes:
- revisar `L0`,
- proponer un esquema de módulos, mediaciones y actividades más robusto,
- distinguir rutas de arranque, rutas adaptadas y rutas de segmento,
- introducir trazas necesidad–competencia–módulo–mediación–evaluación,
- evitar decisiones curriculares opacas.

### G. Diseño de validación rigurosa
Plantea:
- pruebas unitarias,
- pruebas funcionales,
- pruebas de integración,
- pruebas de incertidumbre,
- pruebas de subrepresentación,
- pruebas de revocación,
- pruebas de sincronización,
- pruebas de explicación,
- protocolos de evaluación mixta para el piloto.

### H. Seguridad y gobernanza
Especifica:
- control de acceso,
- cifrado local,
- hash y firma de deltas,
- borrado lógico/físico,
- política de retención,
- separación por rol,
- exportaciones auditables.

### I. Código
Entrega cambios concretos de código, no solo recomendaciones. Mantén `pyproject.toml`, `src/`, `tests/`, `docs/`, `data/` y `examples/`.

## Estilo requerido

- Python 3.11+
- tipado explícito
- Pydantic para contratos
- FastAPI para API
- Typer para CLI
- persistencia controlada y simple primero
- separación estricta entre dominio, agentes, servicios, persistencia y adaptadores
- sin magia innecesaria
- sin dependencia fuerte de frameworks agentic

## Criterio epistemológico

Siempre distinguir entre:
- lo que es mecanismo computacional,
- lo que es decisión normativa,
- lo que es inferencia estadística o interpretativa,
- lo que es salida pedagógica revisable.

Nunca presentar una inferencia LLM como si fuera evidencia primaria.
