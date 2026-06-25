import { useState, useEffect, useRef } from 'react';
import { API_ENDPOINTS } from '../api/client';

/**
 * Hook profesional para observabilidad cognitiva multi-agente
 * 
 * Características:
 * - Polling automático cada 5 segundos
 * - Manejo robusto de errores
 * - Normalización segura de datos
 * - Preparado para migración a WebSockets
 * - Cancelación automática de requests
 */
export function useAgentSwarmStatus() {
  const [agents, setAgents] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Referencias para limpiar recursos
  const intervalRef = useRef(null);
  const abortControllerRef = useRef(null);
  const isMountedRef = useRef(true);

  /**
   * Obtiene el estado actual de los agentes desde el backend
   */
  const fetchAgentsStatus = async () => {
    try {
      // Crear AbortController para cancelación si es necesario
      abortControllerRef.current = new AbortController();

      const response = await fetch(API_ENDPOINTS.AGENTS_STATUS, {
        signal: abortControllerRef.current.signal,
        headers: {
          'Accept': 'application/json',
        },
      });

      // Si no está montado, no actualizar state
      if (!isMountedRef.current) return;

      if (!response.ok) {
        throw new Error(`Backend respondió con status ${response.status}`);
      }

      const data = await response.json();

      // Validación y normalización de datos
      const normalizedAgents = normalizeAgents(data.agents || []);
      
      setAgents(normalizedAgents);
      setError(null); // Limpiar error si fue exitoso
    } catch (err) {
      if (isMountedRef.current) {
        // No mostrar error de cancelación
        if (err.name !== 'AbortError') {
          console.error('Error en observabilidad de agentes:', err);
          setError(err.message || 'Error al conectar con el enjambre');
        }
        // Mantener los agentes anteriores si hay error
        // setAgents(prev => prev); // Fallback a datos previos
      }
    } finally {
      if (isMountedRef.current) {
        setIsLoading(false);
      }
    }
  };

  /**
   * Normaliza y valida los datos de agentes desde el backend
   */
  const normalizeAgents = (agentsList) => {
    if (!Array.isArray(agentsList)) {
      return [];
    }

    return agentsList
      .map((agent) => ({
        // Propiedades requeridas con fallback
        id: agent.id || 'UNKNOWN',
        name: agent.name || 'Agente Sin Nombre',
        status: agent.status || 'OFFLINE',
        current_task: agent.current_task || null,
        processed_events: Math.max(0, parseInt(agent.processed_events) || 0),
        last_seen: agent.last_seen ? new Date(agent.last_seen).toISOString() : null,
        uptime_seconds: Math.max(0, parseInt(agent.uptime_seconds) || 0),
        // Propiedades opcionales adicionales para extensibilidad futura
        ...(agent.error && { error: agent.error }),
        ...(agent.metadata && { metadata: agent.metadata }),
      }))
      .filter((agent) => agent.id !== 'UNKNOWN' || agent.name !== 'Agente Sin Nombre');
  };

  // Setup: Fetch inicial e intervalo
  useEffect(() => {
    isMountedRef.current = true;

    // Fetch inicial
    fetchAgentsStatus();

    // Setup polling cada 15 segundos
    intervalRef.current = setInterval(() => {
      fetchAgentsStatus();
    }, 15000);

    // Cleanup
    return () => {
      isMountedRef.current = false;
      
      // Limpiar intervalo
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      
      // Cancelar request en progreso
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  return {
    agents,
    isLoading,
    error,
    // Métodos opcionales para control manual
    refetch: fetchAgentsStatus,
  };
}

export default useAgentSwarmStatus;
