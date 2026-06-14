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
    const responseError = axiosState.responseErrorHandlers[0];
    const authErrorHandler = vi.fn();

    client.setAuthErrorHandler(authErrorHandler);
    localStorage.setItem("token", "jwt-token");
    localStorage.setItem("user", JSON.stringify({ id: 1 }));

    const unauthorized = { response: { status: 401 } };
    await expect(responseError(unauthorized)).rejects.toBe(unauthorized);
    expect(localStorage.getItem("token")).toBeNull();
    expect(localStorage.getItem("user")).toBeNull();
    expect(authErrorHandler).toHaveBeenCalledTimes(1);
  });

  it("calls auth and tenant endpoints with the correct payloads", async () => {
    const client = await loadClient();
    const loginData = { tenantCode: "tenant-one", username: "alice", password: "secret" };
    const superAdminTenant = {
      name: "Acme Agro",
      code: "acme-agro",
      plan: "pro",
      adminUsername: "acmeadmin",
      adminPassword: "secret",
      adminName: "Acme Admin",
    };

    client.authApi.login(loginData);
    client.authApi.getProfile();
    client.tenantApi.lookupByCode("tenant-one");
    client.superAdminApi.createTenant(superAdminTenant);

    expect(axiosState.instance.post).toHaveBeenNthCalledWith(1, "/auth/login", loginData);
    expect(axiosState.instance.get).toHaveBeenNthCalledWith(1, "/auth/me");
    expect(axiosState.instance.get).toHaveBeenNthCalledWith(2, "/tenants/lookup/tenant-one");
    expect(axiosState.instance.post).toHaveBeenNthCalledWith(2, "/super-admin/tenants", superAdminTenant);
  });
});
