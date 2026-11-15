import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { Platform } from 'react-native';
import { setBaseUrl } from '../services/api';

const STORAGE_KEY = 'mspe_backend_url';

// Default host based on platform
export const getDefaultBackendUrl = (): string => {
  if (process.env.EXPO_PUBLIC_API_URL) {
    return process.env.EXPO_PUBLIC_API_URL;
  }
  if (Platform.OS === 'android') {
    // 10.0.2.2 is Android emulator loopback; for physical Wi-Fi devices user enters their laptop IP
    return 'http://192.168.1.100:8001';
  }
  return 'http://127.0.0.1:8001';
};

export interface ConnectionState {
  url: string;
  status: 'idle' | 'testing' | 'connected' | 'error';
  latency: number | null;
  serverInfo: {
    status?: string;
    system?: string;
    models_initialized?: boolean;
    device?: string;
    mode?: string;
    timestamp?: string;
  } | null;
  errorMessage: string | null;
  ready: boolean;
  initialize: () => Promise<void>;
  setUrl: (newUrl: string) => Promise<boolean>;
  testConnection: (targetUrl?: string) => Promise<boolean>;
  resetToDefault: () => Promise<void>;
}

export const useConnection = create<ConnectionState>((set, get) => ({
  url: getDefaultBackendUrl(),
  status: 'idle',
  latency: null,
  serverInfo: null,
  errorMessage: null,
  ready: false,

  initialize: async () => {
    try {
      const saved = await AsyncStorage.getItem(STORAGE_KEY);
      const activeUrl = saved && saved.trim() ? saved.trim() : getDefaultBackendUrl();
      setBaseUrl(activeUrl);
      set({ url: activeUrl, ready: true });
      // Run initial background test
      get().testConnection(activeUrl).catch(() => {});
    } catch (e) {
      const fallback = getDefaultBackendUrl();
      setBaseUrl(fallback);
      set({ url: fallback, ready: true });
    }
  },

  setUrl: async (newUrl: string) => {
    let clean = (newUrl || '').trim();
    if (!clean) return false;
    if (!clean.startsWith('http://') && !clean.startsWith('https://')) {
      clean = 'http://' + clean;
    }
    clean = clean.replace(/\/+$/, '');

    try {
      await AsyncStorage.setItem(STORAGE_KEY, clean);
      setBaseUrl(clean);
      set({ url: clean });
      return true;
    } catch (e) {
      console.error('[ConnectionStore] Failed to save backend URL:', e);
      return false;
    }
  },

  testConnection: async (targetUrl?: string) => {
    let testUrl = (targetUrl || get().url || '').trim();
    if (!testUrl.startsWith('http://') && !testUrl.startsWith('https://')) {
      testUrl = 'http://' + testUrl;
    }
    testUrl = testUrl.replace(/\/+$/, '');

    set({ status: 'testing', errorMessage: null });
    const startTime = Date.now();

    try {
      const pingEndpoint = `${testUrl}/api/v1/health`;
      const response = await axios.get(pingEndpoint, { timeout: 6000 });
      const latencyMs = Date.now() - startTime;

      if (response.status === 200 && response.data) {
        set({
          status: 'connected',
          latency: latencyMs,
          serverInfo: response.data,
          errorMessage: null,
        });
        return true;
      } else {
        set({
          status: 'error',
          latency: null,
          serverInfo: null,
          errorMessage: `Server returned unexpected status ${response.status}`,
        });
        return false;
      }
    } catch (error: any) {
      let errMsg = 'Connection failed. Please check IP address, port, and Wi-Fi network.';
      if (error.code === 'ECONNABORTED' || error.message?.includes('timeout')) {
        errMsg = 'Connection timed out (6s). Check if laptop firewall allows port 8001.';
      } else if (error.code === 'ERR_NETWORK' || error.message?.includes('Network Error')) {
        errMsg = 'Network unreachable. Verify phone and laptop are on the same Wi-Fi.';
      } else if (error.response?.status) {
        errMsg = `Server responded with HTTP ${error.response.status}: ${error.response.statusText || 'Error'}`;
      }

      set({
        status: 'error',
        latency: null,
        serverInfo: null,
        errorMessage: errMsg,
      });
      return false;
    }
  },

  resetToDefault: async () => {
    const def = getDefaultBackendUrl();
    await AsyncStorage.removeItem(STORAGE_KEY);
    setBaseUrl(def);
    set({ url: def, status: 'idle', latency: null, serverInfo: null, errorMessage: null });
  },
}));
