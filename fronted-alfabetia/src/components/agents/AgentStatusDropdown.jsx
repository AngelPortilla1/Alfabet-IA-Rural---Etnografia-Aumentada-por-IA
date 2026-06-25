import { useState } from 'react';
import AgentStatusItem from './AgentStatusItem';
import { isProcessing, getStateConfig } from './statusStyles';

/**
 * Dropdown principal de observabilidad cognitiva multi-agente
 * Interfaz institucional para visualizar estado del enjambre BDI
 */
export function AgentStatusDropdown({ agents, isLoading, error }) {
  const [isOpen, setIsOpen] = useState(false);

  // Contar agentes procesando
  const processingCount = agents.filter((a) => isProcessing(a.status)).length;
  const totalCount = agents.length;

  // Si hay error mostrar estado degradado
  if (error) {
    return (
      <div className="relative group">
        <button className="flex items-center gap-2 bg-error/10 backdrop-blur-md px-3 py-1.5 rounded-full border border-error/30 hover:bg-error/20 transition-all">
          <span
            className="material-symbols-outlined text-[18px] text-error"
            style={{ fontVariationSettings: "'FILL' 1" }}
          >
            error
          </span>
          <span className="font-label-md text-error font-semibold">Error en Observabilidad</span>
        </button>
        <div className="absolute top-full mt-2 right-0 w-64 bg-error-container/10 backdrop-blur-2xl border border-error/30 rounded-2xl shadow-lg p-4 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-300 z-50">
          <p className="text-error text-xs">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative">
      {/* Botón principal - Cerebro cognitivo */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 bg-white/10 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/20 hover:bg-white/20 hover:border-white/40 transition-all duration-300"
      >
        {/* Icono cognitivo */}
        <span
          className="material-symbols-outlined text-[18px] text-primary"
          style={{ fontVariationSettings: "'FILL' 1" }}
        >
          neurology
        </span>

        {/* Indicador de procesamiento */}
        {processingCount > 0 && (
          <div className="flex items-center gap-1">
            <div className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-tertiary-fixed opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-tertiary-fixed"></span>
            </div>
            <span className="font-label-md text-on-surface-variant">
              {isLoading ? '⟳' : `🧠 ${processingCount} Procesando`}
            </span>
          </div>
        )}

        {/* Estado normal */}
        {processingCount === 0 && (
          <span className="font-label-md text-on-surface-variant">
            {isLoading ? '⟳ Sincronizando...' : `${totalCount} Agentes`}
          </span>
        )}

        {/* Chevron indicador de dropdown */}
        <span
          className={`material-symbols-outlined text-xs text-on-surface-variant transition-transform duration-300 ${
            isOpen ? 'rotate-180' : ''
          }`}
          style={{ fontVariationSettings: "'FILL' 0" }}
        >
          expand_more
        </span>
      </button>

      {/* Dropdown Panel - Sala de Control Cognitiva */}
      {isOpen && (
        <div className="absolute top-full mt-2 right-0 w-96 bg-surface/95 backdrop-blur-2xl border border-outline-variant/30 rounded-2xl shadow-2xl overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 duration-300">
          {/* Header del Dropdown */}
          <div className="relative overflow-hidden bg-gradient-to-r from-primary/10 to-tertiary-fixed/10 px-4 py-3 border-b border-outline-variant/20">
            {/* Background accent */}
            <div className="absolute inset-0 opacity-30"></div>

            {/* Content */}
            <div className="relative z-10 flex items-center justify-between">
              <div>
                <p className="text-[11px] font-black text-primary uppercase tracking-widest">
                  🔬 Enjambre BDI Observabilidad
                </p>
                <p className="text-[9px] text-on-surface-variant mt-1">
                  {totalCount} agente{totalCount !== 1 ? 's' : ''} en red
                  {processingCount > 0 && ` • ${processingCount} procesando`}
                </p>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="text-on-surface-variant hover:text-on-surface transition-colors"
              >
                <span className="material-symbols-outlined text-lg">close</span>
              </button>
            </div>
          </div>

          {/* Content Area */}
          <div className="max-h-96 overflow-y-auto overscroll-contain">
            {/* Loading State */}
            {isLoading && (
              <div className="p-6 flex items-center justify-center">
                <div className="flex flex-col items-center gap-2">
                  <div className="w-8 h-8 border-2 border-primary/20 border-t-primary rounded-full animate-spin"></div>
                  <p className="text-xs text-on-surface-variant">Sincronizando estado del enjambre...</p>
                </div>
              </div>
            )}

            {/* Empty State */}
            {!isLoading && totalCount === 0 && (
              <div className="p-8 flex items-center justify-center">
                <div className="flex flex-col items-center gap-2 text-center">
                  <span className="material-symbols-outlined text-3xl text-outline-variant opacity-50">
                    cloud_off
                  </span>
                  <p className="text-sm text-on-surface-variant">
                    No hay agentes disponibles
                  </p>
                  <p className="text-xs text-on-surface-variant">
                    Conecta el backend para activar observabilidad
                  </p>
                </div>
              </div>
            )}

            {/* Agents List */}
            {!isLoading && totalCount > 0 && (
              <div className="p-3 space-y-1">
                {agents.map((agent) => (
                  <AgentStatusItem key={agent.id} agent={agent} />
                ))}
              </div>
            )}
          </div>

          {/* Footer Stats */}
          {!isLoading && totalCount > 0 && (
            <div className="bg-surface-container/50 px-4 py-2 border-t border-outline-variant/20 grid grid-cols-3 gap-2 text-[10px]">
              <div className="text-center py-1 border-r border-outline-variant/20">
                <p className="font-bold text-primary">{totalCount}</p>
                <p className="text-on-surface-variant">Totales</p>
              </div>
              <div className="text-center py-1 border-r border-outline-variant/20">
                <p className="font-bold text-on-tertiary-fixed-variant">{processingCount}</p>
                <p className="text-on-surface-variant">Procesando</p>
              </div>
              <div className="text-center py-1">
                <p className="font-bold text-primary">{agents.filter((a) => a.status === 'IDLE').length}</p>
                <p className="text-on-surface-variant">En Espera</p>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default AgentStatusDropdown;
