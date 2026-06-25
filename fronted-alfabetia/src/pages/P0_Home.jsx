import { Link, useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { API_ENDPOINTS } from '../api/client';

export default function P0_Home() {
  const [pidSearch, setPidSearch] = useState('');
  const [summary, setSummary] = useState(null);
  const [participants, setParticipants] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchSummary = async () => {
      try {
        const response = await fetch(API_ENDPOINTS.DASHBOARD_SUMMARY);
        if (response.ok) {
          const data = await response.json();
          setSummary(data);
        }
      } catch (err) {
        console.error('Error fetching dashboard summary:', err);
      }
    };
    const fetchParticipants = async () => {
      try {
        const response = await fetch(API_ENDPOINTS.PARTICIPANTS);
        if (response.ok) {
          const data = await response.json();
          setParticipants(data);
        }
      } catch (err) {
        console.error('Error fetching participants:', err);
      }
    };
    fetchSummary();
    fetchParticipants();
  }, []);

  const handleSearch = (target) => {
    if (pidSearch.trim()) {
      navigate(`/${target}/${pidSearch.trim()}`);
    }
  };

  return (
    <main className="px-margin-mobile md:px-margin-desktop max-w-container-max mx-auto flex flex-col items-center justify-center min-h-[calc(100vh-120px)] py-12">

      {/* Hero Section */}
      <div className="text-center mb-8 max-w-3xl">
        <h1 className="font-display-lg text-4xl md:text-[48px] font-bold text-on-surface mb-6 leading-tight">
          AlfabetIA: Ecosistema Multiagente de Etnografía Rural
        </h1>
        <p className="font-body-lg text-body-lg text-on-surface-variant leading-relaxed">
          Seleccione su rol en el sistema. AlfabetIA utiliza agentes de Inteligencia Artificial para facilitar la alfabetización digital y la investigación etnográfica, co-creando conocimiento con las comunidades campesinas y valorando sus saberes locales.
        </p>
      </div>

      <div className="mb-10 text-center flex flex-col items-center gap-3 animate-in fade-in duration-700 delay-150">
        <span className="px-3.5 py-1 bg-primary/5 text-primary border border-primary/30 rounded-full text-xs font-bold uppercase tracking-widest flex items-center gap-2">
          <div className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
          </div>
          Interactuar en vivo
        </span>
        <div className="flex flex-col sm:flex-row items-center gap-4 justify-center">
          <Link to="/chat-etnografico" className="inline-flex items-center gap-3 bg-primary text-on-primary px-8 py-4 rounded-2xl font-bold text-lg hover:shadow-lg hover:shadow-primary/20 hover:-translate-y-1 transition-all duration-300 group">
            <span className="material-symbols-outlined text-2xl group-hover:rotate-12 transition-transform" style={{ fontVariationSettings: "'FILL' 1" }}>chat</span>
            Iniciar Conversación Etnográfica
          </Link>
          <Link to="/dashboard" className="inline-flex items-center gap-2 bg-surface-container-highest text-on-surface px-6 py-4 rounded-2xl font-bold text-sm hover:bg-surface-container-high hover:-translate-y-0.5 transition-all border border-outline-variant/30">
            <span className="material-symbols-outlined text-[18px]">query_stats</span>
            Ver Estado del Sistema
          </Link>
        </div>
      </div>

      {/* Quick Lookup Panel (Optimizada) */}
      <div className="w-full max-w-[1000px] relative z-20 bg-surface/80 backdrop-blur-lg border border-white/40 shadow-sm rounded-3xl p-6 mb-12 animate-in fade-in slide-in-from-bottom-4 duration-700">
        <div className="flex flex-col md:flex-row items-center gap-4">
          <div className="flex-1 w-full relative group">
            <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant group-focus-within:text-primary transition-colors">person_search</span>
            <input
              type="text"
              placeholder="Ingresa el PID (ID del Productor, ej: p1, don_aurelio)"
              value={pidSearch}
              onChange={(e) => {
                setPidSearch(e.target.value);
                setShowSuggestions(true);
              }}
              onFocus={() => setShowSuggestions(true)}
              onBlur={() => {
                setTimeout(() => setShowSuggestions(false), 200);
              }}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch('modelo-mental')}
              className="w-full bg-surface-container-highest border border-outline-variant rounded-2xl pl-12 pr-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
            />
            {showSuggestions && (pidSearch.trim() ? participants.filter(p => p.pid.toLowerCase().includes(pidSearch.toLowerCase())) : []).length > 0 && (
              <ul className="absolute left-0 right-0 mt-2 bg-surface/95 backdrop-blur-md border border-outline-variant/30 rounded-2xl shadow-xl z-50 max-h-60 overflow-y-auto py-2">
                {(pidSearch.trim() ? participants.filter(p => p.pid.toLowerCase().includes(pidSearch.toLowerCase())) : []).map((p) => (
                  <li key={p.pid}>
                    <button
                      type="button"
                      onMouseDown={() => {
                        setPidSearch(p.pid);
                        setShowSuggestions(false);
                      }}
                      className="w-full text-left px-5 py-3 hover:bg-primary-container/20 text-on-surface font-mono text-sm flex items-center justify-between group transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <span className="material-symbols-outlined text-primary text-lg">person</span>
                        <span>{p.pid}</span>
                      </div>
                      <span className="text-[10px] uppercase tracking-wider font-bold bg-surface-container-high px-2 py-0.5 rounded text-on-surface-variant group-hover:bg-primary group-hover:text-on-primary transition-colors">
                        Rev. {p.revision}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="flex gap-2 w-full md:w-auto">
            <button
              onClick={() => handleSearch('modelo-mental')}
              disabled={!pidSearch.trim()}
              className="flex-1 md:flex-none bg-primary text-on-primary px-5 py-3 rounded-2xl text-sm font-bold hover:shadow-md hover:-translate-y-0.5 transition-all disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              <span className="material-symbols-outlined text-[18px]">account_tree</span>
              Modelo
            </button>
            <button
              onClick={() => handleSearch('ruta-pedagogica')}
              disabled={!pidSearch.trim()}
              className="flex-1 md:flex-none bg-secondary text-on-secondary px-5 py-3 rounded-2xl text-sm font-bold hover:shadow-md hover:-translate-y-0.5 transition-all disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              <span className="material-symbols-outlined text-[18px]">route</span>
              Ruta
            </button>
            <button
              onClick={() => handleSearch('auditoria')}
              disabled={!pidSearch.trim()}
              className="flex-1 md:flex-none bg-surface-container-highest text-on-surface px-5 py-3 rounded-2xl text-sm font-bold border border-outline-variant hover:bg-surface-container-high transition-all disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              <span className="material-symbols-outlined text-[18px]">policy</span>
              Auditoría
            </button>
          </div>
        </div>
      </div>

      {/* Role Selection Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6 w-full max-w-[1400px]">

        {/* Card 1: Facilitador Territorial */}
        <Link to="/registrar-relato" className="group relative flex flex-col items-start p-8 rounded-3xl bg-surface/60 backdrop-blur-md border border-white/40 shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_20px_40px_rgb(27,48,34,0.1)] transition-all duration-500 hover:-translate-y-2 text-left overflow-hidden">
          <div className="absolute inset-0 bg-primary-container opacity-0 group-hover:opacity-5 transition-opacity duration-500"></div>
          <div className="absolute top-0 right-0 w-32 h-32 bg-primary-container opacity-5 rounded-bl-[100px] -mr-10 -mt-10"></div>

          <div className="w-14 h-14 rounded-2xl bg-primary-container text-on-primary flex items-center justify-center mb-8 shadow-inner">
            <span className="material-symbols-outlined text-[28px]" style={{ fontVariationSettings: "'FILL' 1" }}>map</span>
          </div>

          <h2 className="font-headline-md text-[24px] font-semibold text-on-surface mb-3">Facilitador Territorial</h2>
          <p className="font-body-md text-body-md text-on-surface-variant mb-8 opacity-80 line-clamp-3">
            Gestión directa en campo. Monitoreo de cultivos, reporte de incidencias y enlace vital entre la comunidad agrícola y el ecosistema tecnológico.
          </p>

          <div className="mt-auto flex items-center gap-2 bg-primary-fixed/50 px-3 py-1.5 rounded-full border border-primary-fixed w-full overflow-hidden">
            <div className="relative flex h-2 w-2 flex-shrink-0">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
            </div>
            <span className="font-label-md text-label-md text-on-primary-fixed-variant truncate">
              {summary ? `${summary.active_participants} Participantes Activos` : '2 Agentes Asignados'}
            </span>
          </div>
        </Link>

        {/* Card 2: Equipo Curricular */}
        <Link to="/revisiones" className="group relative flex flex-col items-start p-8 rounded-3xl bg-surface/60 backdrop-blur-md border border-white/40 shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_20px_40px_rgb(128,85,51,0.1)] transition-all duration-500 hover:-translate-y-2 text-left overflow-hidden">
          <div className="absolute inset-0 bg-secondary opacity-0 group-hover:opacity-5 transition-opacity duration-500"></div>
          <div className="absolute top-0 right-0 w-32 h-32 bg-secondary opacity-5 rounded-bl-[100px] -mr-10 -mt-10"></div>

          <div className="w-14 h-14 rounded-2xl bg-secondary text-on-secondary flex items-center justify-center mb-8 shadow-inner">
            <span className="material-symbols-outlined text-[28px]" style={{ fontVariationSettings: "'FILL' 1" }}>route</span>
          </div>

          <h2 className="font-headline-md text-[24px] font-semibold text-on-surface mb-3">Equipo Curricular</h2>
          <p className="font-body-md text-body-md text-on-surface-variant mb-8 opacity-80 line-clamp-3">
            Diseño y adaptación de metodologías de aprendizaje. Traducción de saberes ancestrales a estructuras de conocimiento transferibles y escalables.
          </p>

          <div className="mt-auto flex items-center gap-2 bg-secondary-container/30 px-3 py-1.5 rounded-full border border-secondary-container w-full overflow-hidden">
            <div className="relative flex h-2 w-2 flex-shrink-0">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-secondary opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-secondary"></span>
            </div>
            <span className="font-label-md text-label-md text-on-secondary-container truncate">
              {summary ? `${summary.pending_reviews} Revisiones Pendientes` : 'Módulo Pedagógico Activo'}
            </span>
          </div>
        </Link>

        {/* Card 3: Auditor de Datos */}
        <Link to="/auditoria" className="group relative flex flex-col items-start p-8 rounded-3xl bg-surface/60 backdrop-blur-md border border-white/40 shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_20px_40px_rgb(27,48,34,0.15)] transition-all duration-500 hover:-translate-y-2 text-left overflow-hidden">
          <div className="absolute inset-0 bg-surface-tint opacity-0 group-hover:opacity-5 transition-opacity duration-500"></div>
          <div className="absolute top-0 right-0 w-32 h-32 bg-surface-tint opacity-5 rounded-bl-[100px] -mr-10 -mt-10"></div>

          <div className="w-14 h-14 rounded-2xl bg-surface-tint text-on-primary flex items-center justify-center mb-8 shadow-inner">
            <span className="material-symbols-outlined text-[28px]" style={{ fontVariationSettings: "'FILL' 1" }}>shield</span>
          </div>

          <h2 className="font-headline-md text-[24px] font-semibold text-on-surface mb-3">Auditor de Datos</h2>
          <p className="font-body-md text-body-md text-on-surface-variant mb-8 opacity-80 line-clamp-3">
            Verificación de integridad, trazabilidad y ética de los modelos. Supervisión de la seguridad blockchain y cumplimiento normativo del sistema.
          </p>

          <div className="mt-auto flex items-center gap-2 bg-primary-fixed/30 px-3 py-1.5 rounded-full border border-primary-fixed-dim w-full overflow-hidden">
            <div className="relative flex h-2 w-2 flex-shrink-0">
              {summary && summary.pending_deltas === 0 ? null : (
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-on-surface opacity-75"></span>
              )}
              <span className="relative inline-flex rounded-full h-2 w-2 bg-on-surface"></span>
            </div>
            <span className="font-label-md text-label-md text-on-primary-fixed-variant truncate">
              {summary
                ? (summary.pending_deltas === 0 ? 'Estado Offline: Sincronizado' : `${summary.pending_deltas} Cambios Pendientes`)
                : 'Seguridad Activa'}
            </span>
          </div>
        </Link>

        {/* Card 4: Coordinador Territorial */}
        <Link to="/segmentos" className="group relative flex flex-col items-start p-8 rounded-3xl bg-surface/60 backdrop-blur-md border border-white/40 shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_20px_40px_rgb(27,48,34,0.15)] transition-all duration-500 hover:-translate-y-2 text-left overflow-hidden">
          <div className="absolute inset-0 bg-tertiary opacity-0 group-hover:opacity-5 transition-opacity duration-500"></div>
          <div className="absolute top-0 right-0 w-32 h-32 bg-tertiary opacity-5 rounded-bl-[100px] -mr-10 -mt-10"></div>

          <div className="w-14 h-14 rounded-2xl bg-tertiary text-on-primary flex items-center justify-center mb-8 shadow-inner">
            <span className="material-symbols-outlined text-[28px]" style={{ fontVariationSettings: "'FILL' 1" }}>public</span>
          </div>

          <h2 className="font-headline-md text-[24px] font-semibold text-on-surface mb-3">Coordinador Territorial</h2>
          <p className="font-body-md text-body-md text-on-surface-variant mb-8 opacity-80 line-clamp-3">
            Análisis de inteligencia colectiva. Identificación de segmentos comunitarios, visualización de brechas digitales y toma de decisiones a nivel regional.
          </p>

          <div className="mt-auto flex items-center gap-2 bg-tertiary-fixed/30 px-3 py-1.5 rounded-full border border-tertiary-fixed-dim/30 w-full overflow-hidden">
            <div className="relative flex h-2 w-2 flex-shrink-0">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-tertiary opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-tertiary"></span>
            </div>
            <span className="font-label-md text-label-md text-on-tertiary-fixed-variant truncate">
              {summary && summary.latest_segment
                ? `Último Segmento: ${summary.latest_segment.segment_id.slice(0, 15)}...`
                : 'Análisis Macro'}
            </span>
          </div>
        </Link>

      </div>
    </main>
  );
}