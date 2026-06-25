import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import ForceGraph2D from 'react-force-graph-2d';
import { forceCollide } from 'd3-force-3d';
import { getMentalModelUrl } from '../api/client';

// ─── Paleta semántica (Material Design 3 Theme) ──────────────────────────────
const KIND_STYLE = {
  actor: { fill: '#ffdcc5', stroke: '#805533', text: '#301400', label: 'Actor' }, // secondary-fixed
  concept: { fill: '#ebe8df', stroke: '#4d6453', text: '#1c1c17', label: 'Concepto' }, // surface-container-high
  value: { fill: '#d0e9d4', stroke: '#1b3022', text: '#0b2013', label: 'Valor' }, // primary-fixed
  belief: { fill: '#ffdad6', stroke: '#ba1a1a', text: '#93000a', label: 'Creencia' }, // error-container
  fear: { fill: '#fdc39a', stroke: '#794e2e', text: '#301400', label: 'Temor' }, // secondary-container
  intention: { fill: '#c8f17a', stroke: '#203000', text: '#131f00', label: 'Intención' }, // tertiary-fixed
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

// ─── Helpers ────────────────────────────────────────────────────────────────
function Badge({ label, style = {}, className = '' }) {
  return (
    <span 
      className={`inline-block px-3 py-0.5 rounded-full text-[10px] font-bold border border-outline-variant/30 uppercase tracking-wider ${className}`}
      style={style}
    >
      {label}
    </span>
  );
}

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

// ─── Renderizado de nodo canvas (ForceGraph2D custom) ────────────────────────
function drawNode(node, ctx, globalScale, selectedId) {
  const r = node.__r ?? 14;
  const ks = kindStyle(node.kind ?? node.group);
  const isSelected = node.id === selectedId;

  // Halo si está seleccionado
  if (isSelected) {
    ctx.beginPath();
    ctx.arc(node.x, node.y, r + 5, 0, 2 * Math.PI);
    ctx.fillStyle = ks.stroke + '33';
    ctx.fill();
  }

  // Círculo principal
  ctx.beginPath();
  ctx.arc(node.x, node.y, r, 0, 2 * Math.PI);
  ctx.fillStyle = ks.fill;
  ctx.fill();
  ctx.strokeStyle = ks.stroke;
  ctx.lineWidth = isSelected ? 2.5 : 1;
  ctx.stroke();

  // Anillo de confianza (arco exterior)
  const conf = 1 - (node.confidence ?? 0.5);
  ctx.beginPath();
  ctx.arc(node.x, node.y, r + 3, -Math.PI / 2, -Math.PI / 2 + 2 * Math.PI * conf);
  ctx.strokeStyle = ks.stroke + 'aa';
  ctx.lineWidth = 2;
  ctx.stroke();

  // Label
  const fontSize = Math.max(8, 11 / globalScale);
  ctx.font = `600 ${fontSize}px Inter, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = ks.text;
  const label = node.label ?? node.id;
  ctx.fillText(label.length > 14 ? label.slice(0, 13) + '…' : label, node.x, node.y);
}

// ─── Panel lateral ───────────────────────────────────────────────────────────
function NodePanel({ node, edges, nodes, onClose }) {
  if (!node) return (
    <div className="flex-1 flex flex-col items-center justify-center opacity-50 gap-3 text-center px-4">
      <div className="w-16 h-16 rounded-full bg-surface-container-high flex items-center justify-center mb-2">
        <span className="material-symbols-outlined text-4xl text-on-surface-variant">touch_app</span>
      </div>
      <p className="text-sm font-bold text-on-surface-variant">Haz clic en un nodo para examinar la creencia extraída.</p>
    </div>
  );

  const ks = kindStyle(node.kind ?? node.group);
  const outEdges = edges.filter(e => (e.source?.id ?? e.source) === node.id);
  const inEdges = edges.filter(e => (e.target?.id ?? e.target) === node.id);
  const nodeById = (id) => nodes.find(n => n.id === (id?.id ?? id));

  return (
    <div className="flex flex-col gap-6 overflow-y-auto pb-4 pr-1 animate-in slide-in-from-right-4 duration-300">
      {/* Header del nodo */}
      <div className="flex items-start gap-4">
        <div 
          className="w-12 h-12 rounded-2xl shrink-0 flex items-center justify-center border-2 shadow-sm"
          style={{ background: ks.fill, borderColor: ks.stroke, color: ks.text }}
        >
          <span className="font-bold text-lg">{(node.label ?? node.id).slice(0, 2).toUpperCase()}</span>
        </div>
        <div className="flex-1 min-w-0">
          <p className="m-0 font-display-lg text-xl font-bold text-on-surface leading-tight mb-1">{node.label ?? node.id}</p>
          <Badge label={ks.label} style={{ background: ks.fill, borderColor: ks.stroke, color: ks.text }} />
        </div>
        <button onClick={onClose} className="bg-surface-container hover:bg-error-container hover:text-error text-on-surface-variant rounded-full w-8 h-8 flex items-center justify-center transition-colors">
          <span className="material-symbols-outlined text-sm font-bold">close</span>
        </button>
      </div>

      {/* Confianza */}
      <div className="bg-surface p-4 rounded-2xl border border-outline-variant/30 shadow-sm">
        <p className="m-0 mb-3 text-[10px] font-bold text-on-surface-variant uppercase tracking-widest flex items-center gap-1.5">
          <span className="material-symbols-outlined text-[14px]">psychology</span>
          Confianza del modelo
        </p>
        <Meter value={node.confidence ?? 0.5} color={ks.stroke} />
      </div>

      {/* Relaciones salientes */}
      {outEdges.length > 0 && (
        <div>
          <p className="m-0 mb-3 text-[10px] font-bold text-secondary uppercase tracking-widest flex items-center gap-1.5">
            <span className="material-symbols-outlined text-[14px]">output</span>
            Impacta en
          </p>
          <div className="flex flex-col gap-3">
            {outEdges.map((e, i) => {
              const tgt = nodeById(e.target);
              const tgtKs = kindStyle(tgt?.kind ?? tgt?.group);
              return (
                <div key={i} className="bg-surface p-4 rounded-2xl border border-outline-variant/30 shadow-sm transition-colors hover:border-primary/40">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-[10px] font-mono font-bold text-on-surface-variant bg-surface-container-high px-2 py-0.5 rounded uppercase tracking-wide border border-outline-variant/30">
                      {e.relation ?? e.label}
                    </span>
                    {e.inferred && <Badge label="Inferencia LLM" className="text-[9px] px-2 bg-tertiary-fixed border-tertiary/20 text-on-tertiary-fixed" />}
                  </div>
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-3 h-3 rounded-full shrink-0 border-2" style={{ background: tgtKs.fill, borderColor: tgtKs.stroke }} />
                    <span className="text-sm font-bold text-on-surface">{tgt?.label ?? e.target}</span>
                  </div>
                  <Meter value={e.weight ?? 0.5} color={ks.stroke} />
                  {e.support_count != null && (
                    <p className={`m-0 mt-3 text-[11px] font-medium border-t border-outline-variant/20 pt-2 ${
                      (e.uncertainty ?? 0) > 0.5 ? 'text-amber-600 font-bold' : (e.uncertainty ?? 0) < 0.1 ? 'text-green-600' : 'text-on-surface-variant'
                    }`}>
                      {e.support_count} fragmentos de evidencia · Incertidumbre: {Math.round((e.uncertainty ?? 0) * 100)}%
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Relaciones entrantes */}
      {inEdges.length > 0 && (
        <div>
          <p className="m-0 mb-3 text-[10px] font-bold text-secondary uppercase tracking-widest flex items-center gap-1.5">
            <span className="material-symbols-outlined text-[14px]">input</span>
            Influenciado por
          </p>
          <div className="flex flex-col gap-2">
            {inEdges.map((e, i) => {
              const src = nodeById(e.source);
              const srcKs = kindStyle(src?.kind ?? src?.group);
              return (
                <div key={i} className="bg-surface p-4 rounded-2xl border border-outline-variant/30 shadow-sm transition-colors hover:border-primary/40">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-[10px] font-mono font-bold text-on-surface-variant bg-surface-container-high px-2 py-0.5 rounded uppercase tracking-wide border border-outline-variant/30">
                      ← {e.relation ?? e.label}
                    </span>
                    {e.inferred && <Badge label="Inferencia LLM" className="text-[9px] px-2 bg-tertiary-fixed border-tertiary/20 text-on-tertiary-fixed" />}
                  </div>
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-3 h-3 rounded-full shrink-0 border-2" style={{ background: srcKs.fill, borderColor: srcKs.stroke }} />
                    <span className="text-sm font-bold text-on-surface">{src?.label ?? e.source}</span>
                  </div>
                  <Meter value={e.weight ?? 0.5} color={srcKs.stroke} />
                  {e.support_count != null && (
                    <p className={`m-0 mt-3 text-[11px] font-medium border-t border-outline-variant/20 pt-2 ${
                      (e.uncertainty ?? 0) > 0.5 ? 'text-amber-600 font-bold' : (e.uncertainty ?? 0) < 0.1 ? 'text-green-600' : 'text-on-surface-variant'
                    }`}>
                      {e.support_count} fragmentos de evidencia · Incertidumbre: {Math.round((e.uncertainty ?? 0) * 100)}%
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Panel: Relato + Evidencias ─────────────────────────────────────────────
function NarrativePanel({ evidenceRefs = [], contradictions = [], title = "Fragmentos del Relato" }) {
  if (evidenceRefs.length === 0)
    return (
      <div className="flex flex-col items-center justify-center h-full opacity-50 gap-2 text-center px-4 py-8">
        <span className="material-symbols-outlined text-3xl text-on-surface-variant">article</span>
        <p className="text-xs text-on-surface-variant">Sin fragmentos de relato disponibles.</p>
      </div>
    );
  return (
    <div className="flex flex-col gap-3 overflow-y-auto max-h-[500px] pr-1">
      <p className="text-[10px] font-bold uppercase tracking-widest text-secondary mb-1 flex items-center gap-1.5">
        <span className="material-symbols-outlined text-[14px]">format_quote</span>
        {title} ({evidenceRefs.length})
      </p>
      {evidenceRefs.slice(0, 15).map((ref, i) => (
        <div key={i} className="p-3 rounded-xl bg-surface border border-outline-variant/30 text-xs leading-relaxed">
          <p className="text-on-surface italic mb-2">"{ref.quote}"</p>
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider ${
              ref.kind === 'direct' ? 'bg-primary-fixed text-on-primary-fixed' : 'bg-tertiary-fixed text-on-tertiary-fixed'
            }`}>{ref.kind === 'direct' ? 'Directa' : 'Inferida'}</span>
            <span className="text-on-surface-variant font-bold">{Math.round((ref.confidence ?? 0.5) * 100)}% conf.</span>
            <span className={`font-bold ${
              (ref.uncertainty ?? 0) > 0.5 ? 'text-amber-600' : (ref.uncertainty ?? 0) < 0.1 ? 'text-green-600' : 'text-on-surface-variant'
            }`}>
              {Math.round((ref.uncertainty ?? 0) * 100)}% incert.
            </span>
            {ref.metadata?.llm_provider && (
              <span className="text-[9px] font-mono bg-surface-container px-1.5 py-0.5 rounded text-on-surface-variant">
                LLM: {ref.metadata.llm_provider}
              </span>
            )}
          </div>
        </div>
      ))}
      {contradictions.length > 0 && (
        <div className="p-3 rounded-xl bg-error-container/20 border border-error/20 text-xs mt-2">
          <p className="font-bold text-error flex items-center gap-1 mb-1">
            <span className="material-symbols-outlined text-[14px]">warning</span>
            {contradictions.length} contradicción(es) detectada(s)
          </p>
          {contradictions.map((c, i) => (
            <p key={i} className="text-on-surface-variant">{c.reason}</p>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Panel: Lectura del Sistema (tupla Mᵢ) ───────────────────────────────────
function TupleReadingPanel({ values = {}, literacy = {}, uncertaintySources = {}, confidence = 0.5, revision = 1, nodes = [], edges = [] }) {
  const tupleItems = [
    {
      sym: 'Gᵢ',
      label: 'Grafo de Conocimiento',
      color: 'text-on-primary-fixed-variant',
      bg: 'bg-primary-fixed/20 border-primary-fixed-dim/40',
      content: `${nodes.length} nodos · ${edges.length} relaciones · Rev. ${revision}`,
    },
    {
      sym: 'vᵢ',
      label: 'Valores Culturales',
      color: 'text-on-secondary-fixed-variant',
      bg: 'bg-secondary-fixed/20 border-secondary-fixed-dim/40',
      content: Object.keys(values).length > 0
        ? Object.entries(values).map(([k, v]) => `${k} (${Math.round(v * 100)}%)`).join(' · ')
        : 'Sin valores explícitos registrados.',
    },
    {
      sym: 'ℓᵢ',
      label: 'Perfil de Alfabetización',
      color: 'text-on-tertiary-fixed-variant',
      bg: 'bg-tertiary-fixed/20 border-tertiary-fixed-dim/40',
      content: Object.keys(literacy).length > 0
        ? Object.entries(literacy).map(([k, v]) => `${k}: ${(v * 100).toFixed(1)}%`).join(' · ')
        : 'Perfil de alfabetización base incipiente.',
    },
    {
      sym: 'qᵢ',
      label: 'Incertidumbre Global',
      color: 'text-on-surface-variant',
      bg: 'bg-surface-container border-outline-variant/40',
      content: Object.keys(uncertaintySources).length > 0
        ? Object.entries(uncertaintySources).map(([k, v]) => `${k}: ${Math.round(v * 100)}%`).join(' · ')
        : `Confianza global: ${Math.round(confidence * 100)}%`,
    },
  ];
  return (
    <div className="flex flex-col gap-3">
      {tupleItems.map(({ sym, label, color, bg, content }) => (
        <div key={sym} className={`flex items-start gap-3 p-3 rounded-2xl border ${bg}`}>
          <div className={`shrink-0 w-9 h-9 rounded-xl bg-white/60 border ${bg.split(' ')[1]} flex items-center justify-center`}>
            <span className={`font-mono text-base font-black ${color}`}>{sym}</span>
          </div>
          <div className="flex-1 min-w-0">
            <p className={`font-bold text-[11px] uppercase tracking-wide ${color}`}>{label}</p>
            <p className="text-xs text-on-surface-variant mt-0.5 leading-relaxed">{content}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Leyenda ─────────────────────────────────────────────────────────────────
function Legend({ kinds }) {
  return (
    <div className="flex flex-wrap gap-x-5 gap-y-3 px-5 py-3 bg-surface/90 backdrop-blur-md border border-outline-variant/30 rounded-2xl shadow-sm text-xs font-bold">
      {kinds.map(k => {
        const ks = kindStyle(k);
        return (
          <span key={k} className="flex items-center gap-2 text-on-surface">
            <span className="w-3.5 h-3.5 rounded-full inline-block border-2" style={{ background: ks.fill, borderColor: ks.stroke }} />
            {ks.label}
          </span>
        );
      })}
    </div>
  );
}

// ─── Barra de filtros ─────────────────────────────────────────────────────────
function FilterBar({ kinds, active, onToggle }) {
  return (
    <div className="flex gap-2 flex-wrap">
      {kinds.map(k => {
        const ks = kindStyle(k);
        const on = active.has(k);
        return (
          <button 
            key={k} 
            onClick={() => onToggle(k)} 
            className={`px-4 py-1.5 rounded-full text-[11px] font-bold uppercase tracking-wider cursor-pointer transition-all border shadow-sm ${
              on ? 'hover:-translate-y-0.5' : 'bg-surface text-on-surface-variant border-outline-variant/30 hover:bg-surface-container-high'
            }`}
            style={on ? { borderColor: ks.stroke, background: ks.fill, color: ks.text } : {}}
          >
            {ks.label}
          </button>
        );
      })}
    </div>
  );
}

// ─── Componente principal ─────────────────────────────────────────────────────
export default function P2_ModeloMental() {
  const navigate = useNavigate();
  const graphRef = useRef();
  const { pid } = useParams();

  const [rawData, setRawData] = useState({ nodes: [], edges: [], values: {}, literacy: {}, uncertainty_sources: {}, evidence_refs: [], contradiction_flags: [], confidence: 0.5, revision: 1 });
  const [graphData, setGraphData] = useState({ nodes: [], links: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedNode, setSelectedNode] = useState(null);
  const [selectedLink, setSelectedLink] = useState(null);
  const [activeKinds, setActiveKinds] = useState(new Set());
  const [showInferred, setShowInferred] = useState(true);
  const [leftOpen, setLeftOpen] = useState(true);
  const [leftTab, setLeftTab] = useState('relato'); // 'relato' | 'tupla'
  const [dimensions, setDimensions] = useState({ w: 600, h: 480 });
  const containerRef = useRef();

  // Dimensiones responsivas
  useEffect(() => {
    if (!containerRef.current) return;
    const ro = new ResizeObserver(([entry]) => {
      setDimensions({ w: entry.contentRect.width, h: entry.contentRect.height });
    });
    ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, []);

  // Fetch
  useEffect(() => { fetchMentalModel(); }, [pid]);

  const fetchMentalModel = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(getMentalModelUrl(pid));
      if (res.ok) {
        const data = await res.json();
        setRawData({
          nodes: (data.nodes ?? []).map(n => ({ ...n, kind: normalizeKind(n.kind ?? n.group) })),
          edges: data.edges ?? data.links ?? [],
          values: data.values ?? {},
          literacy: data.literacy ?? {},
          uncertainty_sources: data.uncertainty_sources ?? {},
          evidence_refs: data.evidence_refs ?? [],
          contradiction_flags: data.contradiction_flags ?? [],
          confidence: data.confidence ?? 0.5,
          revision: data.revision ?? 1,
        });
      } else { setError('Error: No se pudo obtener el modelo mental.'); }
    } catch { setError('Error: No se pudo obtener el modelo mental.'); }
    finally { setLoading(false); }
  };

  // Inicializar activeKinds cuando llegan nodos nuevos (solo si está vacío)
  useEffect(() => {
    const { nodes } = rawData;
    if (nodes.length > 0 && activeKinds.size === 0) {
      const allKinds = [...new Set(nodes.map(n => n.kind ?? n.group ?? 'concept'))];
      setActiveKinds(new Set(allKinds));
    }
  }, [rawData]); // NO incluir activeKinds aquí para evitar bucle infinito

  // Construir graphData filtrado
  useEffect(() => {
    const { nodes, edges } = rawData;
    const filteredNodes = nodes.filter(n => activeKinds.size === 0 || activeKinds.has(n.kind ?? n.group ?? 'concept'));
    const nodeIds = new Set(filteredNodes.map(n => n.id));
    const filteredEdges = edges.filter(e => {
      const s = e.source?.id ?? e.source, t = e.target?.id ?? e.target;
      return nodeIds.has(s) && nodeIds.has(t) && (showInferred || !e.inferred);
    });

    setGraphData({
      nodes: filteredNodes.map(n => ({ ...n, __r: 12 + (n.confidence ?? 0.5) * 6 })),
      links: filteredEdges.map(e => ({ ...e })),
    });
  }, [rawData, activeKinds, showInferred]);

  // Fuerzas
  useEffect(() => {
    if (loading || !graphRef.current) return;
    graphRef.current.d3Force('charge').strength(-320);
    graphRef.current.d3Force('link').distance(l => 80 + (1 - (l.weight ?? 0.5)) * 80);
    graphRef.current.d3Force('collide', forceCollide(node => (node.__r ?? 12) + 15)); // Evitar solapamiento
    setTimeout(() => graphRef.current?.zoomToFit(400, 60), 500);
  }, [loading, graphData]);

  const handleNodeClick = useCallback((node) => {
    setSelectedNode(node);
    setSelectedLink(null);
    graphRef.current?.centerAt(node.x, node.y, 600);
    graphRef.current?.zoom(2.2, 600);
  }, []);

  const toggleKind = (k) => setActiveKinds(prev => {
    const next = new Set(prev);
    next.has(k) ? next.delete(k) : next.add(k);
    return next;
  });

  const allKinds = [...new Set(rawData.nodes.map(n => n.kind ?? n.group ?? 'concept'))];
  const hasInferred = rawData.edges.some(e => e.inferred);

  const { values, literacy, uncertainty_sources, evidence_refs, contradiction_flags, confidence, revision } = rawData;

  return (
    <div className="max-w-[1400px] mx-auto py-6 px-4 flex flex-col h-[calc(100vh-80px)] gap-4">

      {/* Header */}
      <div className="flex items-center gap-4 shrink-0 bg-surface/60 backdrop-blur-md p-4 rounded-3xl border border-outline-variant/30 shadow-sm">
        <button 
          onClick={() => navigate('/')} 
          className="bg-surface-container hover:bg-primary-fixed/50 text-on-surface-variant hover:text-primary w-12 h-12 rounded-full flex items-center justify-center transition-colors border border-outline-variant/30"
        >
          <span className="material-symbols-outlined text-xl">arrow_back</span>
        </button>
        <div className="flex-1">
          <h1 className="m-0 text-3xl font-display-lg font-bold text-on-surface">Modelo Mental BDI</h1>
          <p className="m-0 text-sm font-bold text-on-surface-variant flex items-center gap-2 mt-1">
            Visualización Cognitiva <span className="text-outline-variant">•</span> PID: 
            <code className="font-mono bg-primary-container/30 text-primary px-2 py-0.5 rounded-md border border-primary/20">{pid}</code>
          </p>
        </div>
        {hasInferred && (
          <div className="bg-tertiary-fixed border border-tertiary/20 text-on-tertiary-fixed px-4 py-2 rounded-full text-xs font-bold flex items-center gap-2 uppercase tracking-wider shadow-sm">
            <span className="material-symbols-outlined text-[18px]">psychology</span>
            Enriquecido por LLM
          </div>
        )}
      </div>

      {/* Filtros */}
      <div className="flex items-center gap-4 flex-wrap shrink-0 bg-surface-container-lowest p-3 rounded-2xl border border-outline-variant/30 shadow-sm">
        <span className="text-xs font-bold text-secondary uppercase tracking-widest ml-3 flex items-center gap-1.5">
          <span className="material-symbols-outlined text-[16px]">filter_alt</span>
          Filtros:
        </span>
        <FilterBar kinds={allKinds} active={activeKinds} onToggle={toggleKind} />
        {hasInferred && (
          <label className="flex items-center gap-2 text-xs font-bold text-on-surface-variant cursor-pointer ml-auto mr-4 hover:text-tertiary transition-colors bg-surface-container px-3 py-1.5 rounded-full border border-outline-variant/30">
            <input type="checkbox" checked={showInferred} onChange={e => setShowInferred(e.target.checked)} className="accent-tertiary w-4 h-4 cursor-pointer" />
            Mostrar inferencias LLM
          </label>
        )}
      </div>

      {/* Layout: 3 columnas */}
      <div className="flex-1 flex flex-col md:flex-row gap-4 min-h-0">

        {/* ── Sidebar izquierdo: Relato + Lectura del sistema ── */}
        <div className={`shrink-0 transition-all duration-300 ${leftOpen ? 'w-full md:w-[300px]' : 'md:w-10'} flex flex-col`}>
          {/* Toggle */}
          <button
            onClick={() => setLeftOpen(v => !v)}
            className="hidden md:flex items-center justify-center self-end mb-2 w-8 h-8 rounded-full bg-surface-container border border-outline-variant/30 hover:bg-primary-fixed/50 text-on-surface-variant hover:text-primary transition-colors"
            title={leftOpen ? 'Cerrar panel' : 'Abrir panel'}
          >
            <span className="material-symbols-outlined text-sm">{leftOpen ? 'chevron_left' : 'chevron_right'}</span>
          </button>

          {leftOpen && (
            <div className="flex-1 flex flex-col rounded-[28px] border border-outline-variant/40 bg-surface-container-lowest/90 backdrop-blur-md overflow-hidden shadow-md min-h-0">
              {/* Tabs */}
              <div className="flex border-b border-outline-variant/30">
                {[['relato','article','Relato'],['tupla','functions','Mᵢ']].map(([tab, icon, label]) => (
                  <button
                    key={tab}
                    onClick={() => setLeftTab(tab)}
                    className={`flex-1 flex items-center justify-center gap-1.5 py-3 text-xs font-bold uppercase tracking-wider transition-colors ${
                      leftTab === tab
                        ? 'text-primary border-b-2 border-primary bg-primary-container/10'
                        : 'text-on-surface-variant hover:text-on-surface'
                    }`}
                  >
                    <span className="material-symbols-outlined text-[16px]">{icon}</span>
                    {label}
                  </button>
                ))}
              </div>

              <div className="flex-1 overflow-y-auto p-4">
                {leftTab === 'relato' ? (
                  <div className="flex-1 overflow-y-auto">
                    <NarrativePanel 
                      evidenceRefs={selectedLink 
                        ? evidence_refs.filter(ref => selectedLink.evidence_refs?.includes(ref.evidence_id))
                        : evidence_refs
                      } 
                      title={selectedLink ? `Evidencia de Relación Seleccionada` : `Fragmentos Globales`}
                      contradictions={contradiction_flags} 
                    />
                  </div>
                ) : (
                  <>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-primary mb-3 flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-[14px]">functions</span>
                      Lectura del Sistema
                    </p>
                    <TupleReadingPanel
                      values={values}
                      literacy={literacy}
                      uncertaintySources={uncertainty_sources}
                      confidence={confidence}
                      revision={revision}
                      nodes={rawData.nodes}
                      edges={rawData.edges}
                    />
                  </>
                )}
              </div>
            </div>
          )}
        </div>

        {/* ── Canvas grafo ── */}
        <div
          ref={containerRef}
          className="flex-1 rounded-[32px] border border-outline-variant/40 bg-surface/80 backdrop-blur-md overflow-hidden relative cursor-grab active:cursor-grabbing shadow-md"
        >
          {/* Instrucciones flotantes (Onboarding) */}
          <div className="absolute top-6 left-1/2 -translate-x-1/2 bg-surface-container-high/80 backdrop-blur border border-outline-variant/30 px-4 py-2 rounded-full text-[11px] font-bold text-on-surface-variant flex items-center gap-2 z-10 pointer-events-none shadow-sm animate-in fade-in slide-in-from-top-4 duration-1000">
            <span className="material-symbols-outlined text-[16px] animate-pulse">touch_app</span>
            Arrastra el lienzo o haz clic en los nodos para explorar
          </div>
          {loading ? (
            <div className="absolute inset-0 flex items-center justify-center bg-surface/50 backdrop-blur-sm z-10">
              <span className="animate-spin material-symbols-outlined text-5xl text-primary">sync</span>
            </div>
          ) : error ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-surface/50 backdrop-blur-sm z-10 gap-4">
              <span className="material-symbols-outlined text-5xl text-error">error</span>
              <p className="font-headline-md text-xl text-on-surface-variant">{error}</p>
            </div>
          ) : (
            <ForceGraph2D
              ref={graphRef}
              graphData={graphData}
              width={dimensions.w}
              height={dimensions.h}
              nodeLabel={n => n.label ?? n.id}
              nodeColor={n => kindStyle(n.kind ?? n.group).fill}
              nodeRelSize={1}
              nodeVal={n => (n.__r ?? 14) * (n.__r ?? 14)}
              nodeCanvasObject={(node, ctx, scale) => drawNode(node, ctx, scale, selectedNode?.id)}
              nodeCanvasObjectMode={() => 'replace'}
              linkColor={l => l === selectedLink ? '#d97706' : l.inferred ? '#a3a8a3' : '#4d6453'}
              linkWidth={l => (l === selectedLink ? 4 : 1.5) + (l.weight ?? 0.5) * 3.5}
              linkOpacity={l => (l === selectedLink ? 0.9 : l.inferred ? 0.5 : 0.8)}
              linkDirectionalArrowLength={6}
              linkDirectionalArrowRelPos={1}
              linkLineDash={l => l.inferred ? [5, 4] : null}
              linkLabel={l => `${l.relation ?? l.label}${l.support_count ? ` (${l.support_count})` : ''}`}
              onNodeClick={handleNodeClick}
              onLinkClick={(link) => {
                setSelectedLink(link);
                setSelectedNode(null);
                setLeftOpen(true);
                setLeftTab('relato');
              }}
              onBackgroundClick={() => {
                setSelectedNode(null);
                setSelectedLink(null);
              }}
              cooldownTicks={120}
            />
          )}

          {/* Leyenda flotante */}
          <div className="absolute bottom-6 left-6">
            <Legend kinds={allKinds} />
          </div>
        </div>

        {/* Panel lateral */}
        <div className="w-full md:w-[340px] shrink-0 border border-outline-variant/40 rounded-[32px] bg-surface-container-lowest/90 backdrop-blur-md p-6 flex flex-col overflow-y-auto shadow-md">
          <h3 className="text-sm font-bold text-secondary uppercase tracking-widest mb-6 flex items-center gap-2 border-b border-outline-variant/30 pb-4">
             <span className="material-symbols-outlined">analytics</span>
             Explorador de Nodo
          </h3>
          <NodePanel
            node={selectedNode}
            edges={graphData.links}
            nodes={graphData.nodes}
            onClose={() => setSelectedNode(null)}
          />
        </div>
      </div>
    </div>
  );
}