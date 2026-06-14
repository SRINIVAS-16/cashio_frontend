import { useState } from "react";
import { NavLink, Outlet } from "react-router-dom";
import { BarChart3, Building2, LogOut, Menu, Shield, Sprout, X, type LucideIcon } from "lucide-react";
import { useAuth } from "../context/AuthContext";

const navItems: { to: string; label: string; icon: LucideIcon; end?: boolean }[] = [
  { to: "/super-admin", label: "Dashboard", icon: BarChart3, end: true },
  { to: "/super-admin/tenants", label: "Manage Tenants", icon: Building2 },
];

export default function SuperAdminLayout() {
  const { user, logout } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const linkClasses = ({ isActive }: { isActive: boolean }) =>
    `flex items-center gap-3 rounded-lg border-l-2 px-3 py-2 text-sm transition-all backdrop-blur-md ${
      isActive
        ? "border-primary-400 bg-white/10 text-white font-medium shadow-lg shadow-slate-950/10"
        : "border-transparent text-white/60 hover:bg-white/10 hover:text-white"
    }`;

  return (
    <div className="min-h-screen bg-slate-50 lg:flex">
      {sidebarOpen && <div className="fixed inset-0 z-40 bg-slate-950/60 backdrop-blur-sm lg:hidden" onClick={() => setSidebarOpen(false)} />}

      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-72 flex-col border-r border-white/10 bg-gradient-to-b from-slate-900 via-slate-800 to-primary-900 shadow-2xl shadow-slate-950/40 transition-transform ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        } lg:static lg:translate-x-0`}
      >
        <div className="border-b border-white/10 px-5 py-4">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-primary-500 to-primary-700 shadow-lg shadow-primary-900/40 text-white">
                <Sprout className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] uppercase tracking-wider text-white/40">Platform</p>
                <h1 className="truncate text-sm font-semibold text-white">Admin Console</h1>
                <p className="mt-0.5 text-[10px] text-white/50">Secure multi-tenant control</p>
              </div>
            </div>
            <button
              type="button"
              className="rounded-lg p-2 text-white/60 transition hover:bg-white/10 hover:text-white lg:hidden"
              onClick={() => setSidebarOpen(false)}
              aria-label="Close navigation"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        <div className="flex flex-1 flex-col justify-between px-4 py-4">
          <div>
            <p className="px-3 text-[10px] uppercase tracking-wider text-white/40">Navigation</p>
            <nav className="mt-3 space-y-1.5">
              {navItems.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.end}
                  className={linkClasses}
                  onClick={() => setSidebarOpen(false)}
                >
                  <item.icon className="h-4 w-4" />
                  <span>{item.label}</span>
                </NavLink>
              ))}
            </nav>
          </div>

          <div className="space-y-3 border-t border-white/10 pt-4">
            {user && (
              <div className="rounded-2xl border border-white/10 bg-white/10 p-4 shadow-lg shadow-slate-950/10 backdrop-blur-xl">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary-500/20 text-primary-300">
                    <Shield className="h-4 w-4" />
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-white">{user.name || user.username || "Platform Admin"}</p>
                    <p className="text-[10px] uppercase tracking-wider text-white/50">{user.role}</p>
                  </div>
                </div>
              </div>
            )}

            <button
              type="button"
              onClick={logout}
              className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-white/60 transition hover:bg-white/10 hover:text-white"
            >
              <LogOut className="h-4 w-4" />
              <span>Logout</span>
            </button>
          </div>
        </div>
      </aside>

      <div className="flex min-h-screen flex-1 flex-col bg-slate-50">
        <header className="sticky top-0 z-30 bg-slate-50/80 px-4 py-3 backdrop-blur lg:hidden">
          <div className="flex items-center">
            <button
              type="button"
              className="rounded-lg border border-slate-200 bg-white/80 p-2 text-slate-700 shadow-sm transition hover:bg-white"
              onClick={() => setSidebarOpen(true)}
              aria-label="Open navigation"
            >
              <Menu className="h-5 w-5" />
            </button>
          </div>
        </header>

        <main className="flex-1 bg-slate-50 p-4 sm:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
