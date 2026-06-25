/**
 * Configuración centralizada de estilos cognitivos para estados de agentes
 * Implementa visualización institucional BDI según especificación
 */

export const AGENT_STATES = {
  WORKING: 'WORKING',
  IDLE: 'IDLE',
  WAITING_REVIEW: 'WAITING_REVIEW',
  ERROR: 'ERROR',
  OFFLINE: 'OFFLINE',
};

export const STATE_CONFIG = {
  WORKING: {
    label: 'Procesando',
    color: 'tertiary-fixed-dim',
    bgColor: 'bg-tertiary-fixed/10',
    borderColor: 'border-tertiary-fixed-dim/50',
    dotColor: 'bg-tertiary-fixed',
    glowColor: 'shadow-lg shadow-tertiary-fixed/20',
    textColor: 'text-on-tertiary-fixed-variant',
    icon: 'engineering',
    animated: true,
  },
  IDLE: {
    label: 'En Espera',
    color: 'primary',
    bgColor: 'bg-primary/10',
    borderColor: 'border-primary/30',
    dotColor: 'bg-primary',
    glowColor: 'shadow-lg shadow-primary/15',
    textColor: 'text-primary',
    icon: 'check_circle',
    animated: false,
  },
  WAITING_REVIEW: {
    label: 'Revisión Pendiente',
    color: 'inverse-primary',
    bgColor: 'bg-inverse-primary/10',
    borderColor: 'border-inverse-primary/30',
    dotColor: 'bg-inverse-primary',
    glowColor: 'shadow-lg shadow-inverse-primary/15',
    textColor: 'text-on-primary-fixed-variant',
    icon: 'pending_actions',
    animated: true,
  },
  ERROR: {
    label: 'Error',
    color: 'error',
    bgColor: 'bg-error/10',
    borderColor: 'border-error/30',
    dotColor: 'bg-error',
    glowColor: 'shadow-lg shadow-error/20',
    textColor: 'text-error',
    icon: 'error',
    animated: true,
  },
  OFFLINE: {
    label: 'Inactivo',
    color: 'outline-variant',
    bgColor: 'bg-outline-variant/10',
    borderColor: 'border-outline-variant/30',
    dotColor: 'bg-outline-variant',
    glowColor: 'shadow-none',
    textColor: 'text-on-surface-variant',
    icon: 'offline_pin',
    animated: false,
  },
};

/**
 * Determina si el agente está procesando
 */
export const isProcessing = (status) => status === AGENT_STATES.WORKING;

/**
 * Obtiene configuración de estado o fallback a OFFLINE
 */
export const getStateConfig = (status) => {
  return STATE_CONFIG[status] || STATE_CONFIG.OFFLINE;
};

/**
 * Formatea el tiempo de actividad en formato legible
 */
export const formatUptime = (uptimeSeconds) => {
  if (!uptimeSeconds || uptimeSeconds < 0) return '-';
  
  const hours = Math.floor(uptimeSeconds / 3600);
  const minutes = Math.floor((uptimeSeconds % 3600) / 60);
  const seconds = uptimeSeconds % 60;
  
  if (hours > 0) return `${hours}h ${minutes}m`;
  if (minutes > 0) return `${minutes}m ${seconds}s`;
  return `${seconds}s`;
};

/**
 * Formatea la última vez visto
 */
export const formatLastSeen = (isoString) => {
  if (!isoString) return '-';
  
  try {
    const date = new Date(isoString);
    const now = new Date();
    const diffMs = now - date;
    const diffSecs = Math.floor(diffMs / 1000);
    
    if (diffSecs < 60) return 'Ahora';
    if (diffSecs < 3600) {
      const mins = Math.floor(diffSecs / 60);
      return `Hace ${mins}m`;
    }
    if (diffSecs < 86400) {
      const hours = Math.floor(diffSecs / 3600);
      return `Hace ${hours}h`;
    }
    
    return date.toLocaleDateString('es-ES', { month: 'short', day: 'numeric' });
  } catch (e) {
    return '-';
  }
};

/**
 * CSS clases para animaciones del dot de estado
 */
export const getAnimationClasses = (status) => {
  const config = getStateConfig(status);
  if (!config.animated) return '';
  
  return 'animate-pulse';
};
