import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { API_ENDPOINTS } from '../api/client';
import { useToast } from '../components/ToastContext';

export default function P1_RegistrarRelato() {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Estado del formulario
  const [formData, setFormData] = useState({
    pid: '',
    relato: '',
    consent_data: false,   // Permite guardar los datos
    consent_ai: false      // Permite procesar con Agentes/LLM
  });

  // El botón solo se habilita si ambos consentimientos obligatorios están marcados y hay texto
  const isFormValid = formData.pid.trim() !== '' &&
    formData.relato.trim() !== '' &&
    formData.consent_data &&
    formData.consent_ai;

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!isFormValid) return;

    setLoading(true);
    setError(null);

    // Generamos un ID único para el evento y las fechas exactas en formato ISO
    const eventId = crypto.randomUUID ? crypto.randomUUID() : `evt_${Date.now()}`;
    const now = new Date();
    const nextYear = new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000);

    // Obtenemos o generamos un Session ID del facilitador
    let currentSid = sessionStorage.getItem('facilitator_sid');
    if (!currentSid) {
      currentSid = crypto.randomUUID ? crypto.randomUUID() : `sid_${Date.now()}`;
      sessionStorage.setItem('facilitator_sid', currentSid);
    }

    // Calculamos hash criptográfico real del contenido
    const msgUint8 = new TextEncoder().encode(formData.relato);
    const hashBuffer = await crypto.subtle.digest('SHA-256', msgUint8);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const contentHashReal = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

    // Construimos el Payload EXACTO que pide el modelo Pydantic del Backend
    const payload = {
      event_id: eventId,
      event_type: "narrative.v1",
      sid: currentSid,
      pid: formData.pid,
      channel: "text",
      content: formData.relato, // Aquí va el texto real
      consent: {
        primary_use: true,
        allow_raw_capture: formData.consent_data,           // Mapeado a tu checkbox
        allow_semantic_processing: formData.consent_ai,     // Mapeado a tu checkbox
        allow_graph_derivative: formData.consent_ai,        // Permitimos derivar grafos BDI
        allow_curriculum_derivatives: formData.consent_ai,  // Permitimos derivar currículo
        secondary_use: false,
        allow_export: false,
        revoked: false,
        revocation_reason: "",
        retention_days: 365,
        valid_until: nextYear.toISOString(),
        policy_version: "Pi0-2026-04",
        participant_ack: true,
        metadata: {}
      },
      provenance: "direct",
      uncertainty: 0,
      uncertainty_sources: {},
      version: 1,
      schema_version: "event-envelope/2.0",
      ts: now.toISOString(),
      content_hash: contentHashReal,
      metadata: {}
    };

    try {
      const response = await fetch(API_ENDPOINTS.EVENTS, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        // Extraemos el detalle del error 422 para depurar si sigue fallando
        const errDetail = await response.json();
        console.error("Detalle del error FastAPI:", errDetail);
        throw new Error(`Error ${response.status}: El backend rechazó el formato. Revisa la consola.`);
      }

      const resData = await response.json();
      console.log("Respuesta de ingesta de evento:", resData);

      if (resData.status === 'blocked') {
        const reasons = resData.reasons ? resData.reasons.join(', ') : 'Riesgo o políticas de gobernanza/privacidad del sistema.';
        showToast(`El relato fue BLOQUEADO en la etapa ${resData.stage}. Motivo: ${reasons}`, 'error');
        setError(`El relato fue bloqueado por políticas en la etapa ${resData.stage}. Motivo: ${reasons}`);
      } else if (resData.status === 'review') {
        let reasonMsg = 'El relato ha sido enviado a la cola de revisión humana.';
        if (resData.stage === 'AETHNO') {
          reasonMsg = 'Requiere aprobación humana del facilitador por contener temas sensibles en el probe de profundización.';
        } else if (resData.stage === 'AGOV') {
          reasonMsg = 'El alcance de consentimiento está restringido y requiere auditoría de gobernanza.';
        } else if (resData.stage === 'AING') {
          reasonMsg = 'La normalización del texto tiene baja confianza y requiere revisión.';
        }
        showToast(`El relato requiere revisión humana (Etapa: ${resData.stage}). ${reasonMsg}`, 'info');
        // Navegamos al dashboard principal
        navigate('/');
      } else {
        showToast('¡Relato registrado y enviado a los agentes BDI exitosamente!', 'success');
        // Navegamos automáticamente al modelo mental generado para este productor
        navigate(`/modelo-mental/${formData.pid}`);
      }

      // Limpiamos el formulario (aunque ya habremos navegado)
      setFormData({ pid: '', relato: '', consent_data: false, consent_ai: false });

    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto py-8">

      <header className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <button onClick={() => navigate('/')} className="text-on-surface-variant hover:text-primary transition-colors">
            <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 0" }}>arrow_back</span>
          </button>
          <h1 className="font-display-lg text-3xl font-bold text-on-surface">Registrar Relato</h1>
        </div>
        <p className="font-body-md text-on-surface-variant ml-10">
          Captura el contexto y necesidades del productor. El agente M_per procesará este texto.
        </p>
      </header>

      {error && (
        <div className="bg-error-container text-on-error-container p-4 rounded-xl mb-6 flex items-start gap-3">
          <span className="material-symbols-outlined">error</span>
          <p>{error}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="bg-surface/80 backdrop-blur-md border border-white/40 shadow-sm p-6 md:p-8 rounded-3xl space-y-6">

        {/* Identificador del Productor */}
        <div>
          <label htmlFor="pid" className="block font-label-md text-on-surface mb-2">
            Identificador del Productor (PID) <span className="text-error">*</span>
          </label>
          <input
            type="text"
            id="pid"
            name="pid"
            placeholder="Ej. campesino_vereda_01"
            value={formData.pid}
            onChange={handleChange}
            className="w-full bg-surface-container-highest border border-outline-variant rounded-xl px-4 py-3 text-on-surface focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
            required
          />
        </div>

        {/* Área del Relato */}
        <div>
          <label htmlFor="relato" className="block font-label-md text-on-surface mb-2">
            Relato del Productor <span className="text-error">*</span>
          </label>
          <div className="flex justify-between items-end mb-3">
            <p className="text-sm text-on-surface-variant">
              Transcribe textualmente las necesidades, temores o dudas sobre la tecnología y los datos.
            </p>
            <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${formData.relato.length > 50 ? 'bg-primary-fixed text-on-primary-fixed-variant' : 'bg-surface-container-highest text-on-surface-variant'}`}>
              {formData.relato.length} caracteres
            </span>
          </div>
          <textarea
            id="relato"
            name="relato"
            rows="6"
            placeholder="El campesino menciona que tiene desconfianza de usar el teléfono porque cree que..."
            value={formData.relato}
            onChange={handleChange}
            className="w-full bg-surface-container-highest border border-outline-variant rounded-xl px-4 py-3 text-on-surface focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all resize-y"
            required
          ></textarea>
        </div>

        {/* Sección de Consentimientos (CRÍTICO) */}
        <div className="bg-surface-container p-5 rounded-2xl border border-outline-variant/50">
          <h3 className="font-label-md text-on-surface mb-4 flex items-center gap-2">
            <span className="material-symbols-outlined text-secondary">verified_user</span>
            Consentimientos Requeridos (Strict)
          </h3>

          <div className="space-y-4">
            <label className="flex items-start gap-3 cursor-pointer group">
              <div className="mt-1 flex-shrink-0">
                <input
                  type="checkbox"
                  name="consent_data"
                  checked={formData.consent_data}
                  onChange={handleChange}
                  className="w-5 h-5 rounded border-outline text-primary focus:ring-primary accent-primary"
                />
              </div>
              <div>
                <p className="font-body-md text-on-surface font-medium group-hover:text-primary transition-colors">
                  Almacenamiento Local de Datos
                </p>
                <p className="text-sm text-on-surface-variant">
                  El productor autoriza que su relato sea guardado encriptado en el dispositivo (Offline-first).
                </p>
              </div>
            </label>

            <label className="flex items-start gap-3 cursor-pointer group">
              <div className="mt-1 flex-shrink-0">
                <input
                  type="checkbox"
                  name="consent_ai"
                  checked={formData.consent_ai}
                  onChange={handleChange}
                  className="w-5 h-5 rounded border-outline text-primary focus:ring-primary accent-primary"
                />
              </div>
              <div>
                <p className="font-body-md text-on-surface font-medium group-hover:text-primary transition-colors">
                  Procesamiento mediante Inteligencia Artificial Local
                </p>
                <p className="text-sm text-on-surface-variant">
                  El productor comprende y acepta que este texto será procesado por la inteligencia artificial para generar su modelo mental.
                </p>
              </div>
            </label>
          </div>
        </div>

        {/* Botón Submit */}
        <div className="pt-4 flex justify-end">
          <button
            type="submit"
            disabled={!isFormValid || loading}
            className={`px-8 py-3 rounded-xl font-label-md flex items-center gap-2 transition-all duration-300
              ${isFormValid && !loading
                ? 'bg-primary text-on-primary hover:shadow-lg hover:-translate-y-0.5'
                : 'bg-surface-container-highest text-outline cursor-not-allowed'
              }`}
          >
            {loading ? (
              <>
                <span className="animate-spin material-symbols-outlined">sync</span>
                Procesando Agentes...
              </>
            ) : (
              <>
                <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>send</span>
                Registrar y Analizar
              </>
            )}
          </button>
        </div>

      </form>
    </div>
  );
}