/**
 * Utilidades para el sistema de observabilidad cognitiva multi-agente
 */

import { STATE_CONFIG } from './statusStyles';

/**
 * Obtiene estadísticas agregadas de la lista de agentes
 */
export const getAgentsStatistics = (agents) => {
  if (!Array.isArray(agents) || agents.length === 0) {
    return {
      total: 0,
      working: 0,
      idle: 0,
      waiting_review: 0,
      error: 0,
      offline: 0,
      total_events: 0,
      avg_uptime: 0,
    };
  }

  const stats = agents.reduce(
    (acc, agent) => {
      acc.total += 1;
      acc.total_events += agent.processed_events || 0;
      acc.avg_uptime += agent.uptime_seconds || 0;

      switch (agent.status) {
        case 'WORKING':
          acc.working += 1;
          break;
        case 'IDLE':
          acc.idle += 1;
          break;
        case 'WAITING_REVIEW':
          acc.waiting_review += 1;
          break;
        case 'ERROR':
          acc.error += 1;
          break;
        default:
          acc.offline += 1;
      }

      return acc;
    },
    {
      total: 0,
      working: 0,
      idle: 0,
      waiting_review: 0,
      error: 0,
      offline: 0,
      total_events: 0,
      avg_uptime: 0,
    }
  );

  stats.avg_uptime = stats.total > 0 ? Math.floor(stats.avg_uptime / stats.total) : 0;

  return stats;
};

/**
 * Obtiene agentes filtrados por estado
 */
export const getAgentsByStatus = (agents, status) => {
  if (!Array.isArray(agents)) return [];
  return agents.filter((agent) => agent.status === status);
};

/**
 * Obtiene el agente con más eventos procesados
 */
export const getMostActiveAgent = (agents) => {
  if (!Array.isArray(agents) || agents.length === 0) return null;
  return agents.reduce((prev, current) =>
    (current.processed_events || 0) > (prev.processed_events || 0) ? current : prev
  );
};

/**
 * Obtiene el agente con mayor uptime
 */
export const getLongestRunningAgent = (agents) => {
  if (!Array.isArray(agents) || agents.length === 0) return null;
  return agents.reduce((prev, current) =>
    (current.uptime_seconds || 0) > (prev.uptime_seconds || 0) ? current : prev
  );
};

/**
 * Comprueba si hay agentes en estado crítico (ERROR)
 */
export const hasCriticalErrors = (agents) => {
  if (!Array.isArray(agents)) return false;
  return agents.some((agent) => agent.status === 'ERROR');
};

/**
 * Comprueba si todos los agentes están activos (WORKING o IDLE)
 */
export const areAllAgentsHealthy = (agents) => {
  if (!Array.isArray(agents) || agents.length === 0) return false;
  return agents.every((agent) => agent.status === 'WORKING' || agent.status === 'IDLE');
};

/**
 * Obtiene el porcentaje de agentes en un estado dado
 */
export const getStatusPercentage = (agents, status) => {
  if (!Array.isArray(agents) || agents.length === 0) return 0;
  const count = agents.filter((agent) => agent.status === status).length;
  return Math.round((count / agents.length) * 100);
};

/**
 * Ordena agentes por criterio
 */
export const sortAgents = (agents, sortBy = 'status') => {
  if (!Array.isArray(agents)) return [];
  const copy = [...agents];

  switch (sortBy) {
    case 'name':
      return copy.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
    case 'events':
      return copy.sort((a, b) => (b.processed_events || 0) - (a.processed_events || 0));
    case 'uptime':
      return copy.sort((a, b) => (b.uptime_seconds || 0) - (a.uptime_seconds || 0));
    case 'status':
    default:
      // Orden de estados: WORKING -> WAITING_REVIEW -> IDLE -> ERROR -> OFFLINE
      const statusOrder = { WORKING: 0, WAITING_REVIEW: 1, IDLE: 2, ERROR: 3, OFFLINE: 4 };
      return copy.sort(
        (a, b) => (statusOrder[a.status] || 5) - (statusOrder[b.status] || 5)
      );
  }
};

/**
 * Genera un resumen textual del estado del enjambre
 */
export const generateSwarmSummary = (agents) => {
  const stats = getAgentsStatistics(agents);
  const processing = stats.working;
  const waiting = stats.waiting_review;
  const errors = stats.error;

  let summary = `${stats.total} agentes en red`;

  if (processing > 0) {
    summary += ` • 🧠 ${processing} procesando`;
  }
  if (waiting > 0) {
    summary += ` • ⏳ ${waiting} esperando`;
  }
  if (errors > 0) {
    summary += ` • ⚠️ ${errors} con errores`;
  }

  return summary;
};

/**
 * Comprueba si hay actividad reciente (último evento en los últimos N segundos)
 */
export const hasRecentActivity = (agents, withinSeconds = 30) => {
  if (!Array.isArray(agents)) return false;

  const now = new Date();

  return agents.some((agent) => {
    if (!agent.last_seen) return false;
    try {
      const lastSeen = new Date(agent.last_seen);
      const diffMs = now - lastSeen;
      return diffMs < withinSeconds * 1000;
    } catch (e) {
      return false;
    }
  });
};

/**
 * Exporta datos de agentes en formato JSON para debugging
 */
export const exportAgentsData = (agents) => {
  return JSON.stringify(
    {
      timestamp: new Date().toISOString(),
      total_agents: agents.length,
      statistics: getAgentsStatistics(agents),
      agents: agents,
    },
    null,
    2
  );
};

/**
 * Valida estructura de un agente
 */
export const isValidAgent = (agent) => {
  return (
    agent &&
    typeof agent === 'object' &&
    typeof agent.id === 'string' &&
    agent.id.length > 0 &&
    typeof agent.status === 'string'
  );
};

export default {
  getAgentsStatistics,
  getAgentsByStatus,
  getMostActiveAgent,
  getLongestRunningAgent,
  hasCriticalErrors,
  areAllAgentsHealthy,
  getStatusPercentage,
  sortAgents,
  generateSwarmSummary,
  hasRecentActivity,
  exportAgentsData,
  isValidAgent,
};
