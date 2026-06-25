import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import ForceGraph2D from 'react-force-graph-2d';
import { forceCollide } from 'd3-force-3d';
import { getChatUrl, getChatHistoryUrl, getMentalModelUrl, getRouteUrl, getRouteGenerateUrl } from '../api/client';
import { useToast } from '../components/ToastContext';

// ─── Paleta semántica (Material Design 3 Theme) ──────────────────────────────
const KIND_STYLE = {
  actor: { fill: '#ffdcc5', stroke: '#805533', text: '#301400', label: 'Actor' },
  concept: { fill: '#ebe8df', stroke: '#4d6453', text: '#1c1c17', label: 'Concepto' },
  value: { fill: '#d0e9d4', stroke: '#1b3022', text: '#0b2013', label: 'Valor' },
  belief: { fill: '#ffdad6', stroke: '#ba1a1a', text: '#93000a', label: 'Creencia' },
  fear: { fill: '#fdc39a', stroke: '#794e2e', text: '#301400', label: 'Temor' },
  intention: { fill: '#c8f17a', stroke: '#203000', text: '#131f00', label: 'Intención' },
};
const DEFAULT_STYLE = KIND_STYLE.concept;
const normalizeKind = (kind) => {
  const k = kind?.toLowerCase() ?? '';
  if (k === 'actor') return 'actor';
  if (k === 'value' || k === 'valor') return 'value';
  if (k === 'belief' || k === 'creencia') return 'belief';
  if (k === 'fear' || k === 'temor' || k === 'barrera') return 'fear';
  if (k === 'intention' || k === 'intencion' || k === 'intención' || k === 'necesidad' || k === 'preferencia' || k === 'opportunity') return 'intention';
  return 'concept';
};
const kindStyle = (kind) => KIND_STYLE[normalizeKind(kind)] ?? DEFAULT_STYLE;

// ─── Componente Meter para barras de progreso ───
function Meter({ value, max = 1, color = '#1b3022' }) {
  const pct = Math.round((value / max) * 100);
  return (
    <div className="flex items-center gap-3">
      <div className="flex-1 h-2 rounded-full bg-outline-variant/30 overflow-hidden shadow-inner">
        <div style={{ width: `${pct}%`, background: color }} className="h-full rounded-full transition-all duration-500" />
      </div>
      <span className="text-xs text-on-surface-variant font-bold min-w-[32px] text-right">{pct}%</span>
    </div>
  );
}

// ─── Renderizado de nodo canvas ───
function drawNode(node, ctx, globalScale) {
  const r = node.__r ?? 12;
  const ks = kindStyle(node.kind ?? node.group);

  // Círculo principal
  ctx.beginPath();
  ctx.arc(node.x, node.y, r, 0, 2 * Math.PI);
  ctx.fillStyle = ks.fill;
  ctx.fill();
  ctx.strokeStyle = ks.stroke;
  ctx.lineWidth = 1.5;
  ctx.stroke();

  // Label
  const fontSize = Math.max(8, 10 / globalScale);
  ctx.font = `600 ${fontSize}px Inter, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = ks.text;
  const label = node.label ?? node.id;
  ctx.fillText(label.length > 12 ? label.slice(0, 11) + '…' : label, node.x, node.y);
}

export default function P_ChatEtnografico() {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const messagesEndRef = useRef(null);
  const graphRef = useRef();
  const containerRef = useRef(null);

  // Configuración del chat
  const [pid, setPid] = useState('');
  const [channel, setChannel] = useState('text');
  const [sessionId, setSessionId] = useState('');
  const [isSessionActive, setIsSessionActive] = useState(false);
  const [shouldContinue, setShouldContinue] = useState(true);

  // Estados de carga e interfaz
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [tabIndex, setTabIndex] = useState('grafo'); // 'grafo' | 'metricas' | 'ruta'
  const [dimensions, setDimensions] = useState({ width: 480, height: 400 });

  // Estados para la ruta pedagógica en el panel derecho
  const [routeData, setRouteData] = useState(null);
  const [loadingRoute, setLoadingRoute] = useState(false);

  const fetchRoute = useCallback(async () => {
    if (!pid) return;
    setLoadingRoute(true);
    try {
      const response = await fetch(getRouteUrl(pid.trim()));
      if (response.ok) {
        const data = await response.json();
        setRouteData(data);
      } else {
        setRouteData(null);
      }
    } catch (err) {
      console.error('Error fetching route in chat:', err);
      setRouteData(null);
    } finally {
      setLoadingRoute(false);
    }
  }, [pid]);

  // Eliminamos el `useEffect` que hacía un fetchRoute automático al cambiar de pestaña.
  // La ruta ahora solo se consulta si explícitamente se pide, para evitar bucles.
  useEffect(() => {
    if (tabIndex === 'ruta' && isSessionActive && pid && !routeData) {
      fetchRoute();
    }
  }, [tabIndex, isSessionActive, pid, routeData, fetchRoute]);

  const handleGenerateRoute = async () => {
    if (!pid) return;
    setLoadingRoute(true);
    try {
      const response = await fetch(getRouteGenerateUrl(pid.trim()), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      if (response.ok) {
        const data = await response.json();
        setRouteData(data);
        showToast('Ruta curricular generada exitosamente.', 'success');
      } else {
        showToast('Error al generar la ruta curricular.', 'error');
      }
    } catch (err) {
      console.error('Error generating route:', err);
      showToast('Error de red al generar la ruta.', 'error');
    } finally {
      setLoadingRoute(false);
    }
  };

  // Datos cognitivos del participante (mental model, gaps, control, etc.)
  const [cognitiveData, setCognitiveData] = useState({
    nodes: [],
    edges: [],
    values: {},
    literacy: {
      C1: 0, C2: 0, C3: 0, C4: 0, C5: 0, C6: 0, C7: 0
    },
    open_gaps: [],
    risk_flags: [],
    phase: 'consent'
  });

  const [graphData, setGraphData] = useState({ nodes: [], links: [] });

  // Generar ID de sesión
  useEffect(() => {
    setSessionId(`sess_${Math.random().toString(36).substring(2, 11)}`);
  }, []);

  // Observar dimensiones del contenedor para redimensionar el grafo
  useEffect(() => {
    if (!containerRef.current) return;
    const resizeObserver = new ResizeObserver((entries) => {
      for (let entry of entries) {
        const { width, height } = entry.contentRect;
        setDimensions({
          width: Math.floor(width),
          height: Math.floor(height) || 400
        });
      }
    });
    resizeObserver.observe(containerRef.current);
    return () => resizeObserver.disconnect();
  }, [tabIndex]);

  // Hacer scroll automático al final del chat
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Actualizar datos del grafo cuando cambian los nodos/edges cognitivos
  useEffect(() => {
    const nodes = cognitiveData.nodes ?? [];
    const edges = cognitiveData.edges ?? [];
    
    // Buscar coordenadas de nodos existentes para no reiniciar la simulación
    const existingNodes = new Map(graphData.nodes.map(n => [n.id ?? n.node_id, n]));

    const mappedNodes = nodes.map(n => {
      const id = n.id ?? n.node_id;
      const existing = existingNodes.get(id);
      return {
        ...n,
        id: id,
        kind: normalizeKind(n.kind ?? n.group),
        __r: 10 + (n.confidence ?? 0.5) * 5,
        // Preservar coordenadas d3 si ya existía el nodo
        x: existing ? existing.x : undefined,
        y: existing ? existing.y : undefined,
        vx: existing ? existing.vx : undefined,
        vy: existing ? existing.vy : undefined
      };
    });

    const nodeIds = new Set(mappedNodes.map(n => n.id));
    const filteredEdges = edges.filter(e => {
      const s = e.source?.id ?? e.source;
      const t = e.target?.id ?? e.target;
      return nodeIds.has(s) && nodeIds.has(t);
    });

    setGraphData({
      nodes: mappedNodes,
      links: filteredEdges.map(e => ({
        source: e.source?.id ?? e.source,
        target: e.target?.id ?? e.target,
        ...e
      }))
    });
  }, [cognitiveData]);

  // Ajustar el zoom del grafo y recalentar la simulación
  useEffect(() => {
    if (graphRef.current && graphData.nodes.length > 0) {
      graphRef.current.d3Force('charge').strength(-400); // Fuerza de repulsión más fuerte
      graphRef.current.d3Force('link').distance(100);    // Mayor separación de enlaces
      graphRef.current.d3Force('collide', forceCollide(node => (node.__r ?? 12) + 15)); // Evitar solapamiento de nodos
      graphRef.current.d3ReheatSimulation();             // Recalentar simulación para aplicar fuerzas
      setTimeout(() => graphRef.current?.zoomToFit(300, 40), 300);
    }
  }, [graphData]);

  // Iniciar la conversación y cargar historial
  const handleStartSession = async (e) => {
    e.preventDefault();
    if (!pid.trim()) return;

    setLoading(true);
    try {
      // 1. Cargar historial de chat previo
      const historyRes = await fetch(getChatHistoryUrl(pid.trim()));
      if (historyRes.ok) {
        const historyData = await historyRes.json();
        // Si hay historial, cargarlo
        if (historyData.length > 0) {
          setMessages(historyData.map(t => ({
            role: t.role,
            text: t.text,
            ts: t.created_at
          })));
        } else {
          // Si no hay historial, agregar un mensaje de saludo inicial etnográfico
          setMessages([
            {
              role: 'assistant',
              text: 'Antes de conversar, necesito confirmar que usted está de acuerdo. La conversación es voluntaria y busca entender sus necesidades de aprendizaje sobre tecnología e inteligencia artificial. ¿Me autoriza a continuar?',
              ts: new Date().toISOString()
            }
          ]);
        }
      }

      // 2. Cargar el modelo mental actual de la BD
      const modelRes = await fetch(getMentalModelUrl(pid.trim()));
      if (modelRes.ok) {
        const modelData = await modelRes.json();
        setCognitiveData(prev => ({
          ...prev,
          nodes: modelData.nodes ?? [],
          edges: modelData.edges ?? [],
          values: modelData.values ?? {},
          literacy: modelData.literacy ?? prev.literacy,
          open_gaps: modelData.open_gaps ?? [],
          risk_flags: modelData.risk_flags ?? []
        }));
      }

      setIsSessionActive(true);
      setShouldContinue(true);
      showToast(`Sesión etnográfica iniciada para: ${pid.trim()}`, 'success');
    } catch (err) {
      showToast('Error al iniciar la sesión etnográfica.', 'error');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Enviar un mensaje
  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!inputMessage.trim() || loading || !pid.trim()) return;

    const userText = inputMessage.trim();
    setInputMessage('');
    setLoading(true);

    // Agregar mensaje del usuario en local
    setMessages(prev => [...prev, { role: 'user', text: userText, ts: new Date().toISOString() }]);

    try {
      // Payload dual
      const response = await fetch(getChatUrl(pid.trim()), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: userText,
          channel: channel,
          session_id: sessionId
        })
      });

      if (!response.ok) {
        throw new Error('Error al procesar el turno en el backend.');
      }

      const resData = await response.json();

      if (resData.status === 'blocked') {
        showToast('El flujo fue bloqueado por políticas de consentimiento (AGOV).', 'error');
        setMessages(prev => [...prev, {
          role: 'assistant',
          text: '⛔ La conversación ha sido bloqueada por políticas éticas del sistema debido a la falta de un consentimiento explícito o revocación del mismo.',
          ts: new Date().toISOString()
        }]);
        return;
      }

      // Añadir la respuesta del asistente
      setMessages(prev => [...prev, {
        role: 'assistant',
        text: resData.assistant_message,
        ts: new Date().toISOString()
      }]);

      // Consolidar estado cognitivo en tiempo real
      if (resData.mental_model) {
        setCognitiveData(prev => ({
          ...prev,
          nodes: resData.mental_model.nodes ?? [],
          edges: resData.mental_model.edges ?? [],
          values: resData.mental_model.values ?? {},
          literacy: resData.mental_model.literacy ?? prev.literacy,
          open_gaps: resData.open_gaps ?? [],
          risk_flags: resData.risk_flags ?? [],
          phase: resData.conversation_control?.phase ?? prev.phase
        }));
      }

      if (resData.conversation_control) {
        setShouldContinue(resData.conversation_control.should_continue !== false);
      }

      // Refrescar ruta si se está visualizando la pestaña de ruta ha sido REMOVIDO 
      // para evitar re-generación recursiva en cada turno de chat.

    } catch (err) {
      showToast(err.message, 'error');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-[1500px] mx-auto py-6 px-4 flex flex-col h-[calc(100vh-100px)] gap-4">
      {/* Header */}
      <header className="flex items-center gap-4 shrink-0 bg-surface/60 backdrop-blur-md p-4 rounded-3xl border border-white/40 shadow-sm">
        <button
          onClick={() => navigate('/')}
          className="bg-surface-container hover:bg-primary-fixed/50 text-on-surface-variant hover:text-primary w-12 h-12 rounded-full flex items-center justify-center transition-colors border border-outline-variant/30 animate-in fade-in"
        >
          <span className="material-symbols-outlined text-xl">arrow_back</span>
        </button>
        <div>
          <h1 className="m-0 text-2xl md:text-3xl font-display-lg font-bold text-on-surface">Chat Etnográfico Inteligente</h1>
          <p className="m-0 text-xs font-bold text-on-surface-variant mt-1">
            Escucha activa y modelado cognitivo turn-based • AETHNO-LLM Rural
          </p>
        </div>
        {isSessionActive && (
          <div className="ml-auto flex items-center gap-2">
            <span className="text-[10px] font-bold uppercase tracking-wider bg-primary/10 text-primary border border-primary/20 px-3 py-1 rounded-full flex items-center gap-1.5 shadow-sm">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
              </span>
              Fase: {cognitiveData.phase.toUpperCase()}
            </span>
          </div>
        )}
      </header>

      {/* Main Grid */}
      <div className="flex-1 flex flex-col lg:flex-row gap-4 min-h-0">
        
        {/* Columna Izquierda: Panel de Control + Chat */}
        <section className="flex-[1.2] flex flex-col rounded-3xl border border-white/40 bg-surface/60 backdrop-blur-md overflow-hidden shadow-sm min-h-0">
          
          {/* Formulario de Inicio si no está activo */}
          {!isSessionActive ? (
            <div className="flex-1 flex flex-col items-center justify-center p-8 max-w-md mx-auto text-center space-y-6">
              <div className="w-16 h-16 rounded-3xl bg-primary-container text-on-primary flex items-center justify-center shadow-inner">
                <span className="material-symbols-outlined text-4xl" style={{ fontVariationSettings: "'FILL' 1" }}>chat</span>
              </div>
              <div>
                <h2 className="font-bold text-xl text-on-surface">Iniciar Diálogo Etnográfico</h2>
                <p className="text-sm text-on-surface-variant mt-2 leading-relaxed">
                  Ingrese el PID del productor para cargar su historial o iniciar una nueva conversación guiada.
                </p>
              </div>

              <form onSubmit={handleStartSession} className="w-full space-y-4 text-left">
                <div>
                  <label htmlFor="pidInput" className="block text-xs font-bold text-on-surface uppercase tracking-wider mb-2">
                    ID del Productor (PID)
                  </label>
                  <input
                    type="text"
                    id="pidInput"
                    placeholder="Ej: don_aurelio, campesina_soto"
                    value={pid}
                    onChange={e => setPid(e.target.value)}
                    className="w-full bg-surface-container border border-outline-variant rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
                    required
                  />
                </div>

                <div>
                  <label htmlFor="channelSelect" className="block text-xs font-bold text-on-surface uppercase tracking-wider mb-2">
                    Canal de Interacción
                  </label>
                  <select
                    id="channelSelect"
                    value={channel}
                    onChange={e => setChannel(e.target.value)}
                    className="w-full bg-surface-container border border-outline-variant rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all cursor-pointer"
                  >
                    <option value="text">Texto Plano (Kiosco)</option>
                    <option value="audio">Voz Transcrita</option>
                    <option value="whatsapp">WhatsApp / Chatbot</option>
                    <option value="facilitated">Mediación del Facilitador</option>
                  </select>
                </div>

                <button
                  type="submit"
                  disabled={loading || !pid.trim()}
                  className="w-full py-3 bg-primary hover:bg-primary/95 text-on-primary font-bold rounded-xl shadow-md transition-all flex items-center justify-center gap-2 hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? (
                    <>
                      <span className="animate-spin material-symbols-outlined text-[20px]">sync</span>
                      Conectando agentes...
                    </>
                  ) : (
                    <>
                      <span className="material-symbols-outlined text-[20px]">play_arrow</span>
                      Iniciar Conversación
                    </>
                  )}
                </button>
              </form>
            </div>
          ) : (
            // Ventana de Chat Activa
            <div className="flex-1 flex flex-col min-h-0">
              {/* Info de sesión */}
              <div className="bg-surface-container/60 border-b border-outline-variant/30 px-5 py-3 flex items-center justify-between shrink-0">
                <div>
                  <span className="text-xs font-bold text-on-surface-variant">Conversando con: </span>
                  <code className="text-xs font-mono font-bold bg-primary-container/40 text-primary px-2 py-0.5 rounded border border-primary/15">{pid}</code>
                </div>
                <div className="flex gap-2">
                  {cognitiveData.nodes.length > 0 && (
                    <button
                      onClick={() => navigate(`/ruta-pedagogica/${pid}`)}
                      className="text-xs font-bold text-primary bg-primary/10 hover:bg-primary hover:text-on-primary px-3 py-1.5 rounded-full border border-primary/20 transition-all flex items-center gap-1 cursor-pointer"
                    >
                      <span className="material-symbols-outlined text-[14px]">route</span>
                      Ver Ruta Pedagógica
                    </button>
                  )}
                  <button
                    onClick={() => {
                      setIsSessionActive(false);
                      setMessages([]);
                    }}
                    className="text-xs font-bold text-error bg-error/10 hover:bg-error hover:text-white px-3 py-1.5 rounded-full border border-error/20 transition-all cursor-pointer"
                  >
                    Cerrar Diálogo
                  </button>
                </div>
              </div>

              {/* Mensajes */}
              <div className="flex-1 overflow-y-auto p-5 space-y-4">
                {messages.map((msg, i) => {
                  const isUser = msg.role === 'user';
                  return (
                    <div
                      key={i}
                      className={`flex ${isUser ? 'justify-end' : 'justify-start'} animate-in fade-in slide-in-from-bottom-2 duration-300`}
                    >
                      <div
                        className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-relaxed shadow-sm border ${
                          isUser
                            ? 'bg-primary text-on-primary border-primary rounded-tr-none'
                            : 'bg-surface-container-high text-on-surface border-outline-variant/30 rounded-tl-none'
                        }`}
                      >
                        <p className="m-0 whitespace-pre-wrap">{msg.text}</p>
                        <span className={`block text-[9px] mt-1.5 text-right font-bold opacity-60 ${isUser ? 'text-on-primary' : 'text-on-surface-variant'}`}>
                          {msg.ts ? new Date(msg.ts).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' }) : ''}
                        </span>
                      </div>
                    </div>
                  );
                })}
                {loading && (
                  <div className="flex justify-start animate-pulse">
                    <div className="bg-surface-container-high border border-outline-variant/30 rounded-2xl rounded-tl-none px-5 py-3 text-xs flex items-center gap-2 text-on-surface-variant shadow-sm">
                      <span className="material-symbols-outlined animate-spin text-[16px] text-primary">sync</span>
                      AETHNO-LLM está interpretando y reconstruyendo su modelo mental...
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Formulario de Envío */}
              <form onSubmit={handleSendMessage} className="p-4 bg-surface-container-lowest border-t border-outline-variant/30 flex items-center gap-3 shrink-0">
                <input
                  type="text"
                  placeholder={!shouldContinue ? '🔒 Diálogo finalizado. El modelo mental está consolidado.' : loading ? 'Espere a que responda el agente...' : 'Escriba un relato o respuesta para continuar la conversación...'}
                  value={inputMessage}
                  onChange={e => setInputMessage(e.target.value)}
                  disabled={loading || !shouldContinue}
                  className="flex-1 bg-surface-container border border-outline-variant rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                />
                <button
                  type="submit"
                  disabled={loading || !shouldContinue || !inputMessage.trim()}
                  className="w-12 h-12 rounded-xl bg-primary text-on-primary hover:shadow-md hover:-translate-y-0.5 transition-all flex items-center justify-center flex-shrink-0 disabled:opacity-40 disabled:cursor-not-allowed disabled:transform-none"
                >
                  <span className="material-symbols-outlined text-[20px]" style={{ fontVariationSettings: "'FILL' 1" }}>
                    {!shouldContinue ? 'lock' : 'send'}
                  </span>
                </button>
              </form>
            </div>
          )}
        </section>

        {/* Columna Derecha: Grafo Mental + Métricas (BDI Visualizer) */}
        <section className="flex-1 flex flex-col rounded-3xl border border-white/40 bg-surface/60 backdrop-blur-md overflow-hidden shadow-sm min-h-0">
          {/* Navegación pestañas */}
          <div className="flex border-b border-outline-variant/30 bg-surface-container/30 shrink-0">
            <button
              onClick={() => setTabIndex('grafo')}
              className={`flex-1 py-3.5 text-[10px] sm:text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all ${
                tabIndex === 'grafo'
                  ? 'text-primary border-b-2 border-primary bg-primary-container/10'
                  : 'text-on-surface-variant hover:text-on-surface'
              }`}
            >
              <span className="material-symbols-outlined text-[15px]">account_tree</span>
              Grafo (Gᵢ)
            </button>
            <button
              onClick={() => setTabIndex('metricas')}
              className={`flex-1 py-3.5 text-[10px] sm:text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all ${
                tabIndex === 'metricas'
                  ? 'text-primary border-b-2 border-primary bg-primary-container/10'
                  : 'text-on-surface-variant hover:text-on-surface'
              }`}
            >
              <span className="material-symbols-outlined text-[15px]">analytics</span>
              Métricas BDI (vᵢ, ℓᵢ)
            </button>
            <button
              onClick={() => setTabIndex('ruta')}
              className={`flex-1 py-3.5 text-[10px] sm:text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all ${
                tabIndex === 'ruta'
                  ? 'text-primary border-b-2 border-primary bg-primary-container/10'
                  : 'text-on-surface-variant hover:text-on-surface'
              }`}
            >
              <span className="material-symbols-outlined text-[15px]">route</span>
              Ruta (Rᵢ)
            </button>
          </div>

          <div ref={containerRef} className={`flex-1 min-h-0 relative ${tabIndex === 'grafo' ? 'overflow-hidden' : 'overflow-y-auto'}`}>
            {tabIndex === 'grafo' && (
              // Grafo Mental
              <div className="w-full h-full bg-surface-container-lowest/15 relative overflow-hidden">
                {graphData.nodes.length === 0 ? (
                  <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-6 opacity-60">
                    <span className="material-symbols-outlined text-4xl text-on-surface-variant mb-2">schema</span>
                    <p className="text-xs font-bold text-on-surface-variant">El Grafo Mental (Gᵢ) se generará dinámicamente conforme avance la conversación.</p>
                  </div>
                ) : (
                  <>
                    <ForceGraph2D
                      ref={graphRef}
                      graphData={graphData}
                      width={dimensions.width}
                      height={dimensions.height}
                      nodeColor={n => kindStyle(n.kind ?? n.group).fill}
                      nodeCanvasObject={drawNode}
                      nodeCanvasObjectMode={() => 'replace'}
                      linkColor={() => '#4d6453'}
                      linkWidth={l => 1.5 + (l.weight ?? 0.5) * 3}
                      linkDirectionalArrowLength={5}
                      linkDirectionalArrowRelPos={1}
                      cooldownTicks={100}
                    />
                    {/* Leyenda */}
                    <div className="absolute bottom-4 left-4 right-4 flex flex-wrap gap-2 text-[9px] font-bold p-2 bg-surface/90 rounded-xl border border-outline-variant/20 shadow-sm pointer-events-none">
                      {Object.keys(KIND_STYLE).map(k => {
                        const style = kindStyle(k);
                        return (
                          <span key={k} className="flex items-center gap-1">
                            <span className="w-2 h-2 rounded-full inline-block border" style={{ background: style.fill, borderColor: style.stroke }} />
                            {style.label}
                          </span>
                        );
                      })}
                    </div>
                  </>
                )}
              </div>
            )}
            
            {tabIndex === 'metricas' && (
              // Métricas y Dominios
              <div className="p-5 space-y-6">
                
                {/* Valores */}
                <div>
                  <h3 className="text-xs font-bold text-secondary uppercase tracking-widest mb-3 flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-[16px]">star</span>
                    Valores Culturales (vᵢ)
                  </h3>
                  {Object.keys(cognitiveData.values).length === 0 ? (
                    <p className="text-xs italic text-on-surface-variant">Ninguno detectado aún.</p>
                  ) : (
                    <div className="space-y-3 bg-surface-container/40 p-4 rounded-2xl border border-outline-variant/20">
                      {Object.entries(cognitiveData.values).map(([k, v]) => (
                        <div key={k}>
                          <p className="text-xs font-bold text-on-surface capitalize mb-1">{k.replace(/_/g, ' ')}</p>
                          <Meter value={v} color="#006d3a" />
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Perfil de Alfabetización */}
                <div>
                  <h3 className="text-xs font-bold text-secondary uppercase tracking-widest mb-3 flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-[16px]">school</span>
                    Dominios de Alfabetización (ℓᵢ)
                  </h3>
                  <div className="space-y-3 bg-surface-container/40 p-4 rounded-2xl border border-outline-variant/20">
                    {[
                      { key: 'C1', name: 'C1: Comprensión conceptual' },
                      { key: 'C2', name: 'C2: Datos y gobernanza' },
                      { key: 'C3', name: 'C3: Lectura crítica' },
                      { key: 'C4', name: 'C4: Humano-en-el-bucle' },
                      { key: 'C5', name: 'C5: Sesgo y equidad' },
                      { key: 'C6', name: 'C6: Experimentación segura' },
                      { key: 'C7', name: 'C7: Seguridad y soberanía' }
                    ].map(({ key, name }) => {
                      const val = cognitiveData.literacy[key] ?? 0;
                      return (
                        <div key={key}>
                          <p className="text-xs font-bold text-on-surface mb-1">{name}</p>
                          <Meter value={val} color="#005db3" />
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Brechas y Riesgos */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  
                  {/* Brechas abiertas */}
                  <div className="bg-surface-container/30 p-4 rounded-2xl border border-outline-variant/20">
                    <h4 className="text-[10px] font-bold text-secondary uppercase tracking-wider mb-2 flex items-center gap-1">
                      <span className="material-symbols-outlined text-[14px]">help_center</span>
                      Brechas Abiertas ({cognitiveData.open_gaps?.length ?? 0})
                    </h4>
                    {cognitiveData.open_gaps?.length === 0 ? (
                      <p className="text-[10px] italic text-on-surface-variant">Ninguna registrada.</p>
                    ) : (
                      <ul className="m-0 pl-4 space-y-1.5 text-xs text-on-surface-variant">
                        {cognitiveData.open_gaps?.map((g, idx) => (
                          <li key={idx} className="leading-tight">{g.gap ?? g}</li>
                        ))}
                      </ul>
                    )}
                  </div>

                  {/* Banderas de Riesgo */}
                  <div className="bg-error-container/10 p-4 rounded-2xl border border-error/20">
                    <h4 className="text-[10px] font-bold text-error uppercase tracking-wider mb-2 flex items-center gap-1">
                      <span className="material-symbols-outlined text-[14px]">warning</span>
                      Riesgos ({cognitiveData.risk_flags?.length ?? 0})
                    </h4>
                    {cognitiveData.risk_flags?.length === 0 ? (
                      <p className="text-[10px] italic text-on-surface-variant">Ninguno detectado.</p>
                    ) : (
                      <ul className="m-0 pl-4 space-y-1 text-xs text-error font-medium">
                        {cognitiveData.risk_flags?.map((f, idx) => (
                          <li key={idx} className="leading-tight">{f.description ?? f.type ?? f}</li>
                        ))}
                      </ul>
                    )}
                  </div>

                </div>

              </div>
            )}

            {tabIndex === 'ruta' && (
              // Vista compacta de la ruta pedagógica
              <div className="p-5 space-y-6">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold text-secondary uppercase tracking-widest flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-[16px]">route</span>
                    Propuesta Curricular (Rᵢ)
                  </h3>
                  {routeData && (
                    <button
                      onClick={() => navigate(`/ruta-pedagogica/${pid}`)}
                      className="text-[10px] font-bold text-primary bg-primary/10 border border-primary/20 hover:bg-primary hover:text-on-primary px-2.5 py-1 rounded-full transition-all flex items-center gap-1"
                    >
                      <span className="material-symbols-outlined text-[12px]">open_in_new</span>
                      Expandir Vista
                    </button>
                  )}
                </div>

                {loadingRoute ? (
                  <div className="text-center py-10 animate-pulse text-primary text-xs font-bold">
                    Descargando propuesta de ruta...
                  </div>
                ) : !routeData ? (
                  <div className="text-center py-12 bg-surface-container/30 border border-dashed border-outline-variant/30 rounded-2xl p-6">
                    <span className="material-symbols-outlined text-3xl text-on-surface-variant opacity-40 mb-2">route</span>
                    <p className="text-xs font-bold text-on-surface-variant">No hay ruta generada todavía.</p>
                    <p className="text-[10px] text-on-surface-variant opacity-70 mt-1 mb-4">Concluye más turnos en el chat y luego genera la ruta a partir del modelo mental actual.</p>
                    <button
                      onClick={handleGenerateRoute}
                      disabled={loadingRoute || cognitiveData.nodes.length === 0}
                      className="bg-primary hover:bg-primary/90 text-on-primary text-xs font-bold px-4 py-2 rounded-xl transition-colors disabled:opacity-50 flex items-center gap-2 mx-auto shadow-sm"
                    >
                      <span className="material-symbols-outlined text-[16px]">magic_button</span>
                      Generar Ruta Curricular
                    </button>
                    {cognitiveData.nodes.length === 0 && (
                      <p className="text-[9px] text-error mt-2">El modelo mental está vacío. Interactúa más en el chat.</p>
                    )}
                  </div>
                ) : (
                  <div className="space-y-6 animate-in fade-in duration-300">
                    
                    {/* Tarjeta resumen ruta */}
                    <div className="bg-surface-container/60 border border-outline-variant/30 p-4 rounded-2xl relative overflow-hidden">
                      <div className="absolute top-0 left-0 w-1.5 h-full bg-primary"></div>
                      <h4 className="font-bold text-primary text-sm">Ruta {routeData.route_type}</h4>
                      <p className="text-[10px] text-on-surface-variant mt-1 italic">
                        "{routeData.explanation || 'Sin justificación registrada.'}"
                      </p>
                    </div>

                    {/* Pasos / Cronología simplificada */}
                    <div className="relative border-l border-primary/25 ml-3 pl-5 space-y-5">
                      {routeData.steps?.map((step, idx) => (
                        <div key={idx} className="relative">
                          {/* Pin */}
                          <div className="absolute -left-[26px] top-1 w-3.5 h-3.5 rounded-full border-2 border-white bg-primary shadow-sm flex items-center justify-center text-[7px] text-on-primary font-bold">
                            {idx + 1}
                          </div>
                          
                          <div className="bg-surface-container/30 border border-outline-variant/20 p-3 rounded-xl hover:border-outline transition-colors">
                            <div className="flex justify-between items-center mb-1">
                              <span className="text-[9px] font-black text-primary uppercase tracking-widest">{step.module_id}</span>
                              <span className="text-[8px] bg-surface-container px-1.5 py-0.5 rounded text-on-surface-variant uppercase font-mono">{step.modality}</span>
                            </div>
                            <h5 className="font-bold text-on-surface text-xs">{step.title}</h5>
                            <p className="text-[10px] text-on-surface-variant mt-1 leading-snug line-clamp-2" title={step.assessment || step.rationale}>
                              {step.assessment || step.rationale}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </section>

      </div>
    </div>
  );
}
