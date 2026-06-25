import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { API_ENDPOINTS, getRevokeUrl } from '../api/client';

// ─── Helper: Traducir el payload JSON a texto legible ───────────────────────
// IMPORTANTE: Esta función debe definirse ANTES del componente para evitar el
// 'ReferenceError: Cannot access before initialization' (las const no se elevan/hoist).
const extractDeltaText = (log) => {
  try {
    const { action, payload } = log;
    switch(action) {
      case 'validate_consent':
        return `Consentimiento: ${payload.decision.toUpperCase()}. Permisos: ${payload.allowed_scopes.join(', ')}`;
      case 'normalize':
        return `Texto normalizado (${payload.channel}): "${payload.normalized_text.substring(0, 70)}..."`;
      case 'suggest_probe':
        return `Pregunta de profundización sugerida: "${payload.question}"`;
      case 'assign_codes': {
        const codes = payload.codes.map(c => c.code).join(', ');
        return `Códigos semánticos asignados: ${codes}`;
      }
      case 'update_mental_model':
        return `Grafo actualizado (Revisión ${payload.revision}). Nodos: ${payload.nodes.length} | Relaciones nuevas: ${payload.edges.length}`;
      case 'evaluate_fairness':
        return `Evaluación de sesgos: ${payload.decision}. Acción recomendada: ${payload.recommended_action}`;
      case 'propose_route':
        return `Ruta candidata generada (${payload.route_type}). Módulos propuestos: ${payload.steps.length}`;
      case 'explain_route':
        return `Razonamiento LLM: "${payload.explanation.substring(0, 80)}..."`;
      case 'open_review':
        return `Revisión Humana Requerida (Estado: ${payload.status}). Rol: ${payload.required_role}`;
      case 'approve_review':
        return `Aprobación Humana registrada. Review ID: ${payload.review_id.substring(0,8)}... Por: ${payload.resolved_by}`;
      case 'reject_review':
        return `Rechazo Humano registrado. Review ID: ${payload.review_id.substring(0,8)}... Por: ${payload.resolved_by}`;
      case 'persist_delta':
        return `Delta guardado en base de datos. Hash de integridad: ${payload.data_hash.substring(0, 16)}...`;
      default:
        return `Registro modificado en capa de memoria: ${log.memory_layer}`;
    }
  } catch (e) {
    return 'Detalles técnicos cifrados en el payload original.';
  }
};

export default function P7_Auditoria() {
  const navigate = useNavigate();
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [revokingId, setRevokingId] = useState(null);
  const [revokeScope, setRevokeScope] = useState('');  // '' = revocación total
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  // Paginación y Filtros
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterLayer, setFilterLayer] = useState(''); // '' = Todas
  
  // Usamos uno de los PIDs reales de tu base de datos
  const { pid: targetPid } = useParams(); // Obtenemos el PID a auditar desde la URL 

  useEffect(() => {
    fetchAuditLogs();
  }, [targetPid]);

  const fetchAuditLogs = async () => {
    setLoading(true);
    try {
      const response = await fetch(API_ENDPOINTS.AUDIT); // Ajusta la ruta si es necesario para filtrar por PID
      if (response.ok) {
        let data = await response.json();
        
        // Filtramos para mostrar solo los de este productor si está especificado
        if (targetPid) {
          data = data.filter(log => log.pid === targetPid);
        }
        
        // Ordenamos por fecha más reciente primero (opcional, dependiendo de cómo quieras verlo)
        data.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
        
        setLogs(data);
      } else {
        setLogs([]);
      }
    } catch (err) {
      console.warn("Backend de auditoría no disponible.");
      setLogs([]);
    } finally {
      setLoading(false);
    }
  };

  // Filtrar logs en el cliente
  const filteredLogs = logs.filter(log => {
    // Filtro por capa de memoria
    if (filterLayer && log.memory_layer !== filterLayer) {
      return false;
    }
    // Filtro por búsqueda de texto
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      const actionMatch = log.action && log.action.toLowerCase().includes(term);
      const agentMatch = log.agent && log.agent.toLowerCase().includes(term);
      const hashMatch = log.record_hash && log.record_hash.toLowerCase().includes(term);
      const deltaText = extractDeltaText(log).toLowerCase();
      const deltaMatch = deltaText.includes(term);
      return actionMatch || agentMatch || hashMatch || deltaMatch;
    }
    return true;
  });

  // Resetear a la página 1 cuando cambia algún filtro
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, filterLayer, itemsPerPage]);

  // Cálculos de paginación
  const totalPages = Math.ceil(filteredLogs.length / itemsPerPage);
  const paginatedLogs = filteredLogs.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );


  const handleRevoke = async () => {
    setShowConfirmModal(false);
    
    const scopeLabel = revokeScope
      ? `solo el alcance "${revokeScope}"`
      : 'TODOS los datos (relato, modelo mental BDI y ruta curricular)';

    setRevokingId(targetPid);
    try {
      const url = getRevokeUrl(
        targetPid,
        revokeScope || null,
        'Solicitud directa del operador en campo'
      );
      const response = await fetch(url, { method: 'POST' });
      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.detail || `Error ${response.status}`);
      }
      alert(`✅ Revocación completada para "${targetPid}". Alcance: ${scopeLabel}.`);
      navigate('/');
    } catch (err) {
      console.error(err);
      alert(`Error al revocar: ${err.message}`);
      setRevokingId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col justify-center items-center h-[60vh] gap-4">
        <span className="animate-spin material-symbols-outlined text-5xl text-on-surface-variant">sync</span>
        <p className="font-headline-md text-xl text-on-surface-variant animate-pulse">Recuperando cadena de auditoría criptográfica...</p>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto py-8 px-4 flex flex-col min-h-[calc(100vh-120px)]">
      
      {/* Header */}
      <header className="mb-8 flex-shrink-0">
        <div className="flex items-center gap-3 mb-2">
          <button onClick={() => navigate('/')} className="text-on-surface-variant hover:text-primary transition-colors">
            <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 0" }}>arrow_back</span>
          </button>
          <h1 className="font-display-lg text-3xl md:text-4xl font-bold text-on-surface">
            Auditoría de Datos
          </h1>
        </div>
        <div className="flex flex-col md:flex-row md:items-center justify-between ml-10 gap-4">
          <p className="font-body-md text-on-surface-variant">
            Trazabilidad de eventos, firmas criptográficas y gestión de revocación de consentimiento (Privacy by Design).
          </p>
          <div className="bg-surface-container-highest px-4 py-2 rounded-xl text-sm font-mono border border-outline-variant/50">
            PID Auditado: <span className="font-bold text-on-surface">{targetPid || 'Todos'}</span>
          </div>
        </div>
      </header>

      {/* Cadena de Auditoría (Línea de tiempo técnica real) */}
      <div className="flex-1 bg-surface/80 backdrop-blur-md border border-white/40 shadow-sm rounded-3xl overflow-hidden flex flex-col h-[65vh] min-h-[500px] mb-6">
        <div className="bg-surface-container-highest p-4 border-b border-outline-variant/30 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-on-surface-variant">history</span>
            <h2 className="font-label-md font-bold uppercase tracking-wider text-on-surface">Registro de Eventos (Log Criptográfico)</h2>
          </div>
          <span className="text-xs font-mono text-on-surface-variant">
            {filteredLogs.length !== logs.length ? `${filteredLogs.length} de ${logs.length}` : logs.length} eventos registrados
          </span>
        </div>

        {/* Filtros */}
        <div className="bg-surface-container/60 p-4 border-b border-outline-variant/30 flex flex-col md:flex-row gap-4 items-center justify-between shrink-0">
          <div className="relative w-full md:w-80">
            <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <span className="material-symbols-outlined text-on-surface-variant text-sm">search</span>
            </span>
            <input
              type="text"
              placeholder="Buscar acción, agente o detalle..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-surface border border-outline-variant/50 text-on-surface rounded-xl pl-9 pr-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary transition-all"
            />
          </div>
          <div className="flex items-center gap-2 w-full md:w-auto justify-end">
            <span className="text-xs font-bold text-on-surface-variant uppercase tracking-wider">Capa de Memoria:</span>
            <select
              value={filterLayer}
              onChange={(e) => setFilterLayer(e.target.value)}
              className="bg-surface border border-outline-variant/50 text-on-surface rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary transition-all"
            >
              <option value="">Todas</option>
              <option value="M_policy">M_policy (Políticas)</option>
              <option value="M_sem">M_sem (Semántica)</option>
              <option value="M_graph">M_graph (Grafo BDI)</option>
              <option value="M_audit">M_audit (Auditoría)</option>
              <option value="M_ing">M_ing (Ingesta)</option>
            </select>
          </div>
        </div>
        
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          {logs.length === 0 ? (
            <p className="text-center text-on-surface-variant italic">No hay eventos de auditoría para este productor.</p>
          ) : filteredLogs.length === 0 ? (
            <p className="text-center text-on-surface-variant italic">No se encontraron eventos de auditoría con los filtros aplicados.</p>
          ) : (
            paginatedLogs.map((log, index) => (
              <div key={log.record_hash} className="relative pl-6 pb-6 border-l-2 border-outline-variant/30 last:pb-0 last:border-transparent group">
                {/* Timeline dot */}
                <div className="absolute left-[-9px] top-0 w-4 h-4 rounded-full bg-surface border-2 border-primary group-hover:bg-primary transition-colors"></div>
                
                <div className="bg-surface-container p-4 rounded-2xl border border-outline-variant/20 hover:border-outline-variant transition-colors">
                  {/* Meta info */}
                  <div className="flex flex-wrap justify-between items-start gap-2 mb-3">
                    <div className="flex items-center gap-3">
                      <span className="text-xs font-mono bg-surface-container-highest px-2 py-1 rounded text-on-surface-variant border border-outline-variant/30 font-bold" title="Record Hash">
                        {log.record_hash.substring(0, 12)}...
                      </span>
                      {/* Badge dinámico según la capa de memoria */}
                      <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full tracking-widest ${
                        log.memory_layer === 'M_policy' ? 'bg-error-container text-on-error-container' :
                        log.memory_layer === 'M_sem' ? 'bg-secondary-container text-on-secondary-container' :
                        log.memory_layer === 'M_graph' ? 'bg-tertiary-fixed text-on-tertiary-fixed-variant' :
                        'bg-primary-fixed text-on-primary-fixed-variant'
                      }`}>
                        {log.memory_layer}
                      </span>
                    </div>
                    <span className="text-xs font-mono text-on-surface-variant opacity-70">
                      {new Date(log.timestamp).toLocaleString('es-CO')}
                    </span>
                  </div>

                  {/* Acción y Actor (Mapeados desde el JSON real) */}
                  <h4 className="font-headline-md text-lg text-on-surface mb-1 uppercase tracking-wide">
                    {log.action.replace(/_/g, ' ')}
                  </h4>
                  <p className="text-sm text-on-surface-variant mb-4 flex items-center gap-2">
                    <span className="material-symbols-outlined text-[16px]">smart_toy</span>
                    Agente Responsable: <strong className="font-mono text-primary">{log.agent}</strong>
                  </p>

                  {/* Delta / Payload Traducido */}
                  <div className="bg-surface-container-highest p-3 rounded-xl border border-outline-variant/30">
                    <p className="text-xs font-bold text-on-surface-variant uppercase mb-1 flex items-center gap-1">
                      <span className="material-symbols-outlined text-[14px]">data_object</span> Trazabilidad del Payload:
                    </p>
                    <p className="font-mono text-sm text-on-surface leading-relaxed">
                      {extractDeltaText(log)}
                    </p>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Paginación */}
        {filteredLogs.length > 0 && (
          <div className="bg-surface-container-highest p-4 border-t border-outline-variant/30 flex flex-col sm:flex-row items-center justify-between gap-4 shrink-0">
            {/* Selector de items por página */}
            <div className="flex items-center gap-2 text-xs text-on-surface-variant">
              <span>Mostrar</span>
              <select
                value={itemsPerPage}
                onChange={(e) => setItemsPerPage(Number(e.target.value))}
                className="bg-surface border border-outline-variant/50 text-on-surface rounded-lg px-2 py-1 focus:outline-none focus:ring-2 focus:ring-primary font-bold"
              >
                <option value={5}>5</option>
                <option value={10}>10</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
              </select>
              <span>de {filteredLogs.length} resultados</span>
            </div>

            {/* Navegación de páginas */}
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setCurrentPage(1)}
                disabled={currentPage === 1}
                className="w-8 h-8 rounded-lg flex items-center justify-center border border-outline-variant/50 text-on-surface-variant hover:text-primary hover:border-primary disabled:opacity-30 disabled:hover:text-on-surface-variant disabled:hover:border-outline-variant/50 transition-colors"
                title="Primera página"
              >
                <span className="material-symbols-outlined text-[18px]">first_page</span>
              </button>
              <button
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
                className="w-8 h-8 rounded-lg flex items-center justify-center border border-outline-variant/50 text-on-surface-variant hover:text-primary hover:border-primary disabled:opacity-30 disabled:hover:text-on-surface-variant disabled:hover:border-outline-variant/50 transition-colors"
                title="Página anterior"
              >
                <span className="material-symbols-outlined text-[18px]">chevron_left</span>
              </button>

              <span className="text-xs font-mono text-on-surface-variant mx-2 font-bold">
                Pág. {currentPage} de {totalPages || 1}
              </span>

              <button
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                disabled={currentPage === totalPages || totalPages === 0}
                className="w-8 h-8 rounded-lg flex items-center justify-center border border-outline-variant/50 text-on-surface-variant hover:text-primary hover:border-primary disabled:opacity-30 disabled:hover:text-on-surface-variant disabled:hover:border-outline-variant/50 transition-colors"
                title="Página siguiente"
              >
                <span className="material-symbols-outlined text-[18px]">chevron_right</span>
              </button>
              <button
                onClick={() => setCurrentPage(totalPages)}
                disabled={currentPage === totalPages || totalPages === 0}
                className="w-8 h-8 rounded-lg flex items-center justify-center border border-outline-variant/50 text-on-surface-variant hover:text-primary hover:border-primary disabled:opacity-30 disabled:hover:text-on-surface-variant disabled:hover:border-outline-variant/50 transition-colors"
                title="Última página"
              >
                <span className="material-symbols-outlined text-[18px]">last_page</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Panel de Revocación (Zona Peligrosa al Final) */}
      {targetPid && (
        <div className="bg-error-container/10 border border-error/30 p-6 rounded-3xl flex flex-col gap-5 shrink-0">
        <div className="flex items-start gap-3">
          <span className="material-symbols-outlined text-error text-3xl mt-0.5">warning</span>
          <div>
            <h3 className="font-headline-md text-error mb-1">Derecho al Olvido (Revocación de Consentimiento)</h3>
            <p className="text-sm text-on-surface-variant font-body-md">
              Si <strong>{targetPid.replace(/_/g, ' ')}</strong> retira su consentimiento, seleccione el alcance y confirme la purga de datos.
            </p>
          </div>
        </div>

        {/* Selector de alcance */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <select
            value={revokeScope}
            onChange={(e) => setRevokeScope(e.target.value)}
            disabled={revokingId === targetPid}
            className="flex-1 bg-surface border border-error/40 text-on-surface rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-error transition-all"
          >
            <option value="">⚠️ Revocación total (todos los datos)</option>
            <option value="raw_capture">Solo almacenamiento (raw_capture)</option>
            <option value="semantic_processing">Solo procesamiento IA (semantic_processing)</option>
            <option value="graph_derivative">Solo modelo mental BDI (graph_derivative)</option>
          </select>

          <button
            onClick={() => setShowConfirmModal(true)}
            disabled={revokingId === targetPid}
            className="bg-error hover:bg-on-error-container text-on-error px-6 py-3 rounded-xl font-label-md transition-colors flex items-center justify-center gap-2 shrink-0 shadow-sm disabled:opacity-60"
          >
            {revokingId === targetPid ? (
              <><span className="animate-spin material-symbols-outlined">sync</span> Purgando...</>
            ) : (
              <><span className="material-symbols-outlined">delete_forever</span> Revocar Consentimiento</>
            )}
          </button>
        </div>
      </div>
      )}

      {/* Modal de Confirmación */}
      <div className={`fixed inset-0 z-[100] flex items-center justify-center p-4 transition-all duration-300 ${showConfirmModal ? 'visible opacity-100' : 'invisible opacity-0'}`}>
        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowConfirmModal(false)}></div>
        
        <div className={`relative bg-surface border border-error/30 rounded-[32px] p-8 max-w-md w-full shadow-2xl transition-transform duration-300 ${showConfirmModal ? 'scale-100 translate-y-0' : 'scale-95 translate-y-4'}`}>
          <div className="w-16 h-16 rounded-full bg-error-container text-on-error-container flex items-center justify-center mx-auto mb-6 shadow-inner">
            <span className="material-symbols-outlined text-4xl">warning</span>
          </div>
          
          <h2 className="text-center font-display-lg text-2xl font-bold text-on-surface mb-4">
            ¿Confirmar Purga de Datos?
          </h2>
          
          <p className="text-center font-body-md text-on-surface-variant mb-8 leading-relaxed">
            Esta acción es <strong className="text-error">irreversible</strong>. ¿Estás seguro de que el productor <strong>{targetPid}</strong> ha solicitado revocar {revokeScope ? `solo el alcance "${revokeScope}"` : 'todos sus datos'}?
          </p>
          
          <div className="flex flex-col sm:flex-row gap-3">
            <button 
              onClick={() => setShowConfirmModal(false)}
              className="flex-1 px-6 py-3 rounded-2xl font-bold text-on-surface-variant bg-surface-container hover:bg-surface-container-high transition-colors"
            >
              Cancelar
            </button>
            <button 
              onClick={handleRevoke}
              className="flex-1 px-6 py-3 rounded-2xl font-bold text-on-error bg-error hover:bg-on-error-container shadow-sm transition-colors flex items-center justify-center gap-2"
            >
              <span className="material-symbols-outlined text-[20px]">delete_forever</span>
              Purga Definitiva
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// extractDeltaText ha sido movida al inicio del archivo (antes del componente)
// para evitar el ReferenceError de Temporal Dead Zone con declaraciones `const`.