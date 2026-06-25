# Auditoría arquitectónica AlfabetIA Rural

## 1. Bien modelado

- La arquitectura conserva separación entre adquisición, gobernanza, interpretación, planeación pedagógica y persistencia.
- Los agentes normativos (`AGOV`, `ASUP`, `AFAIR`, `ASYNC`) son deterministas y producen bitácora.
- El núcleo no depende de LangChain ni LangGraph como backbone.
- El consentimiento es granular: captura cruda, procesamiento semántico, derivado de grafo, derivado curricular, uso secundario y exportación.
- `M_curr` se trata como memoria derivada con aprobación humana obligatoria.
- La salida pedagógica se modela como propuesta revisable, no como decisión final.
- La integración de observabilidad y métricas para el dashboard (resumen de participantes, revisiones pendientes, deltas y consentimientos) se resuelve en la capa de persistencia (`Store`) manteniendo a los agentes agnósticos del frontend.

## 2. Sobre-simplificaciones existentes

- El codebook `C0` es semilla; sus palabras clave no sustituyen codificación cualitativa humana ni confiabilidad intercoder.
- La construcción del grafo causal es una operacionalización inicial, no un modelo causal aprendido empíricamente.
- El agrupamiento usa un sustituto transparente de distancia de edición de grafo; aún no implementa GED exacta por costo calibrado.
- La cobertura de equidad se limita a señales disponibles y consentidas; no inferir categorías sensibles sin co-diseño.
- La reconciliación offline detecta conflictos por hash, pero no resuelve conflictos semánticos automáticamente.
- Anteriormente, `_base_literacy` en AMIND solo inicializaba C1-C6, pero en la versión actual se ha resuelto inicializando C1-C7 con fracción igual (1/7), garantizando una composición consistente.

- Las `startup_routes` definidas en `l0_curriculum.yaml` son orientaciones de diseño; APLAN no las lee
  directamente. La selección real de módulos opera ínicamente por `_tags_for_model` y el scoring
  `_choose_module`.

## 3. Debilidades metodológicas que permanecen

- Falta validación participativa de codebook, glosario y taxonomía de competencias.
- Falta prueba de validez ecológica con comunidades reales.
- Falta calibración de umbrales por contexto territorial, canal y ruido ASR.
- Falta medición de carga del facilitador y costo de revisión humana.
- Falta auditoría externa de seguridad para datos productivos sensibles.

## 4. Amenazas a la validez

- **Validez constructiva**: los códigos iniciales podrían no representar significados locales.
- **Validez interna**: una ruta puede parecer plausible por heurística, no por causalidad pedagógica comprobada.
- **Validez externa**: los resultados de una vereda o canal no generalizan automáticamente.
- **Sesgo de canal**: voces con mejor conectividad o mayor alfabetización digital pueden dominar `M_graph` y `M_curr`.
- **Reactividad**: la presencia del sistema puede modificar cómo las personas narran confianza, datos o riesgo.

## 5. Acoplamientos indebidos corregidos

- El LLM quedó encapsulado en `LLMClientProtocol`; el dominio no importa proveedores.
- La planeación no accede a dato crudo; trabaja sobre modelos y evidencia permitida.
- La auditoría y la cola offline no dependen de outputs generativos.
- La API no aprueba automáticamente rutas ni briefs.
- La agregación de estados de consentimiento y métricas de dashboard se encapsuló puramente en persistencia (`sqlite_store.py`), evitando acoplar la API a las estructuras internas de los agentes.

## 6. Riesgos operativos remanentes

- Fallos de Ollama local o modelos pequeños pueden devolver JSON inválido o interpretaciones débiles.
- Sin `alfabetia_FERNET_KEY`, el cifrado opera en modo desarrollo.
- SQLite es correcto para MVP/offline-first, pero no para multiusuario concurrente intensivo sin endurecimiento.
- La revocación física total depende de backups y política de retención fuera de la base activa.
