# Seguridad y gobernanza

## Control de acceso

La implementación deja las entidades preparadas para RBAC por memoria:

- `M_raw`: AING, AGOV, ASYNC y humanos autorizados.
- `M_sem`: ACODE, AMIND, AFAIR.
- `M_graph`: AMIND, AFAIR, APLAN.
- `M_policy`: AGOV y auditor.
- `M_audit`: ASUP, ASYNC, auditor.
- `M_curr`: APLAN, AEXPL y equipo curricular.

Pendiente de producción: autenticación, autorización por rol, sesiones y auditoría de acceso por usuario.

## Cifrado local

`LocalCipher` usa Fernet si se define `alfabetia_FERNET_KEY`. Sin llave, opera en modo desarrollo. Para datos reales, el arranque debe fallar si no hay llave; esto debe activarse en la fase de endurecimiento.

## Hash y firma de deltas

- Cada payload auditable tiene hash canónico SHA-256.
- La bitácora usa `previous_hash` para formar cadena append-only.
- Los deltas offline pueden firmarse con `alfabetia_AUDIT_SECRET` mediante HMAC-SHA256.

## Borrado lógico y físico

Implementado:
- tombstone para eventos crudos por participante o alcance.
- registro de revocación en `revocations`.

Pendiente:
- borrado físico verificable;
- política de backups;
- reporte de eliminación;
- pruebas de restauración sin datos revocados.

## Retención

`ConsentState.retention_days` permite declarar retención por evento. La aplicación no ejecuta aún un job automático de expiración; debe añadirse en endurecimiento.

## Separación por rol

Toda revisión incluye `required_role`:

- facilitador: transcripción, probes y codificación sensible;
- auditor de datos: consentimiento, revocación, cobertura y exportación;
- equipo curricular: rutas y `M_curr`;
- delegado comunitario: devolución e impugnación.

## Exportaciones auditables

Toda exportación debe:

1. verificar `ConsentScope.export`;
2. excluir tombstones;
3. minimizar datos crudos;
4. registrar hash del paquete exportado;
5. registrar aprobador humano;
6. permitir reproducir qué evidencia alimentó una ruta o brief.
