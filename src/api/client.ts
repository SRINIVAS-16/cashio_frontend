// ─── API Client (Axios) ──────────────────────────────────────────
import axios, { AxiosRequestConfig } from "axios";

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
  login: (data: { username: string; password: string; tenantSlug?: string }) =>
    api.post("/auth/login", data),
  register: (data: { username: string; password: string; name: string }) =>
    api.post("/auth/register", data),
  getProfile: () => api.get("/auth/me"),
};

// ─── Product APIs ────────────────────────────────────────────────
export const productApi = {
  getAll: (search?: string, category?: string, config?: AxiosRequestConfig) =>
    api.get("/products", { params: { search, category }, ...config }),
  getById: (id: number, config?: AxiosRequestConfig) => api.get(`/products/${id}`, config),
  getCategories: (config?: AxiosRequestConfig) => api.get("/products/categories", config),
  create: (data: any) => api.post("/products", data),
  update: (id: number, data: any) => api.put(`/products/${id}`, data),
  delete: (id: number) => api.delete(`/products/${id}`),
};

// ─── Customer APIs ───────────────────────────────────────────────
export const customerApi = {
  getAll: (search?: string, config?: AxiosRequestConfig) => api.get("/customers", { params: { search }, ...config }),
  getById: (id: number, config?: AxiosRequestConfig) => api.get(`/customers/${id}`, config),
  findByPhone: (phone: string, config?: AxiosRequestConfig) => api.get(`/customers/phone/${phone}`, config),
  create: (data: any) => api.post("/customers", data),
  update: (id: number, data: any) => api.put(`/customers/${id}`, data),
  delete: (id: number) => api.delete(`/customers/${id}`),
};

// ─── Order APIs ──────────────────────────────────────────────────
export const orderApi = {
  getAll: (page = 1, limit = 20, startDate?: string, endDate?: string, customerIds?: number[], config?: AxiosRequestConfig) =>
    api.get("/orders", { params: { page, limit, startDate, endDate, customerIds: customerIds?.length ? customerIds.join(",") : undefined }, ...config }),
  getById: (id: number, config?: AxiosRequestConfig) => api.get(`/orders/${id}`, config),
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
  getAll: (scope?: string, category?: string, config?: AxiosRequestConfig) =>
    api.get("/custom-fields", { params: { scope, category }, ...config }),
  getForCategory: (category: string, config?: AxiosRequestConfig) =>
    api.get(`/custom-fields/for-category/${category}`, config),
  getById: (id: number, config?: AxiosRequestConfig) => api.get(`/custom-fields/${id}`, config),
  create: (data: any) => api.post("/custom-fields", data),
  update: (id: number, data: any) => api.put(`/custom-fields/${id}`, data),
  delete: (id: number) => api.delete(`/custom-fields/${id}`),
  getProductValues: (productId: number) =>
    api.get(`/custom-fields/product/${productId}`),
  saveProductValues: (productId: number, values: { customFieldDefinitionId: number; value: string }[]) =>
    api.post(`/custom-fields/product/${productId}`, { values }),
};

export const dashboardApi = {
  getDashboard: (config?: AxiosRequestConfig) => api.get("/dashboard", config),
  getSalesTrend: (days = 30, config?: AxiosRequestConfig) =>
    api.get("/dashboard/sales-trend", { params: { days }, ...config }),
  getProductDistribution: (config?: AxiosRequestConfig) => api.get("/dashboard/product-distribution", config),
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
  getAll: (page = 1, limit = 20, dealerId?: number, startDate?: string, endDate?: string, config?: AxiosRequestConfig) =>
    api.get("/purchases", { params: { page, limit, dealerId, startDate, endDate }, ...config }),
  getById: (id: number, config?: AxiosRequestConfig) => api.get(`/purchases/${id}`, config),
  create: (data: any) => api.post("/purchases", data),
  recordPayment: (id: number, amount: number, paymentMode = "cash", notes?: string) =>
    api.post(`/purchases/${id}/payment`, { amount, paymentMode, notes }),
  getByProduct: (productId: number) =>
    api.get(`/purchases/product/${productId}`),
};

// ─── Dealer APIs ─────────────────────────────────────────────────
export const dealerApi = {
  getAll: (search?: string, config?: AxiosRequestConfig) => api.get("/dealers", { params: { search }, ...config }),
  getById: (id: number, config?: AxiosRequestConfig) => api.get(`/dealers/${id}`, config),
  create: (data: any) => api.post("/dealers", data),
  update: (id: number, data: any) => api.put(`/dealers/${id}`, data),
  delete: (id: number) => api.delete(`/dealers/${id}`),
};

// ─── Stock Book APIs ─────────────────────────────────────────────
export const stockBookApi = {
  getAll: (search?: string, category?: string, config?: AxiosRequestConfig) =>
    api.get("/stock-book", { params: { search, category }, ...config }),
  getProductDetail: (productId: number, config?: AxiosRequestConfig) =>
    api.get(`/stock-book/${productId}`, config),
  getAvailableBatches: (productId: number, config?: AxiosRequestConfig) =>
    api.get(`/stock-book/${productId}/batches`, config),
};

// ─── Permission APIs ─────────────────────────────────────────────
export const permissionApi = {
  getMyPermissions: (config?: AxiosRequestConfig) => api.get("/auth/permissions", config),
  getMatrix: (config?: AxiosRequestConfig) => api.get("/permissions/matrix", config),
  updateRolePermissions: (role: string, entries: { code: string; action: string }[]) =>
    api.put(`/permissions/role/${role}`, { entries }),
  seed: () => api.post("/permissions/seed"),
};

// ─── Tenant APIs ─────────────────────────────────────────────────
export const tenantApi = {
  lookupBySlug: (slug: string) => api.get(`/tenants/lookup/${slug}`),
  register: (data: {
    shopName: string; slug: string; phone?: string; address?: string; gstNo?: string;
    adminUsername: string; adminPassword: string; adminName: string;
  }) => api.post("/tenants/register", data),
  getMyTenant: (config?: AxiosRequestConfig) => api.get("/tenants/me", config),
  updateMyTenant: (data: { name?: string }) => api.put("/tenants/me", data),
  getShopDetails: (config?: AxiosRequestConfig) => api.get("/tenants/me/shop-details", config),
  updateShopDetails: (data: {
    name?: string;
    nameLocal?: string;
    phone?: string;
    altPhone?: string;
    email?: string;
    address?: string;
    addressLocal?: string;
    district?: string;
    districtLocal?: string;
    gstNo?: string;
    tagline?: string;
    taglineLocal?: string;
    logo?: string;
  }) => api.put("/tenants/me/shop-details", data),
  getSettings: (config?: AxiosRequestConfig) => api.get("/tenants/me/settings", config),
  updateSettings: (data: {
    localLanguage?: string;
    currency?: string;
    billPrefix?: string;
    thermalPrintEnabled?: boolean;
  }) => api.put("/tenants/me/settings", data),
};

// ─── Super Admin APIs ───────────────────────────────────────────
export const superAdminApi = {
  getTenants: () => api.get("/super-admin/tenants"),
  createTenant: (data: { name: string; slug: string; plan?: string; adminUsername: string; adminPassword: string; adminName: string }) =>
    api.post("/super-admin/tenants", data),
  getTenant: (id: string) => api.get(`/super-admin/tenants/${id}`),
  updateTenant: (id: string, data: { name?: string; plan?: string; isActive?: boolean }) => api.put(`/super-admin/tenants/${id}`, data),
  getTenantUsers: (id: string) => api.get(`/super-admin/tenants/${id}/users`),
};

// ─── User Management APIs ────────────────────────────────────────
export const userApi = {
  getAll: (config?: AxiosRequestConfig) => api.get("/users", config),
  getById: (id: number, config?: AxiosRequestConfig) => api.get(`/users/${id}`, config),
  create: (data: { username: string; password: string; name: string; role?: string }) =>
    api.post("/users", data),
  update: (id: number, data: { name?: string; role?: string; password?: string }) =>
    api.put(`/users/${id}`, data),
  delete: (id: number) => api.delete(`/users/${id}`),
};

export default api;
