// ─── API Client (Axios) ──────────────────────────────────────────
import axios from "axios";

const API_BASE = import.meta.env.VITE_API_URL || "/api";

const api = axios.create({
  baseURL: API_BASE,
  headers: { "Content-Type": "application/json" },
});

// Callback for auth errors — set by AuthContext to clear React state
let onAuthError: (() => void) | null = null;
export function setAuthErrorHandler(handler: () => void) {
  onAuthError = handler;
}

// Attach JWT / OAuth token to every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle 401 errors globally — clear session and notify AuthContext
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      localStorage.removeItem("authMethod");
      // Notify AuthContext to clear React state (triggers ProtectedRoute → /login)
      if (onAuthError) onAuthError();
    }
    if (error.response?.status === 403) {
      console.warn("Access denied: insufficient permissions");
    }
    return Promise.reject(error);
  }
);

// ─── Auth APIs ───────────────────────────────────────────────────
export const authApi = {
  login: (data: { username: string; password: string }) =>
    api.post("/auth/login", data),
  register: (data: { username: string; password: string; name: string }) =>
    api.post("/auth/register", data),
  getProfile: () => api.get("/auth/me"),
};

// ─── Product APIs ────────────────────────────────────────────────
export const productApi = {
  getAll: (search?: string, category?: string) =>
    api.get("/products", { params: { search, category } }),
  getById: (id: number) => api.get(`/products/${id}`),
  getCategories: () => api.get("/products/categories"),
  create: (data: any) => api.post("/products", data),
  update: (id: number, data: any) => api.put(`/products/${id}`, data),
  delete: (id: number) => api.delete(`/products/${id}`),
};

// ─── Customer APIs ───────────────────────────────────────────────
export const customerApi = {
  getAll: (search?: string) => api.get("/customers", { params: { search } }),
  getById: (id: number) => api.get(`/customers/${id}`),
  findByPhone: (phone: string) => api.get(`/customers/phone/${phone}`),
  create: (data: any) => api.post("/customers", data),
  update: (id: number, data: any) => api.put(`/customers/${id}`, data),
  delete: (id: number) => api.delete(`/customers/${id}`),
};

// ─── Order APIs ──────────────────────────────────────────────────
export const orderApi = {
  getAll: (page = 1, limit = 20, startDate?: string, endDate?: string, customerIds?: number[]) =>
    api.get("/orders", { params: { page, limit, startDate, endDate, customerIds: customerIds?.length ? customerIds.join(",") : undefined } }),
  getById: (id: number) => api.get(`/orders/${id}`),
  create: (data: any) => api.post("/orders", data),
  cancel: (id: number) => api.patch(`/orders/${id}/cancel`),
};

// ─── Payment APIs ────────────────────────────────────────────────
export const paymentApi = {
  getByOrderId: (orderId: number) => api.get(`/payments/order/${orderId}`),
  recordPayment: (orderId: number, data: { amount: number; paymentMode: string; notes?: string }) =>
    api.post(`/payments/order/${orderId}`, data),
  getOrdersWithDues: () => api.get("/payments/dues"),
  getCustomersWithDues: () => api.get("/payments/dues/customers"),
  getDueSummary: () => api.get("/payments/dues/summary"),
};

// ─── Dashboard APIs ──────────────────────────────────────────────
export const customFieldApi = {
  getAll: (scope?: string, category?: string) =>
    api.get("/custom-fields", { params: { scope, category } }),
  getForCategory: (category: string) =>
    api.get(`/custom-fields/for-category/${category}`),
  getById: (id: number) => api.get(`/custom-fields/${id}`),
  create: (data: any) => api.post("/custom-fields", data),
  update: (id: number, data: any) => api.put(`/custom-fields/${id}`, data),
  delete: (id: number) => api.delete(`/custom-fields/${id}`),
  getProductValues: (productId: number) =>
    api.get(`/custom-fields/product/${productId}`),
  saveProductValues: (productId: number, values: { customFieldDefinitionId: number; value: string }[]) =>
    api.post(`/custom-fields/product/${productId}`, { values }),
};

export const dashboardApi = {
  getDashboard: () => api.get("/dashboard"),
  getSalesTrend: (days = 30) =>
    api.get("/dashboard/sales-trend", { params: { days } }),
  getProductDistribution: () => api.get("/dashboard/product-distribution"),
  exportSalesReport: (startDate: string, endDate: string) =>
    api.get("/dashboard/export", {
      params: { startDate, endDate },
      responseType: "blob",
    }),
  getDailySummary: (date?: string) =>
    api.get("/dashboard/daily-summary", { params: { date } }),
  getAuditLogs: (limit = 50) =>
    api.get("/dashboard/audit-logs", { params: { limit } }),
};

// ─── Purchase APIs ───────────────────────────────────────────────
export const purchaseApi = {
  getAll: (page = 1, limit = 20, dealerId?: number, startDate?: string, endDate?: string) =>
    api.get("/purchases", { params: { page, limit, dealerId, startDate, endDate } }),
  getById: (id: number) => api.get(`/purchases/${id}`),
  create: (data: any) => api.post("/purchases", data),
  recordPayment: (id: number, amount: number, paymentMode = "cash", notes?: string) =>
    api.post(`/purchases/${id}/payment`, { amount, paymentMode, notes }),
  getByProduct: (productId: number) =>
    api.get(`/purchases/product/${productId}`),
};

// ─── Dealer APIs ─────────────────────────────────────────────────
export const dealerApi = {
  getAll: (search?: string) => api.get("/dealers", { params: { search } }),
  getById: (id: number) => api.get(`/dealers/${id}`),
  create: (data: any) => api.post("/dealers", data),
  update: (id: number, data: any) => api.put(`/dealers/${id}`, data),
  delete: (id: number) => api.delete(`/dealers/${id}`),
};

// ─── Stock Book APIs ─────────────────────────────────────────────
export const stockBookApi = {
  getAll: (search?: string, category?: string) =>
    api.get("/stock-book", { params: { search, category } }),
  getProductDetail: (productId: number) =>
    api.get(`/stock-book/${productId}`),
  getAvailableBatches: (productId: number) =>
    api.get(`/stock-book/${productId}/batches`),
};

// ─── Permission APIs ─────────────────────────────────────────────
export const permissionApi = {
  getMyPermissions: () => api.get("/auth/permissions"),
  getMatrix: () => api.get("/permissions/matrix"),
  updateRolePermissions: (role: string, permissions: string[]) =>
    api.put(`/permissions/role/${role}`, { permissions }),
  seed: () => api.post("/permissions/seed"),
};

// ─── User Management APIs ────────────────────────────────────────
export const userApi = {
  getAll: () => api.get("/users"),
  getById: (id: number) => api.get(`/users/${id}`),
  create: (data: { username: string; password: string; name: string; role?: string }) =>
    api.post("/users", data),
  update: (id: number, data: { name?: string; role?: string; password?: string }) =>
    api.put(`/users/${id}`, data),
  delete: (id: number) => api.delete(`/users/${id}`),
};

export default api;
