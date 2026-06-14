import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Sprout, Eye, EyeOff, Phone, MapPin, Shield, Building2 } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useLang } from "../context/LanguageContext";
import { useShopConfig } from "../context/ShopConfigContext";
import { isLocalAuthEnabled } from "../config/authConfig";
import { tenantApi } from "../api/client";
import toast from "react-hot-toast";

const RECENT_TENANTS_KEY = "cashio-recent-tenants";

function readRecentTenants(): string[] {
  try {
    const parsed = JSON.parse(localStorage.getItem(RECENT_TENANTS_KEY) || "[]");
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((value): value is string => typeof value === "string" && value.trim().length > 0).slice(0, 5);
  } catch {
    return [];
  }
}

function saveRecentTenant(slug: string): string[] {
  const normalized = slug.trim().toLowerCase();
  if (!normalized) return readRecentTenants();
  const next = [normalized, ...readRecentTenants().filter((value) => value !== normalized)].slice(0, 5);
  localStorage.setItem(RECENT_TENANTS_KEY, JSON.stringify(next));
  return next;
}

type TenantLookup = {
  name: string;
  slug: string;
};

export default function Login() {
  const { user, isLoading: authLoading, login, loginWithOAuth, isOAuthAvailable } = useAuth();
  const { t } = useLang();
  const { shop: shopConfig } = useShopConfig();
  const navigate = useNavigate();
  const loginSuccessPendingRef = useRef(false);
  const [step, setStep] = useState<"tenant" | "credentials">("tenant");
  const [platformAdminMode, setPlatformAdminMode] = useState(false);
  const [tenantSlug, setTenantSlug] = useState("");
  const [tenant, setTenant] = useState<TenantLookup | null>(null);
  const [recentTenants, setRecentTenants] = useState<string[]>(() => readRecentTenants());
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [lookupLoading, setLookupLoading] = useState(false);
  const [oauthLoading, setOauthLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && user) {
      if (loginSuccessPendingRef.current) {
        toast.success(t.welcomeBack);
        loginSuccessPendingRef.current = false;
      }
      navigate(user.role === "superadmin" ? "/super-admin" : "/", { replace: true });
    }
  }, [authLoading, user, navigate, t]);

  if (authLoading || user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  const clearError = () => {
    if (errorMsg) setErrorMsg(null);
  };

  const handleTenantLookup = async (slugToLookup?: string) => {
    const normalized = (slugToLookup ?? tenantSlug).trim().toLowerCase();
    if (!normalized) {
      setErrorMsg("Enter your shop code to continue.");
      return;
    }

    setLookupLoading(true);
    clearError();
    try {
      const res = await tenantApi.lookupBySlug(normalized);
      const tenantInfo = res.data as TenantLookup;
      setTenant(tenantInfo);
      setTenantSlug(tenantInfo.slug);
      setRecentTenants(saveRecentTenant(tenantInfo.slug));
      setStep("credentials");
      setPlatformAdminMode(false);
    } catch (err: any) {
      const serverMsg = err.response?.data?.error;
      setErrorMsg(serverMsg || "Invalid shop code. Please try again.");
    } finally {
      setLookupLoading(false);
    }
  };

  const handleTenantSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await handleTenantLookup();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    clearError();
    loginSuccessPendingRef.current = true;
    try {
      const selectedTenantSlug = platformAdminMode ? undefined : tenant?.slug || tenantSlug.trim().toLowerCase();
      await login(username, password, selectedTenantSlug);
      if (selectedTenantSlug) {
        setRecentTenants(saveRecentTenant(selectedTenantSlug));
      }
    } catch (err: any) {
      loginSuccessPendingRef.current = false;
      const status = err.response?.status;
      const serverMsg = err.response?.data?.error;
      const friendly =
        status === 401 || status === 400
          ? "Incorrect username or password. Please try again."
          : serverMsg || "Login failed. Please try again.";
      setErrorMsg(friendly);
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => {
    clearError();
    setPassword("");
    setShowPassword(false);
    setStep("tenant");
    setPlatformAdminMode(false);
  };

  const handlePlatformAdmin = () => {
    clearError();
    setTenant(null);
    setTenantSlug("");
    setPassword("");
    setShowPassword(false);
    setPlatformAdminMode(true);
    setStep("credentials");
  };

  const handleOAuthLogin = async () => {
    setOauthLoading(true);
    clearError();
    try {
      await loginWithOAuth();
    } catch (err: any) {
      setErrorMsg(err.message || "Microsoft sign-in failed. Please try again.");
      setOauthLoading(false);
    }
  };

  const showTenantStep = isLocalAuthEnabled && step === "tenant" && !platformAdminMode;
  const tenantHeading = tenant?.name || tenantSlug;

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 via-white to-primary-50 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-14 h-14 bg-primary-600 rounded-xl shadow-sm mb-3">
            <Sprout className="w-7 h-7 text-white" />
          </div>
          <h1 className="text-lg font-bold text-gray-800 leading-tight">{shopConfig.name}</h1>
          <p className="text-primary-600 text-xs font-medium mt-0.5">{shopConfig.nameLocal}</p>
          <p className="text-[11px] text-gray-400 mt-1">{shopConfig.taglineLocal}</p>
          <div className="flex items-center justify-center gap-1 text-[11px] text-gray-400 mt-2">
            <Phone className="w-3 h-3 flex-shrink-0" /> {shopConfig.phone}
          </div>
          <div className="flex items-center justify-center gap-1 text-[10px] text-gray-400 mt-0.5 px-4">
            <MapPin className="w-3 h-3 flex-shrink-0" /> {shopConfig.district}
          </div>
        </div>

        <div className="relative">
          <form
            onSubmit={showTenantStep ? handleTenantSubmit : handleSubmit}
            className="bg-white rounded-lg shadow-lg shadow-gray-200/50 p-6 space-y-4"
          >
            {isLocalAuthEnabled && (
              <h2 className="text-sm font-semibold text-gray-700 text-center">
                {showTenantStep ? "Enter your shop code" : t.loginTitle}
              </h2>
            )}

            {errorMsg && (
              <div
                role="alert"
                aria-live="polite"
                className="flex items-start gap-2 px-3 py-2 rounded-md border border-red-200 bg-red-50 text-red-700 text-xs"
              >
                <span className="flex-1">{errorMsg}</span>
                <button
                  type="button"
                  onClick={() => setErrorMsg(null)}
                  aria-label="Dismiss"
                  className="text-red-400 hover:text-red-600 leading-none"
                >
                  ×
                </button>
              </div>
            )}

            {isLocalAuthEnabled && showTenantStep && (
              <>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Shop Code (slug)</label>
                  <input
                    type="text"
                    value={tenantSlug}
                    onChange={(e) => {
                      setTenantSlug(e.target.value);
                      clearError();
                    }}
                    className="w-full px-3 py-2 rounded-md border border-gray-200 focus:ring-1 focus:ring-primary-500 focus:border-primary-500 text-sm outline-none transition"
                    placeholder="sri-sai-agro"
                    required
                    autoFocus
                  />
                </div>

                {recentTenants.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-[11px] font-medium text-gray-500 uppercase tracking-wide">Recent shops</p>
                    <div className="flex flex-wrap gap-2">
                      {recentTenants.map((recentSlug) => (
                        <button
                          key={recentSlug}
                          type="button"
                          onClick={() => handleTenantLookup(recentSlug)}
                          disabled={lookupLoading}
                          className="px-3 py-1.5 rounded-full border border-gray-200 text-xs text-gray-700 hover:border-primary-500 hover:text-primary-700 transition disabled:opacity-60"
                        >
                          {recentSlug}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={lookupLoading}
                  className="w-full py-2 bg-primary-600 text-white text-sm font-medium rounded-md hover:bg-primary-700 active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
                >
                  {lookupLoading ? "..." : "Continue"}
                </button>

                <button
                  type="button"
                  onClick={handlePlatformAdmin}
                  className="w-full text-xs font-medium text-primary-700 hover:text-primary-800"
                >
                  Login as Platform Admin
                </button>
              </>
            )}

            {isLocalAuthEnabled && !showTenantStep && (
              <>
                <div className="rounded-lg border border-primary-100 bg-primary-50 px-3 py-2 text-sm text-primary-800">
                  <div className="flex items-center gap-2 font-medium">
                    <Building2 className="w-4 h-4" />
                    {platformAdminMode ? "Platform Admin Login" : `Logging into: ${tenantHeading}`}
                  </div>
                  {!platformAdminMode && tenant?.slug && (
                    <div className="text-xs text-primary-700 mt-1">{tenant.slug}</div>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">{t.username}</label>
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => {
                      setUsername(e.target.value);
                      clearError();
                    }}
                    className="w-full px-3 py-2 rounded-md border border-gray-200 focus:ring-1 focus:ring-primary-500 focus:border-primary-500 text-sm outline-none transition"
                    placeholder="admin"
                    required
                    autoFocus
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">{t.password}</label>
                  <div className="relative">
                    <input
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => {
                        setPassword(e.target.value);
                        clearError();
                      }}
                      className="w-full px-3 py-2 rounded-md border border-gray-200 focus:ring-1 focus:ring-primary-500 focus:border-primary-500 text-sm outline-none transition pr-10"
                      placeholder="••••••"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={handleBack}
                    className="flex-1 py-2 border border-gray-200 text-gray-700 text-sm font-medium rounded-md hover:bg-gray-50 transition"
                  >
                    Back
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="flex-1 py-2 bg-primary-600 text-white text-sm font-medium rounded-md hover:bg-primary-700 active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
                  >
                    {loading ? "..." : t.loginButton}
                  </button>
                </div>
              </>
            )}

            {isOAuthAvailable && (
              <>
                {isLocalAuthEnabled && (
                  <div className="relative">
                    <div className="absolute inset-0 flex items-center">
                      <div className="w-full border-t border-gray-200" />
                    </div>
                    <div className="relative flex justify-center text-xs">
                      <span className="px-2 bg-white text-gray-400 uppercase tracking-wide">or</span>
                    </div>
                  </div>
                )}
                <button
                  type="button"
                  onClick={handleOAuthLogin}
                  disabled={oauthLoading}
                  className={
                    isLocalAuthEnabled
                      ? "w-full flex items-center justify-center gap-2 py-2.5 bg-white border border-gray-300 text-gray-700 text-sm font-medium rounded-md hover:bg-gray-50 hover:border-primary-500 hover:text-primary-700 active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                      : "w-full flex items-center justify-center gap-2 py-2.5 bg-primary-600 text-white text-sm font-medium rounded-md hover:bg-primary-700 active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
                  }
                >
                  <Shield className={`w-4 h-4 ${isLocalAuthEnabled ? "text-primary-600" : ""}`} />
                  {oauthLoading ? "Signing in..." : "Login with Microsoft"}
                </button>
              </>
            )}
          </form>
        </div>

        {isLocalAuthEnabled && (
          <p className="text-center text-[11px] text-gray-400 mt-4">
            Default: admin / admin123
          </p>
        )}
      </div>
    </div>
  );
}
