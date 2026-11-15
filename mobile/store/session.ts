import { create } from "zustand";
import Storage from "../src/lib/storage";

export interface Session {
  access: string | null;
  refresh: string | null;
  ready: boolean;
  initialize: () => Promise<void>;
  setTokens: (access: string, refresh: string) => Promise<void>;
  clear: () => Promise<void>;
}

let initPromise: Promise<void> | null = null;

export const useSession = create<Session>((set, get) => ({
  access: null,
  refresh: null,
  ready: false,

  initialize: async () => {
    if (get().ready) {
      return;
    }

    if (initPromise) {
      return initPromise;
    }

    initPromise = (async () => {
      try {
        const [access, refresh] = await Promise.all([
          Storage.getItem("access").catch((err) => {
            console.error("[Session] Error retrieving access token:", err);
            return null;
          }),
          Storage.getItem("refresh").catch((err) => {
            console.error("[Session] Error retrieving refresh token:", err);
            return null;
          }),
        ]);

        set({ access, refresh, ready: true });
      } catch (error) {
        console.error("[Session] Session initialization failed:", error);
        set({ access: null, refresh: null, ready: true });
      } finally {
        initPromise = null;
      }
    })();

    return initPromise;
  },

  setTokens: async (access: string, refresh: string) => {
    try {
      await Promise.all([
        Storage.setItem("access", access).catch((err) => {
          console.error("[Session] Error persisting access token:", err);
        }),
        Storage.setItem("refresh", refresh).catch((err) => {
          console.error("[Session] Error persisting refresh token:", err);
        }),
      ]);
    } catch (error) {
      console.error("[Session] Error in setTokens:", error);
    } finally {
      set({ access, refresh });
    }
  },

  clear: async () => {
    try {
      await Promise.all([
        Storage.deleteItem("access").catch((err) => {
          console.error("[Session] Error clearing access token:", err);
        }),
        Storage.deleteItem("refresh").catch((err) => {
          console.error("[Session] Error clearing refresh token:", err);
        }),
      ]);
    } catch (error) {
      console.error("[Session] Error in clear:", error);
    } finally {
      set({ access: null, refresh: null });
    }
  },
}));
