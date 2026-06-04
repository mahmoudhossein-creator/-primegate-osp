import axios from "axios";
import * as SecureStore from "expo-secure-store";

const BASE = process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:8000";

export const api = axios.create({ baseURL: BASE, headers: { "Content-Type":"application/json" } });

api.interceptors.request.use(async (config) => {
  const token = await SecureStore.getItemAsync("access_token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(r => r, async (err) => {
  if (err.response?.status === 401 && !err.config._retry) {
    err.config._retry = true;
    try {
      const refresh = await SecureStore.getItemAsync("refresh_token");
      const { data } = await axios.post(`${BASE}/api/auth/refresh`, { refresh_token: refresh });
      await SecureStore.setItemAsync("access_token", data.access_token);
      err.config.headers.Authorization = `Bearer ${data.access_token}`;
      return api(err.config);
    } catch {
      await SecureStore.deleteItemAsync("access_token");
      await SecureStore.deleteItemAsync("refresh_token");
    }
  }
  return Promise.reject(err);
});

// ── API helpers ──────────────────────────────────────
export const authApi = {
  login: (email: string, password: string) =>
    api.post("/api/auth/login",
      `username=${encodeURIComponent(email)}&password=${encodeURIComponent(password)}`,
      { headers: { "Content-Type":"application/x-www-form-urlencoded" } }),
  me: () => api.get("/api/auth/me"),
};

export const plansApi = {
  list:     (params: any) => api.get("/api/daily-plans/", { params }),
  get:      (id: number)  => api.get(`/api/daily-plans/${id}`),
  checkIn:  (id: number, data: any) => api.post(`/api/daily-plans/${id}/check-in`, data),
  checkOut: (id: number, data: any) => api.post(`/api/daily-plans/${id}/check-out`, data),
  submit:   (id: number, data: any) => api.post(`/api/daily-plans/${id}/submit`, data),
  supervisorApprove: (id: number, data: any) => api.post(`/api/daily-plans/${id}/supervisor-approve`, data),
};

export const expensesApi = {
  list:   (params?: any) => api.get("/api/expenses/", { params }),
  create: (data: any)    => api.post("/api/expenses/", data),
};

export const materialsApi = {
  shortage: () => api.get("/api/materials/shortage-alerts"),
  usage:    (data: any) => api.post("/api/materials/usage", data),
};
