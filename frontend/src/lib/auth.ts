import { create } from "zustand";
import { persist } from "zustand/middleware";
import { authApi } from "./api";

interface User {
  id: number;
  name: string;
  email: string;
  role: "management" | "district_manager" | "supervisor" | "team_leader";
  district_id: number | null;
}

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  hydrate: () => Promise<void>;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      isAuthenticated: false,

      login: async (email, password) => {
        const { data } = await authApi.login(email, password);
        localStorage.setItem("access_token", data.access_token);
        localStorage.setItem("refresh_token", data.refresh_token);
        set({ user: data.user, isAuthenticated: true });
      },

      logout: () => {
        localStorage.removeItem("access_token");
        localStorage.removeItem("refresh_token");
        set({ user: null, isAuthenticated: false });
        window.location.href = "/login";
      },

      hydrate: async () => {
        try {
          const { data } = await authApi.me();
          set({ user: data, isAuthenticated: true });
        } catch {
          set({ user: null, isAuthenticated: false });
        }
      },
    }),
    { name: "auth-store", partialize: (s) => ({ user: s.user, isAuthenticated: s.isAuthenticated }) }
  )
);

// Role helpers
export const isManagement    = (u: User | null) => u?.role === "management";
export const isDMOrAbove     = (u: User | null) => ["management","district_manager"].includes(u?.role ?? "");
export const isSupervisorUp  = (u: User | null) => ["management","district_manager","supervisor"].includes(u?.role ?? "");
