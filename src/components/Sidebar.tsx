// ─── Sidebar Navigation (Permission-Aware) ──────────────────────
import { useState, useRef, useEffect } from "react";
import { NavLink } from "react-router-dom";
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
  const [langOpen, setLangOpen] = useState(false);
  const langRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (langRef.current && !langRef.current.contains(e.target as Node)) setLangOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const currentLang = languages.find((l) => l.code === lang);

  const allNavItems: { to: string; icon: any; label: string; permission: string }[] = [
    { to: "/", icon: LayoutDashboard, label: t.dashboard, permission: "dashboard" },
    { to: "/billing", icon: ShoppingCart, label: t.billing, permission: "billing" },
    { to: "/stock-book", icon: BookOpen, label: t.stockBook || "Stock Book", permission: "stock-book" },
    { to: "/orders", icon: Receipt, label: t.orders, permission: "orders" },
    { to: "/purchases", icon: Truck, label: t.purchases || "Purchases", permission: "purchases" },
    { to: "/customers", icon: Users, label: t.customers, permission: "customers" },
    { to: "/dealers", icon: Store, label: t.dealers || "Dealers", permission: "dealers" },
    { to: "/products", icon: Package, label: t.products, permission: "products" },
    { to: "/custom-fields", icon: Settings2, label: t.customFields || "Custom Fields", permission: "custom-fields" },
    { to: "/users", icon: UserCog, label: "Users", permission: "users" },
    { to: "/role-permissions", icon: Shield, label: "Role Permissions", permission: "roles" },
  ];

  // Filter nav items based on dynamic permissions
  const navItems = allNavItems.filter((item) => hasPermission(item.permission));

  const linkClasses = ({ isActive }: { isActive: boolean }) =>
    `flex items-center gap-2.5 px-3 py-2 rounded-md text-sm font-medium transition-all ${
      isActive
        ? "bg-primary-50 text-primary-700 border-l-[3px] border-primary-600"
        : "text-gray-600 hover:bg-gray-50 hover:text-gray-800 border-l-[3px] border-transparent"
    }`;

  return (
    <>
      {/* Mobile overlay */}
      {open && (
        <div className="fixed inset-0 bg-black/50 z-40 lg:hidden" onClick={onClose} />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed top-0 left-0 h-full w-64 bg-white border-r border-gray-200 z-50 flex flex-col transition-transform duration-300 ${
          open ? "translate-x-0" : "-translate-x-full"
        } lg:translate-x-0 lg:static lg:z-0`}
      >
        {/* Header - Shop branding */}
        <div className="px-3 py-3.5 bg-gradient-to-b from-primary-600 to-primary-700">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5 min-w-0">
              <img
                src={shopConfig.logo}
                alt="Logo"
                className="w-9 h-9 rounded-lg flex-shrink-0 shadow ring-2 ring-white/25"
              />
              <div className="min-w-0">
                <h1 className="text-[13px] font-bold text-white leading-tight tracking-tight">
                  {lang === "te" ? shopConfig.nameTe : shopConfig.name}
                </h1>
                <p className="text-[10px] text-primary-200 truncate mt-0.5">{shopConfig.phone}</p>
              </div>
            </div>
            <button onClick={onClose} className="lg:hidden p-1 text-primary-200 hover:text-white">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-2 space-y-0.5 overflow-y-auto">
          {navItems.map((item) => (
            <NavLink key={item.to} to={item.to} className={linkClasses} onClick={onClose} end={item.to === "/"}>
              <item.icon className="w-4 h-4 flex-shrink-0" />
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>

        {/* Footer */}
        <div className="p-2 border-t border-gray-100 space-y-0.5">
          {/* User role badge */}
          {user && (
            <div className="px-3 py-1.5 mb-0.5">
              <p className="text-xs text-gray-500 truncate">{user.name}</p>
              <span className="inline-block mt-0.5 px-1.5 py-0.5 text-[10px] font-semibold rounded bg-primary-50 text-primary-700 capitalize">
                {user.role}
              </span>
            </div>
          )}

          {/* Language Picker */}
          <div className="relative" ref={langRef}>
            <button
              onClick={() => setLangOpen((v) => !v)}
              className="flex items-center gap-2.5 px-3 py-2 rounded-md text-sm font-medium text-gray-600 hover:bg-primary-50 hover:text-primary-700 w-full transition-all"
            >
              <Languages className="w-4 h-4" />
              <span className="flex-1 text-left">{currentLang?.name || "English"}</span>
              <ChevronDown className={`w-3.5 h-3.5 text-gray-400 transition-transform ${langOpen ? "rotate-180" : ""}`} />
            </button>
            {langOpen && (
              <div className="absolute bottom-full left-0 right-0 mb-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-64 overflow-y-auto z-50">
                {languages.map((l) => (
                  <button
                    key={l.code}
                    onClick={() => { setLang(l.code); setLangOpen(false); }}
                    className={`flex items-center gap-2.5 w-full px-3 py-2 text-left text-sm transition-colors ${
                      l.code === lang
                        ? "bg-primary-50 text-primary-700 font-medium"
                        : "text-gray-600 hover:bg-gray-50"
                    }`}
                  >
                    <span className="w-6 h-6 rounded-md bg-gray-100 flex items-center justify-center text-xs font-bold text-gray-600 flex-shrink-0">
                      {l.script}
                    </span>
                    <span className="flex-1">{l.name}</span>
                    <span className="text-[10px] text-gray-400">{l.nameEn}</span>
                    {l.code === lang && <Check className="w-3.5 h-3.5 text-primary-600 flex-shrink-0" />}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Settings */}
          {hasPermission("settings") && (
            <NavLink to="/settings" className={linkClasses} onClick={onClose}>
              <Sliders className="w-4 h-4 flex-shrink-0" />
              <span>{t.settings || "Settings"}</span>
            </NavLink>
          )}

          {/* Logout */}
          <button
            onClick={logout}
            className="flex items-center gap-2.5 px-3 py-2 rounded-md text-sm font-medium text-red-600 hover:bg-red-50 w-full transition-all"
          >
            <LogOut className="w-4 h-4" />
            <span>{t.logout}</span>
          </button>
        </div>
      </aside>
    </>
  );
}
