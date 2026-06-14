import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Sprout, Eye, EyeOff } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useLang } from "../context/LanguageContext";
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
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-primary-900 flex items-center justify-center p-4">
      {/* Subtle background pattern */}
      <div className="absolute inset-0 bg-[url('data:image/svg+xml,%3Csvg%20width%3D%2260%22%20height%3D%2260%22%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%3E%3Cpath%20d%3D%22M0%200h60v60H0z%22%20fill%3D%22none%22%2F%3E%3Cpath%20d%3D%22M30%2030m-1%200a1%201%200%201%201%202%200a1%201%200%201%201-2%200%22%20fill%3D%22rgba(255%2C255%2C255%2C0.03)%22%2F%3E%3C%2Fsvg%3E')] opacity-50"></div>

      <div className="relative w-full max-w-md">
        {/* Glass card */}
        <div className="backdrop-blur-xl bg-white/10 border border-white/20 rounded-2xl shadow-2xl p-8 space-y-6">
          {/* Logo & branding */}
          <div className="text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-primary-500 to-primary-700 rounded-2xl shadow-lg shadow-primary-500/30 mb-4">
              <Sprout className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-xl font-bold text-white tracking-tight">Cashio</h1>
            <p className="text-sm text-white/60 mt-1">Shop Management Platform</p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {errorMsg && (
              <div
                role="alert"
                aria-live="polite"
                className="flex items-start gap-2 px-3 py-2.5 rounded-lg border border-red-400/30 bg-red-500/10 backdrop-blur text-red-200 text-xs"
              >
                <span className="flex-1">{errorMsg}</span>
                <button type="button" onClick={() => setErrorMsg(null)} aria-label="Dismiss" className="text-red-300 hover:text-red-100 leading-none">×</button>
              </div>
            )}

            <div>
              <label className="block text-xs font-medium text-white/70 mb-1.5">Tenant Code</label>
              <input
                type="text"
                value={tenantCode}
                onChange={(e) => { setTenantCode(e.target.value); clearError(); }}
                className="w-full px-4 py-2.5 rounded-lg bg-white/5 border border-white/10 text-white placeholder-white/30 focus:border-primary-400 focus:ring-1 focus:ring-primary-400/50 text-sm outline-none transition backdrop-blur"
                placeholder="Enter your shop code"
                required
                autoFocus
              />
            </div>

            {recentTenantCodes.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {recentTenantCodes.map((recentCode) => (
                  <button
                    key={recentCode}
                    type="button"
                    onClick={() => { setTenantCode(recentCode); clearError(); }}
                    className="px-2.5 py-1 rounded-full bg-white/5 border border-white/10 text-[11px] text-white/60 hover:bg-white/10 hover:text-white/90 hover:border-white/20 transition"
                  >
                    {recentCode}
                  </button>
                ))}
              </div>
            )}

            <div>
              <label className="block text-xs font-medium text-white/70 mb-1.5">{t.username}</label>
              <input
                type="text"
                value={username}
                onChange={(e) => { setUsername(e.target.value); clearError(); }}
                className="w-full px-4 py-2.5 rounded-lg bg-white/5 border border-white/10 text-white placeholder-white/30 focus:border-primary-400 focus:ring-1 focus:ring-primary-400/50 text-sm outline-none transition backdrop-blur"
                placeholder="Username"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-white/70 mb-1.5">{t.password}</label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => { setPassword(e.target.value); clearError(); }}
                  className="w-full px-4 py-2.5 rounded-lg bg-white/5 border border-white/10 text-white placeholder-white/30 focus:border-primary-400 focus:ring-1 focus:ring-primary-400/50 text-sm outline-none transition backdrop-blur pr-10"
                  placeholder="Password"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/70 transition"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 bg-gradient-to-r from-primary-500 to-primary-600 text-white text-sm font-semibold rounded-lg hover:from-primary-600 hover:to-primary-700 active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-primary-500/25"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  Signing in...
                </span>
              ) : "Sign In"}
            </button>
          </form>

          <p className="text-[11px] text-white/30 text-center">Platform admin? Use code: <span className="text-white/50 font-mono">PLATFORM</span></p>
        </div>

        {/* Footer */}
        <p className="text-center text-[10px] text-white/20 mt-4">Powered by Cashio • Secure Multi-Tenant Platform</p>
      </div>
    </div>
  );
}
