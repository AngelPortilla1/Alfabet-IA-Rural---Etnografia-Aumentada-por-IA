import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { API_ENDPOINTS } from '../api/client';
import { useApiStatus } from '../hooks/useApiStatus';
import { useAgentSwarmStatus } from '../hooks/useAgentSwarmStatus';
import { AgentStatusDropdown } from './agents/AgentStatusDropdown';
import { useToast } from './ToastContext';
import LogoAlfabetia from '../assets/LogoAlfabetia.png';

export default function Header() {
  const location = useLocation();
  // Uso del sensor real para el principio Offline-first
  const { isOnline, loading, mode, modelName } = useApiStatus();
  const { agents, isLoading } = useAgentSwarmStatus();
  const { showToast } = useToast();
  const [isColdStarting, setIsColdStarting] = useState(false);
  const [useStub, setUseStub] = useState(true);
  const [menuOpen, setMenuOpen] = useState(false);

  const handleColdStart = async () => {
    setIsColdStarting(true);

    try {
      const response = await fetch(`${API_ENDPOINTS.COLD_START}?use_stub=${useStub}`, {
        method: 'POST'
      });
      if (response.ok) {
        showToast('Sistema Multiagente inicializado exitosamente.', 'success');
        setTimeout(() => window.location.reload(), 1500);
      } else {
        showToast('Error al intentar inicializar el Backend.', 'error');
      }
    } catch (err) {
      showToast('No se pudo conectar con el Backend (127.0.0.1:8000).', 'error');
      console.error(err);
    } finally {
      setIsColdStarting(false);
    }
  };

  return (
    <>
      {/* TopNavBar */}
      <header className="fixed top-0 w-full z-50 bg-surface/80 backdrop-blur-xl border-b border-white/20 shadow-sm transition-all duration-500 hover:backdrop-blur-2xl">
        {/* Utilizamos max-w-[1600px] con w-full para evitar el colapso en pantallas grandes y distribuir mejor los elementos */}
        <div className="flex items-center justify-between px-4 md:px-8 py-3 max-w-[1600px] mx-auto w-full h-[72px]">

          {/* Lado Izquierdo: Menu y Logo */}
          <div className="flex items-center justify-start gap-3 lg:gap-5 flex-1 min-w-0">
            <button
              onClick={() => setMenuOpen(true)}
              className="w-10 h-10 flex-shrink-0 rounded-full bg-surface-container flex items-center justify-center text-on-surface hover:bg-primary/10 hover:text-primary transition-colors border border-outline-variant/30"
            >
              <span className="material-symbols-outlined">menu</span>
            </button>
            <Link to="/" className="flex items-center gap-3 text-primary truncate hover:opacity-80 transition-opacity">
              <img src={LogoAlfabetia} alt="Logo AlfabetIA" className="h-9 w-auto object-contain flex-shrink-0" />
              <span className="hidden sm:block font-display-lg text-lg lg:text-xl font-bold truncate tracking-tight">AlfabetIA Rural</span>
            </Link>
          </div>

          {/* Centro: Indicadores (IA Core, Agentes) */}
          <div className="hidden lg:flex items-center justify-center gap-4 xl:gap-8 flex-[2]">

            {/* StatusBar Dinámico (Sensor FastAPI/Ollama) */}
            <div className={`flex items-center gap-2.5 px-4 py-2 rounded-full border transition-all duration-500 hover:shadow-sm ${isOnline ? 'bg-surface-container-highest/80 border-outline-variant/30' : 'bg-error-container border-error/30'
              }`}>
              <div className="relative flex h-2.5 w-2.5">
                {isOnline && (
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-tertiary-fixed opacity-75"></span>
                )}
                <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${isOnline ? 'bg-on-tertiary-container' : 'bg-error'}`}></span>
              </div>
              <span className={`font-label-md text-xs xl:text-sm font-medium ${isOnline ? 'text-on-surface' : 'text-error font-bold'}`}>
                IA Core: <span className="font-bold opacity-80">{loading ? 'Sincronizando...' : isOnline ? (modelName.toLowerCase().includes(mode.toLowerCase()) ? modelName : `${mode} (${modelName})`) : 'Offline'}</span>
              </span>
            </div>

            {/* Agents Status - Observabilidad Cognitiva Multi-Agente */}
            <div className="flex-shrink-0">
              <AgentStatusDropdown agents={agents} isLoading={isLoading} error={null} />
            </div>
          </div>

          {/* Lado Derecho: Acciones (Stubs, Cold Start) */}
          <div className="flex items-center justify-end gap-3 xl:gap-5 flex-1 min-w-0">

            {/* Toggle Modo Rápido */}
            <div className="hidden md:flex items-center gap-2.5 bg-surface-container-highest/50 px-4 py-2 rounded-full border border-outline-variant/30 transition-colors hover:bg-surface-container-highest hover:shadow-sm">
              <span className="material-symbols-outlined text-[18px] text-primary" style={{ fontVariationSettings: "'FILL' 1" }}>
                {useStub ? 'bolt' : 'psychology'}
              </span>
              <label htmlFor="stub-toggle" className="text-xs xl:text-sm font-bold text-on-surface cursor-pointer select-none whitespace-nowrap">
                {useStub ? 'Stubs' : 'LLM Real'}
              </label>
              <div className="relative inline-block w-9 h-5 align-middle select-none ml-1 cursor-pointer">
                <input
                  type="checkbox"
                  id="stub-toggle"
                  checked={useStub}
                  onChange={(e) => setUseStub(e.target.checked)}
                  disabled={isColdStarting}
                  className="absolute block w-4 h-4 rounded-full bg-white appearance-none cursor-pointer transition-all duration-300 z-10 top-[2px] shadow-sm"
                  style={{ left: useStub ? '18px' : '2px' }}
                />
                <div
                  className={`block h-full rounded-full transition-colors duration-300 w-full ${
                    useStub ? 'bg-surface-tint' : 'bg-error'
                  }`}
                ></div>
              </div>
            </div>

            {/* Botón de Cold Start */}
            <button
              onClick={handleColdStart}
              disabled={isColdStarting}
              title="Inicializar Sistema Multiagente"
              className={`flex items-center gap-2 px-5 py-2 rounded-full transition-all duration-300 font-label-md border flex-shrink-0 ${isColdStarting
                  ? 'bg-surface-container text-on-surface-variant border-transparent cursor-wait'
                  : 'bg-primary hover:bg-primary/90 text-on-primary border-primary hover:shadow-md hover:-translate-y-0.5'
                }`}
            >
              {isColdStarting ? (
                <>
                  <span className="animate-spin material-symbols-outlined text-[20px]">sync</span>
                  <span className="text-xs xl:text-sm font-bold hidden sm:inline whitespace-nowrap">Iniciando...</span>
                </>
              ) : (
                <>
                  <span className="material-symbols-outlined text-[20px]" style={{ fontVariationSettings: "'FILL' 1" }}>power_settings_new</span>
                  <span className="text-xs xl:text-sm font-bold hidden sm:inline whitespace-nowrap">Arrancar IA</span>
                </>
              )}
            </button>
          </div>
        </div>
      </header>

      {/* Navegación Global (Drawer) */}
      <div className={`fixed inset-0 z-[60] transition-all duration-500 ${menuOpen ? 'visible' : 'invisible'}`}>
        {/* Backdrop (fondo oscuro interactivo) */}
        <div
          className={`absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity duration-500 ${menuOpen ? 'opacity-100' : 'opacity-0'}`}
          onClick={() => setMenuOpen(false)}
        ></div>

        {/* Panel lateral */}
        <nav className={`absolute top-0 left-0 bottom-0 w-[340px] max-w-[85vw] bg-surface/95 backdrop-blur-3xl border-r border-white/20 shadow-2xl shadow-primary/10 transition-transform duration-500 ease-out flex flex-col ${menuOpen ? 'translate-x-0' : '-translate-x-full'}`}>

          {/* Drawer Header */}
          <div className="p-6 flex items-center justify-between border-b border-outline-variant/30 bg-surface-container-lowest/50 relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-primary/10 to-transparent pointer-events-none"></div>
            <div className="flex items-center gap-4 relative z-10">
              <div className="bg-white p-1.5 rounded-xl shadow-sm border border-outline-variant/20">
                <img src={LogoAlfabetia} alt="Logo" className="h-8 w-auto object-contain" />
              </div>
              <div>
                <h2 className="font-display-lg text-xl font-bold text-primary leading-none tracking-tight mb-1">AlfabetIA</h2>
                <p className="text-[10px] uppercase tracking-widest text-secondary font-bold bg-secondary/10 inline-block px-2 py-0.5 rounded-full">Rural 2.0</p>
              </div>
            </div>
            <button
              onClick={() => setMenuOpen(false)}
              className="w-10 h-10 rounded-full bg-surface border border-outline-variant/30 flex items-center justify-center hover:bg-error-container hover:text-error hover:border-error/30 transition-all duration-300 hover:rotate-90 relative z-10 shadow-sm"
              aria-label="Cerrar menú"
            >
              <span className="material-symbols-outlined text-[20px]">close</span>
            </button>
          </div>

          {/* Drawer Links */}
          <div className="flex-1 overflow-y-auto p-5 space-y-2 relative">
            {/* Elemento decorativo de fondo */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full blur-3xl pointer-events-none"></div>

            <div className="text-xs font-bold text-on-surface-variant uppercase tracking-widest mb-4 ml-2 opacity-70">
              Módulos Principales
            </div>

            {[
              { to: '/', icon: 'home', label: 'Inicio' },
              { to: '/dashboard', icon: 'query_stats', label: 'Estado del Sistema' },
              { to: '/consentimiento', icon: 'policy', label: 'Gestión de Consentimiento' },
              { to: '/registrar-relato', icon: 'map', label: 'Registrar Relato' },
              { to: '/chat-etnografico', icon: 'chat', label: 'Chat Etnográfico' },
              { to: '/segmentos', icon: 'public', label: 'Segmentos Comunitarios' },
              { to: '/revisiones', icon: 'route', label: 'Cola de Revisiones (BDI)' },
              { to: '/aprobacion-curricular', icon: 'school', label: 'Aprobación Curricular' },
              { to: '/analisis-modelos', icon: 'functions', label: 'Análisis de Modelos Mentales' },
            ].map((link) => {
              const isActive = location.pathname === link.to;
              return (
                <Link
                  key={link.to}
                  to={link.to}
                  onClick={() => setMenuOpen(false)}
                  className={`flex items-center gap-4 px-5 py-4 rounded-2xl transition-all duration-300 font-bold font-label-md group relative overflow-hidden border ${isActive
                      ? 'bg-primary text-on-primary border-primary shadow-md shadow-primary/20'
                      : 'bg-transparent text-on-surface border-transparent hover:bg-surface-container hover:border-outline-variant/30 hover:translate-x-1'
                    }`}
                >
                  {/* Subtle highlight effect for active state */}
                  {isActive && (
                    <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/10 to-white/0 opacity-50"></div>
                  )}

                  {/* Icon wrapper with hover/active transitions */}
                  <div className={`flex items-center justify-center w-10 h-10 rounded-full transition-colors duration-300 flex-shrink-0 ${isActive ? 'bg-white/20' : 'bg-surface-container-high group-hover:bg-primary/10 group-hover:text-primary'}`}>
                    <span className={`material-symbols-outlined transition-transform duration-300 ${isActive ? 'scale-110' : 'group-hover:scale-110'}`} style={{ fontVariationSettings: isActive ? "'FILL' 1" : "'FILL' 0" }}>
                      {link.icon}
                    </span>
                  </div>

                  <span className="relative z-10 text-base">{link.label}</span>

                  {/* Right indicator chevron for active item */}
                  {isActive && (
                    <span className="material-symbols-outlined ml-auto opacity-70 text-[20px]">chevron_right</span>
                  )}
                </Link>
              );
            })}
          </div>

          {/* Drawer Footer */}
          <div className="p-6 border-t border-outline-variant/30 bg-surface-container-lowest/50 relative">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 rounded-full bg-primary animate-pulse"></div>
                <span className="text-xs font-bold text-on-surface-variant">Sistema Multiagente</span>
              </div>
              <span className="text-[10px] font-mono font-bold text-on-surface-variant opacity-50 border border-outline-variant/30 px-2 py-1 rounded-md">v2.0</span>
            </div>
          </div>
        </nav>
      </div>
    </>
  );
}
