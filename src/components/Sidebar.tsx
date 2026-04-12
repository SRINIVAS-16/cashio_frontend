// ─── Sidebar Navigation ──────────────────────────────────────────
import { NavLink } from "react-router-dom";
import {
  LayoutDashboard,
  Package,
  Users,
  Receipt,
  ShoppingCart,
  Truck,
  Store,
  LogOut,
  Languages,
  X,
  Settings2,
  BookOpen,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useLang } from "../context/LanguageContext";
import { shopConfig } from "../config/shopConfig";

interface SidebarProps {
  open: boolean;
  onClose: () => void;
}

export default function Sidebar({ open, onClose }: SidebarProps) {
  const { user, logout } = useAuth();
  const { t, lang, toggleLang } = useLang();

  const navItems = [
    { to: "/", icon: LayoutDashboard, label: t.dashboard },
    { to: "/products", icon: Package, label: t.products },
    { to: "/customers", icon: Users, label: t.customers },
    { to: "/billing", icon: ShoppingCart, label: t.billing },
    { to: "/orders", icon: Receipt, label: t.orders },
    { to: "/purchases", icon: Truck, label: t.purchases || "Purchases" },
    { to: "/dealers", icon: Store, label: t.dealers || "Dealers" },
    { to: "/stock-book", icon: BookOpen, label: t.stockBook || "Stock Book" },
    { to: "/custom-fields", icon: Settings2, label: t.customFields || "Custom Fields" },
  ];

  const linkClasses = ({ isActive }: { isActive: boolean }) =>
    `flex items-center gap-2.5 px-3 py-2 rounded-md text-sm font-medium transition-all ${
      isActive
        ? "bg-primary-600 text-white shadow-sm"
        : "text-gray-600 hover:bg-primary-50 hover:text-primary-700"
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
        <div className="p-3 border-b border-gray-100">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5 min-w-0">
              <img
                src={shopConfig.logo}
                alt="Logo"
                className="w-8 h-8 rounded-md flex-shrink-0"
              />
              <div className="min-w-0">
                <h1 className="text-xs font-bold text-primary-800 leading-tight">
                  {lang === "te" ? shopConfig.nameTe : shopConfig.name}
                </h1>
                <p className="text-[9px] text-gray-400 truncate">{shopConfig.phone}</p>
              </div>
            </div>
            <button onClick={onClose} className="lg:hidden p-1 text-gray-400 hover:text-gray-600">
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
          {/* Language Toggle */}
          <button
            onClick={toggleLang}
            className="flex items-center gap-2.5 px-3 py-2 rounded-md text-sm font-medium text-gray-600 hover:bg-blue-50 hover:text-blue-700 w-full transition-all"
          >
            <Languages className="w-4 h-4" />
            <span>{lang === "en" ? "తెలుగు" : "English"}</span>
          </button>

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
