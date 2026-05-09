import { describe, it, expect, vi, beforeEach } from "vitest";
import { LogLevel } from "@azure/msal-browser";

async function loadModule() {
  return import("../../config/authConfig");
}

describe("authConfig", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.unstubAllEnvs();
  });

  it("builds the default MSAL config and feature flags", async () => {
    vi.stubEnv("VITE_AZURE_CLIENT_ID", "");
    vi.stubEnv("VITE_AZURE_TENANT_ID", "");
    vi.stubEnv("VITE_AZURE_REDIRECT_URI", "");
    vi.stubEnv("VITE_AZURE_API_SCOPE", "");
    vi.stubEnv("VITE_LOCAL_AUTH_ENABLED", "");

    const authConfig = await loadModule();

    expect(authConfig.msalConfig.auth).toEqual({
      clientId: "",
      authority: "https://login.microsoftonline.com/",
      redirectUri: window.location.origin,
      postLogoutRedirectUri: window.location.origin,
    });
    expect(authConfig.msalConfig.cache).toEqual({ cacheLocation: "localStorage" });
    expect(authConfig.msalConfig.system?.loggerOptions?.logLevel).toBe(LogLevel.Warning);
    expect(authConfig.msalConfig.system?.loggerOptions?.loggerCallback).toEqual(expect.any(Function));
    expect(authConfig.loginRequest).toEqual({ scopes: ["User.Read"] });
    expect(authConfig.apiTokenRequest).toEqual({ scopes: ["User.Read"] });
    expect(authConfig.isOAuthEnabled).toBe(false);
    expect(authConfig.isLocalAuthEnabled).toBe(false);
  });

  it("uses environment overrides when provided", async () => {
    vi.stubEnv("VITE_AZURE_CLIENT_ID", "client-id");
    vi.stubEnv("VITE_AZURE_TENANT_ID", "tenant-id");
    vi.stubEnv("VITE_AZURE_REDIRECT_URI", "https://cashio.example.com/callback");
    vi.stubEnv("VITE_AZURE_API_SCOPE", "api://cashio/access_as_user");
    vi.stubEnv("VITE_LOCAL_AUTH_ENABLED", "TRUE");

    const authConfig = await loadModule();

    expect(authConfig.msalConfig.auth).toEqual({
      clientId: "client-id",
      authority: "https://login.microsoftonline.com/tenant-id",
      redirectUri: "https://cashio.example.com/callback",
      postLogoutRedirectUri: "https://cashio.example.com/callback",
    });
    expect(authConfig.loginRequest.scopes).toEqual(["api://cashio/access_as_user"]);
    expect(authConfig.apiTokenRequest.scopes).toEqual(["api://cashio/access_as_user"]);
    expect(authConfig.isOAuthEnabled).toBe(true);
    expect(authConfig.isLocalAuthEnabled).toBe(true);
  });
});
