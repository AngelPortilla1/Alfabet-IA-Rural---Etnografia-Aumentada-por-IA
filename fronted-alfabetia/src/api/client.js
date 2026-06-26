const BASE_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000';

export const API_ENDPOINTS = {
  HEALTH: `${BASE_URL}/health`,
  AGENTS_STATUS: `${BASE_URL}/agents/status`,
  EVENTS: `${BASE_URL}/events`,
  PARTICIPANTS: `${BASE_URL}/participants`,
  SEGMENTS: `${BASE_URL}/segments`,
  REVIEWS: `${BASE_URL}/reviews`,
  AUDIT: `${BASE_URL}/audit`,
  COLD_START: `${BASE_URL}/demo/cold-start`,
  RECALCULATE_SEGMENTS: `${BASE_URL}/segments/recalculate`,
  DASHBOARD_SUMMARY: `${BASE_URL}/dashboard/summary`,
  CONSENTS: `${BASE_URL}/participants/consents`,
  REVOKE: `${BASE_URL}/participants`,  // Se usa con getRevokeUrl(pid)
  DELTAS: `${BASE_URL}/deltas`
};

export const getMentalModelUrl = (pid) => `${API_ENDPOINTS.PARTICIPANTS}/${pid}/mental-model`;
export const getRouteUrl = (pid) => `${API_ENDPOINTS.PARTICIPANTS}/${pid}/route`;
export const getRouteGenerateUrl = (pid) => `${API_ENDPOINTS.PARTICIPANTS}/${pid}/route/generate`;
export const getChatUrl = (pid) => `${API_ENDPOINTS.PARTICIPANTS}/${pid}/chat`;
export const getChatHistoryUrl = (pid) => `${API_ENDPOINTS.PARTICIPANTS}/${pid}/chat/history`;
export const getAuditUrl = (pid) => `${API_ENDPOINTS.AUDIT}`; // El backend actual usa /audit general y se filtra en el front
export const getReviewApproveUrl = (id) => `${API_ENDPOINTS.REVIEWS}/${id}/approve`;
export const getReviewRejectUrl = (id) => `${API_ENDPOINTS.REVIEWS}/${id}/reject`;
export const getRevokeUrl = (pid, scope = null, reason = null) => {
  const params = new URLSearchParams();
  if (scope) params.set('scope', scope);
  if (reason) params.set('reason', reason);
  const query = params.toString();
  return `${BASE_URL}/participants/${pid}/revoke${query ? '?' + query : ''}`;
};

export default BASE_URL;
