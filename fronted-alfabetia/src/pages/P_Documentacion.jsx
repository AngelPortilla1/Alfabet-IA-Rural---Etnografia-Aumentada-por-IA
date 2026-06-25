import { useNavigate } from 'react-router-dom';

export default function P_Documentacion() {
  const navigate = useNavigate();

  return (
    <main className="px-margin-mobile md:px-margin-desktop max-w-container-max mx-auto py-12 min-h-[calc(100vh-120px)] animate-in fade-in duration-700">
      
      {/* Back to Home Navigation */}
      <button
        onClick={() => navigate('/')}
        className="flex items-center gap-2 text-on-surface-variant hover:text-primary transition-all mb-8 group"
      >
        <span className="material-symbols-outlined transition-transform group-hover:-translate-x-1">arrow_back</span>
        <span className="font-bold text-sm uppercase tracking-widest">Volver al Inicio</span>
      </button>

      {/* Header */}
      <div className="mb-12">
        <div className="flex items-start gap-4 mb-4">
          <div className="w-12 h-12 rounded-2xl bg-primary text-on-primary flex items-center justify-center shadow-inner flex-shrink-0">
            <span className="material-symbols-outlined text-[24px]">description</span>
          </div>
          <div>
            <h1 className="font-display-lg text-3xl md:text-4xl font-bold text-on-surface">
              Documentación del Sistema
            </h1>
            <p className="font-body-lg text-body-lg text-on-surface-variant mt-2 max-w-3xl">
              Conozca el funcionamiento interno de AlfabetIA Rural. Descubra cómo interactúa nuestro sistema multiagente,
              cómo se procesan los relatos campesinos y la forma en que garantizamos el control humano en la toma de decisiones.
            </p>
          </div>
        </div>
      </div>

      {/* Grid de Secciones */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-16">
        
        {/* Columna Principal: Arquitectura de Agentes */}
        <section className="lg:col-span-2 space-y-8">
          
          <div className="bg-surface/80 backdrop-blur-md border border-white/40 shadow-sm p-6 md:p-8 rounded-3xl space-y-6">
            <h2 className="font-headline-md text-2xl text-on-surface flex items-center gap-3 border-b border-outline-variant/30 pb-4">
              <span className="material-symbols-outlined text-primary">lan</span>
              Arquitectura Multiagente Cooperativa
            </h2>
            <p className="text-on-surface-variant text-sm leading-relaxed">
              AlfabetIA Rural utiliza un ecosistema de 10 agentes inteligentes especializados que interactúan a través de 6 capas de memoria independientes para procesar relatos rurales y proponer rutas pedagógicas auditables:
            </p>

            <div className="space-y-4">
              {/* Adquisición territorial */}
              <div className="flex gap-4 p-4 rounded-2xl bg-primary-fixed/20 border border-primary-fixed-dim/40">
                <div className="shrink-0 w-10 h-10 rounded-xl bg-white/60 border border-primary-fixed-dim/40 flex items-center justify-center">
                  <span className="material-symbols-outlined font-black text-on-primary-fixed-variant">input</span>
                </div>
                <div>
                  <h3 className="font-bold text-sm text-on-primary-fixed-variant">Adquisición Territorial (AING)</h3>
                  <p className="text-xs text-on-surface-variant mt-1 leading-relaxed">
                    Captura y normaliza relatos (texto/audio), y extrae dialectos locales en la capa de memoria <strong>M_raw</strong>.
                  </p>
                </div>
              </div>

              {/* Interpretación Netnográfica */}
              <div className="flex gap-4 p-4 rounded-2xl bg-secondary-fixed/20 border border-secondary-fixed-dim/40">
                <div className="shrink-0 w-10 h-10 rounded-xl bg-white/60 border border-secondary-fixed-dim/40 flex items-center justify-center">
                  <span className="material-symbols-outlined font-black text-on-secondary-fixed-variant">psychology</span>
                </div>
                <div>
                  <h3 className="font-bold text-sm text-on-secondary-fixed-variant">Interpretación Netnográfica (AETHNO, ACODE, AMIND)</h3>
                  <p className="text-xs text-on-surface-variant mt-1 leading-relaxed">
                    Aplican codificación cualitativa asistida en <strong>M_sem</strong> y reconstruyen el modelo mental en <strong>M_graph</strong> como un grafo formal $M_i = (G_i, v_i, \ell_i, q_i)$ de conceptos, relaciones causales, valores y perfiles de alfabetización digital.
                  </p>
                </div>
              </div>

              {/* Etnografía Aumentada por IA */}
              <div className="flex gap-4 p-4 rounded-2xl bg-tertiary-container/20 border border-tertiary-container/40">
                <div className="shrink-0 w-10 h-10 rounded-xl bg-white/60 border border-tertiary-container/40 flex items-center justify-center">
                  <span className="material-symbols-outlined font-black text-on-tertiary-container">forum</span>
                </div>
                <div>
                  <h3 className="font-bold text-sm text-on-tertiary-container">Etnografía Aumentada por IA (AETHNO-LLM)</h3>
                  <p className="text-xs text-on-surface-variant mt-1 leading-relaxed">
                    Agente conversacional LLM especializado que aplica técnicas de entrevista etnográfica. Utiliza memoria persistente para caracterizar progresivamente las necesidades de alfabetización sin emitir juicios ni persuadir, operando siempre bajo controles estrictos y revisión humana (<em>human-in-the-loop</em>).
                  </p>
                </div>
              </div>

              {/* Apoyo Pedagógico */}
              <div className="flex gap-4 p-4 rounded-2xl bg-tertiary-fixed/20 border border-tertiary-fixed-dim/40">
                <div className="shrink-0 w-10 h-10 rounded-xl bg-white/60 border border-tertiary-fixed-dim/40 flex items-center justify-center">
                  <span className="material-symbols-outlined font-black text-on-tertiary-fixed-variant">local_library</span>
                </div>
                <div>
                  <h3 className="font-bold text-sm text-on-tertiary-fixed-variant">Apoyo Curricular (APLAN, AEXPL)</h3>
                  <p className="text-xs text-on-surface-variant mt-1 leading-relaxed">
                    Proponen rutas pedagógicas modulares sobre el currículo L0 y explicaciones transparentes en la capa <strong>M_curr</strong> a partir de los perfiles y necesidades estimadas en el grafo.
                  </p>
                </div>
              </div>

              {/* Control Normativo y Seguridad */}
              <div className="flex gap-4 p-4 rounded-2xl bg-error-container/20 border border-error/20">
                <div className="shrink-0 w-10 h-10 rounded-xl bg-white/60 border border-error/20 flex items-center justify-center">
                  <span className="material-symbols-outlined font-black text-on-error-container">gavel</span>
                </div>
                <div>
                  <h3 className="font-bold text-sm text-on-error-container">Gobernanza y Auditoría (AGOV, ASUP, AFAIR, ASYNC)</h3>
                  <p className="text-xs text-on-surface-variant mt-1 leading-relaxed">
                    Verifican consentimientos (<strong>M_policy</strong>), evalúan riesgos de sesgo y equidad, gestionan la cola de sincronización offline, y mantienen la bitácora inmutable por hash-chain (<strong>M_audit</strong>).
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Guía de Procesos */}
          <div className="bg-surface/80 backdrop-blur-md border border-white/40 shadow-sm p-6 md:p-8 rounded-3xl space-y-6">
            <h2 className="font-headline-md text-2xl text-on-surface flex items-center gap-3 border-b border-outline-variant/30 pb-4">
              <span className="material-symbols-outlined text-secondary">checklist_rtl</span>
              Flujo de Operación paso a paso
            </h2>
            
            <div className="relative pl-6 border-l-2 border-outline-variant/40 space-y-6">
              
              <div className="relative">
                <div className="absolute -left-[31px] top-0 w-4 h-4 rounded-full bg-primary border-2 border-white" />
                <h4 className="font-bold text-on-surface text-sm">1. Registro de Consentimiento y Relato</h4>
                <p className="text-xs text-on-surface-variant mt-1">
                  El facilitador en territorio lee los consentimientos y captura el relato oral del campesino. Los datos se cifran en el dispositivo.
                </p>
              </div>

              <div className="relative">
                <div className="absolute -left-[31px] top-0 w-4 h-4 rounded-full bg-secondary border-2 border-white" />
                <h4 className="font-bold text-on-surface text-sm">2. Inferencia y Generación de Modelo Mental</h4>
                <p className="text-xs text-on-surface-variant mt-1">
                  Los agentes procesan la información utilizando LLMs locales (con Ollama). Se extraen conceptos, valores culturales y temores, y se propone un currículo.
                </p>
              </div>

              <div className="relative">
                <div className="absolute -left-[31px] top-0 w-4 h-4 rounded-full bg-tertiary border-2 border-white" />
                <h4 className="font-bold text-on-surface text-sm">3. Co-Diseño Curricular (Human-in-the-Loop)</h4>
                <p className="text-xs text-on-surface-variant mt-1">
                  Un docente del equipo curricular revisa el modelo mental y la ruta pedagógica propuesta. Puede corregir conceptos, aprobar la ruta o rechazarla.
                </p>
              </div>

              <div className="relative">
                <div className="absolute -left-[31px] top-0 w-4 h-4 rounded-full bg-outline border-2 border-white" />
                <h4 className="font-bold text-on-surface text-sm">4. Auditoría y Trazabilidad</h4>
                <p className="text-xs text-on-surface-variant mt-1">
                  Cada acción de los agentes y humanos queda registrada de manera inmutable en el registro de Auditoría con firmas hash encadenadas.
                </p>
              </div>

            </div>
          </div>

        </section>

        {/* Columna Lateral: Gobernanza y Privacidad */}
        <section className="space-y-8">
          
          {/* Privacy Card */}
          <div className="bg-surface/80 backdrop-blur-md border border-white/40 shadow-sm p-6 rounded-3xl space-y-4">
            <h3 className="font-headline-md text-xl text-on-surface flex items-center gap-2 border-b border-outline-variant/30 pb-3">
              <span className="material-symbols-outlined text-error">policy</span>
              Gobernanza de Datos
            </h3>
            <p className="text-xs text-on-surface-variant leading-relaxed">
              Nuestro sistema implementa <strong>Privacy-by-Design</strong> mediante alcances granulares de privacidad:
            </p>
            
            <ul className="space-y-2 text-xs text-on-surface-variant">
              <li className="flex gap-2">
                <span className="material-symbols-outlined text-sm text-primary">mic</span>
                <div>
                  <strong>Captura Cruda:</strong> Almacena el relato textual del productor.
                </div>
              </li>
              <li className="flex gap-2">
                <span className="material-symbols-outlined text-sm text-secondary">psychology</span>
                <div>
                  <strong>Procesamiento Semántico:</strong> Permite que la IA extraiga conceptos clave.
                </div>
              </li>
              <li className="flex gap-2">
                <span className="material-symbols-outlined text-sm text-tertiary">account_tree</span>
                <div>
                  <strong>Derivado de Grafo:</strong> Permite construir el Modelo Mental BDI.
                </div>
              </li>
              <li className="flex gap-2">
                <span className="material-symbols-outlined text-sm text-outline">school</span>
                <div>
                  <strong>Derivado Curricular:</strong> Habilita la propuesta de rutas pedagógicas adaptadas.
                </div>
              </li>
            </ul>

            <div className="pt-2 border-t border-outline-variant/20">
              <h4 className="text-xs font-bold text-on-surface mb-1">Derecho al Olvido (Tombstones)</h4>
              <p className="text-[11px] text-on-surface-variant/80 leading-relaxed">
                Cuando un usuario solicita revocar su consentimiento, el Agente de Gobernanza purga la base de datos y genera un 
                <strong> Tombstone criptográfico</strong>, que certifica inmutablemente la eliminación sin revelar datos sensibles.
              </p>
            </div>
          </div>

          {/* Glosario de Conceptos */}
          <div className="bg-surface/80 backdrop-blur-md border border-white/40 shadow-sm p-6 rounded-3xl space-y-4">
            <h3 className="font-headline-md text-xl text-on-surface flex items-center gap-2 border-b border-outline-variant/30 pb-3">
              <span className="material-symbols-outlined text-secondary">book_4</span>
              Glosario Rápido
            </h3>
            
            <div className="space-y-3 text-xs text-on-surface-variant">
              <div>
                <h4 className="font-bold text-on-surface">Modelos Mentales BDI:</h4>
                <p className="mt-0.5 leading-relaxed">Estructura cognitiva que agrupa Creencias (Beliefs), Deseos (Desires) e Intenciones (Intentions) de un usuario.</p>
              </div>
              <div>
                <h4 className="font-bold text-on-surface">Distancia Fisher-Rao:</h4>
                <p className="mt-0.5 leading-relaxed">Métrica matemática usada por los agentes para medir la distancia semántica y cultural entre dos grafos de conocimiento.</p>
              </div>
              <div>
                <h4 className="font-bold text-on-surface">Segmento Comunitario:</h4>
                <p className="mt-0.5 leading-relaxed">Agrupación de productores que comparten similitudes en sus modelos mentales de desconfianza o disposición tecnológica.</p>
              </div>
            </div>
          </div>

        </section>
        
      </div>
      
    </main>
  );
}
