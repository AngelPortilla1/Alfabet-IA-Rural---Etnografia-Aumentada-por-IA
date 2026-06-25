# Diseño de validación rigurosa

## Pruebas automatizadas incluidas

- Consentimiento revocado bloquea procesamiento.
- Alcance curricular restringido abre revisión.
- Revocación genera tombstone para eventos crudos.
- Hash-chain de auditoría enlaza registros.
- Deltas offline se firman con HMAC cuando hay secreto.
- Fisher-Rao es cero para composiciones iguales.
- Distancia híbrida es simétrica.
- Agrupamiento produce centroides y segmentos.
- Planificador genera trazas completas.
- Orquestador crea ruta, revisión `M_curr` y delta.

## Pruebas funcionales faltantes

- Carga de audios reales y ASR con ruido rural.
- Corrección humana de transcripción y re-procesamiento controlado.
- Resolución de conflicto de sincronización por doble edición.
- Exportación auditable con permisos de auditor.
- Borrado físico y verificación contra backups.

## Pruebas de incertidumbre

Casos mínimos:

1. segmento corto de audio;
2. códigos contradictorios;
3. LLM con JSON inválido;
4. evidencia insuficiente;
5. probe sensible.

Criterio: el sistema debe pausar o marcar revisión, no inventar certeza.

## Pruebas de subrepresentación

- Simular canales: audio, texto, kiosco, facilitado.
- Forzar baja presencia de audio o baja conectividad.
- Confirmar que AFAIR abre revisión antes de rutas de segmento.

## Pruebas de revocación

- Revocación antes de procesamiento: bloqueo total.
- Revocación después de captura: tombstone en `M_raw`.
- Revocación de derivado curricular: no exportar ni aprobar `M_curr`.
- Revocación parcial: conservar solo capas permitidas.

## Protocolo de evaluación mixta para piloto

### Cuantitativo

- Pre/post de competencias C1-C7.
- Tiempo de revisión por facilitador.
- Tasa de corrección de códigos.
- Tasa de rutas rechazadas por equipo curricular.
- Cobertura por canal/subgrupo consentido.
- Conflictos de sincronización por semana.

### Cualitativo

- Entrevistas de devolución.
- Grupos focales sobre confianza y soberanía de datos.
- Auditoría de interpretaciones sensibles.
- Revisión participativa de grafos y segmentos.
- Análisis de diferencias entre sugerencia del sistema y decisión humana.

### Criterio de éxito científico

No basta que el software funcione. Debe demostrar pertinencia, comprensibilidad, trazabilidad, gobernanza efectiva y ausencia de daño operativo no mitigado.
