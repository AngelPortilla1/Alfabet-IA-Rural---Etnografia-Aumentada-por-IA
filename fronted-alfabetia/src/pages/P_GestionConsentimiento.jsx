import { useState, useEffect, useCallback } from 'react';
import { API_ENDPOINTS, getRevokeUrl } from '../api/client';
import { useToast } from '../components/ToastContext';

const SCOPE_META = {
  raw_capture: {
    label: 'Captura Cruda',
    description: 'Permite registrar el relato original del participante.',
    icon: 'mic',
    color: 'primary',
  },
  semantic_processing: {
    label: 'Procesamiento Semántico',
    description: 'Permite que la IA extraiga conceptos y entidades del relato.',
    icon: 'psychology',
    color: 'secondary',
  },
  graph_derivative: {
    label: 'Derivado de Grafo',
    description: 'Permite construir el Modelo Mental BDI del participante.',
    icon: 'account_tree',
    color: 'tertiary',
  },
  curriculum_derivative: {
    label: 'Derivado Curricular',
    description: 'Permite generar rutas pedagógicas personalizadas.',
    icon: 'school',
    color: 'surface-tint',
  },
  secondary_use: {
    label: 'Uso Secundario',
    description: 'Permite usar los datos en análisis e investigación externa.',
    icon: 'hub',
    color: 'secondary',
  },
  export: {
    label: 'Exportación',
    description: 'Permite exportar datos fuera del sistema.',
    icon: 'output',
    color: 'tertiary',
  },
};

const COLOR_MAP = {
  primary: {
    active: 'bg-primary text-on-primary',
    inactive: 'bg-error text-on-error',
    badge: 'bg-primary/10 text-primary border-primary/20',
  },
  secondary: {
    active: 'bg-secondary text-on-secondary',
    inactive: 'bg-error text-on-error',
    badge: 'bg-secondary/10 text-secondary border-secondary/20',
  },
  tertiary: {
    active: 'bg-tertiary text-on-tertiary',
    inactive: 'bg-error text-on-error',
    badge: 'bg-tertiary/10 text-tertiary border-tertiary/20',
  },
  'surface-tint': {
    active: 'bg-surface-tint text-on-primary',
    inactive: 'bg-error text-on-error',
    badge: 'bg-surface-tint/10 text-on-surface border-outline-variant/30',
  },
};

function ScopePill({ scope, active, onRevoke, revoking }) {
  const meta = SCOPE_META[scope] || { label: scope, icon: 'circle', color: 'primary' };
  const colors = COLOR_MAP[meta.color] || COLOR_MAP.primary;

  return (
    <div
      className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold border transition-all duration-300 ${
        active
          ? `${colors.badge} border`
          : 'bg-error/10 text-error border-error/20 line-through opacity-60'
      }`}
    >
      <span
        className="material-symbols-outlined text-[14px]"
        style={{ fontVariationSettings: active ? "'FILL' 1" : "'FILL' 0" }}
      >
        {active ? meta.icon : 'block'}
      </span>
      <span>{meta.label}</span>
      {active && (
        <button
          onClick={() => onRevoke(scope)}
          disabled={revoking}
          title={`Revocar ${meta.label}`}
          className="ml-1 w-4 h-4 rounded-full bg-error/20 hover:bg-error hover:text-white text-error flex items-center justify-center transition-all disabled:opacity-50 disabled:cursor-wait"
        >
          <span className="material-symbols-outlined text-[11px]">close</span>
        </button>
      )}
    </div>
  );
}

export default function P_GestionConsentimiento() {
  const [participants, setParticipants] = useState([]);
  const [tombstones, setTombstones] = useState([]);
  const [loading, setLoading] = useState(true);
  const [revoking, setRevoking] = useState(null); // "pid:scope" o "pid:all"
  const [confirmModal, setConfirmModal] = useState(null);
  const [confirmText, setConfirmText] = useState('');
  const { showToast } = useToast();

  const fetchData = useCallback(async () => {
    try {
      const [consentsRes, auditRes] = await Promise.all([
        fetch(API_ENDPOINTS.CONSENTS),
        fetch(API_ENDPOINTS.AUDIT),
      ]);
      if (consentsRes.ok) setParticipants(await consentsRes.json());
      if (auditRes.ok) {
        const audit = await auditRes.json();
        setTombstones(audit.filter((r) => r.action === 'revoke_pid').reverse());
      }
    } catch (err) {
      showToast('Error al cargar los datos de consentimiento.', 'error');
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleRevoke = (pid, scope) => {
    setConfirmText('');
    setConfirmModal({ pid, scope });
  };

  const handleRevokeAll = (pid) => {
    setConfirmText('');
    setConfirmModal({ pid, scope: null });
  };

  const executeRevoke = async () => {
    if (!confirmModal) return;
    const { pid, scope } = confirmModal;
    const key = `${pid}:${scope ?? 'all'}`;
    setRevoking(key);
    setConfirmModal(null);
    try {
      const url = getRevokeUrl(pid, scope, 'Revocado desde panel de gobernanza');
      const res = await fetch(url, { method: 'POST' });
      if (res.ok) {
        showToast(`Consentimiento revocado para ${pid}${scope ? ` (${SCOPE_META[scope]?.label || scope})` : ' (Total)'}`, 'success');
        await fetchData();
      } else {
        showToast('Error al ejecutar la revocación.', 'error');
      }
    } catch {
      showToast('No se pudo conectar con el backend.', 'error');
    } finally {
      setRevoking(null);
    }
  };

  const activeScopes = (consent) =>
    Object.entries(consent).filter(([, v]) => v).length;
  const totalScopes = Object.keys(SCOPE_META).length;

  return (
    <main className="px-margin-mobile md:px-margin-desktop max-w-container-max mx-auto py-12 min-h-[calc(100vh-120px)]">

      {/* Header */}
      <div className="mb-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
        <div className="flex items-start gap-4 mb-4">
          <div className="w-12 h-12 rounded-2xl bg-error-container text-on-error-container flex items-center justify-center shadow-inner flex-shrink-0">
            <span className="material-symbols-outlined text-[24px]">policy</span>
          </div>
          <div>
            <h1 className="font-display-lg text-3xl md:text-4xl font-bold text-on-surface">
              Gestión de Consentimiento
            </h1>
            <p className="font-body-lg text-body-lg text-on-surface-variant mt-2 max-w-3xl">
              Visualice y administre el estado de consentimiento granular de cada participante.
              Las revocaciones son inmutables: quedan firmadas criptográficamente en la cadena de auditoría.
            </p>
          </div>
        </div>

        {/* Leyenda de scopes */}
        <div className="flex flex-wrap gap-2 mt-6">
          {Object.entries(SCOPE_META).map(([scope, meta]) => (
            <div
              key={scope}
              className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-surface-container text-on-surface-variant text-xs font-bold border border-outline-variant/30"
              title={meta.description}
            >
              <span className="material-symbols-outlined text-[13px]">{meta.icon}</span>
              {meta.label}
            </div>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20 gap-3 text-on-surface-variant">
          <span className="material-symbols-outlined animate-spin text-primary text-3xl">sync</span>
          <span className="font-bold">Cargando datos de consentimiento…</span>
        </div>
      ) : participants.length === 0 ? (
        <div className="text-center py-20 bg-surface-container/50 rounded-3xl border border-outline-variant/30">
          <span className="material-symbols-outlined text-[48px] text-on-surface-variant opacity-40 mb-3 block">group_off</span>
          <p className="font-bold text-on-surface-variant">No hay participantes registrados en el sistema.</p>
          <p className="text-sm text-on-surface-variant opacity-70 mt-1">Registre un relato primero para que aparezca aquí.</p>
        </div>
      ) : (
        <div className="space-y-4 mb-14 animate-in fade-in duration-700">
          {participants.map((p) => {
            const active = activeScopes(p.consent);
            const isFullyRevoked = active === 0;
            const revokingAny = revoking?.startsWith(p.pid + ':');

            return (
              <div
                key={p.pid}
                className={`rounded-3xl border backdrop-blur-md transition-all duration-300 overflow-hidden ${
                  isFullyRevoked
                    ? 'bg-error-container/20 border-error/20'
                    : 'bg-surface/60 border-white/40 shadow-sm hover:shadow-md'
                }`}
              >
                {/* Header de la tarjeta */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 pb-4">
                  <div className="flex items-center gap-4">
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center font-black text-lg shadow-md border ${
                      isFullyRevoked ? 'bg-error text-on-error border-error/20' : 'bg-primary text-on-primary border-primary/20'
                    }`}>
                      {p.pid.slice(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <h2 className="font-black text-on-surface text-xl font-mono tracking-wide">{p.pid}</h2>
                      <p className="text-sm font-bold text-on-surface mt-0.5">
                        {isFullyRevoked
                          ? '⛔ Todos los consentimientos revocados'
                          : `${active} / ${totalScopes} scopes activos`}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 flex-wrap">
                    {/* Barra de progreso de scopes */}
                    <div className="flex gap-1 items-center">
                      {Object.keys(SCOPE_META).map((scope) => (
                        <div
                          key={scope}
                          className={`w-3 h-3 rounded-full transition-colors duration-300 ${
                            p.consent[scope] ? 'bg-primary' : 'bg-error/40'
                          }`}
                          title={`${SCOPE_META[scope]?.label}: ${p.consent[scope] ? 'Activo' : 'Revocado'}`}
                        />
                      ))}
                    </div>

                    {/* Botón de Revocación Total */}
                    {!isFullyRevoked && (
                      <button
                        onClick={() => handleRevokeAll(p.pid)}
                        disabled={!!revokingAny}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-error/10 text-error border border-error/20 text-xs font-bold hover:bg-error hover:text-on-error transition-all disabled:opacity-50 disabled:cursor-wait"
                      >
                        <span className="material-symbols-outlined text-[14px]">person_remove</span>
                        Revocar Todo
                      </button>
                    )}
                  </div>
                </div>

                {/* Scopes */}
                <div className="flex flex-wrap gap-2 px-5 pb-5">
                  {Object.entries(SCOPE_META).map(([scope]) => (
                    <ScopePill
                      key={scope}
                      scope={scope}
                      active={!!p.consent[scope]}
                      onRevoke={(s) => handleRevoke(p.pid, s)}
                      revoking={revoking === `${p.pid}:${scope}`}
                    />
                  ))}
                  {p.revocations_count > 0 && (
                    <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-surface-container text-on-surface-variant text-xs font-bold border border-outline-variant/30 ml-auto">
                      <span className="material-symbols-outlined text-[14px]">history</span>
                      {p.revocations_count} revocación{p.revocations_count !== 1 ? 'es' : ''} registradas
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Tombstones / Auditoría */}
      <div className="animate-in fade-in slide-in-from-bottom-4 duration-700 delay-200">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 rounded-xl bg-surface-container-highest text-on-surface-variant flex items-center justify-center">
            <span className="material-symbols-outlined text-[20px]">verified_user</span>
          </div>
          <div>
            <h2 className="font-bold text-on-surface text-lg">Registro de Tombstones (Auditoría Criptográfica)</h2>
            <p className="text-xs text-on-surface-variant">Cada revocación genera un hash encadenado e inmutable.</p>
          </div>
          <span className="ml-auto text-xs font-bold px-3 py-1 rounded-full bg-surface-container border border-outline-variant/30 text-on-surface-variant">
            {tombstones.length} registros
          </span>
        </div>

        {tombstones.length === 0 ? (
          <div className="text-center py-10 bg-surface-container/40 rounded-2xl border border-outline-variant/20">
            <span className="material-symbols-outlined text-[36px] text-on-surface-variant opacity-30 block mb-2">lock_open</span>
            <p className="text-sm text-on-surface-variant opacity-60">No se han registrado revocaciones aún.</p>
          </div>
        ) : (
          <div className="rounded-2xl border border-outline-variant/30 overflow-hidden bg-surface/40 backdrop-blur-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-outline-variant/30 bg-surface-container-highest/50">
                    <th className="text-left px-5 py-3 font-bold text-on-surface-variant text-xs uppercase tracking-widest">PID</th>
                    <th className="text-left px-5 py-3 font-bold text-on-surface-variant text-xs uppercase tracking-widest">Scope</th>
                    <th className="text-left px-5 py-3 font-bold text-on-surface-variant text-xs uppercase tracking-widest">Motivo</th>
                    <th className="text-left px-5 py-3 font-bold text-on-surface-variant text-xs uppercase tracking-widest">Tombstone Hash</th>
                    <th className="text-left px-5 py-3 font-bold text-on-surface-variant text-xs uppercase tracking-widest">Fecha</th>
                  </tr>
                </thead>
                <tbody>
                  {tombstones.map((t, i) => {
                    const payload = t.payload || {};
                    const ts = payload.tombstone_hash || t.record_hash || '—';
                    const reason = payload.reason || '—';
                    const scope = payload.scope || 'Total';
                    const date = t.timestamp ? new Date(t.timestamp).toLocaleString('es-CO') : '—';

                    return (
                      <tr
                        key={t.record_hash || i}
                        className="border-b border-outline-variant/20 hover:bg-surface-container/60 transition-colors"
                      >
                        <td className="px-5 py-3 font-mono font-bold text-primary text-xs">{t.pid}</td>
                        <td className="px-5 py-3">
                          <span className={`px-2 py-0.5 rounded-full text-xs font-bold border ${
                            scope === 'Total'
                              ? 'bg-error/10 text-error border-error/20'
                              : 'bg-surface-container text-on-surface-variant border-outline-variant/30'
                          }`}>
                            {scope === 'Total' ? '⛔ Total' : SCOPE_META[scope]?.label || scope}
                          </span>
                        </td>
                        <td className="px-5 py-3 text-on-surface-variant text-xs max-w-[200px] truncate" title={reason}>{reason}</td>
                        <td className="px-5 py-3">
                          <span className="font-mono text-[10px] text-on-surface-variant bg-surface-container px-2 py-0.5 rounded border border-outline-variant/30 block truncate max-w-[180px]" title={ts}>
                            {ts}
                          </span>
                        </td>
                        <td className="px-5 py-3 text-xs text-on-surface-variant whitespace-nowrap">{date}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Modal de Confirmación */}
      {confirmModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setConfirmModal(null)}
          />
          <div className="relative z-10 bg-surface rounded-3xl border border-white/20 shadow-2xl p-8 max-w-md w-full animate-in zoom-in-95 duration-200">
            <div className="w-14 h-14 rounded-2xl bg-error-container text-on-error-container flex items-center justify-center mx-auto mb-5">
              <span className="material-symbols-outlined text-[28px]">warning</span>
            </div>
            <h3 className="font-bold text-xl text-on-surface text-center mb-2">
              {confirmModal.scope ? 'Revocar Scope de Consentimiento' : 'Revocar Consentimiento Total'}
            </h3>
            <p className="text-sm text-on-surface-variant text-center mb-2">
              Esta acción es <strong>irreversible</strong>. Se generará un tombstone criptográfico en la auditoría.
            </p>
            <div className="bg-surface-container rounded-2xl p-4 text-center mb-4">
              <p className="text-xs text-on-surface-variant mb-1">Participante</p>
              <p className="font-mono font-bold text-primary">{confirmModal.pid}</p>
              {confirmModal.scope && (
                <>
                  <p className="text-xs text-on-surface-variant mt-2 mb-1">Scope</p>
                  <p className="font-bold text-on-surface">{SCOPE_META[confirmModal.scope]?.label}</p>
                </>
              )}
            </div>
            
            {/* Input de confirmación doble (Trazabilidad y Prevención de errores) */}
            <div className="mt-4 mb-6">
              <label htmlFor="confirmTextVal" className="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-2 text-center">
                Escribe <span className="font-mono text-error font-bold">CONFIRMAR</span> para proceder:
              </label>
              <input
                type="text"
                id="confirmTextVal"
                placeholder="CONFIRMAR"
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value)}
                className="w-full bg-surface-container border border-outline-variant rounded-xl px-4 py-2.5 text-sm text-center focus:outline-none focus:ring-2 focus:ring-error/20 focus:border-error transition-all font-bold text-error uppercase"
              />
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setConfirmModal(null)}
                className="flex-1 px-5 py-3 rounded-2xl bg-surface-container text-on-surface font-bold border border-outline-variant hover:bg-surface-container-high transition-all text-sm"
              >
                Cancelar
              </button>
              <button
                onClick={executeRevoke}
                disabled={confirmText.trim().toUpperCase() !== 'CONFIRMAR'}
                className="flex-1 px-5 py-3 rounded-2xl bg-error text-on-error font-bold hover:shadow-md hover:-translate-y-0.5 disabled:bg-outline-variant/30 disabled:text-outline disabled:cursor-not-allowed transition-all text-sm flex items-center justify-center gap-2"
              >
                <span className="material-symbols-outlined text-[18px]">delete_forever</span>
                Confirmar
              </button>
            </div>
          </div>
        </div>
      )}

    </main>
  );
}
