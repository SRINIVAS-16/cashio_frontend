import { useEffect, useMemo, useState } from "react";
import { BarChart3, Building2, CheckCircle2, Clock3, XCircle } from "lucide-react";
import toast from "react-hot-toast";
import { superAdminApi } from "../../api/client";

interface SuperAdminTenant {
  id: string;
  name: string;
  slug: string;
  plan: string;
  isActive: boolean;
  createdAt?: string;
  _count?: { users?: number };
}

function normalizeTenant(raw: any): SuperAdminTenant {
  return {
    id: raw.id,
    name: raw.name,
    slug: raw.slug,
    plan: raw.plan || "free",
    isActive: Boolean(raw.isActive),
    createdAt: raw.createdAt,
    _count: { users: raw._count?.users ?? 0 },
  };
}

export default function SuperAdminDashboard() {
  const [tenants, setTenants] = useState<SuperAdminTenant[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadTenants = async () => {
      setLoading(true);
      try {
        const res = await superAdminApi.getTenants();
        setTenants(Array.isArray(res.data) ? res.data.map(normalizeTenant) : []);
      } catch (err: any) {
        toast.error(err.response?.data?.error || "Failed to load tenant dashboard");
      } finally {
        setLoading(false);
      }
    };

    loadTenants();
  }, []);

  const stats = useMemo(() => {
    const active = tenants.filter((tenant) => tenant.isActive).length;
    const inactive = tenants.length - active;
    const planCounts = tenants.reduce(
      (acc, tenant) => {
        const plan = tenant.plan?.toLowerCase();
        if (plan === "basic" || plan === "pro") acc[plan] += 1;
        else acc.free += 1;
        return acc;
      },
      { free: 0, basic: 0, pro: 0 }
    );

    return {
      total: tenants.length,
      active,
      inactive,
      planCounts,
      recent: [...tenants]
        .sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime())
        .slice(0, 5),
    };
  }, [tenants]);

  const summaryCards = [
    {
      title: "Total Tenants",
      value: stats.total,
      icon: Building2,
      accent: "bg-primary-50 text-primary-600",
    },
    {
      title: "Active Tenants",
      value: stats.active,
      icon: CheckCircle2,
      accent: "bg-green-50 text-green-600",
    },
    {
      title: "Inactive Tenants",
      value: stats.inactive,
      icon: XCircle,
      accent: "bg-red-50 text-red-600",
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="rounded-xl bg-primary-50 p-3 text-primary-600">
          <BarChart3 className="h-6 w-6" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Super Admin Dashboard</h1>
          <p className="text-sm text-gray-500">Monitor tenant growth, status, and plan distribution.</p>
        </div>
      </div>

      {loading ? (
        <div className="flex h-64 items-center justify-center rounded-2xl border border-gray-200 bg-white">
          <div className="h-10 w-10 animate-spin rounded-full border-b-2 border-primary-600" />
        </div>
      ) : (
        <>
          <div className="grid gap-4 md:grid-cols-3">
            {summaryCards.map((card) => (
              <div key={card.title} className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-500">{card.title}</p>
                    <p className="mt-2 text-3xl font-bold text-gray-900">{card.value}</p>
                  </div>
                  <div className={`rounded-xl p-3 ${card.accent}`}>
                    <card.icon className="h-5 w-5" />
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="grid gap-6 xl:grid-cols-[1.1fr,0.9fr]">
            <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">Tenants by Plan</h2>
                  <p className="text-sm text-gray-500">Current subscription mix across all tenants.</p>
                </div>
                <div className="rounded-xl bg-primary-50 p-2 text-primary-600">
                  <Building2 className="h-5 w-5" />
                </div>
              </div>

              <div className="mt-5 grid gap-4 sm:grid-cols-3">
                {[
                  { label: "Free", value: stats.planCounts.free, color: "bg-gray-900" },
                  { label: "Basic", value: stats.planCounts.basic, color: "bg-blue-600" },
                  { label: "Pro", value: stats.planCounts.pro, color: "bg-primary-600" },
                ].map((plan) => (
                  <div key={plan.label} className="rounded-xl border border-gray-200 p-4">
                    <div className={`h-2 w-full rounded-full ${plan.color}`} />
                    <p className="mt-4 text-sm font-medium text-gray-500">{plan.label}</p>
                    <p className="mt-1 text-2xl font-bold text-gray-900">{plan.value}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">Recent Tenants</h2>
                  <p className="text-sm text-gray-500">Last 5 tenants created on the platform.</p>
                </div>
                <div className="rounded-xl bg-amber-50 p-2 text-amber-600">
                  <Clock3 className="h-5 w-5" />
                </div>
              </div>

              <div className="mt-5 space-y-3">
                {stats.recent.length > 0 ? (
                  stats.recent.map((tenant) => (
                    <div key={tenant.id} className="flex items-center justify-between rounded-xl border border-gray-100 px-4 py-3">
                      <div>
                        <p className="font-medium text-gray-900">{tenant.name}</p>
                        <p className="text-sm text-gray-500">/{tenant.slug}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-semibold capitalize text-gray-700">{tenant.plan}</p>
                        <p className="text-xs text-gray-500">
                          {tenant.createdAt ? new Date(tenant.createdAt).toLocaleDateString("en-IN") : "—"}
                        </p>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="rounded-xl border border-dashed border-gray-300 px-4 py-8 text-center text-sm text-gray-500">
                    No tenants found.
                  </div>
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
