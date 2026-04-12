// ─── Login Page ──────────────────────────────────────────────────
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Sprout, Eye, EyeOff, Phone, MapPin } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useLang } from "../context/LanguageContext";
import { shopConfig } from "../config/shopConfig";
import toast from "react-hot-toast";

export default function Login() {
  const { login } = useAuth();
  const { t } = useLang();
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await login(username, password);
      toast.success(t.welcomeBack);
      navigate("/");
    } catch (err: any) {
      toast.error(err.response?.data?.error || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 via-white to-blue-50 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        {/* Logo & Shop Details */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-14 h-14 bg-primary-600 rounded-xl shadow-sm mb-3">
            <Sprout className="w-7 h-7 text-white" />
          </div>
          <h1 className="text-lg font-bold text-gray-800 leading-tight">{shopConfig.name}</h1>
          <p className="text-primary-600 text-xs font-medium mt-0.5">{shopConfig.nameTe}</p>
          <p className="text-[11px] text-gray-400 mt-1">{shopConfig.taglineTe}</p>
          <div className="flex items-center justify-center gap-1 text-[11px] text-gray-400 mt-2">
            <Phone className="w-3 h-3 flex-shrink-0" /> {shopConfig.phone}
          </div>
          <div className="flex items-center justify-center gap-1 text-[10px] text-gray-400 mt-0.5 px-4">
            <MapPin className="w-3 h-3 flex-shrink-0" /> {shopConfig.district}
          </div>
        </div>

        {/* Login Form */}
        <form
          onSubmit={handleSubmit}
          className="bg-white rounded-lg shadow-lg shadow-gray-200/50 p-6 space-y-4"
        >
          <h2 className="text-sm font-semibold text-gray-700 text-center">{t.loginTitle}</h2>

          {/* Username */}
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">{t.username}</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
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
                onChange={(e) => setPassword(e.target.value)}
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
        </form>

        <p className="text-center text-[11px] text-gray-400 mt-4">
          Default: admin / admin123
        </p>
      </div>
    </div>
  );
}
