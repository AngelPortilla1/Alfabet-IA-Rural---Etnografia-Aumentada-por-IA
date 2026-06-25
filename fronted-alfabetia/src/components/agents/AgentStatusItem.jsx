import { getStateConfig, formatUptime, formatLastSeen, getAnimationClasses } from './statusStyles';

/**
 * Componente visual individual de un agente
 * Implementa diseño glassmorphism institucional
 */
export function AgentStatusItem({ agent }) {
  if (!agent) return null;

  const stateConfig = getStateConfig(agent.status);
  const animationClass = getAnimationClasses(agent.status);

  return (
    <div
      className={`relative p-3 mb-2 rounded-lg border backdrop-blur-sm transition-all duration-300 hover:scale-105 hover:${stateConfig.glowColor} ${stateConfig.bgColor} ${stateConfig.borderColor}`}
    >
      {/* Glow effect background */}
      <div className={`absolute inset-0 rounded-lg opacity-0 hover:opacity-100 transition-opacity duration-300 pointer-events-none ${stateConfig.glowColor}`}></div>

      {/* Content container */}
      <div className="relative z-10">
        {/* Header: ID y Nombre */}
        <div className="flex items-start justify-between gap-2 mb-2">
          <div className="flex items-center gap-2 flex-1">
            {/* Badge ID */}
            <span className="font-mono text-[10px] font-black uppercase tracking-widest bg-primary/15 text-primary px-2 py-1 rounded whitespace-nowrap">
              {agent.id}
            </span>
            {/* Nombre del agente */}
            <span className="text-xs font-medium text-on-surface truncate">
              {agent.name || 'Sin nombre'}
            </span>
          </div>

          {/* Status dot animado */}
          <div className="flex items-center justify-center">
            <div className="relative flex h-2.5 w-2.5">
              {animationClass && (
                <span
                  className={`animate-pulse absolute inline-flex h-full w-full rounded-full ${stateConfig.dotColor} opacity-75`}
                ></span>
              )}
              <span
                className={`relative inline-flex rounded-full h-2.5 w-2.5 ${stateConfig.dotColor} ${stateConfig.glowColor}`}
              ></span>
            </div>
          </div>
        </div>

        {/* Body: Tarea actual */}
        <div className="mb-2 bg-surface-container/50 rounded p-2">
          <p className="text-[11px] text-on-surface-variant leading-snug line-clamp-2">
            {agent.current_task ? (
              <>
                <span className="font-semibold text-on-surface">Tarea:</span>{' '}
                {agent.current_task}
              </>
            ) : (
              <span className="italic text-outline">Sin tarea activa</span>
            )}
          </p>
        </div>

        {/* Footer: Métricas y estado */}
        <div className="flex items-center justify-between gap-2 text-[10px] text-on-surface-variant">
          {/* Eventos procesados */}
          <div className="flex items-center gap-1">
            <span className="material-symbols-outlined text-xs" style={{ fontVariationSettings: "'FILL' 1" }}>
              checkmark
            </span>
            <span>{agent.processed_events || 0} eventos</span>
          </div>

          {/* Estado cognitivo label */}
          <span className={`font-semibold uppercase tracking-wider ${stateConfig.textColor}`}>
            {stateConfig.label}
          </span>

          {/* Uptime si existe */}
          {agent.uptime_seconds && (
            <div className="flex items-center gap-1">
              <span className="material-symbols-outlined text-xs" style={{ fontVariationSettings: "'FILL' 0" }}>
                schedule
              </span>
              <span>{formatUptime(agent.uptime_seconds)}</span>
            </div>
          )}
        </div>

        {/* Last seen - información secundaria */}
        {agent.last_seen && (
          <div className="mt-2 pt-2 border-t border-outline-variant/20 text-[9px] text-outline-variant">
            {formatLastSeen(agent.last_seen)}
          </div>
        )}
      </div>
    </div>
  );
}

export default AgentStatusItem;
