# Casos de Prueba para Auditoría — AlfabetIA Rural

Este documento contiene los **6 casos de prueba clave** diseñados para demostrar el comportamiento decisional, la gobernanza de datos, la mitigación de riesgos y la trazabilidad criptográfica de la arquitectura multiagente **AlfabetIA Rural** en una sustentación o auditoría.

---

## 🟢 Caso 1: Flujo Exitoso Estándar (El "Camino Feliz")
*   **Propósito:** Demostrar el funcionamiento normal del pipeline completo (normalización, análisis etnográfico, codificación, generación de modelo mental BDI y planeación curricular en cuarentena).

### 📝 Datos de Entrada
*   **PID:** `don_ramon` (o cualquier ID nuevo)
*   **Consentimientos:** Ambos activos (**Almacenamiento Local** = SÍ, **Procesamiento por IA** = SÍ).
*   **Relato:**
    > "Quiero aprender a utilizar la aplicación de clima para ver cuándo sembrar mi café. Si la aplicación me da recomendaciones, me gustaría poder compararlas con lo que me dice el técnico de la federación. Prefiero probar en un lote pequeño primero para ver si de verdad funciona."

### 👣 Paso a Paso en la Interfaz
1. Ir a **Registrar Relato**.
2. Ingresar el PID `don_ramon` y pegar el relato.
3. Marcar ambas casillas de consentimiento.
4. Hacer clic en **Registrar y Analizar**.

### 🔍 Resultados Esperados
*   **Frontend:** El facilitador es redirigido a la pantalla del **Modelo Mental BDI** del productor. Se renderiza un grafo interactivo con nodos de colores (Conceptos, Valores, Creencias, etc.).
*   **Cola de Revisiones:** Se genera una propuesta de ruta pedagógica en la etapa **M_CURR** con estado **Pendiente**, bajo el motivo: *"toda ruta candidata que modifica M_curr requiere revisión humana"*.
*   **Base de Datos (Auditoría):** Se añaden registros firmados criptográficamente de las acciones `normalize` (AING), `assign_codes` (ACODE), `update_mental_model` (AMIND), `evaluate_fairness` (AFAIR), `propose_route` (APLAN) y `open_review` (ASUP).

---

## 🟡 Caso 2: Cuarentena de Ingesta por Baja Confianza (`AING`)
*   **Propósito:** Demostrar cómo el sistema detecta entradas de texto de baja calidad, cortadas o incoherentes, evitando ensuciar los modelos de conocimiento y forzando la corrección por parte del operador de campo.

### 📝 Datos de Entrada
*   **PID:** `transcripcion_erronea`
*   **Consentimientos:** Ambos activos.
*   **Relato:**
    > "IA café."

### 👣 Paso a Paso en la Interfaz
1. Ir a **Registrar Relato**.
2. Ingresar el PID `transcripcion_erronea` y pegar el relato ultra-corto.
3. Marcar ambos consentimientos y hacer clic en **Registrar y Analizar**.

### 🔍 Resultados Esperados
*   **Frontend:** El sistema muestra una notificación informativa indicando que el relato requiere revisión humana en la etapa **AING** por baja confianza de normalización.
*   **Cola de Revisiones:** Aparece una tarjeta en la etapa **AING** que muestra el texto ingresado. El evaluador puede elegir **Aprobar** o **Rechazar** (descartar).
*   **Base de Datos:** El agente `AING` asigna un score de confianza por debajo de `0.55` (el umbral configurado), abriendo un registro de revisión de rol `facilitador`. El pipeline se congela y no se crea ningún modelo mental ni ruta.

---

## 🟠 Caso 3: Cuarentena Etnográfica por Probe Sensible (`AETHNO`)
*   **Propósito:** Demostrar el resguardo ético del sistema. Si el relato toca temáticas sensibles que pueden implicar riesgos de revictimización en zonas de conflicto o vulnerabilidad financiera, el sistema detiene la salida automatizada.

### 📝 Datos de Entrada
*   **PID:** `campesino_vereda_alta`
*   **Consentimientos:** Ambos activos.
*   **Relato:**
    > "Me da miedo usar la aplicación porque en esta vereda ha habido mucho conflicto armado y tengo deudas de tierras. No quiero que el gobierno o gente ajena vea dónde queda mi finca."

### 👣 Paso a Paso en la Interfaz
1. Ir a **Registrar Relato**.
2. Ingresar el PID `campesino_vereda_alta` e ingresar el relato sensible.
3. Marcar ambos consentimientos y hacer clic en **Registrar y Analizar**.

### 🔍 Resultados Esperados
*   **Frontend:** El sistema notifica al operador que el relato entró en revisión humana en la etapa **AETHNO** por contener temas de probe sensibles.
*   **Cola de Revisiones:** Aparece una revisión bajo la etapa **AETHNO** con el motivo *"probe sensible requiere validación humana"*. Muestra la pregunta de profundización sugerida por el LLM para que el facilitador evalúe si es seguro hacerla.
*   **Base de Datos:** El agente `AETHNO` activa la bandera `sensitive: true` debido a los tokens de conflicto/deudas, enviando el flujo a la cola antes de mapear el modelo mental definitivo.

---

## 🟣 Caso 4: Cuarentena de Gobernanza por Consentimiento Restringido (`AGOV`)
*   **Propósito:** Demostrar el principio de soberanía y consentimiento granular. Si el usuario retira un permiso de procesamiento secundario o derivado, el sistema interrumpe de inmediato los accesos a los agentes que requieren ese permiso.

### 📝 Datos de Entrada
*   **PID:** Utilizar un participante ya registrado exitosamente (ej. `don_ramon` del Caso 1).
*   **Configuración:** Revocar únicamente el permiso de **Derivado de Grafo (graph_derivative)** o **Derivado Curricular (curriculum_derivative)**.

### 👣 Paso a Paso en la Interfaz
1. Ir al panel de **Gestión de Consentimiento**.
2. Buscar al productor `don_ramon`.
3. Hacer clic en el botón de cerrar (`X`) del botón verde **"Derivado de Grafo"** o **"Derivado Curricular"**.
4. Confirmar la revocación de ese alcance específico en el modal.

### 🔍 Resultados Esperados
*   **Frontend:** El botón verde del scope seleccionado se tacha y se vuelve opaco. Se suma 1 al contador de revocaciones del usuario.
*   **Base de Datos (Auditoría):** El agente `AGOV` agrega un registro en la capa `M_policy` registrando la acción `revoke_pid` con el scope restringido y el hash del tombstone parcial.
*   **Gobernanza:** Si el facilitador intenta subir un nuevo relato para `don_ramon`, la compuerta `AGOV` detectará la restricción y el relato irá directamente a la Cola de Revisiones en la etapa **AGOV** con el motivo *"procesamiento derivado restringido"*.

---

## 🔴 Caso 5: Alerta o Cuarentena de Equidad y Riesgo (`AFAIR`)
*   **Propósito:** Demostrar cómo el Agente de Equidad (`AFAIR`) calcula riesgos acumulados en el participante (desconfianza digital, barreras físicas de conectividad y subrepresentación en el clúster) y pone en cuarentena de seguridad la toma de decisiones.

### 📝 Datos de Entrada
*   **PID:** `barrera_infraestructura`
*   **Consentimientos:** Ambos activos.
*   **Relato:**
    > "No confío en nada digital, no me fío de los teléfonos porque me da miedo que me roben los datos y prefiero el papel. Además, aquí no hay señal de internet, se va la luz todo el tiempo y la vereda queda muy lejos de todo."

### 👣 Paso a Paso en la Interfaz
1. Ir a **Registrar Relato**.
2. Ingresar el PID `barrera_infraestructura` y el relato de alta barrera tecnológica.
3. Marcar ambos consentimientos y hacer clic en **Registrar y Analizar**.

### 🔍 Resultados Esperados
*   **Frontend:** El flujo se detiene y se notifica que requiere revisión en la etapa **AFAIR**.
*   **Cola de Revisiones:** Aparece una revisión crítica en la etapa **AFAIR** alertando sobre los riesgos detectados.
*   **Base de Datos:** El agente `AFAIR` evalúa el modelo mental generado. Dado que se activaron los códigos `digital_distrust` (desconfianza) y `connectivity_barrier` (barrera física), el score de riesgo acumulado supera el umbral de `0.35` (e.g., suma factores por desconfianza y aislamiento). Esto dispara la cuarentena de equidad con rol asignado al **Auditor de Datos**.

---

## ⬛ Caso 6: Revocación Total y Derecho al Olvido
*   **Propósito:** Demostrar la máxima garantía ética: la purga de datos personales a petición del usuario. Cumplimiento de la soberanía tecnológica y el derecho a ser olvidado.

### 📝 Datos de Entrada
*   **PID:** Un participante que ya tenga datos en el sistema (ej. `don_ramon` o `barrera_infraestructura`).
*   **Acción:** Revocación completa (sin especificar alcance).

### 👣 Paso a Paso en la Interfaz
1. Ir a la pestaña **Auditoría de Datos** (o **Gestión de Consentimiento**).
2. Si estás en Auditoría, buscar el PID (ej. `don_ramon`).
3. En la parte inferior, en la sección *"Derecho al Olvido"*, dejar seleccionado *"⚠️ Revocación total (todos los datos)"*.
4. Hacer clic en **Revocar Consentimiento** y confirmar en el modal de *"Purga Definitiva"*.

### 🔍 Resultados Esperados
*   **Frontend:**
    *   En **Gestión de Consentimiento**, la tarjeta del participante se vuelve roja con el aviso `⛔ Todos los consentimientos revocados (0/6 scopes activos)`.
    *   Aparece una nueva fila en la tabla de **Tombstones** inferior registrando el borrado.
*   **Base de Datos (Soberanía):**
    *   La tabla `events` actualiza los relatos del PID a `tombstoned = 1`. Cualquier consulta futura para jalar los relatos originales devolverá un conjunto vacío.
    *   El agente `AGOV` escribe un **Tombstone Hash** (código inmutable de borrado) en el log de auditoría criptográfica (`AuditRecord` de acción `revoke_pid`), sirviendo de recibo oficial de que los datos personales crudos fueron destruidos.
