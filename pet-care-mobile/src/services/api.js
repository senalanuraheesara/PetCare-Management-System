import axios from 'axios';
import Constants from 'expo-constants';

const expoConfig = Constants.expoConfig || Constants.manifest;

const fromEnv =
  typeof process.env.EXPO_PUBLIC_API_BASE_URL === 'string'
    ? process.env.EXPO_PUBLIC_API_BASE_URL.trim()
    : '';
const fromExtra =
  typeof expoConfig?.extra?.apiUrl === 'string' ? expoConfig.extra.apiUrl.trim() : '';

/**
 * Axios paths are written as `/auth/...`; baseURL must end with `/api`
 * (e.g. http://HOST:5050/api). Env often sets only `http://HOST:5050`.
 */
function normalizeApiBaseUrl(raw) {
  const s = typeof raw === 'string' ? raw.trim() : '';
  if (!s) return '';

  try {
    const url = new URL(s);
    const path = url.pathname.replace(/\/+$/, '') || '';
    if (/\/api$/i.test(path)) {
      url.pathname = path;
      return url.toString().replace(/\/+$/, '');
    }
    url.pathname = path === '' ? '/api' : `${path}/api`;
    return url.toString().replace(/\/+$/, '');
  } catch {
    const noTrail = s.replace(/\/+$/, '');
    return /\/api$/i.test(noTrail) ? noTrail : `${noTrail}/api`;
  }
}

const apiUrl = normalizeApiBaseUrl(fromEnv || fromExtra);

if (!apiUrl) {
  throw new Error(
    'Missing EXPO_PUBLIC_API_BASE_URL in pet-care-mobile/.env. Set it to your backend (e.g. http://YOUR_IP:5050 or http://YOUR_IP:5050/api).'
  );
}

const api = axios.create({
  baseURL: apiUrl,
});

export const apiBaseUrl = apiUrl;

/**
 * Axios often leaves HTML bodies as strings; Alerts should show readable text.
 */
export function formatApiError(error, fallback = 'Something went wrong') {
  const status = error?.response?.status;
  const raw = error?.response?.data;

  if (typeof raw === 'object' && raw !== null && typeof raw.message === 'string' && raw.message) {
    return raw.message;
  }

  if (typeof raw === 'string' && raw.length) {
    const preMatch = raw.match(/<pre>\s*([^<]+)\s*<\/pre>/i);
    if (preMatch) {
      let line = preMatch[1].trim();
      if (/Cannot\s+(POST|GET|PUT|PATCH|DELETE)\s+\S+/i.test(line)) {
        const ping = `${apiBaseUrl.replace(/\/+$/, '')}/build-info`;
        line += `\n\nLikely not the pet-care-backend you expect (stale process or wrong host/port).\n• API base: ${apiBaseUrl}\n• Open in browser: ${ping}\n  (expect JSON with "postPwReset": true). Kill other servers on this port, then restart from pet-care-backend.`;
      }
      return status ? `${line} (HTTP ${status})` : line;
    }
    if (/<!DOCTYPE/i.test(raw) || /<html/i.test(raw)) {
      return `Server returned HTML (HTTP ${status ?? '?'}). Not this API JSON. Check EXPO_PUBLIC_API_BASE_URL (${apiBaseUrl}).`;
    }
    return raw.trim().slice(0, 220);
  }

  const msg = error?.message;
  if (typeof msg === 'string' && msg) return msg;

  return fallback;
}

/** Server origin for static files (same host as API, `/uploads` is not under `/api`). */
export function getBackendOrigin() {
  const base = typeof api.defaults.baseURL === 'string' ? api.defaults.baseURL.trim() : '';
  if (!base) {
    throw new Error('API base URL is not configured');
  }
  const trimmed = base.replace(/\/+$/, '');
  return trimmed.endsWith('/api') ? trimmed.slice(0, -'/api'.length) : trimmed;
}

export const setAuthToken = (token) => {
  if (token) {
    api.defaults.headers.common.Authorization = `Bearer ${token}`;
  } else {
    delete api.defaults.headers.common.Authorization;
  }
};

export default api;
