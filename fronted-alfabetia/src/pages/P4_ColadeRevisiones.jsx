import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { API_ENDPOINTS, getReviewApproveUrl, getReviewRejectUrl } from '../api/client';
import { useApiStatus } from '../hooks/useApiStatus';
import { useToast } from '../components/ToastContext';

export default function P4_ColadeRevisiones() {
  const navigate = useNavigate();
  const { mode } = useApiStatus();
  const { showToast } = useToast();
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [processingId, setProcessingId] = useState(null);
  const [processingStep, setProcessingStep] = useState(null);

  // Determinar si estamos en modo real o stub
  const isStubMode = mode === 'Stubs';

  useEffect(() => {
    fetchPendingReviews();
  }, []);

  const fetchPendingReviews = async () => {
    try {
      const response = await fetch(`${API_ENDPOINTS.REVIEWS}?status=pending`);
      
      if (!response.ok) {
        throw new Error('No se pudo conectar con el servidor local.');
      }
      
      const data = await response.json();
      const allReviews = Array.isArray(data) ? data : [data];
      
      // Mostrar todas las revisiones que estén pendientes
      const pendingReviews = allReviews.filter(
        item => item.status === 'pending'
      );
      
      setReviews(pendingReviews);
    } catch (err) {
      setError('Error al cargar los perfiles pendientes. Verifica que tu backend en Python (puerto 8000) esté encendido.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (review) => {
    const { review_id, stage, payload } = review;
    setProcessingId(review_id);
    setProcessingStep('approving');
    try {
      const response = await fetch(getReviewApproveUrl(review_id), {
        method: 'POST',
      });

      if (response.ok) {
        showToast(`Revisión de la etapa ${stage} aprobada correctamente.`, 'success');
        
        // Si el payload contiene el evento original, lo re-enviamos automáticamente al backend
        // para continuar su procesamiento con el bypass de aprobación
        if (payload && payload.event) {
          setProcessingStep('bdi_running');
          showToast('Procesando el relato aprobado con los agentes BDI...', 'info');
          try {
            const ingestResponse = await fetch(API_ENDPOINTS.EVENTS, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(payload.event)
            });
            if (ingestResponse.ok) {
              const resData = await ingestResponse.json();
              if (resData.status === 'ok' || resData.status === 'ok_with_review') {
                showToast('¡Modelo mental y ruta pedagógica generados con éxito!', 'success');
                setProcessingStep('success');
              } else if (resData.status === 'review') {
                showToast(`El relato avanzó pero requiere revisión en la etapa ${resData.stage}.`, 'info');
                setProcessingStep('success');
              } else {
                setProcessingStep('error');
              }
            } else {
              showToast('Error al re-procesar el relato aprobado en el backend.', 'error');
              setProcessingStep('error');
            }
          } catch (e) {
            console.error('Error al re-procesar el relato aprobado:', e);
            showToast('Error al procesar el relato aprobado.', 'error');
            setProcessingStep('error');
          }
        } else {
          setProcessingStep('success');
        }
        
        // Esperamos 1.5s para que se vea el checkmark de éxito en la interfaz
        await new Promise(resolve => setTimeout(resolve, 1500));
        setReviews(currentReviews => currentReviews.filter(r => r.review_id !== review_id));
      } else {
        showToast('Hubo un problema al aprobar la revisión en el servidor.', 'error');
        setProcessingStep('error');
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    } catch (err) {
      showToast('Error de red. Revisa tu conexión con el backend.', 'error');
      console.error(err);
      setProcessingStep('error');
      await new Promise(resolve => setTimeout(resolve, 2000));
    } finally {
      setProcessingId(null);
      setProcessingStep(null);
    }
  };

  const handleReject = async (reviewId) => {
    setProcessingId(reviewId);
    setProcessingStep('rejecting');
    try {
      const response = await fetch(getReviewRejectUrl(reviewId), {
        method: 'POST',
      });

      if (response.ok) {
        showToast('Revisión rechazada correctamente.', 'info');
        setProcessingStep('success');
        await new Promise(resolve => setTimeout(resolve, 1200));
        setReviews(currentReviews => currentReviews.filter(r => r.review_id !== reviewId));
      } else {
        showToast('Hubo un problema al rechazar la revisión en el servidor.', 'error');
        setProcessingStep('error');
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    } catch (err) {
      showToast('Error de red. Revisa tu conexión con el backend.', 'error');
      console.error(err);
      setProcessingStep('error');
      await new Promise(resolve => setTimeout(resolve, 2000));
    } finally {
      setProcessingId(null);
      setProcessingStep(null);
    }
  };

  // 1. Pantalla de carga
  if (loading) {
    return (
      <div className="flex flex-col justify-center items-center h-[60vh] gap-4">
        <span className="animate-spin material-symbols-outlined text-5xl text-primary">sync</span>
        <p className="font-headline-md text-xl text-primary animate-pulse">
          Cargando perfiles en cuarentena...
        </p>
      </div>
    );
  }

  // 2. Pantalla de error
  if (error) {
    return (
      <div className="max-w-3xl mx-auto mt-8 p-6 bg-error-container border-l-8 border-error rounded-2xl shadow-sm flex items-start gap-4">
        <span className="material-symbols-outlined text-on-error-container text-3xl">error</span>
        <div>
          <h2 className="font-headline-md text-xl text-on-error-container mb-1">Aviso de Conexión</h2>
          <p className="font-body-md text-on-error-container opacity-90">{error}</p>
        </div>
      </div>
    );
  }

  // 3. Pantalla principal del Panel
  return (
    <div className="max-w-4xl mx-auto py-8 px-4">
      
      {/* Encabezado del Panel */}
      <header className="mb-10">
        <div className="flex items-center gap-3 mb-2">
          <button onClick={() => navigate('/')} className="text-on-surface-variant hover:text-primary transition-colors">
            <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 0" }}>arrow_back</span>
          </button>
          <h1 className="font-display-lg text-3xl md:text-4xl font-bold text-on-surface">
            Cola de Revisiones
          </h1>
        </div>
        <p className="font-body-md text-on-surface-variant ml-10">
          Revisión humana (Human-in-the-loop) de rutas de aprendizaje generadas por el agente BDI.
        </p>
      </header>

      {/* Condicional: Si no hay datos vs Si hay datos */}
      {reviews.length === 0 ? (
        <div className="bg-surface/60 backdrop-blur-md border-2 border-dashed border-outline-variant p-16 text-center rounded-3xl shadow-sm flex flex-col items-center justify-center gap-4">
          <span className="material-symbols-outlined text-6xl text-outline-variant" style={{ fontVariationSettings: "'FILL' 0" }}>inbox</span>
          <p className="font-headline-md text-2xl text-on-surface-variant">
            No hay perfiles pendientes de revisión.
          </p>
        </div>
      ) : (
        <div className="space-y-8">
          {reviews.map((review) => {
            const isCurrStage = review.stage === 'M_CURR';
            const isEthnoStage = review.stage === 'AETHNO';
            const isIngestionStage = review.stage === 'AING';
            const isGovStage = review.stage === 'AGOV';
            const isFairStage = review.stage === 'AFAIR';
            const isCodeStage = review.stage === 'ACODE';
            
            // Determinar si podemos mostrar el botón "Ver Grafo BDI"
            // Solo si ya existe un modelo mental guardado (M_CURR, o AFAIR)
            const canShowGraph = isCurrStage || isFairStage;

            return (
              <article 
                key={review.review_id} 
                className="relative bg-surface/80 backdrop-blur-md border border-white/40 shadow-sm p-6 md:p-8 rounded-3xl hover:shadow-md transition-shadow group animate-in fade-in slide-in-from-bottom-4 duration-300 overflow-hidden"
              >
                {/* Overlay de carga interactivo y dinámico */}
                {processingId === review.review_id && (
                  <div className="absolute inset-0 bg-surface/95 backdrop-blur-md z-30 rounded-3xl flex flex-col items-center justify-center p-8 animate-in fade-in duration-200">
                    <div className="flex flex-col items-center gap-5 max-w-md text-center">
                      {processingStep === 'success' ? (
                        <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center animate-bounce">
                          <span className="material-symbols-outlined text-5xl text-primary font-bold">check_circle</span>
                        </div>
                      ) : processingStep === 'error' ? (
                        <div className="w-16 h-16 rounded-full bg-error/10 flex items-center justify-center">
                          <span className="material-symbols-outlined text-5xl text-error font-bold">error</span>
                        </div>
                      ) : (
                        <div className="relative flex items-center justify-center w-16 h-16">
                          <span className="animate-spin material-symbols-outlined text-6xl text-primary" style={{ fontVariationSettings: "'wght' 300" }}>sync</span>
                          <span className="absolute text-[10px] font-bold text-primary animate-pulse">BDI</span>
                        </div>
                      )}

                      <div>
                        <h3 className="font-headline-md text-xl font-bold text-on-surface">
                          {processingStep === 'approving' && 'Registrando Aprobación'}
                          {processingStep === 'rejecting' && 'Registrando Rechazo'}
                          {processingStep === 'bdi_running' && 'Procesando con Agentes BDI'}
                          {processingStep === 'success' && '¡Proceso Completado!'}
                          {processingStep === 'error' && 'Error en el Procesamiento'}
                        </h3>
                        <p className="text-xs text-on-surface-variant mt-1.5 px-4">
                          {processingStep === 'approving' && 'Comunicando decisión con el servidor...'}
                          {processingStep === 'rejecting' && 'Comunicando decisión con el servidor...'}
                          {processingStep === 'bdi_running' && 'El orquestador está ejecutando la normalización, alineación semántica, modelo mental y plan curricular. Esto puede demorar unos 30 segundos.'}
                          {processingStep === 'success' && 'Los datos han sido actualizados exitosamente en la base de datos.'}
                          {processingStep === 'error' && 'No se pudo completar el flujo. Por favor, reintenta.'}
                        </p>
                      </div>

                      {/* Lista de pasos con su estado actual */}
                      {(processingStep === 'approving' || processingStep === 'rejecting' || processingStep === 'bdi_running' || processingStep === 'success') && (
                        <div className="w-full space-y-3 mt-3 text-left border-t border-outline-variant/30 pt-4 px-2">
                          {/* Paso 1 */}
                          <div className="flex items-center gap-3">
                            {processingStep === 'approving' || processingStep === 'rejecting' ? (
                              <span className="animate-spin material-symbols-outlined text-primary text-[20px]">sync</span>
                            ) : (
                              <span className="material-symbols-outlined text-primary text-[20px] font-bold">check_circle</span>
                            )}
                            <span className={`text-sm ${
                              processingStep === 'approving' || processingStep === 'rejecting' ? 'font-semibold text-primary' : 'text-on-surface-variant line-through opacity-60'
                            }`}>
                              {processingStep === 'rejecting' ? 'Registrar rechazo en base de datos' : 'Registrar aprobación en base de datos'}
                            </span>
                          </div>

                          {/* Paso 2: Solo si requiere procesar BDI */}
                          {review.payload?.event && (
                            <div className="flex items-center gap-3">
                              {processingStep === 'approving' || processingStep === 'rejecting' ? (
                                <span className="material-symbols-outlined text-outline-variant text-[20px]">circle</span>
                              ) : processingStep === 'bdi_running' ? (
                                <span className="animate-spin material-symbols-outlined text-primary text-[20px]">sync</span>
                              ) : (
                                <span className="material-symbols-outlined text-primary text-[20px] font-bold">check_circle</span>
                              )}
                              <span className={`text-sm ${
                                processingStep === 'bdi_running' ? 'font-semibold text-primary' : 'text-on-surface-variant'
                              }`}>
                                Re-ingesta del relato y ejecución de agentes BDI (~30s)
                              </span>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                )}
                {/* Identificación del Productor */}
                <div className="mb-8 border-b border-outline-variant/30 pb-6">
                  <div className="flex flex-wrap items-center gap-3 mb-6">
                    <div className="inline-flex items-center gap-2 bg-surface-container-high text-on-surface px-5 py-2.5 rounded-full text-xs font-bold uppercase tracking-widest border border-outline-variant/30 shadow-sm">
                      <span className="material-symbols-outlined text-[18px] text-primary">person</span>
                      Productor: {review.pid.replace(/_/g, ' ')}
                    </div>
                    
                    <span className="inline-flex items-center gap-1.5 bg-secondary-container/30 text-secondary border border-secondary/20 px-3.5 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider">
                      <span className="material-symbols-outlined text-[14px]">query_stats</span>
                      Etapa: {review.stage}
                    </span>

                    {canShowGraph && (
                      <button 
                        onClick={() => navigate(`/modelo-mental/${review.pid}`)}
                        className="text-xs bg-primary text-on-primary px-4 py-2.5 rounded-full shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all flex items-center gap-2 font-bold"
                      >
                        <span className="material-symbols-outlined text-[18px]">account_tree</span> Ver Grafo BDI
                      </button>
                    )}
                    
                    <button 
                      onClick={() => navigate(`/auditoria/${review.pid}`)}
                      className="text-xs bg-surface-container-highest text-on-surface hover:bg-error-container/10 px-4 py-2.5 rounded-full transition-all flex items-center gap-2 border border-outline-variant/30 font-bold"
                    >
                      <span className="material-symbols-outlined text-[18px]">policy</span> Auditoría
                    </button>
                  </div>
                  
                  <h2 className="font-headline-md text-2xl md:text-3xl font-bold text-on-surface flex items-center gap-3 leading-tight">
                    {isCurrStage && <>Ruta Sugerida: <span className="capitalize text-primary">{review.payload?.route_type || 'No especificada'}</span></>}
                    {isEthnoStage && 'Pregunta de Profundización (Probe Etnográfico)'}
                    {isIngestionStage && 'Normalización / Transcripción (Baja Confianza)'}
                    {isGovStage && 'Auditoría de Gobernanza y Consentimiento'}
                    {isFairStage && 'Evaluación de Equidad y Riesgo (AFAIR)'}
                    {isCodeStage && 'Códigos Cualitativos Asignados (ACODE)'}
                  </h2>
                  <p className="text-sm text-on-surface-variant font-medium mt-3">
                    <strong>Motivo de revisión:</strong> {review.reason}
                  </p>
                </div>

                {/* ─── Renderizado Dinámico por Etapa ─── */}
                
                {/* 1. Etapa M_CURR (Rutas pedagógicas) */}
                {isCurrStage && (
                  <>
                    {/* Justificación de la IA */}
                    <div className="mb-8 relative">
                      <h3 className="font-label-md text-secondary mb-3 flex items-center gap-2 uppercase tracking-wider">
                        <span className="material-symbols-outlined">
                          {!isStubMode ? "psychology" : "settings"}
                        </span>
                        Justificación de AEXPL
                        {(() => {
                          const src = review.payload?.explanation_source || (isStubMode ? 'heuristic' : 'heuristic');
                          if (src === 'llm') {
                            return (
                              <span className="text-[10px] bg-tertiary-fixed text-on-tertiary-fixed px-2 py-0.5 rounded-full ml-2 border border-tertiary/20 font-bold">
                                GENERADO POR LLM ({mode.toUpperCase()})
                              </span>
                            );
                          }
                          if (src === 'llm_error') {
                            return (
                              <span className="text-[10px] bg-warning-container/30 text-warning px-2 py-0.5 rounded-full ml-2 border border-warning/30 font-bold">
                                LLM FALLÓ — DETERMINISTA ACTIVO
                              </span>
                            );
                          }
                          return (
                            <span className="text-[10px] bg-surface-container-high text-on-surface-variant px-2 py-0.5 rounded-full ml-2 border border-outline-variant/30 font-medium">
                              {isStubMode ? 'DETERMINISTA (STUB)' : 'DETERMINISTA (SIN LLM)'}
                            </span>
                          );
                        })()}
                      </h3>
                      <p className={`font-body-lg text-on-surface-variant leading-relaxed p-5 rounded-2xl border italic shadow-sm transition-colors ${
                        !isStubMode
                          ? "bg-white border-tertiary/20 shadow-tertiary/5"
                          : "bg-surface-container-highest/50 border-outline-variant/30"
                      }`}>
                        "{review.payload?.explanation || 'Sin justificación disponible'}"
                      </p>
                    </div>

                    {/* Lista de Módulos */}
                    <div className="mb-8">
                      <h3 className="font-label-md text-secondary mb-4 flex items-center gap-2 uppercase tracking-wider">
                        <span className="material-symbols-outlined">view_list</span>
                        Módulos a Asignar
                      </h3>
                      <ul className="space-y-4">
                        {review.payload?.steps && Array.isArray(review.payload.steps) ? (
                          review.payload.steps.map((step, index) => (
                            <li key={index} className="flex items-center gap-4 bg-surface-container p-4 rounded-2xl border border-outline-variant/30 transition-colors hover:border-primary/50">
                              <div className="bg-primary text-on-primary w-10 h-10 rounded-full flex items-center justify-center font-bold text-lg flex-shrink-0 shadow-inner">
                                {index + 1}
                              </div>
                              <div>
                                <p className="font-body-lg font-bold text-on-surface">
                                  {step.title}
                                </p>
                                <p className="text-sm text-on-surface-variant font-mono mt-1">
                                  ID: {step.module_id}
                                </p>
                              </div>
                            </li>
                          ))
                        ) : (
                          <li className="text-on-surface-variant italic">Sin módulos definidos</li>
                        )}
                      </ul>
                    </div>
                  </>
                )}

                {/* 2. Etapa AETHNO (Probes sensibles) */}
                {isEthnoStage && (
                  <div className="mb-8 space-y-6 animate-in fade-in duration-300">
                    <div className="bg-surface-container-highest p-5 rounded-2xl border border-outline-variant/30">
                      <h3 className="font-label-md text-secondary mb-3 flex items-center gap-2 uppercase tracking-wider">
                        <span className="material-symbols-outlined text-[20px]">help_center</span>
                        Pregunta de Profundización Sugerida por LLM
                      </h3>
                      <p className="font-body-lg text-on-surface font-bold leading-relaxed mb-3">
                        "{review.payload?.question}"
                      </p>
                      <div className="flex gap-4 text-xs text-on-surface-variant font-medium mt-1">
                        <span>Incertidumbre: <strong>{Math.round((review.payload?.uncertainty ?? 0.25) * 100)}%</strong></span>
                        <span>Sensibilidad: <strong className="text-error">ALTA (Requiere Revisión)</strong></span>
                      </div>
                    </div>

                    <div className="bg-surface p-5 rounded-2xl border border-outline-variant/20 shadow-sm">
                      <h3 className="font-label-md text-secondary mb-2 flex items-center gap-2 uppercase tracking-wider">
                        <span className="material-symbols-outlined text-[20px]">description</span>
                        Justificación Etnográfica
                      </h3>
                      <p className="font-body-md text-on-surface-variant italic leading-relaxed">
                        "{review.payload?.justification}"
                      </p>
                    </div>

                    {review.payload?.event?.content && (
                      <div className="bg-surface-container/50 p-4 rounded-2xl border border-outline-variant/20">
                        <h4 className="text-xs font-bold text-on-surface-variant uppercase mb-2">Relato Original Ingresado:</h4>
                        <p className="text-sm italic text-on-surface-variant">"{review.payload.event.content}"</p>
                      </div>
                    )}
                  </div>
                )}

                {/* 3. Etapa AING (Baja confianza) */}
                {isIngestionStage && (
                  <div className="mb-8 space-y-4 animate-in fade-in duration-300">
                    <div className="bg-surface-container-highest p-5 rounded-2xl border border-outline-variant/30">
                      <h3 className="font-label-md text-secondary mb-2 flex items-center gap-2 uppercase tracking-wider">
                        Texto Normalizado Resultante
                      </h3>
                      <p className="font-body-lg text-on-surface leading-relaxed italic">
                        "{review.payload?.normalized_text}"
                      </p>
                      <div className="mt-3 text-xs text-on-surface-variant font-medium">
                        Confianza de Transcripción: <strong className="text-error">{Math.round((review.payload?.confidence ?? 0) * 100)}%</strong> (Umbral mínimo requerido: 55%)
                      </div>
                    </div>

                    {review.payload?.event?.content && (
                      <div className="bg-surface p-4 rounded-2xl border border-outline-variant/20">
                        <h4 className="text-xs font-bold text-on-surface-variant uppercase mb-2">Texto Original:</h4>
                        <p className="text-sm italic text-on-surface-variant">"{review.payload.event.content}"</p>
                      </div>
                    )}
                  </div>
                )}

                {/* 4. Etapa AGOV (Gobernanza / Consentimiento restringido) */}
                {isGovStage && (
                  <div className="mb-8 space-y-4 bg-surface-container-highest p-5 rounded-2xl border border-outline-variant/30 animate-in fade-in duration-300">
                    <h3 className="font-label-md text-secondary mb-2 flex items-center gap-2 uppercase tracking-wider">
                      Estado de Consentimiento
                    </h3>
                    <div className="text-sm space-y-2">
                      <p>Decisión de AGOV: <strong className="text-warning">REQUIERE REVISIÓN</strong></p>
                      <p><strong>Permisos Permitidos:</strong> {review.payload?.allowed_scopes?.join(', ') || 'Ninguno'}</p>
                      <p><strong>Permisos Restringidos:</strong> <span className="text-error font-bold">{review.payload?.restricted_scopes?.join(', ') || 'Ninguno'}</span></p>
                    </div>
                  </div>
                )}

                {/* 4.5. Etapa ACODE (Códigos cualitativos) */}
                {isCodeStage && (
                  <div className="mb-8 space-y-4 animate-in fade-in duration-300">
                    <div className="bg-surface-container-highest p-5 rounded-2xl border border-outline-variant/30">
                      <h3 className="font-label-md text-secondary mb-3 flex items-center gap-2 uppercase tracking-wider">
                        <span className="material-symbols-outlined text-[20px]">sell</span>
                        Códigos sugeridos que requieren revisión
                      </h3>
                      <ul className="space-y-3">
                        {review.payload?.codes && Array.isArray(review.payload.codes) ? (
                          review.payload.codes.map((codeItem, index) => (
                            <li key={index} className="bg-surface p-4 rounded-xl border border-outline-variant/20 flex flex-col gap-2">
                              <div className="flex items-center justify-between">
                                <span className="font-mono font-bold text-sm bg-primary/10 text-primary px-3 py-1 rounded-full">
                                  #{codeItem.code}
                                </span>
                                <span className="text-xs text-on-surface-variant font-medium">
                                  Confianza: <strong>{Math.round((codeItem.confidence ?? 0) * 100)}%</strong>
                                </span>
                              </div>
                              {codeItem.evidence && (
                                <p className="text-sm italic text-on-surface-variant bg-surface-container-high/40 p-3 rounded-lg border border-dashed border-outline-variant/20">
                                  "{Array.isArray(codeItem.evidence) ? codeItem.evidence.join(' ') : codeItem.evidence}"
                                </p>
                              )}
                            </li>
                          ))
                        ) : (
                          <li className="text-on-surface-variant italic">No hay códigos definidos en el payload</li>
                        )}
                      </ul>
                    </div>
                  </div>
                )}

                {/* 5. Etapa AFAIR (Riesgo y Equidad) */}
                {isFairStage && (
                  <div className="mb-8 space-y-4 bg-error-container/15 p-5 rounded-2xl border border-error/25 text-on-surface animate-in fade-in duration-300">
                    <h3 className="font-label-md text-error mb-2 flex items-center gap-2 uppercase tracking-wider">
                      Alerta de Riesgo o Equidad
                    </h3>
                    <div className="text-sm space-y-2">
                      <p>Decisión de Equidad: <strong className="text-error">{review.payload?.decision}</strong></p>
                      <p><strong>Puntuación de Riesgo:</strong> {Math.round((review.payload?.risk_score ?? 0) * 100)}%</p>
                      <p><strong>Razones del Alerta:</strong></p>
                      <ul className="list-disc pl-5 space-y-1">
                        {review.payload?.reasons?.map((r, i) => <li key={i}>{r}</li>)}
                      </ul>
                    </div>
                  </div>
                )}

                {/* Botones de Acción (Touch-Friendly) */}
                <div className="flex flex-col md:flex-row justify-end gap-3 pt-2">
                  <button
                    onClick={() => handleReject(review.review_id)}
                    disabled={processingId !== null}
                    className="w-full md:w-auto bg-surface-container hover:bg-error-container hover:text-error text-on-surface px-8 py-4 rounded-2xl font-label-md text-lg transition-all duration-300 flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed"
                    aria-label="Rechazar esta revisión"
                  >
                    <span className="material-symbols-outlined">cancel</span>
                    Rechazar
                  </button>
                  <button
                    onClick={() => handleApprove(review)}
                    disabled={processingId !== null}
                    className="w-full md:w-auto bg-primary text-on-primary px-8 py-4 rounded-2xl font-label-md text-lg hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300 flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed"
                    aria-label="Aprobar esta revisión"
                  >
                    {processingId === review.review_id ? (
                      <>
                        <span className="animate-spin material-symbols-outlined">sync</span>
                        Procesando...
                      </>
                    ) : (
                      <>
                        <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
                        {isCurrStage ? 'Aprobar Ruta Pedagógica' : 'Aprobar y Registrar Relato'}
                      </>
                    )}
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}