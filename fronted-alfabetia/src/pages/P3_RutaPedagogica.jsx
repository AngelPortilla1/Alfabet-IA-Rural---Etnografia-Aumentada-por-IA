import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { getRouteUrl } from '../api/client';
import { useApiStatus } from '../hooks/useApiStatus';
import { useToast } from '../components/ToastContext';

export default function P3_RutaPedagogica() {
  const navigate = useNavigate();
  const { mode } = useApiStatus();
  const { showToast } = useToast();
  const [route, setRoute] = useState(null);
  const [loading, setLoading] = useState(true);
  const { pid } = useParams(); // PID dinámico desde la URL

  const isStubMode = mode === 'Stubs';

  useEffect(() => {
    fetchRoute();
  }, [pid]);

  const fetchRoute = async () => {
    try {
      const response = await fetch(getRouteUrl(pid));
      if (response.ok) {
        const data = await response.json();
        setRoute(data);
      } else {
        throw new Error('Backend encendido pero respondió con error o sin datos (Ej. 404).');
      }
    } catch (err) {
      console.warn('Backend apagado o error de conexión.', err);
      setRoute(null);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="p-20 text-center animate-pulse text-primary font-bold">Generando ruta pedagógica...</div>;

  if (!route) return (
    <div className="p-20 text-center text-on-surface-variant">
      <span className="material-symbols-outlined text-5xl mb-4">route</span>
      <p className="font-headline-md text-xl">No hay ruta pedagógica generada para este productor.</p>
    </div>
  );

  return (
    <div className="max-w-4xl mx-auto py-8 px-4">
      
      {/* Header */}
      <header className="mb-10">
        <div className="flex items-center gap-3 mb-4">
          <button onClick={() => navigate(`/modelo-mental/${pid}`)} className="text-on-surface-variant hover:text-primary transition-colors">
            <span className="material-symbols-outlined">arrow_back</span>
          </button>
          <h1 className="font-display-lg text-3xl font-bold text-on-surface">Propuesta Pedagógica</h1>
        </div>
        
        <div className="bg-white border border-outline-variant/30 p-8 rounded-[32px] flex flex-col md:flex-row justify-between items-start md:items-center gap-6 shadow-sm relative overflow-hidden">
          <div className="absolute top-0 left-0 w-2 h-full bg-primary"></div>
          <div>
            <h2 className="text-3xl font-bold text-primary mb-2">Ruta {route.route_type} — {((route.score || 0) * 100).toFixed(0)}%</h2>
            <p className="text-on-surface-variant flex items-center gap-2">
              <span className="material-symbols-outlined text-[18px]">person</span>
              Ruta personalizada generada para <span className="font-bold text-on-surface">{route.pid}</span>
            </p>
          </div>
          <div className="flex flex-col items-end gap-3">
            {(() => {
              const hasExplicitRisks = route.risks?.length > 0;
              const riskScore = route.objective_terms?.risk || 0;
              const hasCalculatedRisk = riskScore > 0.1;
              const isError = hasExplicitRisks;
              const isWarning = !hasExplicitRisks && hasCalculatedRisk;
              
              return (
                <div className={`flex items-center gap-2 px-4 py-2 rounded-full border text-sm font-bold uppercase ${
                  isError
                    ? "bg-error-container/10 border-error/20 text-error" 
                    : isWarning
                    ? "bg-warning-container/10 border-warning/20 text-warning"
                    : "bg-primary-container/5 border-primary/20 text-primary"
                }`}>
                  <span className="material-symbols-outlined text-sm">
                    {isError ? "warning" : isWarning ? "info" : "verified_user"}
                  </span>
                  <span className="tracking-wide">
                    {isError 
                      ? route.risks[0]
                      : isWarning
                      ? `⚠️ Riesgo pedagógico: ${(riskScore * 100).toFixed(0)}%`
                      : "Sin riesgos detectados"
                    }
                  </span>
                </div>
              );
            })()}
            {/* Indicador honesto de fuente de la explicación */}
            {(() => {
              const src = route.explanation_source || (isStubMode ? 'heuristic' : 'heuristic');
              if (src === 'llm') {
                return (
                  <div className="flex items-center gap-2 px-4 py-2 rounded-full border text-sm font-bold uppercase bg-tertiary-fixed text-on-tertiary-fixed border-tertiary/20 shadow-sm">
                    <span className="material-symbols-outlined text-sm">psychology</span>
                    Generado por LLM ({mode})
                  </div>
                );
              }
              if (src === 'llm_error') {
                return (
                  <div className="flex items-center gap-2 px-4 py-2 rounded-full border text-sm font-bold uppercase bg-warning-container/20 border-warning/30 text-warning">
                    <span className="material-symbols-outlined text-sm">warning_amber</span>
                    LLM Falló — Determinista Activo
                  </div>
                );
              }
              // 'heuristic' o stub
              return (
                <div className="flex items-center gap-2 px-4 py-2 rounded-full border text-sm font-bold uppercase bg-surface-container-high border-outline-variant/30 text-on-surface-variant">
                  <span className="material-symbols-outlined text-sm">settings</span>
                  {isStubMode ? 'Determinista (Stub)' : 'Determinista (sin LLM)'}
                </div>
              );
            })()}
          </div>
        </div>
      </header>

      {/* Justificación del Agente AEXPL */}
      {route.explanation && (
        <div className="mb-12 bg-white border border-outline-variant/20 p-6 rounded-3xl relative overflow-hidden shadow-sm">
          <div className="absolute top-0 left-0 w-1.5 h-full bg-tertiary-fixed"></div>
          <div className="flex items-start gap-4">
            <div className="bg-tertiary-container/5 p-3 rounded-2xl shrink-0 border border-tertiary/10">
              <span className="material-symbols-outlined text-tertiary text-2xl">auto_awesome</span>
            </div>
            <div>
              <h3 className="font-bold text-on-surface mb-2 flex items-center gap-2">
                Razonamiento del Agente Explicador (AEXPL)
                {route.explanation_source === 'llm' && (
                  <span className="text-[10px] bg-tertiary-fixed text-on-tertiary-fixed px-2 py-0.5 rounded-full uppercase tracking-wider font-bold border border-tertiary/20">LLM Activo</span>
                )}
                {route.explanation_source === 'llm_error' && (
                  <span className="text-[10px] bg-warning-container/30 text-warning px-2 py-0.5 rounded-full uppercase tracking-wider font-bold border border-warning/30">⚠ LLM Falló</span>
                )}
                {(!route.explanation_source || route.explanation_source === 'heuristic') && (
                  <span className="text-[10px] bg-surface-container-high text-on-surface-variant px-2 py-0.5 rounded-full uppercase tracking-wider font-medium border border-outline-variant/30">Determinista Activo</span>
                )}
              </h3>
              <p className="text-on-surface-variant leading-relaxed italic">
                "{route.explanation}"
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Timeline de la Ruta */}
      <div className="space-y-12 relative before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-primary/20 before:via-primary before:to-primary/20">
        
        {route.steps.map((step, index) => (
          <div key={step.id || step.module_id || index} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group">
            
            {/* El punto de la línea de tiempo */}
            <div className="flex items-center justify-center w-10 h-10 rounded-full border border-white bg-primary text-on-primary shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 z-10">
              <span className="font-bold">{index + 1}</span>
            </div>

            {/* Contenido del Módulo */}
            <div className="w-[calc(100%-4rem)] md:w-[45%] bg-surface/60 backdrop-blur-md p-6 rounded-3xl border border-white/40 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex justify-between items-start mb-3">
                <span className="text-xs font-bold text-primary uppercase tracking-widest">{step.module_id}</span>
                <span className="text-[10px] bg-surface-container-high px-2 py-1 rounded text-on-surface-variant font-mono">Modalidad: {step.modality}</span>
              </div>
              <h3 className="text-xl font-bold text-on-surface mb-2">{step.title}</h3>
              <p className="text-on-surface-variant mb-6 leading-relaxed italic">
                "{step.assessment || step.rationale}"
              </p>

              {/* Tarea F4.1: EvidenceQuote (Trazabilidad Visual) */}
              <div className="bg-surface-container-lowest p-4 rounded-2xl border-l-4 border-secondary shadow-inner relative overflow-hidden">
                <span className="material-symbols-outlined absolute right-2 top-2 opacity-5 text-4xl">format_quote</span>
                <p className="text-xs font-bold text-secondary uppercase mb-2 flex items-center gap-1">
                  <span className="material-symbols-outlined text-sm">visibility</span> Evidencia del Relato:
                </p>
                <p className="text-sm text-on-secondary-container leading-snug">
                  "...{step.quote || step.need}..."
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Botón de Acción Final */}
      <div className="mt-16 text-center">
        <button 
          onClick={() => {
            showToast('Ruta enviada a la cola de revisiones del Agente BDI.', 'success');
            navigate('/revisiones');
          }}
          className="bg-primary text-on-primary px-10 py-4 rounded-2xl font-bold text-lg hover:shadow-xl hover:-translate-y-1 transition-all flex items-center gap-3 mx-auto"
        >
          <span className="material-symbols-outlined">playlist_add_check</span>
          Verificar en Cola de Revisiones
        </button>
      </div>
    </div>
  );
}