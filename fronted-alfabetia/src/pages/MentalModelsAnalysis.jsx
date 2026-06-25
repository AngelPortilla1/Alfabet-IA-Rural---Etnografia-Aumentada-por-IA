import { useNavigate } from 'react-router-dom';

/* ──────────────────────────────────────────────
   Sub-components
────────────────────────────────────────────── */

/** Un término de la tupla con su descripción */
const TupleParam = ({ symbol, name, desc, color = 'primary' }) => {
  const colorMap = {
    primary:   { bg: 'bg-primary-fixed/20',   border: 'border-primary-fixed-dim/40',   text: 'text-on-primary-fixed-variant',   sym: 'text-on-primary-fixed-variant'   },
    secondary: { bg: 'bg-secondary-fixed/20', border: 'border-secondary-fixed-dim/40', text: 'text-on-secondary-fixed-variant', sym: 'text-on-secondary-fixed-variant' },
    tertiary:  { bg: 'bg-tertiary-fixed/20',  border: 'border-tertiary-fixed-dim/40',  text: 'text-on-tertiary-fixed-variant', sym: 'text-on-tertiary-fixed-variant' },
    surface:   { bg: 'bg-surface-container',      border: 'border-outline-variant',        text: 'text-on-surface', sym: 'text-on-surface-variant' },
  };
  const c = colorMap[color];
  return (
    <div className={`flex items-start gap-4 p-4 rounded-2xl ${c.bg} border ${c.border} transition-all duration-300 hover:scale-[1.02]`}>
      <div className={`shrink-0 w-10 h-10 rounded-xl bg-white/60 backdrop-blur-sm border ${c.border} flex items-center justify-center`}>
        <span className={`font-mono text-xl font-black ${c.sym}`}>{symbol}</span>
      </div>
      <div className="flex-1 min-w-0">
        <p className={`font-bold text-sm ${c.text}`}>{name}</p>
        <p className="text-xs text-on-surface-variant mt-0.5 leading-relaxed">{desc}</p>
      </div>
    </div>
  );
};

/** Una etapa del pipeline de procesamiento */
const PipelineStep = ({ step, icon, title, desc, accent, delay }) => (
  <div
    className="relative flex flex-col items-center text-center animate-in fade-in slide-in-from-bottom-6 duration-700"
    style={{ animationDelay: delay }}
  >
    {/* Connector line */}
    <div className="hidden md:block absolute top-7 left-[calc(50%+2rem)] right-[-50%] h-px border-t-2 border-dashed border-outline-variant z-0" />

    <div className={`relative z-10 w-14 h-14 rounded-2xl ${accent} flex items-center justify-center shadow-md mb-4`}>
      <span className="material-symbols-outlined text-white text-[26px]">{icon}</span>
      <span className="absolute -top-2 -left-2 w-6 h-6 rounded-full bg-surface border-2 border-outline-variant flex items-center justify-center text-[10px] font-black text-on-surface">{step}</span>
    </div>
    <p className="font-bold text-on-surface text-sm mb-1">{title}</p>
    <p className="text-xs text-on-surface-variant leading-relaxed max-w-[140px]">{desc}</p>
  </div>
);

/* ──────────────────────────────────────────────
   Main Page
────────────────────────────────────────────── */
const MentalModelsAnalysis = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background relative overflow-hidden">

      {/* ── Ambient orbs ── */}
      <div className="absolute top-[-15%] left-[-10%] w-[45%] h-[45%] bg-primary/8 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[55%] h-[55%] bg-tertiary/8 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute top-[40%] right-[20%] w-[25%] h-[25%] bg-secondary/6 rounded-full blur-[100px] pointer-events-none" />

      <div className="max-w-5xl mx-auto px-margin-mobile md:px-margin-desktop py-12 relative z-10">

        {/* ── Navigation ── */}
        <button
          onClick={() => navigate('/')}
          className="flex items-center gap-2 text-on-surface-variant hover:text-primary transition-all mb-12 group"
        >
          <span className="material-symbols-outlined transition-transform group-hover:-translate-x-1">arrow_back</span>
          <span className="font-bold text-sm uppercase tracking-widest">Volver al Dashboard</span>
        </button>

        {/* ══════════════════════════════════════════
            HERO
        ══════════════════════════════════════════ */}
        <header className="mb-16">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-[10px] font-bold uppercase tracking-widest mb-6 animate-in fade-in slide-in-from-bottom-2 duration-700">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-primary" />
            </span>
            Arquitectura Multiagentes · Módulo Cognitivo
          </div>

          <h1 className="text-headline-lg md:text-[3.5rem] font-display-lg leading-[1.1] text-on-surface mb-6 animate-in fade-in slide-in-from-bottom-4 duration-700 delay-100">
            Análisis de{' '}
            <span className="text-primary italic">Modelos Mentales</span>
            <br className="hidden md:block" /> en AlfabetIA Rural
          </h1>

          <p className="text-lg md:text-xl text-on-surface-variant max-w-2xl leading-relaxed animate-in fade-in slide-in-from-bottom-6 duration-700 delay-200">
            Nuestra arquitectura procesa y analiza los modelos mentales a través de una cadena de apoyo decisional,
            garantizando que el sistema organice la información y el criterio humano tome la decisión final.
          </p>
        </header>

        {/* ══════════════════════════════════════════
            ESPECIFICACIÓN FORMAL — Sección principal
        ══════════════════════════════════════════ */}
        <section className="mb-14 animate-in fade-in slide-in-from-bottom-6 duration-700 delay-300">

          {/* Encabezado de sección */}
          <div className="flex items-center gap-3 mb-8">
            <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center shadow-md shadow-primary/20">
              <span className="material-symbols-outlined text-white text-[20px]">functions</span>
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-primary">§ 1 — Definición Formal</p>
              <h2 className="text-xl font-bold text-on-surface">Formalización Matemática del Modelo Mental</h2>
            </div>
          </div>

          {/* Tarjeta principal de la fórmula */}
          <div className="rounded-[2rem] bg-surface/80 backdrop-blur-md border border-white/50 shadow-[0_8px_40px_rgba(27,48,34,0.08)] overflow-hidden">

            {/* Barra superior decorativa */}
            <div className="h-1 w-full bg-gradient-to-r from-primary via-secondary to-tertiary-fixed-dim" />

            <div className="p-8 md:p-10">

              {/* Descripción */}
              <p className="text-on-surface-variant leading-relaxed mb-8 max-w-prose">
                Cada modelo mental <span className="font-mono font-bold text-primary text-sm bg-primary-container/20 px-1.5 py-0.5 rounded-md">Mᵢ</span> se
                representa mediante una <strong className="text-on-surface">estructura de tupla de cuatro componentes</strong>,
                consolidando evidencia directa e inferencias cognitivas extraídas del relato etnográfico.
              </p>

              {/* Bloque de fórmula */}
              <div className="relative mb-8">
                <div className="absolute inset-0 bg-gradient-to-br from-primary-container/10 to-tertiary-fixed/5 rounded-2xl" />
                <div className="relative flex flex-col items-center justify-center gap-2 py-8 px-6 rounded-2xl border border-primary-container/30">
                  {/* Label */}
                  <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-primary/60 mb-2">Representación Canónica</span>

                  {/* Fórmula principal */}
                  <div className="flex flex-wrap items-center justify-center gap-2 md:gap-3">
                    <span className="font-mono text-3xl md:text-4xl font-black text-on-surface">Mᵢ</span>
                    <span className="font-mono text-3xl md:text-4xl font-light text-outline">=</span>
                    <span className="font-mono text-2xl md:text-3xl font-bold text-outline">(</span>
                    {[
                      { sym: 'Gᵢ', color: 'text-primary',            label: 'Grafo' },
                      { sym: ',',   color: 'text-outline',             label: ''      },
                      { sym: 'vᵢ', color: 'text-secondary',           label: 'Valores' },
                      { sym: ',',   color: 'text-outline',             label: ''      },
                      { sym: 'ℓᵢ', color: 'text-on-tertiary-fixed-variant', label: 'Alfabetización' },
                      { sym: ',',   color: 'text-outline',             label: ''      },
                      { sym: 'qᵢ', color: 'text-on-surface-variant',  label: 'Incertidumbre' },
                    ].map((t, i) =>
                      t.label ? (
                        <div key={i} className="flex flex-col items-center">
                          <span className={`font-mono text-2xl md:text-3xl font-black ${t.color}`}>{t.sym}</span>
                          <span className="text-[8px] font-bold uppercase tracking-widest text-on-surface-variant/50 mt-0.5">{t.label}</span>
                        </div>
                      ) : (
                        <span key={i} className={`font-mono text-2xl md:text-3xl font-light ${t.color}`}>{t.sym}</span>
                      )
                    )}
                    <span className="font-mono text-2xl md:text-3xl font-bold text-outline">)</span>
                  </div>

                  {/* Nota de referencia */}
                  <p className="text-[10px] text-on-surface-variant/60 italic mt-4 text-center">
                    * Incluye métricas de incertidumbre, historial de revisiones y detección de contradicciones [cite: §2.3, p.59].
                  </p>
                </div>
              </div>

              {/* Grid de parámetros */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <TupleParam
                  symbol="Gᵢ"
                  name="Grafo de Conocimiento"
                  desc="Estructura topológica que mapea conceptos, relaciones causales y dependencias extraídas del relato narrativo."
                  color="primary"
                />
                <TupleParam
                  symbol="vᵢ"
                  name="Vector de Valores Culturales"
                  desc="Perfil de creencias, prácticas y saberes locales codificados a partir de la narrativa etnográfica del productor."
                  color="secondary"
                />
                <TupleParam
                  symbol="ℓᵢ"
                  name="Perfil de Alfabetización Digital"
                  desc="Composición en dominios C1-C7, incluyendo la dimensión adaptativa de soberanía tecnológica rural."
                  color="tertiary"
                />
                <TupleParam
                  symbol="qᵢ"
                  name="Grado de Incertidumbre"
                  desc="Escalar [0,1] que cuantifica la confianza del sistema. Valores altos activan revisión humana obligatoria."
                  color="surface"
                />
              </div>
            </div>
          </div>
        </section>

        {/* ══════════════════════════════════════════
            PIPELINE DE PROCESAMIENTO
        ══════════════════════════════════════════ */}
        <section className="mb-14">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-10 h-10 rounded-xl bg-secondary flex items-center justify-center shadow-md shadow-secondary/20">
              <span className="material-symbols-outlined text-white text-[20px]">schema</span>
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-secondary">§ 2 — Cadena de Procesamiento</p>
              <h2 className="text-xl font-bold text-on-surface">Pipeline Multiagente de Análisis</h2>
            </div>
          </div>

          <div className="rounded-[2rem] bg-surface/80 backdrop-blur-md border border-white/50 shadow-[0_8px_40px_rgba(27,48,34,0.08)] p-8 md:p-10">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8 md:gap-4 relative">
              <PipelineStep step="1" icon="mic"          title="Captura de Relato"   desc="Narrativa oral o escrita del productor agrícola"   accent="bg-primary"   delay="0ms"   />
              <PipelineStep step="2" icon="memory"       title="Inferencia LLM"      desc="OllamaClient extrae Gᵢ, vᵢ y ℓᵢ del texto"       accent="bg-secondary" delay="100ms" />
              <PipelineStep step="3" icon="hub"          title="Agrupamiento Híbrido" desc="Distancia combinada dG, euclídea y Fisher-Rao"   accent="bg-[#4d6453]" delay="200ms" />
              <PipelineStep step="4" icon="front_hand"   title="Validación Humana"   desc="Docente revisa y aprueba el borrador del modelo"  accent="bg-tertiary" delay="300ms" />
            </div>

            {/* Métrica Híbrida callout */}
            <div className="mt-8 flex flex-col sm:flex-row items-start sm:items-center gap-4 p-4 rounded-2xl bg-tertiary-fixed/30 border border-tertiary-fixed-dim/30">
              <div className="shrink-0 w-10 h-10 rounded-xl bg-tertiary-fixed/40 border border-tertiary-fixed-dim/30 flex items-center justify-center">
                <span className="material-symbols-outlined text-on-tertiary-fixed-variant text-[20px]">calculate</span>
              </div>
              <div className="flex-1">
                <p className="text-xs font-bold uppercase tracking-widest text-on-tertiary-fixed-variant mb-1">Métrica de Agrupamiento Híbrida</p>
                <div className="flex flex-col gap-1 mt-1">
                  <span className="font-mono text-sm font-bold text-on-surface">d(Mᵢ, Mⱼ) = α · d<sub>G</sub>(Gᵢ, Gⱼ) + β · ‖vᵢ − vⱼ‖ + γ · d<sub>FR</sub>(ℓᵢ, ℓⱼ)</span>
                  <span className="text-xs text-on-surface-variant italic">
                    donde <strong>d<sub>G</sub></strong> mide similitud topológica, la norma euclídea compara valores, y <strong>d<sub>FR</sub></strong> (Fisher-Rao) compara perfiles de alfabetización.
                  </span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ══════════════════════════════════════════
            PROPIEDADES DEL SISTEMA — 2 columnas
        ══════════════════════════════════════════ */}
        <section className="mb-16">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-10 h-10 rounded-xl bg-on-tertiary-container flex items-center justify-center shadow-md">
              <span className="material-symbols-outlined text-white text-[20px]">verified</span>
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-on-tertiary-container">§ 3 — Garantías del Sistema</p>
              <h2 className="text-xl font-bold text-on-surface">Propiedades Arquitectónicas</h2>
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-6">

            {/* Procesamiento Local */}
            <div className="p-7 rounded-[1.75rem] bg-surface/80 backdrop-blur-md border border-white/50 shadow-[0_4px_20px_rgba(27,48,34,0.06)] hover:shadow-[0_12px_40px_rgba(27,48,34,0.12)] hover:-translate-y-1 transition-all duration-500 group">
              <div className="flex items-center gap-3 mb-5">
                <div className="w-11 h-11 rounded-xl bg-primary-container text-on-primary flex items-center justify-center group-hover:scale-110 transition-transform duration-500">
                  <span className="material-symbols-outlined text-[22px]">memory</span>
                </div>
                <h3 className="text-lg font-bold text-on-surface">Procesamiento Local Asistido</h3>
              </div>
              <p className="text-on-surface-variant leading-relaxed text-sm">
                Mediante <span className="font-bold text-secondary">Ollama</span> encapsulado en{' '}
                <code className="text-xs bg-surface-container px-1.5 py-0.5 rounded-md font-mono font-bold text-primary">LLMClientProtocol</code>,
                las narrativas se transforman en grafos{' '}
                <code className="text-xs bg-surface-container px-1.5 py-0.5 rounded-md font-mono font-bold">Gᵢ</code>,
                extrayendo valores <code className="text-xs bg-surface-container px-1.5 py-0.5 rounded-md font-mono font-bold">vᵢ</code>{' '}
                y perfiles de alfabetización <code className="text-xs bg-surface-container px-1.5 py-0.5 rounded-md font-mono font-bold">ℓᵢ</code> sin depender de servidores externos.
              </p>
              <div className="mt-5 flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-primary">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-primary" />
                </span>
                Inferencia On-Device Activa
              </div>
            </div>

            {/* Human-in-the-Loop */}
            <div className="p-7 rounded-[1.75rem] bg-primary text-on-primary shadow-xl shadow-primary/20 hover:-translate-y-1 transition-all duration-500 group">
              <div className="flex items-center gap-3 mb-5">
                <div className="w-11 h-11 rounded-xl bg-white/20 flex items-center justify-center group-hover:scale-110 transition-transform duration-500">
                  <span className="material-symbols-outlined text-[22px]">front_hand</span>
                </div>
                <h3 className="text-lg font-bold">Control Human-in-the-Loop</h3>
              </div>
              <p className="text-white/80 leading-relaxed text-sm mb-6">
                Toda representación funciona estrictamente como un <strong className="text-white">borrador revisable</strong>.
                El equipo docente mantiene la <em>autoridad indelegable</em> para validar, corregir o rechazar
                cualquier inferencia generada por la arquitectura multiagente.
              </p>
              <div className="grid grid-cols-2 gap-3">
                <div className="py-2.5 px-3 rounded-xl bg-white/10 border border-white/20 text-center">
                  <p className="text-[10px] uppercase tracking-widest font-bold text-white/60 mb-1">Principio</p>
                  <p className="text-xs font-bold">Soberanía Epistémica</p>
                </div>
                <div className="py-2.5 px-3 rounded-xl bg-white/10 border border-white/20 text-center">
                  <p className="text-[10px] uppercase tracking-widest font-bold text-white/60 mb-1">Revisión</p>
                  <p className="text-xs font-bold">Obligatoria si qᵢ ≥ 0.7</p>
                </div>
              </div>
            </div>

          </div>
        </section>

        {/* ── Footer ── */}
        <footer className="pt-8 border-t border-on-surface/10 flex flex-col md:flex-row justify-between items-center gap-4 opacity-60">
          <p className="text-xs font-medium text-on-surface-variant">Anexo de Auditoría Técnica · AlfabetIA Rural v2.0.4</p>
          <div className="flex items-center gap-3">
            <span className="text-[10px] uppercase tracking-widest text-on-surface-variant">Módulos</span>
            <span className="w-2 h-2 rounded-full bg-primary" />
            <span className="w-2 h-2 rounded-full bg-secondary" />
            <span className="w-2 h-2 rounded-full bg-on-tertiary-container" />
          </div>
        </footer>

      </div>
    </div>
  );
};

export default MentalModelsAnalysis;
