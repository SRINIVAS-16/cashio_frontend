// ─── Azure AD / Entra ID MSAL Configuration ─────────────────────
import { Configuration, LogLevel } from "@azure/msal-browser";

// Configure these via environment variables in .env
// VITE_AZURE_CLIENT_ID      – Application (client) ID from Azure App Registration
// VITE_AZURE_TENANT_ID      – Directory (tenant) ID
// VITE_AZURE_REDIRECT_URI   – Redirect URI (e.g. http://localhost:5173)
// VITE_AZURE_API_SCOPE      – API scope (e.g. api://<client-id>/access_as_user)

const clientId = import.meta.env.VITE_AZURE_CLIENT_ID || "";
const tenantId = import.meta.env.VITE_AZURE_TENANT_ID || "";
const redirectUri = import.meta.env.VITE_AZURE_REDIRECT_URI || window.location.origin;

export const msalConfig: Configuration = {
  auth: {
    clientId,
    authority: `https://login.microsoftonline.com/${tenantId}`,
    redirectUri,
    postLogoutRedirectUri: redirectUri,
  },
  cache: {
    cacheLocation: "localStorage",
  },
  system: {
    loggerOptions: {
      logLevel: LogLevel.Warning,
      loggerCallback: (_level, message) => {
        console.debug(message);
      },
    },
  },
};

// Scopes requested during login
export const loginRequest = {
  scopes: [
    import.meta.env.VITE_AZURE_API_SCOPE || "User.Read",
  ],
};

// Scopes for acquiring API access token
export const apiTokenRequest = {
  scopes: [
    import.meta.env.VITE_AZURE_API_SCOPE || "User.Read",
  ],
};

// Whether OAuth is enabled (true when Azure client ID is configured)
export const isOAuthEnabled = !!clientId;

// Whether local username/password login is enabled. Defaults to false in
// production so only Microsoft sign-in is shown. Set
// VITE_LOCAL_AUTH_ENABLED=true (e.g. in .env.local) to re-enable for dev.
export const isLocalAuthEnabled =
  String(import.meta.env.VITE_LOCAL_AUTH_ENABLED ?? "").toLowerCase() === "true";
