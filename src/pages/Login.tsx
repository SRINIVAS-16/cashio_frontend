import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Sprout, Eye, EyeOff, Phone, MapPin } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useLang } from "../context/LanguageContext";
import { useShopConfig } from "../context/ShopConfigContext";
import toast from "react-hot-toast";

const RECENT_TENANT_CODES_KEY = "cashio-recent-tenant-codes";

function readRecentTenantCodes(): string[] {
  try {
    const parsed = JSON.parse(localStorage.getItem(RECENT_TENANT_CODES_KEY) || "[]");
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((value): value is string => typeof value === "string" && value.trim().length > 0).slice(0, 5);
  } catch {
    return [];
  }
}

function saveRecentTenantCode(code: string): string[] {
  const normalized = code.trim().toLowerCase();
  if (!normalized) return readRecentTenantCodes();
  const next = [normalized, ...readRecentTenantCodes().filter((value) => value !== normalized)].slice(0, 5);
  localStorage.setItem(RECENT_TENANT_CODES_KEY, JSON.stringify(next));
  return next;
}

function normalizeTenantCode(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return "";
  return trimmed.toUpperCase() === "PLATFORM" ? "PLATFORM" : trimmed.toLowerCase();
}

export default function Login() {
  const { user, isLoading: authLoading, login } = useAuth();
  const { t } = useLang();
  const { shop: shopConfig } = useShopConfig();
  const navigate = useNavigate();
  const loginSuccessPendingRef = useRef(false);
  const [tenantCode, setTenantCode] = useState("");
  const [recentTenantCodes, setRecentTenantCodes] = useState<string[]>(() => readRecentTenantCodes());
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const normalizedTenantCode = normalizeTenantCode(tenantCode);
    if (!normalizedTenantCode) {
      setErrorMsg("Tenant code is required.");
      return;
    }

    setLoading(true);
    clearError();
    loginSuccessPendingRef.current = true;

    try {
      await login(normalizedTenantCode, username, password);
      setTenantCode(normalizedTenantCode);
      if (normalizedTenantCode !== "PLATFORM") {
        setRecentTenantCodes(saveRecentTenantCode(normalizedTenantCode));
      }
    } catch (err: any) {
      loginSuccessPendingRef.current = false;
      const status = err.response?.status;
      const serverMsg = err.response?.data?.error;
      const friendly =
        status === 401 || status === 400
          ? "Incorrect tenant code, username, or password. Please try again."
          : serverMsg || "Login failed. Please try again.";
      setErrorMsg(friendly);
    } finally {
      setLoading(false);
    }
  };

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

        <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-lg shadow-gray-200/50 p-6 space-y-4">
          <h2 className="text-sm font-semibold text-gray-700 text-center">{t.loginTitle}</h2>

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

          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Tenant Code</label>
            <input
              type="text"
              value={tenantCode}
              onChange={(e) => {
                setTenantCode(e.target.value);
                clearError();
              }}
              className="w-full px-3 py-2 rounded-md border border-gray-200 focus:ring-1 focus:ring-primary-500 focus:border-primary-500 text-sm outline-none transition"
              placeholder="Tenant Code"
              required
              autoFocus
            />
          </div>

          {recentTenantCodes.length > 0 && (
            <div className="space-y-2">
              <p className="text-[11px] font-medium text-gray-500 uppercase tracking-wide">Recent tenant codes</p>
              <div className="flex flex-wrap gap-2">
                {recentTenantCodes.map((recentCode) => (
                  <button
                    key={recentCode}
                    type="button"
                    onClick={() => {
                      setTenantCode(recentCode);
                      clearError();
                    }}
                    className="px-3 py-1.5 rounded-full border border-gray-200 text-xs text-gray-700 hover:border-primary-500 hover:text-primary-700 transition"
                  >
                    {recentCode}
                  </button>
                ))}
              </div>
            </div>
          )}

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
              placeholder="Username"
              required
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
                placeholder="Password"
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

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2 bg-primary-600 text-white text-sm font-medium rounded-md hover:bg-primary-700 active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
          >
            {loading ? "..." : "Login"}
          </button>

          <p className="text-xs text-gray-400 mt-2 text-center">Platform admin? Use code: PLATFORM</p>
        </form>
      </div>
    </div>
  );
}
