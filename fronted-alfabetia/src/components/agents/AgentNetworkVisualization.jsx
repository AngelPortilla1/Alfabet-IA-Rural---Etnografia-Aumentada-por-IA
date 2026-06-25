import { getStateConfig, STATE_CONFIG } from './statusStyles';
import { getAgentsStatistics, generateSwarmSummary } from './agentsUtils';

/**
 * Componente de visualización avanzada de estadísticas del enjambre
 * Preparado para futuras integraciones de gráficos
 */
export function AgentNetworkVisualization({ agents, isLoading }) {
  if (isLoading) return null;

  const stats = getAgentsStatistics(agents);
  const summary = generateSwarmSummary(agents);

  // Colores para visualización
  const statusColors = {
    WORKING: '#c8f17a', // tertiary-fixed
    IDLE: '#061b0e', // primary
    WAITING_REVIEW: '#b4cdb8', // inverse-primary
    ERROR: '#ba1a1a', // error
    OFFLINE: '#737973', // outline-variant
  };

  return (
    <div className="hidden lg:block p-4 bg-surface-container/30 rounded-lg border border-outline-variant/20">
      {/* Title */}
      <div className="mb-3">
        <h3 className="text-xs font-bold text-primary uppercase tracking-wider">
          Enjambre BDI
        </h3>
        <p className="text-[10px] text-on-surface-variant mt-1">{summary}</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-5 gap-1 text-[9px]">
        {/* Working */}
        <div className="bg-tertiary-fixed/10 border border-tertiary-fixed/30 rounded p-2 text-center">
          <p className="font-bold text-on-tertiary-fixed-variant text-sm">{stats.working}</p>
          <p className="text-on-surface-variant">Procesando</p>
        </div>

        {/* Waiting Review */}
        <div className="bg-inverse-primary/10 border border-inverse-primary/30 rounded p-2 text-center">
          <p className="font-bold text-on-primary-fixed-variant text-sm">{stats.waiting_review}</p>
          <p className="text-on-surface-variant">Revisión</p>
        </div>

        {/* Idle */}
        <div className="bg-primary/10 border border-primary/30 rounded p-2 text-center">
          <p className="font-bold text-primary text-sm">{stats.idle}</p>
          <p className="text-on-surface-variant">En Espera</p>
        </div>

        {/* Error */}
        <div className="bg-error/10 border border-error/30 rounded p-2 text-center">
          <p className="font-bold text-error text-sm">{stats.error}</p>
          <p className="text-on-surface-variant">Errores</p>
        </div>

        {/* Offline */}
        <div className="bg-outline-variant/10 border border-outline-variant/30 rounded p-2 text-center">
          <p className="font-bold text-on-surface-variant text-sm">{stats.offline}</p>
          <p className="text-on-surface-variant">Inactivos</p>
        </div>
      </div>

      {/* Events Processed Bar */}
      <div className="mt-3 pt-3 border-t border-outline-variant/20">
        <p className="text-[9px] text-on-surface-variant mb-1">
          Total de eventos procesados
        </p>
        <div className="flex items-center gap-2">
          <div className="flex-1 bg-surface-container rounded-full h-2 overflow-hidden">
            <div
              className="bg-gradient-to-r from-tertiary-fixed to-primary h-full transition-all duration-500"
              style={{
                width: `${Math.min((stats.total_events / 1000) * 100, 100)}%`,
              }}
            ></div>
          </div>
          <span className="text-[10px] font-bold text-primary whitespace-nowrap">
            {stats.total_events}
          </span>
        </div>
      </div>

      {/* Mini Status Indicators */}
      <div className="mt-3 pt-3 border-t border-outline-variant/20">
        <p className="text-[9px] text-on-surface-variant mb-2">Estados Activos</p>
        <div className="flex flex-wrap gap-1">
          {Object.entries(stats).map(([key, value]) => {
            if (key === 'total' || key === 'total_events' || key === 'avg_uptime' || value === 0)
              return null;

            const statusKey = key.toUpperCase();
            const config = STATE_CONFIG[statusKey];

            return (
              <div
                key={key}
                className="inline-flex items-center gap-1 bg-surface-container/50 rounded px-2 py-1 border border-outline-variant/20"
              >
                <div
                  className="w-1.5 h-1.5 rounded-full"
                  style={{ backgroundColor: statusColors[statusKey] || '#737973' }}
                ></div>
                <span className="text-[8px] text-on-surface-variant">{value}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export default AgentNetworkVisualization;
