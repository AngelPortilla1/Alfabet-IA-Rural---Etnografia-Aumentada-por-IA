import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { API_ENDPOINTS } from '../api/client';

export default function P_DashboardResumen() {
  const [summary, setSummary] = useState(null);
  const [participants, setParticipants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  // Estados de Sincronización de Deltas
  const [deltas, setDeltas] = useState([]);
  const [deltasPage, setDeltasPage] = useState(1);
  const [deltasPerPage, setDeltasPerPage] = useState(5);
  const [deltasFilter, setDeltasFilter] = useState('all'); // 'all', 'queued', 'synced', 'conflict'

  useEffect(() => {
    const fetchAll = async () => {
      try {
        const [sumRes, partRes] = await Promise.all([
          fetch(API_ENDPOINTS.DASHBOARD_SUMMARY),
          fetch(API_ENDPOINTS.PARTICIPANTS),
        ]);
        if (!sumRes.ok) throw new Error('Error al cargar el resumen');
        const sumData = await sumRes.json();
        setSummary(sumData);
        if (partRes.ok) {
          const partData = await partRes.json();
          setParticipants(Array.isArray(partData) ? partData : []);
        }

        // Carga segura de deltas para evitar tumbar la pantalla principal si falla
        try {
          const url = API_ENDPOINTS.DELTAS || 'http://127.0.0.1:8000/deltas';
          console.log("Fetching deltas from URL:", url);
          const deltasRes = await fetch(url);
          if (deltasRes.ok) {
            const deltasData = await deltasRes.json();
            const sortedDeltas = Array.isArray(deltasData) 
              ? deltasData.sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
              : [];
            setDeltas(sortedDeltas);
          }
        } catch (e) {
          console.warn("No se pudo conectar con el endpoint de deltas:", e);
        }

      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchAll();
  }, []);

  // Filtrar deltas en memoria
  const filteredDeltas = deltas.filter(d => {
    if (deltasFilter === 'all') return true;
    return d.status === deltasFilter;
  });

  // Resetear página de deltas al filtrar
  useEffect(() => {
    setDeltasPage(1);
  }, [deltasFilter, deltasPerPage]);

  // Paginación de deltas
  const totalDeltasPages = Math.ceil(filteredDeltas.length / deltasPerPage);
  const paginatedDeltas = filteredDeltas.slice(
    (deltasPage - 1) * deltasPerPage,
    deltasPage * deltasPerPage
  );

  return (
    <main className="px-margin-mobile md:px-margin-desktop max-w-container-max mx-auto min-h-[calc(100vh-120px)] py-12">

      {/* Header */}
      <div className="mb-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 rounded-2xl bg-primary-container text-on-primary flex items-center justify-center shadow-inner">
            <span className="material-symbols-outlined text-[24px]">query_stats</span>
          </div>
          <h1 className="font-display-lg text-3xl md:text-4xl font-bold text-on-surface">
            Estado del Sistema
          </h1>
        </div>
        <p className="font-body-lg text-body-lg text-on-surface-variant max-w-3xl">
          Resumen ejecutivo en tiempo real de la plataforma AlfabetIA Rural. Visualice el impacto territorial,
          estado de sincronización y métricas operativas del sistema multiagente.
        </p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <span className="material-symbols-outlined animate-spin text-primary text-4xl">sync</span>
        </div>
      ) : error ? (
        <div className="bg-error-container text-on-error-container p-6 rounded-2xl border border-error/20 flex flex-col items-center justify-center">
          <span className="material-symbols-outlined text-[48px] mb-2 opacity-80">error</span>
          <p className="font-bold mb-1">No se pudo cargar el estado del sistema</p>
          <p className="text-sm opacity-80">{error}</p>
        </div>
      ) : (
        <>
          {/* KPI Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 animate-in fade-in duration-1000">

            <div className="relative group p-6 rounded-3xl bg-surface/60 backdrop-blur-md border border-white/40 shadow-sm hover:shadow-md transition-all duration-300 overflow-hidden">
              <div className="absolute top-0 right-0 w-24 h-24 bg-primary-container opacity-10 rounded-bl-full -mr-4 -mt-4"></div>
              <div className="flex justify-between items-start mb-6">
                <div className="w-10 h-10 rounded-xl bg-primary/20 text-primary flex items-center justify-center">
                  <span className="material-symbols-outlined">group</span>
                </div>
                <span className="text-xs font-bold text-primary bg-primary/10 px-2 py-1 rounded-full uppercase tracking-wider">Territorio</span>
              </div>
              <div>
                <p className="text-sm font-bold text-on-surface-variant mb-1">Participantes Activos</p>
                <h3 className="text-4xl font-bold text-on-surface">{summary.active_participants}</h3>
              </div>
              <div className="mt-4 text-xs text-on-surface-variant opacity-70">Con modelos mentales registrados</div>
            </div>

            <div className="relative group p-6 rounded-3xl bg-surface/60 backdrop-blur-md border border-white/40 shadow-sm hover:shadow-md transition-all duration-300 overflow-hidden">
              <div className="absolute top-0 right-0 w-24 h-24 bg-secondary opacity-10 rounded-bl-full -mr-4 -mt-4"></div>
              <div className="flex justify-between items-start mb-6">
                <div className="w-10 h-10 rounded-xl bg-secondary/20 text-secondary flex items-center justify-center">
                  <span className="material-symbols-outlined">pending_actions</span>
                </div>
                <span className="text-xs font-bold text-secondary bg-secondary/10 px-2 py-1 rounded-full uppercase tracking-wider">Curricular</span>
              </div>
              <div>
                <p className="text-sm font-bold text-on-surface-variant mb-1">Revisiones Pendientes</p>
                <h3 className="text-4xl font-bold text-on-surface">{summary.pending_reviews}</h3>
              </div>
              <div className="mt-4 text-xs text-on-surface-variant opacity-70">Requieren aprobación humana</div>
            </div>

            <div className="relative group p-6 rounded-3xl bg-surface/60 backdrop-blur-md border border-white/40 shadow-sm hover:shadow-md transition-all duration-300 overflow-hidden">
              <div className="absolute top-0 right-0 w-24 h-24 bg-surface-tint opacity-10 rounded-bl-full -mr-4 -mt-4"></div>
              <div className="flex justify-between items-start mb-6">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${summary.pending_deltas === 0 ? 'bg-primary/20 text-primary' : 'bg-tertiary/20 text-tertiary'}`}>
                  <span className="material-symbols-outlined">{summary.pending_deltas === 0 ? 'cloud_done' : 'cloud_sync'}</span>
                </div>
                <span className="text-xs font-bold text-surface-tint bg-surface-tint/10 px-2 py-1 rounded-full uppercase tracking-wider">Auditoría</span>
              </div>
              <div>
                <p className="text-sm font-bold text-on-surface-variant mb-1">Estado Sincronización</p>
                <h3 className="text-2xl font-bold text-on-surface mt-2">
                  {summary.pending_deltas === 0 ? 'Sincronizado' : `${summary.pending_deltas} Pendientes`}
                </h3>
              </div>
              <div className="mt-4 text-xs text-on-surface-variant opacity-70">Nodos offline integrados</div>
            </div>

            <div className="relative group p-6 rounded-3xl bg-surface/60 backdrop-blur-md border border-white/40 shadow-sm hover:shadow-md transition-all duration-300 overflow-hidden">
              <div className="absolute top-0 right-0 w-24 h-24 bg-tertiary opacity-10 rounded-bl-full -mr-4 -mt-4"></div>
              <div className="flex justify-between items-start mb-6">
                <div className="w-10 h-10 rounded-xl bg-tertiary/20 text-tertiary flex items-center justify-center">
                  <span className="material-symbols-outlined">data_object</span>
                </div>
                <span className="text-xs font-bold text-tertiary bg-tertiary/10 px-2 py-1 rounded-full uppercase tracking-wider">Análisis</span>
              </div>
              <div>
                <p className="text-sm font-bold text-on-surface-variant mb-1">Último Segmento</p>
                <h3 className="text-lg font-bold text-on-surface leading-tight mt-1 line-clamp-2" title={summary.latest_segment?.segment_id}>
                  {summary.latest_segment ? summary.latest_segment.segment_id : 'No hay segmentos'}
                </h3>
              </div>
              <div className="mt-4 text-xs text-on-surface-variant opacity-70">Generado recientemente</div>
            </div>

          </div>

          {/* ── Tabla de Participantes ── */}
          {participants.length > 0 && (
            <div className="mt-10 animate-in fade-in duration-700 delay-150">
              <div className="flex items-center gap-3 mb-5">
                <span className="material-symbols-outlined text-primary">manage_accounts</span>
                <h2 className="font-headline-md text-xl font-bold text-on-surface">Participantes Registrados</h2>
                <span className="bg-primary/10 text-primary px-3 py-0.5 rounded-full text-xs font-bold">{participants.length} total</span>
              </div>
              <div className="bg-surface/80 backdrop-blur-md border border-white/40 shadow-sm rounded-3xl overflow-hidden">
                <div className="grid grid-cols-[1fr_auto_auto_auto_auto] text-[11px] font-bold uppercase tracking-wider text-on-surface-variant bg-surface-container-highest px-6 py-3 border-b border-outline-variant/30 gap-4">
                  <span>PID / Participante</span>
                  <span className="text-center">Revisión</span>
                  <span className="text-center">Confianza</span>
                  <span className="text-center">Nodos</span>
                  <span>Acceso Rápido</span>
                </div>
                {participants.map((p) => (
                  <div key={p.pid} className="grid grid-cols-[1fr_auto_auto_auto_auto] items-center px-6 py-4 border-b border-outline-variant/10 hover:bg-surface-container/40 transition-colors gap-4 last:border-0">
                    <span className="font-mono font-bold text-on-surface text-sm">{p.pid}</span>
                    <span className="text-center text-xs text-on-surface-variant font-bold bg-surface-container px-2 py-1 rounded-full">v{p.revision}</span>
                    <span className={`text-center text-xs font-bold px-2 py-1 rounded-full ${
                      p.confidence >= 0.7 ? 'bg-primary/10 text-primary' :
                      p.confidence >= 0.5 ? 'bg-tertiary/10 text-tertiary' :
                      'bg-error/10 text-error'
                    }`}>
                      {Math.round(p.confidence * 100)}%
                    </span>
                    <span className="text-center text-xs text-on-surface-variant">{p.nodes} nodos</span>
                    <div className="flex gap-2">
                      <button
                        onClick={() => navigate(`/modelo-mental/${p.pid}`)}
                        title="Ver Modelo Mental BDI"
                        className="w-8 h-8 rounded-lg bg-primary/10 text-primary hover:bg-primary hover:text-on-primary transition-colors flex items-center justify-center"
                      >
                        <span className="material-symbols-outlined text-[16px]">account_tree</span>
                      </button>
                      <button
                        onClick={() => navigate(`/ruta-pedagogica/${p.pid}`)}
                        title="Ver Ruta Pedagógica"
                        className="w-8 h-8 rounded-lg bg-secondary/10 text-secondary hover:bg-secondary hover:text-on-secondary transition-colors flex items-center justify-center"
                      >
                        <span className="material-symbols-outlined text-[16px]">route</span>
                      </button>
                      <button
                        onClick={() => navigate(`/auditoria/${p.pid}`)}
                        title="Ver Auditoría"
                        className="w-8 h-8 rounded-lg bg-surface-container text-on-surface-variant hover:bg-surface-container-high transition-colors flex items-center justify-center border border-outline-variant/30"
                      >
                        <span className="material-symbols-outlined text-[16px]">policy</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── Cola de Sincronización Offline (Deltas) ── */}
          <div className="mt-12 animate-in fade-in duration-700 delay-200">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-5">
              <div className="flex items-center gap-3">
                <span className="material-symbols-outlined text-secondary">cloud_sync</span>
                <h2 className="font-headline-md text-xl font-bold text-on-surface">Cola de Sincronización Offline</h2>
                <span className="bg-secondary/10 text-secondary px-3 py-0.5 rounded-full text-xs font-bold">
                  {filteredDeltas.length !== deltas.length ? `${filteredDeltas.length} de ${deltas.length}` : deltas.length} total
                </span>
              </div>
              
              {/* Filtro de estado */}
              <div className="flex items-center gap-2 self-start sm:self-auto">
                <span className="text-xs font-bold text-on-surface-variant uppercase tracking-wider">Estado:</span>
                <select
                  value={deltasFilter}
                  onChange={(e) => setDeltasFilter(e.target.value)}
                  className="bg-surface border border-outline-variant/50 text-on-surface rounded-xl px-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-secondary transition-all"
                >
                  <option value="all">Todos</option>
                  <option value="queued">En Cola (Pendientes)</option>
                  <option value="synced">Sincronizados</option>
                  <option value="conflict">Conflicto</option>
                </select>
              </div>
            </div>

            <div className="bg-surface/80 backdrop-blur-md border border-white/40 shadow-sm rounded-3xl overflow-hidden">
              {filteredDeltas.length === 0 ? (
                <p className="text-center text-on-surface-variant italic p-10 bg-surface-container/20">
                  {deltas.length === 0 ? "No hay transacciones offline registradas en el sistema." : "No se encontraron deltas con el filtro seleccionado."}
                </p>
              ) : (
                <>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                      <thead>
                        <tr className="border-b border-outline-variant/30 bg-surface-container-highest text-[11px] font-bold uppercase tracking-wider text-on-surface-variant">
                          <th className="px-6 py-3">ID Delta</th>
                          <th className="px-6 py-3">Tipo Objeto</th>
                          <th className="px-6 py-3">ID Objeto</th>
                          <th className="px-6 py-3">Capa Memoria</th>
                          <th className="px-6 py-3 text-center">Estado</th>
                          <th className="px-6 py-3">Firma Integridad</th>
                          <th className="px-6 py-3">Fecha</th>
                        </tr>
                      </thead>
                      <tbody>
                        {paginatedDeltas.map((d) => {
                          const date = d.created_at ? new Date(d.created_at).toLocaleString('es-CO') : '—';
                          const shortSignature = d.signature ? d.signature.substring(0, 12) + '...' : (d.data_hash ? d.data_hash.substring(0, 12) + '...' : '—');
                          const signatureTitle = d.signature || d.data_hash || '';
                          
                          return (
                            <tr key={d.delta_id} className="border-b border-outline-variant/10 hover:bg-surface-container/40 transition-colors last:border-0">
                              <td className="px-6 py-4 font-mono text-xs font-bold text-on-surface-variant" title={d.delta_id}>
                                {d.delta_id.substring(0, 8)}...
                              </td>
                              <td className="px-6 py-4 text-xs font-bold uppercase tracking-wide text-on-surface">
                                {d.object_type}
                              </td>
                              <td className="px-6 py-4 font-mono text-xs text-primary font-bold">
                                {d.object_id}
                              </td>
                              <td className="px-6 py-4 text-xs text-on-surface-variant font-mono">
                                {d.memory_layer}
                              </td>
                              <td className="px-6 py-4 text-center">
                                <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full tracking-wider ${
                                  d.status === 'synced' ? 'bg-primary/10 text-primary border border-primary/20' :
                                  d.status === 'conflict' ? 'bg-error/10 text-error border border-error/20' :
                                  'bg-secondary-container text-on-secondary-container border border-secondary/20'
                                }`}>
                                  {d.status === 'synced' ? 'Sincronizado' :
                                   d.status === 'conflict' ? 'Conflicto' : 'En cola'}
                                </span>
                              </td>
                              <td className="px-6 py-4">
                                <span className="font-mono text-[10px] text-on-surface-variant bg-surface-container px-2 py-0.5 rounded border border-outline-variant/30 cursor-help" title={signatureTitle}>
                                  {shortSignature}
                                </span>
                              </td>
                              <td className="px-6 py-4 text-xs text-on-surface-variant whitespace-nowrap">
                                {date}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  {/* Paginación de Deltas */}
                  {filteredDeltas.length > 0 && (
                    <div className="bg-surface-container-highest p-4 border-t border-outline-variant/30 flex flex-col sm:flex-row items-center justify-between gap-4">
                      {/* Selector de items por página */}
                      <div className="flex items-center gap-2 text-xs text-on-surface-variant">
                        <span>Mostrar</span>
                        <select
                          value={deltasPerPage}
                          onChange={(e) => setDeltasPerPage(Number(e.target.value))}
                          className="bg-surface border border-outline-variant/50 text-on-surface rounded-lg px-2 py-1 focus:outline-none focus:ring-2 focus:ring-secondary font-bold"
                        >
                          <option value={5}>5</option>
                          <option value={10}>10</option>
                          <option value={20}>20</option>
                        </select>
                        <span>de {filteredDeltas.length} transacciones</span>
                      </div>

                      {/* Navegación de páginas */}
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => setDeltasPage(1)}
                          disabled={deltasPage === 1}
                          className="w-8 h-8 rounded-lg flex items-center justify-center border border-outline-variant/50 text-on-surface-variant hover:text-secondary hover:border-secondary disabled:opacity-30 disabled:hover:text-on-surface-variant disabled:hover:border-outline-variant/50 transition-colors"
                          title="Primera página"
                        >
                          <span className="material-symbols-outlined text-[18px]">first_page</span>
                        </button>
                        <button
                          onClick={() => setDeltasPage(prev => Math.max(prev - 1, 1))}
                          disabled={deltasPage === 1}
                          className="w-8 h-8 rounded-lg flex items-center justify-center border border-outline-variant/50 text-on-surface-variant hover:text-secondary hover:border-secondary disabled:opacity-30 disabled:hover:text-on-surface-variant disabled:hover:border-outline-variant/50 transition-colors"
                          title="Página anterior"
                        >
                          <span className="material-symbols-outlined text-[18px]">chevron_left</span>
                        </button>

                        <span className="text-xs font-mono text-on-surface-variant mx-2 font-bold">
                          Pág. {deltasPage} de {totalDeltasPages || 1}
                        </span>

                        <button
                          onClick={() => setDeltasPage(prev => Math.min(prev + 1, totalDeltasPages))}
                          disabled={deltasPage === totalDeltasPages || totalDeltasPages === 0}
                          className="w-8 h-8 rounded-lg flex items-center justify-center border border-outline-variant/50 text-on-surface-variant hover:text-secondary hover:border-secondary disabled:opacity-30 disabled:hover:text-on-surface-variant disabled:hover:border-outline-variant/50 transition-colors"
                          title="Página siguiente"
                        >
                          <span className="material-symbols-outlined text-[18px]">chevron_right</span>
                        </button>
                        <button
                          onClick={() => setDeltasPage(totalDeltasPages)}
                          disabled={deltasPage === totalDeltasPages || totalDeltasPages === 0}
                          className="w-8 h-8 rounded-lg flex items-center justify-center border border-outline-variant/50 text-on-surface-variant hover:text-secondary hover:border-secondary disabled:opacity-30 disabled:hover:text-on-surface-variant disabled:hover:border-outline-variant/50 transition-colors"
                          title="Última página"
                        >
                          <span className="material-symbols-outlined text-[18px]">last_page</span>
                        </button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </>
      )}

      {/* Quick Actions */}
      <div className="mt-12 flex flex-wrap gap-4 animate-in fade-in slide-in-from-bottom-4 duration-700 delay-200">
        <Link to="/" className="flex items-center gap-2 bg-surface-container-highest text-on-surface px-6 py-3 rounded-2xl text-sm font-bold border border-outline-variant hover:bg-surface-container-high transition-all hover:-translate-y-0.5">
          <span className="material-symbols-outlined text-[18px]">arrow_back</span>
          Volver al Inicio
        </Link>
        <Link to="/revisiones" className="flex items-center gap-2 bg-secondary text-on-secondary px-6 py-3 rounded-2xl text-sm font-bold hover:shadow-md hover:-translate-y-0.5 transition-all">
          <span className="material-symbols-outlined text-[18px]">route</span>
          Ver Revisiones Pendientes
        </Link>
        <Link to="/aprobacion-curricular" className="flex items-center gap-2 bg-primary text-on-primary px-6 py-3 rounded-2xl text-sm font-bold hover:shadow-md hover:-translate-y-0.5 transition-all">
          <span className="material-symbols-outlined text-[18px]">school</span>
          Aprobación Curricular
        </Link>
      </div>

    </main>
  );
}
