import { describe, it, expect, vi, beforeEach } from "vitest";

const axiosState = vi.hoisted(() => {
  const requestHandlers: Array<(config: any) => any> = [];
  const responseSuccessHandlers: Array<(response: any) => any> = [];
  const responseErrorHandlers: Array<(error: any) => Promise<never>> = [];

  const instance = {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
    interceptors: {
      request: {
        use: vi.fn((handler: (config: any) => any) => {
          requestHandlers.push(handler);
          return 0;
        }),
      },
      response: {
        use: vi.fn((success: (response: any) => any, error: (error: any) => Promise<never>) => {
          responseSuccessHandlers.push(success);
          responseErrorHandlers.push(error);
          return 0;
        }),
      },
    },
  };

  return {
    create: vi.fn(() => instance),
    instance,
    requestHandlers,
    responseSuccessHandlers,
    responseErrorHandlers,
  };
});

vi.mock("axios", () => ({
  default: {
    create: axiosState.create,
  },
}));

async function loadClient() {
  return import("../../api/client");
}

describe("api client", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    localStorage.clear();
    axiosState.requestHandlers.length = 0;
    axiosState.responseSuccessHandlers.length = 0;
    axiosState.responseErrorHandlers.length = 0;
  });

  it("creates the axios instance with JSON defaults and registers interceptors", async () => {
    await loadClient();

    expect(axiosState.create).toHaveBeenCalledWith({
      baseURL: "/api",
      headers: { "Content-Type": "application/json" },
    });
    expect(axiosState.instance.interceptors.request.use).toHaveBeenCalledTimes(1);
    expect(axiosState.instance.interceptors.response.use).toHaveBeenCalledTimes(1);
  });

  it("injects the auth token into outgoing requests", async () => {
    await loadClient();
    const requestHandler = axiosState.requestHandlers[0];

    const withoutToken = requestHandler({ headers: {} });
    expect(withoutToken.headers.Authorization).toBeUndefined();

    localStorage.setItem("token", "jwt-token");
    const withToken = requestHandler({ headers: {} });
    expect(withToken.headers.Authorization).toBe("Bearer jwt-token");
  });

  it("handles auth and authorization errors in the response interceptor", async () => {
    const client = await loadClient();
    const responseSuccess = axiosState.responseSuccessHandlers[0];
    const responseError = axiosState.responseErrorHandlers[0];
    const authErrorHandler = vi.fn();
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

    client.setAuthErrorHandler(authErrorHandler);
    localStorage.setItem("token", "jwt-token");
    localStorage.setItem("user", JSON.stringify({ id: 1 }));
    localStorage.setItem("authMethod", "local");

    const response = { data: { ok: true } };
    expect(responseSuccess(response)).toBe(response);

    const unauthorized = { response: { status: 401 } };
    await expect(responseError(unauthorized)).rejects.toBe(unauthorized);
    expect(localStorage.getItem("token")).toBeNull();
    expect(localStorage.getItem("user")).toBeNull();
    expect(localStorage.getItem("authMethod")).toBeNull();
    expect(authErrorHandler).toHaveBeenCalledTimes(1);

    localStorage.setItem("token", "jwt-token");
    const forbidden = { response: { status: 403 } };
    await expect(responseError(forbidden)).rejects.toBe(forbidden);
    expect(localStorage.getItem("token")).toBe("jwt-token");
    expect(warnSpy).toHaveBeenCalledWith("Access denied: insufficient permissions");

    warnSpy.mockRestore();
  });

  it("calls auth, product, customer, and order endpoints with the correct payloads", async () => {
    const client = await loadClient();
    const loginData = { username: "alice", password: "secret" };
    const tenantLoginData = { username: "alice", password: "secret", tenantId: "00000000-0000-0000-0000-000000000001" };
    const registerData = { username: "bob", password: "secret", name: "Bob" };
    const productData = { name: "Urea" };
    const customerData = { name: "Customer" };
    const orderData = { items: [{ productId: 1, quantity: 2 }] };

    client.authApi.login(loginData);
    client.authApi.loginWithTenant(tenantLoginData);
    client.authApi.register(registerData);
    client.authApi.getProfile();
    client.productApi.getAll("seed", "fertilizer");
    client.productApi.getById(7);
    client.productApi.getCategories();
    client.productApi.create(productData);
    client.productApi.update(7, productData);
    client.productApi.delete(7);
    client.customerApi.getAll("alice");
    client.customerApi.getById(3);
    client.customerApi.findByPhone("9999999999");
    client.customerApi.create(customerData);
    client.customerApi.update(3, customerData);
    client.customerApi.delete(3);
    client.orderApi.getAll(2, 50, "2024-01-01", "2024-01-31", [1, 2]);
    client.orderApi.getById(9);
    client.orderApi.create(orderData);
    client.orderApi.cancel(9);

    expect(axiosState.instance.post).toHaveBeenNthCalledWith(1, "/auth/login", loginData);
    expect(axiosState.instance.post).toHaveBeenNthCalledWith(2, "/auth/login-with-tenant", tenantLoginData);
    expect(axiosState.instance.post).toHaveBeenNthCalledWith(3, "/auth/register", registerData);
    expect(axiosState.instance.get).toHaveBeenNthCalledWith(1, "/auth/me");
    expect(axiosState.instance.get).toHaveBeenNthCalledWith(2, "/products", { params: { search: "seed", category: "fertilizer" } });
    expect(axiosState.instance.get).toHaveBeenNthCalledWith(3, "/products/7", undefined);
    expect(axiosState.instance.get).toHaveBeenNthCalledWith(4, "/products/categories", undefined);
    expect(axiosState.instance.post).toHaveBeenNthCalledWith(4, "/products", productData);
    expect(axiosState.instance.put).toHaveBeenNthCalledWith(1, "/products/7", productData);
    expect(axiosState.instance.delete).toHaveBeenNthCalledWith(1, "/products/7");
    expect(axiosState.instance.get).toHaveBeenNthCalledWith(5, "/customers", { params: { search: "alice" } });
    expect(axiosState.instance.get).toHaveBeenNthCalledWith(6, "/customers/3", undefined);
    expect(axiosState.instance.get).toHaveBeenNthCalledWith(7, "/customers/phone/9999999999", undefined);
    expect(axiosState.instance.post).toHaveBeenNthCalledWith(5, "/customers", customerData);
    expect(axiosState.instance.put).toHaveBeenNthCalledWith(2, "/customers/3", customerData);
    expect(axiosState.instance.delete).toHaveBeenNthCalledWith(2, "/customers/3");
    expect(axiosState.instance.get).toHaveBeenNthCalledWith(8, "/orders", {
      params: { page: 2, limit: 50, startDate: "2024-01-01", endDate: "2024-01-31", customerIds: "1,2" },
    });
    expect(axiosState.instance.get).toHaveBeenNthCalledWith(9, "/orders/9", undefined);
    expect(axiosState.instance.post).toHaveBeenNthCalledWith(6, "/orders", orderData);
    expect(axiosState.instance.patch).toHaveBeenCalledWith("/orders/9/cancel");
  });

  it("calls payment, custom field, and dashboard endpoints correctly", async () => {
    const client = await loadClient();
    const paymentData = { amount: 200, paymentMode: "upi", notes: "Paid" };
    const customFieldData = { name: "HSN" };
    const customFieldValues = [{ customFieldDefinitionId: 1, value: "1234" }];

    client.paymentApi.getByOrderId(4);
    client.paymentApi.recordPayment(4, paymentData);
    client.paymentApi.getOrdersWithDues();
    client.paymentApi.getCustomersWithDues();
    client.paymentApi.getDueSummary();
    client.customFieldApi.getAll("global", "fertilizer");
    client.customFieldApi.getForCategory("fertilizer");
    client.customFieldApi.getById(2);
    client.customFieldApi.create(customFieldData);
    client.customFieldApi.update(2, customFieldData);
    client.customFieldApi.delete(2);
    client.customFieldApi.getProductValues(11);
    client.customFieldApi.saveProductValues(11, customFieldValues);
    client.dashboardApi.getDashboard();
    client.dashboardApi.getSalesTrend(14);
    client.dashboardApi.getProductDistribution();
    client.dashboardApi.exportSalesReport("2024-01-01", "2024-01-31");
    client.dashboardApi.getDailySummary("2024-02-01");
    client.dashboardApi.getAuditLogs(25);

    expect(axiosState.instance.get).toHaveBeenNthCalledWith(1, "/payments/order/4");
    expect(axiosState.instance.post).toHaveBeenNthCalledWith(1, "/payments/order/4", paymentData);
    expect(axiosState.instance.get).toHaveBeenNthCalledWith(2, "/payments/dues");
    expect(axiosState.instance.get).toHaveBeenNthCalledWith(3, "/payments/dues/customers");
    expect(axiosState.instance.get).toHaveBeenNthCalledWith(4, "/payments/dues/summary");
    expect(axiosState.instance.get).toHaveBeenNthCalledWith(5, "/custom-fields", { params: { scope: "global", category: "fertilizer" } });
    expect(axiosState.instance.get).toHaveBeenNthCalledWith(6, "/custom-fields/for-category/fertilizer", undefined);
    expect(axiosState.instance.get).toHaveBeenNthCalledWith(7, "/custom-fields/2", undefined);
    expect(axiosState.instance.post).toHaveBeenNthCalledWith(2, "/custom-fields", customFieldData);
    expect(axiosState.instance.put).toHaveBeenNthCalledWith(1, "/custom-fields/2", customFieldData);
    expect(axiosState.instance.delete).toHaveBeenNthCalledWith(1, "/custom-fields/2");
    expect(axiosState.instance.get).toHaveBeenNthCalledWith(8, "/custom-fields/product/11");
    expect(axiosState.instance.post).toHaveBeenNthCalledWith(3, "/custom-fields/product/11", { values: customFieldValues });
    expect(axiosState.instance.get).toHaveBeenNthCalledWith(9, "/dashboard", undefined);
    expect(axiosState.instance.get).toHaveBeenNthCalledWith(10, "/dashboard/sales-trend", { params: { days: 14 } });
    expect(axiosState.instance.get).toHaveBeenNthCalledWith(11, "/dashboard/product-distribution", undefined);
    expect(axiosState.instance.get).toHaveBeenNthCalledWith(12, "/dashboard/export", {
      params: { startDate: "2024-01-01", endDate: "2024-01-31" },
      responseType: "blob",
    });
    expect(axiosState.instance.get).toHaveBeenNthCalledWith(13, "/dashboard/daily-summary", { params: { date: "2024-02-01" } });
    expect(axiosState.instance.get).toHaveBeenNthCalledWith(14, "/dashboard/audit-logs", { params: { limit: 25 } });
  });

  it("calls purchase, dealer, stock book, permission, and user endpoints correctly", async () => {
    const client = await loadClient();
    const purchaseData = { invoiceNo: "INV-1" };
    const dealerData = { name: "Dealer" };
    const userData = { username: "carol", password: "secret", name: "Carol", role: "manager" };
    const userUpdate = { name: "Carol Updated", role: "admin" };

    client.purchaseApi.getAll(3, 10, 5, "2024-03-01", "2024-03-31");
    client.purchaseApi.getById(6);
    client.purchaseApi.create(purchaseData);
    client.purchaseApi.recordPayment(6, 400, "cash", "settled");
    client.purchaseApi.getByProduct(11);
    client.dealerApi.getAll("dealer");
    client.dealerApi.getById(8);
    client.dealerApi.create(dealerData);
    client.dealerApi.update(8, dealerData);
    client.dealerApi.delete(8);
    client.stockBookApi.getAll("urea", "fertilizer");
    client.stockBookApi.getProductDetail(11);
    client.stockBookApi.getAvailableBatches(11);
    client.permissionApi.getMyPermissions();
    client.permissionApi.getMatrix();
    client.permissionApi.updateRolePermissions("manager", [{ code: "products", action: "read" }]);
    client.permissionApi.seed();
    client.userApi.getAll();
    client.userApi.getById(12);
    client.userApi.create(userData);
    client.userApi.update(12, userUpdate);
    client.userApi.delete(12);

    expect(axiosState.instance.get).toHaveBeenNthCalledWith(1, "/purchases", {
      params: { page: 3, limit: 10, dealerId: 5, startDate: "2024-03-01", endDate: "2024-03-31" },
    });
    expect(axiosState.instance.get).toHaveBeenNthCalledWith(2, "/purchases/6", undefined);
    expect(axiosState.instance.post).toHaveBeenNthCalledWith(1, "/purchases", purchaseData);
    expect(axiosState.instance.post).toHaveBeenNthCalledWith(2, "/purchases/6/payment", {
      amount: 400,
      paymentMode: "cash",
      notes: "settled",
    });
    expect(axiosState.instance.get).toHaveBeenNthCalledWith(3, "/purchases/product/11");
    expect(axiosState.instance.get).toHaveBeenNthCalledWith(4, "/dealers", { params: { search: "dealer" } });
    expect(axiosState.instance.get).toHaveBeenNthCalledWith(5, "/dealers/8", undefined);
    expect(axiosState.instance.post).toHaveBeenNthCalledWith(3, "/dealers", dealerData);
    expect(axiosState.instance.put).toHaveBeenNthCalledWith(1, "/dealers/8", dealerData);
    expect(axiosState.instance.delete).toHaveBeenNthCalledWith(1, "/dealers/8");
    expect(axiosState.instance.get).toHaveBeenNthCalledWith(6, "/stock-book", { params: { search: "urea", category: "fertilizer" } });
    expect(axiosState.instance.get).toHaveBeenNthCalledWith(7, "/stock-book/11", undefined);
    expect(axiosState.instance.get).toHaveBeenNthCalledWith(8, "/stock-book/11/batches", undefined);
    expect(axiosState.instance.get).toHaveBeenNthCalledWith(9, "/auth/permissions", undefined);
    expect(axiosState.instance.get).toHaveBeenNthCalledWith(10, "/permissions/matrix", undefined);
    expect(axiosState.instance.put).toHaveBeenNthCalledWith(2, "/permissions/role/manager", {
      entries: [{ code: "products", action: "read" }],
    });
    expect(axiosState.instance.post).toHaveBeenNthCalledWith(4, "/permissions/seed");
    expect(axiosState.instance.get).toHaveBeenNthCalledWith(11, "/users", undefined);
    expect(axiosState.instance.get).toHaveBeenNthCalledWith(12, "/users/12", undefined);
    expect(axiosState.instance.post).toHaveBeenNthCalledWith(5, "/users", userData);
    expect(axiosState.instance.put).toHaveBeenNthCalledWith(3, "/users/12", userUpdate);
    expect(axiosState.instance.delete).toHaveBeenNthCalledWith(2, "/users/12");
  });
});
