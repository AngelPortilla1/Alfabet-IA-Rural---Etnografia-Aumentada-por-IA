import { useState, useEffect, useRef } from 'react';
import { API_ENDPOINTS } from '../api/client';

const HEALTH_URL = API_ENDPOINTS.HEALTH;
const POLL_INTERVAL_MS = 30_000; // 30 segundos
const TIMEOUT_MS = 3_000;        // 3 segundos de timeout

export const API_MODES = {
  OFFLINE: 'Offline',
  STUBS: 'Stubs',
  GEMINI: 'Gemini',
  GROK: 'Grok',
  GROQ: 'Groq',
  ANTHROPIC: 'Anthropic',
  OPENAI: 'OpenAI',
  OLLAMA: 'Ollama',
  OPENROUTER: 'OpenRouter',
  DEEPSEEK: 'DeepSeek',
  REMOTE: 'LLM Remoto',
  UNKNOWN: 'Desconocido'
};

/**
 * Función pura para inferir el proveedor de LLM a partir de los datos del backend.
 */
function determineProvider(rawProvider = '', rawModel = '') {
  const provider = rawProvider.toLowerCase();
  const model = rawModel.toLowerCase();

  const rules = [
    { match: () => provider.includes('stub') || model === 'stub', mode: API_MODES.STUBS },
    { match: () => provider.includes('deepseek') || model.includes('deepseek'), mode: API_MODES.DEEPSEEK },
    { match: () => model.includes('gemini'), mode: API_MODES.GEMINI },
    { match: () => model.includes('grok'), mode: API_MODES.GROK },
    { match: () => ['llama', 'mixtral', 'gemma', 'groq'].some(k => model.includes(k)), mode: API_MODES.GROQ },
    { match: () => model.includes('claude'), mode: API_MODES.ANTHROPIC },
    { match: () => model.includes('gpt-') || model.includes('o1-'), mode: API_MODES.OPENAI },
    { match: () => provider.includes('ollama') || provider.includes('langchain'), mode: API_MODES.OLLAMA },
    { match: () => provider === 'cloud_api', mode: API_MODES.OPENROUTER },
    { match: () => provider === 'openai', mode: API_MODES.REMOTE },
  ];

  const matched = rules.find(rule => rule.match());
  if (matched) return matched.mode;
  if (provider) return provider.charAt(0).toUpperCase() + provider.slice(1);
  return API_MODES.UNKNOWN;
}

/**
 * Hook que monitorea el estado del backend AlfabetIA.
 * Devuelve un objeto con:
 *   - isOnline  : boolean  → true si /health responde con 2xx y JSON válido
 *   - loading   : boolean  → true durante la primera petición
 *   - mode      : string   → Constante de API_MODES
 *   - modelName : string   → Nombre del modelo, o null si está offline
 */
export function useApiStatus() {
  const [status, setStatus] = useState({
    isOnline: false,
    loading: true,
    mode: API_MODES.OFFLINE,
    modelName: null
  });

  const abortRef = useRef(null);

  useEffect(() => {
    let cancelled = false;

    const checkStatus = async () => {
      // Usar AbortSignal.timeout si está disponible, sino fallback a AbortController manual
      let signal;
      let timerId;
      if (typeof AbortSignal.timeout === 'function') {
        signal = AbortSignal.timeout(TIMEOUT_MS);
      } else {
        const controller = new AbortController();
        abortRef.current = controller;
        timerId = setTimeout(() => controller.abort(), TIMEOUT_MS);
        signal = controller.signal;
      }

      try {
        const response = await fetch(HEALTH_URL, {
          method: 'GET',
          signal
        });

        if (timerId) clearTimeout(timerId);
        if (cancelled) return;

        if (response.ok) {
          const data = await response.json(); // Si el JSON es inválido, caerá al bloque catch

          const mode = determineProvider(data.llm_provider, data.llm_model);
          const modelName = data.llm_model || 'Desconocido';

          setStatus({
            isOnline: true,
            loading: false,
            mode,
            modelName
          });
          
          if (process.env.NODE_ENV !== 'production') {
            console.log(`[useApiStatus] ✅ Backend online. Modo: ${mode}, Modelo: ${modelName}`);
          }
        } else {
          // Si responde con algo distinto a 2xx, limpiamos estado residual
          setStatus({
            isOnline: false,
            loading: false,
            mode: API_MODES.OFFLINE,
            modelName: null
          });
        }
      } catch (err) {
        if (timerId) clearTimeout(timerId);
        if (!cancelled) {
          // Si el fetch falla o el JSON es corrupto, aseguramos estado Offline sin datos residuales
          setStatus({
            isOnline: false,
            loading: false,
            mode: API_MODES.OFFLINE,
            modelName: null
          });
        }
      }
    };

    checkStatus();
    const intervalId = setInterval(checkStatus, POLL_INTERVAL_MS);

    return () => {
      cancelled = true;
      clearInterval(intervalId);
      if (abortRef.current) abortRef.current.abort();
    };
  }, []);

  return status;
}