import { useState } from "react";
import { NavLink, Outlet } from "react-router-dom";
import { BarChart3, Building2, LogOut, Menu, Shield, X } from "lucide-react";
import { useAuth } from "../context/AuthContext";

const navItems = [
  { to: "/super-admin", label: "Dashboard", icon: BarChart3, end: true },
  { to: "/super-admin/tenants", label: "Manage Tenants", icon: Building2 },
];

export default function SuperAdminLayout() {
  const { user, logout } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const linkClasses = ({ isActive }: { isActive: boolean }) =>
    `flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition ${
      isActive
        ? "bg-primary-50 text-primary-700"
        : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
    }`;

  return (
    <div className="min-h-screen bg-gray-50 lg:flex">
      {sidebarOpen && (
        <div className="fixed inset-0 z-40 bg-black/40 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-50 w-72 border-r border-gray-200 bg-white transition-transform lg:static lg:translate-x-0 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-600 text-white">
              <Shield className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary-600">Platform</p>
              <h1 className="text-sm font-bold text-gray-900">Admin Console</h1>
            </div>
          </div>
          <button
            type="button"
            className="rounded-md p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600 lg:hidden"
            onClick={() => setSidebarOpen(false)}
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex h-[calc(100%-73px)] flex-col justify-between p-4">
          <nav className="space-y-2">
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

          <button
            type="button"
            onClick={logout}
            className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-red-600 transition hover:bg-red-50"
          >
            <LogOut className="h-4 w-4" />
            <span>Logout</span>
          </button>
        </div>
      </aside>

      <div className="flex min-h-screen flex-1 flex-col">
        <header className="sticky top-0 z-30 border-b border-gray-200 bg-white/95 backdrop-blur">
          <div className="flex items-center justify-between px-4 py-3 sm:px-6">
            <div className="flex items-center gap-3">
              <button
                type="button"
                className="rounded-md p-2 text-gray-500 hover:bg-gray-100 lg:hidden"
                onClick={() => setSidebarOpen(true)}
              >
                <Menu className="h-5 w-5" />
              </button>
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Platform Admin</h2>
                <p className="text-sm text-gray-500">Manage tenants across the platform</p>
              </div>
            </div>

            <div className="rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-right">
              <p className="text-xs font-medium uppercase tracking-wide text-gray-500">Signed in as</p>
              <p className="text-sm font-semibold text-gray-800">{user?.name || user?.username}</p>
            </div>
          </div>
        </header>

        <main className="flex-1 p-4 sm:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
