import axios from 'axios';
import { useSession } from '../store/session';

export const PRODUCTION_API_URL = 'https://mspe-dei-t-backend-eight.vercel.app';

let currentBaseUrl: string = (process.env.EXPO_PUBLIC_API_URL || PRODUCTION_API_URL).trim().replace(/\/+$/, '');

export function getBaseUrl(): string {
  return currentBaseUrl;
}

export function setBaseUrl(url: string) {
  let clean = (url || '').trim();
  if (!clean.startsWith('http://') && !clean.startsWith('https://')) {
    clean = 'http://' + clean;
  }
  clean = clean.replace(/\/+$/, '');
  currentBaseUrl = clean;
  api.defaults.baseURL = clean + '/api/v1';
}

export const API_URL = currentBaseUrl;
export const api = axios.create({ baseURL: currentBaseUrl + '/api/v1', timeout: 30000 });

api.interceptors.request.use((config) => {
  if (currentBaseUrl) {
    config.baseURL = currentBaseUrl.replace(/\/+$/, '') + '/api/v1';
  }
  const token = useSession.getState().access;
  if (token) config.headers.Authorization = 'Bearer ' + token;
  return config;
});

let refreshing: Promise<string> | null = null;

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config;
    if (error.response?.status !== 401 || original?._retry || original?.url?.includes('/auth/')) {
      return Promise.reject(error);
    }
    original._retry = true;
    const refresh = useSession.getState().refresh;
    if (!refresh) return Promise.reject(error);
    try {
      refreshing ||= axios
        .post(currentBaseUrl + '/api/v1/auth/refresh', { refresh_token: refresh })
        .then(async ({ data }) => {
          await useSession.getState().setTokens(data.access_token, data.refresh_token);
          return data.access_token;
        })
        .finally(() => {
          refreshing = null;
        });
      original.headers.Authorization = 'Bearer ' + (await refreshing);
      return api(original);
    } catch (cause) {
      await useSession.getState().clear();
      return Promise.reject(cause);
    }
  }
);

/**
 * Normalizes and formats API errors into human-readable strings.
 * Handles FastAPI/Pydantic validation errors, consent checks, HTTP status codes,
 * and network failures without ever returning raw JavaScript objects.
 */
export function message(error: unknown): string {
  if (!error) {
    return 'An unexpected error occurred.';
  }

  if (axios.isAxiosError(error)) {
    // 1. Network and timeout errors
    if (error.code === 'ECONNABORTED' || error.message?.toLowerCase().includes('timeout')) {
      return 'Request timed out. Please check your network connection and try again.';
    }
    if (error.code === 'ERR_NETWORK' || error.message?.toLowerCase().includes('network error') || !error.response) {
      return 'Unable to connect to the server. Please check your internet connection or server status.';
    }

    const status = error.response.status;
    const data = error.response.data;
    const detail = data?.detail;

    // 2. HTTP 401 Unauthorized
    if (status === 401) {
      if (typeof detail === 'string') return detail;
      return 'Invalid credentials or session expired. Please sign in again.';
    }

    // 3. HTTP 403 Forbidden (Consent requirements)
    if (status === 403) {
      if (typeof detail === 'string') {
        const lower = detail.toLowerCase();
        if (lower.includes('research assessment consent')) {
          return 'Research assessment consent is required before submitting. Please visit Privacy & Consent to enable it.';
        }
        if (lower.includes('image storage consent')) {
          return 'Image storage consent is required to upload lesion images. Please visit Privacy & Consent to enable it.';
        }
        return detail;
      }
      return 'Access forbidden. You do not have permission for this action.';
    }

    // 4. HTTP 404 Not Found
    if (status === 404) {
      if (typeof detail === 'string') return detail;
      return 'The requested record or resource was not found.';
    }

    // 5. HTTP 409 Conflict
    if (status === 409) {
      if (typeof detail === 'string') return detail;
      return 'This email is already registered or a conflict occurred.';
    }

    // 6. HTTP 413 Payload Too Large
    if (status === 413) {
      return 'The uploaded image exceeds the 10 MB limit. Please select a smaller image.';
    }

    // 7. HTTP 415 Unsupported Media Type
    if (status === 415) {
      if (typeof detail === 'string') return detail;
      return 'Unsupported file format. Please upload a JPEG or PNG image.';
    }

    // 8. HTTP 422 Unprocessable Entity (FastAPI / Pydantic validation)
    if (status === 422) {
      if (Array.isArray(detail) && detail.length > 0) {
        const messages = detail.map((err: any) => {
          if (typeof err === 'string') return err;
          if (err && typeof err === 'object') {
            const loc = Array.isArray(err.loc)
              ? err.loc.filter((p: any) => p !== 'body').join(' -> ')
              : '';
            const msg = err.msg || err.message || 'Validation error';
            return loc ? loc + ': ' + msg : msg;
          }
          return 'Invalid input value';
        });
        return messages.join('\n');
      }

      if (typeof detail === 'string') {
        return detail;
      }

      if (detail && typeof detail === 'object') {
        if (typeof detail.msg === 'string') return detail.msg;
        if (typeof detail.message === 'string') return detail.message;
      }

      return 'Validation error. Please verify the submitted information.';
    }

    // 9. HTTP 503 Service Unavailable (Model Checkpoints Missing)
    if (status === 503) {
      if (typeof detail === 'string') return detail;
      return 'AI Model service unavailable. Required model checkpoints are missing on the server.';
    }

    // 10. HTTP 500+ Internal Server Error
    if (status >= 500) {
      return 'Server error. The research server encountered an issue. Please try again later.';
    }

    // Generic fallbacks
    if (typeof detail === 'string') return detail;
    if (typeof data?.message === 'string') return data.message;
    return error.message || 'An error occurred while communicating with the server.';
  }

  if (error instanceof Error) {
    return error.message;
  }

  if (typeof error === 'string') {
    return error;
  }

  return 'An unexpected error occurred.';
}
