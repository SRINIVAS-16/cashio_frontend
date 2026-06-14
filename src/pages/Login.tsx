// ─── Login Page (Username/Password + OAuth 2.0) ─────────────────
import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Sprout, Eye, EyeOff, Phone, MapPin, Shield, Building2 } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useLang } from "../context/LanguageContext";
import { useShopConfig } from "../context/ShopConfigContext";
import { isLocalAuthEnabled } from "../config/authConfig";
import toast from "react-hot-toast";

export default function Login() {
  const { user, isLoading: authLoading, pendingLogin, login, selectTenant, loginWithOAuth, isOAuthAvailable } = useAuth();
  const { t } = useLang();
  const { shop: shopConfig } = useShopConfig();
  const navigate = useNavigate();
  const loginSuccessPendingRef = useRef(false);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [oauthLoading, setOauthLoading] = useState(false);
  const [selectingTenantId, setSelectingTenantId] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // If already authenticated (e.g. after OAuth redirect callback resolves),
  // navigate to the dashboard. Without this the page would stay on /login
  // even though /auth/me + /auth/permissions succeeded.
  useEffect(() => {
    if (!authLoading && user) {
      if (loginSuccessPendingRef.current) {
        toast.success(t.welcomeBack);
        loginSuccessPendingRef.current = false;
      }
      navigate(user.role === "superadmin" ? "/super-admin" : "/", { replace: true });
    }
  }, [authLoading, user, navigate, t]);

  // Don't render the login form while auth is still loading or when the user
  // is already signed in — prevents the form from flashing for a frame after
  // a successful OAuth redirect, before the navigate effect fires.
  if (authLoading || user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg(null);
    loginSuccessPendingRef.current = true;
    try {
      await login(username, password);
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

  const handleTenantSelection = async (tenantId: string) => {
    setSelectingTenantId(tenantId);
    setErrorMsg(null);
    loginSuccessPendingRef.current = true;
    try {
      await selectTenant(tenantId);
    } catch (err: any) {
      loginSuccessPendingRef.current = false;
      const status = err.response?.status;
      const serverMsg = err.response?.data?.error;
      const friendly =
        status === 401 || status === 400
          ? "Incorrect username or password. Please try again."
          : serverMsg || "Tenant login failed. Please try again.";
      setErrorMsg(friendly);
    } finally {
      setSelectingTenantId(null);
    }
  };

  const handleOAuthLogin = async () => {
    setOauthLoading(true);
    setErrorMsg(null);
    try {
      await loginWithOAuth();
      // loginWithOAuth redirects the browser — code below only runs on error
    } catch (err: any) {
      setErrorMsg(err.message || "Microsoft sign-in failed. Please try again.");
      setOauthLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 via-white to-primary-50 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        {/* Logo & Shop Details */}
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

        {/* Login Form */}
        <div className="relative">
          <form
            onSubmit={handleSubmit}
            className="bg-white rounded-lg shadow-lg shadow-gray-200/50 p-6 space-y-4"
          >
            {isLocalAuthEnabled && (
              <h2 className="text-sm font-semibold text-gray-700 text-center">{t.loginTitle}</h2>
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

            {isLocalAuthEnabled && (
              <>
                {/* Username */}
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">{t.username}</label>
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => { setUsername(e.target.value); if (errorMsg) setErrorMsg(null); }}
                    className="w-full px-3 py-2 rounded-md border border-gray-200 focus:ring-1 focus:ring-primary-500 focus:border-primary-500 text-sm outline-none transition"
                    placeholder="admin"
                    required
                    autoFocus
                  />
                </div>

                {/* Password */}
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">{t.password}</label>
                  <div className="relative">
                    <input
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => { setPassword(e.target.value); if (errorMsg) setErrorMsg(null); }}
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

                {/* Submit */}
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-2 bg-primary-600 text-white text-sm font-medium rounded-md hover:bg-primary-700 active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
                >
                  {loading ? "..." : t.loginButton}
                </button>
              </>
            )}

            {/* OAuth Login Button */}
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

          {pendingLogin && (
            <div className="absolute inset-0 rounded-lg bg-white/95 backdrop-blur-sm border border-primary-100 shadow-lg p-5 flex flex-col gap-3">
              <div className="text-center">
                <div className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-primary-50 text-primary-600 mb-2">
                  <Building2 className="w-5 h-5" />
                </div>
                <h3 className="text-sm font-semibold text-gray-800">Select your tenant</h3>
                <p className="text-xs text-gray-500 mt-1">This account is linked to multiple tenants.</p>
              </div>
              <div className="space-y-2 overflow-y-auto">
                {pendingLogin.tenants.map((tenant) => (
                  <button
                    key={tenant.tenantId}
                    type="button"
                    onClick={() => handleTenantSelection(tenant.tenantId)}
                    disabled={!!selectingTenantId}
                    className="w-full text-left rounded-lg border border-gray-200 bg-white px-4 py-3 hover:border-primary-500 hover:bg-primary-50 transition disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <div className="text-sm font-medium text-gray-800">{tenant.tenantName}</div>
                        <div className="text-xs text-gray-500">{tenant.tenantSlug}</div>
                      </div>
                      <span className="text-[11px] font-semibold uppercase tracking-wide text-primary-700 bg-primary-100 px-2 py-1 rounded-full">
                        {tenant.role}
                      </span>
                    </div>
                    {selectingTenantId === tenant.tenantId && (
                      <div className="text-xs text-primary-600 mt-2">Signing in...</div>
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}
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
