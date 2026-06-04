import { create } from "zustand";
import * as SecureStore from "expo-secure-store";
import { authApi } from "./api";

interface User { id:number; name:string; email:string; role:string; district_id:number|null }
interface AuthState {
  user: User|null; isAuthenticated:boolean;
  login:   (email:string, password:string) => Promise<void>;
  logout:  () => Promise<void>;
  hydrate: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null, isAuthenticated: false,

  login: async (email, password) => {
    const { data } = await authApi.login(email, password);
    await SecureStore.setItemAsync("access_token",  data.access_token);
    await SecureStore.setItemAsync("refresh_token", data.refresh_token);
    set({ user: data.user, isAuthenticated: true });
  },

  logout: async () => {
    await SecureStore.deleteItemAsync("access_token");
    await SecureStore.deleteItemAsync("refresh_token");
    set({ user: null, isAuthenticated: false });
  },

  hydrate: async () => {
    try {
      const token = await SecureStore.getItemAsync("access_token");
      if (!token) return;
      const { data } = await authApi.me();
      set({ user: data, isAuthenticated: true });
    } catch { set({ user: null, isAuthenticated: false }); }
  },
}));
