// ─── Sidebar Navigation (Permission-Aware) ──────────────────────
import { useState, useRef, useEffect } from "react";
import { NavLink, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  Package,
  Users,
  UserCog,
  Receipt,
  ShoppingCart,
  Truck,
  Store,
  LogOut,
  Languages,
  X,
  Settings2,
  Sliders,
  Shield,
  BookOpen,
  ChevronDown,
  Check,
  ChevronUp,
  Sprout,
  TrendingUp,
  type LucideIcon,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { usePermissions } from "../context/PermissionContext";
import { useLang } from "../context/LanguageContext";
import { useShopConfig } from "../context/ShopConfigContext";

interface SidebarProps {
  open: boolean;
  onClose: () => void;
}

export default function Sidebar({ open, onClose }: SidebarProps) {
  const { user, logout } = useAuth();
  const { hasPermission } = usePermissions();
  const { t, lang, setLang, languages } = useLang();
  const { shop: shopConfig } = useShopConfig();
  const location = useLocation();
  const [langOpen, setLangOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const langRef = useRef<HTMLDivElement>(null);

  const profileSubItems: { to: string; icon: LucideIcon; label: string; permission: string }[] = [
    { to: "/custom-fields", icon: Settings2, label: t.customFields || "Custom Fields", permission: "custom-fields" },
    { to: "/users", icon: UserCog, label: "Users", permission: "users" },
    { to: "/role-permissions", icon: Shield, label: "Role Permissions", permission: "roles" },
    { to: "/settings", icon: Sliders, label: t.settings || "Settings", permission: "settings" },
  ];
  const visibleProfileSubItems = profileSubItems.filter((item) => hasPermission(item.permission));
  const isProfileRouteActive = visibleProfileSubItems.some((item) => location.pathname.startsWith(item.to));

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (langRef.current && !langRef.current.contains(e.target as Node)) setLangOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const currentLang = languages.find((item) => item.code === lang);

  const allNavItems: { to: string; icon: LucideIcon; label: string; permission: string }[] = [
    { to: "/", icon: LayoutDashboard, label: t.dashboard, permission: "dashboard" },
    { to: "/profit-loss", icon: TrendingUp, label: t.profitLoss, permission: "dashboard" },
    { to: "/billing", icon: ShoppingCart, label: t.billing, permission: "billing" },
    { to: "/stock-book", icon: BookOpen, label: t.stockBook || "Stock Book", permission: "stock-book" },
    { to: "/orders", icon: Receipt, label: t.orders, permission: "orders" },
    { to: "/purchases", icon: Truck, label: t.purchases || "Purchases", permission: "purchases" },
    { to: "/customers", icon: Users, label: t.customers, permission: "customers" },
    { to: "/dealers", icon: Store, label: t.dealers || "Dealers", permission: "dealers" },
    { to: "/products", icon: Package, label: t.products, permission: "products" },
  ];
  const navItems = allNavItems.filter((item) => hasPermission(item.permission));

  const linkClasses = ({ isActive }: { isActive: boolean }) =>
    `flex items-center gap-2.5 rounded-lg border-l-2 px-3 py-2 text-sm transition-all backdrop-blur-md ${
      isActive
        ? "border-primary-400 bg-white/10 text-white font-medium shadow-lg shadow-slate-950/10"
        : "border-transparent text-white/60 hover:bg-white/10 hover:text-white"
    }`;

  const subLinkClasses = ({ isActive }: { isActive: boolean }) =>
    `flex items-center gap-2.5 rounded-lg px-3 py-2 pl-10 text-[13px] transition-all backdrop-blur-md ${
      isActive
        ? "bg-white/10 text-white font-medium"
        : "text-white/55 hover:bg-white/10 hover:text-white"
    }`;

  return (
    <>
      {open && <div className="fixed inset-0 z-40 bg-slate-950/60 backdrop-blur-sm lg:hidden" onClick={onClose} />}

      <aside
        className={`fixed left-0 top-0 z-50 flex h-screen w-64 flex-col border-r border-white/10 bg-gradient-to-b from-slate-900 via-slate-800 to-primary-900 shadow-2xl shadow-slate-950/40 transition-transform duration-300 overflow-y-auto ${
          open ? "translate-x-0" : "-translate-x-full"
        } lg:translate-x-0`}
      >
        <div className="border-b border-white/10 px-4 py-4">
          <div className="flex items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-3">
              <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-primary-500 to-primary-700 shadow-lg shadow-primary-900/40">
                <Sprout className="h-5 w-5 text-white" />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] uppercase tracking-wider text-white/40">Cashio Workspace</p>
                <h1 className="truncate text-sm font-semibold text-white leading-tight">
                  {lang !== "en" && shopConfig.nameLocal ? shopConfig.nameLocal : shopConfig.name}
                </h1>
                <p className="mt-0.5 truncate text-[10px] text-white/50">{shopConfig.phone}</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="rounded-lg p-2 text-white/60 transition hover:bg-white/10 hover:text-white lg:hidden"
              aria-label="Close navigation"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-3 py-4">
          <p className="px-3 text-[10px] uppercase tracking-wider text-white/40">Navigation</p>
          <nav className="mt-3 space-y-1.5">
            {navItems.map((item) => (
              <NavLink key={item.to} to={item.to} className={linkClasses} onClick={onClose} end={item.to === "/"}>
                <item.icon className="h-4 w-4 flex-shrink-0" />
                <span>{item.label}</span>
              </NavLink>
            ))}
          </nav>
        </div>

        <div className="border-t border-white/10 px-3 py-4 space-y-3">
          <p className="px-3 text-[10px] uppercase tracking-wider text-white/40">Account</p>

          {user && (
            <div className="rounded-2xl border border-white/10 bg-white/10 p-1.5 shadow-lg shadow-slate-950/10 backdrop-blur-xl">
              <button
                onClick={() => setProfileOpen((value) => !value)}
                className={`flex w-full items-center gap-2 rounded-xl px-2.5 py-1.5 text-left transition-all ${
                  isProfileRouteActive ? "bg-white/10 text-white" : "text-white/70 hover:bg-white/10 hover:text-white"
                }`}
              >
                <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-primary-500/20 text-xs font-semibold uppercase text-primary-300">
                  {(user.name || user.username || "?").charAt(0)}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-medium text-white">{user.name || user.username}</p>
                  <span className="text-[9px] uppercase tracking-wider text-white/50">{user.role}</span>
                </div>
                {visibleProfileSubItems.length > 0 && (
                  profileOpen ? <ChevronUp className="h-3.5 w-3.5 flex-shrink-0 text-white/50" /> : <ChevronDown className="h-3.5 w-3.5 flex-shrink-0 text-white/50" />
                )}
              </button>

              {profileOpen && visibleProfileSubItems.length > 0 && (
                <div className="mt-1 space-y-1 px-1 pb-1">
                  {visibleProfileSubItems.map((item) => (
                    <NavLink key={item.to} to={item.to} className={subLinkClasses} onClick={onClose}>
                      <item.icon className="h-3.5 w-3.5 flex-shrink-0" />
                      <span>{item.label}</span>
                    </NavLink>
                  ))}
                </div>
              )}
            </div>
          )}

          <div className="relative" ref={langRef}>
            <button
              onClick={() => setLangOpen((value) => !value)}
              className="flex w-full items-center gap-2.5 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white/60 transition-all backdrop-blur-md hover:bg-white/10 hover:text-white"
            >
              <Languages className="h-4 w-4" />
              <span className="flex-1 text-left">{currentLang?.name || "English"}</span>
              <ChevronDown className={`h-3.5 w-3.5 text-white/50 transition-transform ${langOpen ? "rotate-180" : ""}`} />
            </button>
            {langOpen && (
              <div className="absolute bottom-full left-0 right-0 z-50 mb-2 max-h-64 overflow-y-auto rounded-2xl border border-white/10 bg-slate-900/95 p-1.5 shadow-2xl shadow-slate-950/40 backdrop-blur-xl">
                {languages.map((item) => (
                  <button
                    key={item.code}
                    onClick={() => {
                      setLang(item.code);
                      setLangOpen(false);
                    }}
                    className={`flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-left text-sm transition-colors ${
                      item.code === lang ? "bg-white/10 text-white font-medium" : "text-white/65 hover:bg-white/10 hover:text-white"
                    }`}
                  >
                    <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-md bg-white/10 text-xs font-bold text-white/75">
                      {item.script}
                    </span>
                    <span className="flex-1">{item.name}</span>
                    <span className="text-[10px] text-white/35">{item.nameEn}</span>
                    {item.code === lang && <Check className="h-3.5 w-3.5 flex-shrink-0 text-primary-300" />}
                  </button>
                ))}
              </div>
            )}
          </div>

          <button
            onClick={logout}
            className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-white/60 transition-all hover:bg-white/10 hover:text-white"
          >
            <LogOut className="h-4 w-4" />
            <span>{t.logout}</span>
          </button>
        </div>
      </aside>
    </>
  );
}
