/**
 * Central API client — all backend calls go through here.
 * Handles: base URL, JWT injection, 401 token refresh, error shaping.
 */
import axios, { AxiosInstance, InternalAxiosRequestConfig } from "axios";

const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

const api: AxiosInstance = axios.create({
  baseURL: BASE_URL,
  headers: { "Content-Type": "application/json" },
});

// ── Inject access token on every request ──────────────────────────
api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  if (typeof window !== "undefined") {
    const token = localStorage.getItem("access_token");
    if (token) config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// ── Auto-refresh on 401 ────────────────────────────────────────────
api.interceptors.response.use(
  (r) => r,
  async (error) => {
    const original = error.config;
    if (error.response?.status === 401 && !original._retry) {
      original._retry = true;
      try {
        const refresh = localStorage.getItem("refresh_token");
        const { data } = await axios.post(`${BASE_URL}/api/auth/refresh`, { refresh_token: refresh });
        localStorage.setItem("access_token", data.access_token);
        original.headers.Authorization = `Bearer ${data.access_token}`;
        return api(original);
      } catch {
        localStorage.clear();
        window.location.href = "/login";
      }
    }
    return Promise.reject(error);
  }
);

export default api;

// ── Typed API helpers ──────────────────────────────────────────────

export const authApi = {
  login:    (email: string, password: string) =>
    api.post("/api/auth/login", `username=${encodeURIComponent(email)}&password=${encodeURIComponent(password)}`,
      { headers: { "Content-Type": "application/x-www-form-urlencoded" } }),
  me:       () => api.get("/api/auth/me"),
  register: (data: Record<string, unknown>) => api.post("/api/auth/register", data),
};

export const teamsApi = {
  list:         (params?: Record<string, unknown>) => api.get("/api/teams/", { params }),
  get:          (id: number) => api.get(`/api/teams/${id}`),
  create:       (data: Record<string, unknown>) => api.post("/api/teams/", data),
  update:       (id: number, data: Record<string, unknown>) => api.patch(`/api/teams/${id}`, data),
  updateStatus: (id: number, data: Record<string, unknown>) => api.patch(`/api/teams/${id}/status`, data),
  addMember:    (teamId: number, userId: number) => api.post(`/api/teams/${teamId}/members/${userId}`),
  removeMember: (teamId: number, userId: number) => api.delete(`/api/teams/${teamId}/members/${userId}`),
};

export const workOrdersApi = {
  list:         (params?: Record<string, unknown>) => api.get("/api/work-orders/", { params }),
  get:          (id: number) => api.get(`/api/work-orders/${id}`),
  create:       (data: Record<string, unknown>) => api.post("/api/work-orders/", data),
  setMilestone: (id: number, milestone: string) => api.patch(`/api/work-orders/${id}/milestone`, { milestone }),
  assignTeam:   (woId: number, teamId: number) => api.post(`/api/work-orders/${woId}/assign-team`, { team_id: teamId }),
  unassignTeam: (woId: number, teamId: number) => api.delete(`/api/work-orders/${woId}/assign-team/${teamId}`),
};

export const boqApi = {
  list:   (woId: number) => api.get(`/api/boq/work-orders/${woId}/boq`),
  add:    (woId: number, data: Record<string, unknown>) => api.post(`/api/boq/work-orders/${woId}/boq`, data),
  delete: (itemId: number) => api.delete(`/api/boq/boq/${itemId}`),
};

export const dailyPlansApi = {
  list:               (params?: Record<string, unknown>) => api.get("/api/daily-plans/", { params }),
  get:                (id: number) => api.get(`/api/daily-plans/${id}`),
  create:             (data: Record<string, unknown>) => api.post("/api/daily-plans/", data),
  checkIn:            (id: number, data: Record<string, unknown>) => api.post(`/api/daily-plans/${id}/check-in`, data),
  checkOut:           (id: number, data: Record<string, unknown>) => api.post(`/api/daily-plans/${id}/check-out`, data),
  submit:             (id: number, data: Record<string, unknown>) => api.post(`/api/daily-plans/${id}/submit`, data),
  supervisorApprove:  (id: number, data: Record<string, unknown>) => api.post(`/api/daily-plans/${id}/supervisor-approve`, data),
};

export const materialsApi = {
  list:           (params?: Record<string, unknown>) => api.get("/api/materials/", { params }),
  shortageAlerts: () => api.get("/api/materials/shortage-alerts"),
  reportUsage:    (data: Record<string, unknown>) => api.post("/api/materials/usage", data),
};

export const expensesApi = {
  list:    (params?: Record<string, unknown>) => api.get("/api/expenses/", { params }),
  summary: (params?: Record<string, unknown>) => api.get("/api/expenses/summary", { params }),
  create:  (data: Record<string, unknown>) => api.post("/api/expenses/", data),
  approve: (id: number, data: Record<string, unknown>) => api.patch(`/api/expenses/${id}/approve`, data),
};

export const reportsApi = {
  dashboardSummary:  () => api.get("/api/reports/dashboard-summary"),
  teamsDistribution: () => api.get("/api/reports/teams-distribution"),
  achievements:      (params?: Record<string, unknown>) => api.get("/api/reports/achievements", { params }),
};
