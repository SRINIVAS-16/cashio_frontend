import { useEffect, useMemo, useState } from "react";
import { Building2, Loader2, Pencil, Plus, Search, Users, X } from "lucide-react";
import toast from "react-hot-toast";
import { superAdminApi } from "../../api/client";

interface SuperAdminTenant {
  id: string;
  name: string;
  slug: string;
  plan: "free" | "basic" | "pro";
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
  userCount: number;
}

interface TenantForm {
  name: string;
  slug: string;
  plan: "free" | "basic" | "pro";
  adminUsername: string;
  adminPassword: string;
  adminName: string;
}

interface TenantEditForm {
  name: string;
  plan: "free" | "basic" | "pro";
  isActive: boolean;
}

const emptyCreateForm: TenantForm = {
  name: "",
  slug: "",
  plan: "free",
  adminUsername: "",
  adminPassword: "",
  adminName: "",
};

function normalizePlan(plan?: string): "free" | "basic" | "pro" {
  return plan === "basic" || plan === "pro" ? plan : "free";
}

function normalizeTenant(raw: any): SuperAdminTenant {
  return {
    id: raw.id,
    name: raw.name,
    slug: raw.slug,
    plan: normalizePlan(raw.plan),
    isActive: Boolean(raw.isActive),
    createdAt: raw.createdAt,
    updatedAt: raw.updatedAt,
    userCount: raw._count?.users ?? raw.userCount ?? 0,
  };
}

export default function ManageTenants() {
  const [tenants, setTenants] = useState<SuperAdminTenant[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createForm, setCreateForm] = useState<TenantForm>(emptyCreateForm);
  const [selectedTenantId, setSelectedTenantId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<TenantEditForm>({ name: "", plan: "free", isActive: true });
  const [creating, setCreating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [togglingTenantId, setTogglingTenantId] = useState<string | null>(null);

  const loadTenants = async () => {
    setLoading(true);
    try {
      const res = await superAdminApi.getTenants();
      const nextTenants = Array.isArray(res.data) ? res.data.map(normalizeTenant) : [];
      setTenants(nextTenants);
      setSelectedTenantId((current) =>
        current && nextTenants.some((tenant) => tenant.id === current) ? current : nextTenants[0]?.id ?? null
      );
    } catch (err: any) {
      toast.error(err.response?.data?.error || "Failed to load tenants");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTenants();
  }, []);

  const filteredTenants = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return tenants;
    return tenants.filter(
      (tenant) => tenant.name.toLowerCase().includes(query) || tenant.slug.toLowerCase().includes(query)
    );
  }, [search, tenants]);

  const selectedTenant = useMemo(
    () => tenants.find((tenant) => tenant.id === selectedTenantId) ?? null,
    [selectedTenantId, tenants]
  );

  useEffect(() => {
    if (!selectedTenant) return;
    setEditForm({
      name: selectedTenant.name,
      plan: selectedTenant.plan,
      isActive: selectedTenant.isActive,
    });
  }, [selectedTenant]);

  const updateTenantInState = (nextTenant: SuperAdminTenant) => {
    setTenants((current) => current.map((tenant) => (tenant.id === nextTenant.id ? nextTenant : tenant)));
  };

  const handleCreateTenant = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    try {
      const res = await superAdminApi.createTenant(createForm);
      const createdTenant = normalizeTenant(res.data?.tenant ?? res.data);
      setTenants((current) => [createdTenant, ...current]);
      setSelectedTenantId(createdTenant.id);
      setShowCreateModal(false);
      setCreateForm(emptyCreateForm);
      toast.success("Tenant created successfully");
    } catch (err: any) {
      toast.error(err.response?.data?.error || "Failed to create tenant");
    } finally {
      setCreating(false);
    }
  };

  const handleSaveTenant = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTenant) return;
    setSaving(true);
    try {
      const res = await superAdminApi.updateTenant(selectedTenant.id, editForm);
      updateTenantInState(normalizeTenant(res.data));
      toast.success("Tenant updated successfully");
    } catch (err: any) {
      toast.error(err.response?.data?.error || "Failed to update tenant");
    } finally {
      setSaving(false);
    }
  };

  const handleToggleStatus = async (tenant: SuperAdminTenant) => {
    setTogglingTenantId(tenant.id);
    try {
      const res = await superAdminApi.updateTenant(tenant.id, { isActive: !tenant.isActive });
      updateTenantInState(normalizeTenant(res.data));
      toast.success(`Tenant ${tenant.isActive ? "deactivated" : "activated"}`);
    } catch (err: any) {
      toast.error(err.response?.data?.error || "Failed to update tenant status");
    } finally {
      setTogglingTenantId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center gap-3">
          <div className="rounded-xl bg-primary-50 p-3 text-primary-600">
            <Building2 className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Manage Tenants</h1>
            <p className="text-sm text-gray-500">Create, search, and update platform tenants.</p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setShowCreateModal(true)}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-primary-700"
        >
          <Plus className="h-4 w-4" />
          Create Tenant
        </button>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.4fr,0.9fr]">
        <div className="rounded-2xl border border-gray-200 bg-white shadow-sm">
          <div className="border-b border-gray-100 p-4 sm:p-5">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search tenants by name"
                className="w-full rounded-xl border border-gray-200 py-2.5 pl-10 pr-3 text-sm text-gray-700 outline-none transition focus:border-primary-500 focus:ring-2 focus:ring-primary-100"
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            {loading ? (
              <div className="flex h-64 items-center justify-center">
                <Loader2 className="h-6 w-6 animate-spin text-primary-600" />
              </div>
            ) : (
              <table className="min-w-full text-sm">
                <thead className="bg-gray-50 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                  <tr>
                    <th className="px-4 py-3">Name</th>
                    <th className="px-4 py-3">Slug</th>
                    <th className="px-4 py-3">Plan</th>
                    <th className="px-4 py-3">Users</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Created</th>
                    <th className="px-4 py-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredTenants.map((tenant) => (
                    <tr
                      key={tenant.id}
                      onClick={() => setSelectedTenantId(tenant.id)}
                      className={`cursor-pointer border-t border-gray-100 transition hover:bg-gray-50 ${
                        selectedTenantId === tenant.id ? "bg-primary-50/60" : ""
                      }`}
                    >
                      <td className="px-4 py-3">
                        <div className="font-semibold text-gray-900">{tenant.name}</div>
                      </td>
                      <td className="px-4 py-3 text-gray-500">/{tenant.slug}</td>
                      <td className="px-4 py-3">
                        <span className="rounded-full bg-primary-50 px-2.5 py-1 text-xs font-semibold capitalize text-primary-700">
                          {tenant.plan}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-600">{tenant.userCount}</td>
                      <td className="px-4 py-3">
                        <span
                          className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                            tenant.isActive ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"
                          }`}
                        >
                          {tenant.isActive ? "Active" : "Inactive"}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-500">
                        {tenant.createdAt ? new Date(tenant.createdAt).toLocaleDateString("en-IN") : "—"}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleToggleStatus(tenant);
                          }}
                          disabled={togglingTenantId === tenant.id}
                          className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                            tenant.isActive
                              ? "bg-red-50 text-red-600 hover:bg-red-100"
                              : "bg-green-50 text-green-600 hover:bg-green-100"
                          } disabled:cursor-not-allowed disabled:opacity-60`}
                        >
                          {togglingTenantId === tenant.id ? "Saving..." : tenant.isActive ? "Deactivate" : "Activate"}
                        </button>
                      </td>
                    </tr>
                  ))}
                  {!loading && filteredTenants.length === 0 && (
                    <tr>
                      <td colSpan={7} className="px-4 py-12 text-center text-sm text-gray-500">
                        No tenants found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            )}
          </div>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          {selectedTenant ? (
            <form onSubmit={handleSaveTenant} className="space-y-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary-600">Tenant Details</p>
                  <h2 className="mt-1 text-xl font-bold text-gray-900">{selectedTenant.name}</h2>
                  <p className="text-sm text-gray-500">Review and update tenant information.</p>
                </div>
                <div className="rounded-xl bg-primary-50 p-3 text-primary-600">
                  <Pencil className="h-5 w-5" />
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="rounded-xl border border-gray-200 p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Slug</p>
                  <p className="mt-2 text-sm font-medium text-gray-900">/{selectedTenant.slug}</p>
                </div>
                <div className="rounded-xl border border-gray-200 p-4">
                  <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-gray-500">
                    <Users className="h-4 w-4" />
                    Users
                  </div>
                  <p className="mt-2 text-sm font-medium text-gray-900">{selectedTenant.userCount}</p>
                </div>
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">Tenant Name</label>
                <input
                  type="text"
                  value={editForm.name}
                  onChange={(e) => setEditForm((current) => ({ ...current, name: e.target.value }))}
                  className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm outline-none transition focus:border-primary-500 focus:ring-2 focus:ring-primary-100"
                  required
                />
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">Plan</label>
                <select
                  value={editForm.plan}
                  onChange={(e) => setEditForm((current) => ({ ...current, plan: normalizePlan(e.target.value) }))}
                  className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm outline-none transition focus:border-primary-500 focus:ring-2 focus:ring-primary-100"
                >
                  <option value="free">Free</option>
                  <option value="basic">Basic</option>
                  <option value="pro">Pro</option>
                </select>
              </div>

              <div className="flex items-center justify-between rounded-xl border border-gray-200 px-4 py-3">
                <div>
                  <p className="text-sm font-medium text-gray-900">Tenant Status</p>
                  <p className="text-xs text-gray-500">Control whether this tenant can access the platform.</p>
                </div>
                <button
                  type="button"
                  onClick={() => setEditForm((current) => ({ ...current, isActive: !current.isActive }))}
                  className={`rounded-lg px-3 py-2 text-sm font-semibold ${
                    editForm.isActive ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"
                  }`}
                >
                  {editForm.isActive ? "Active" : "Inactive"}
                </button>
              </div>

              <div className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-xs text-gray-500">
                Created {selectedTenant.createdAt ? new Date(selectedTenant.createdAt).toLocaleString("en-IN") : "—"}
              </div>

              <button
                type="submit"
                disabled={saving}
                className="w-full rounded-xl bg-primary-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-primary-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {saving ? "Saving changes..." : "Save Tenant Details"}
              </button>
            </form>
          ) : (
            <div className="flex h-full min-h-80 items-center justify-center rounded-2xl border border-dashed border-gray-300 bg-gray-50 p-6 text-center text-sm text-gray-500">
              Select a tenant to view or edit its details.
            </div>
          )}
        </div>
      </div>

      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setShowCreateModal(false)}>
          <div className="w-full max-w-2xl rounded-2xl bg-white shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
              <div>
                <h2 className="text-lg font-bold text-gray-900">Create New Tenant</h2>
                <p className="text-sm text-gray-500">Provision a tenant and its default admin user.</p>
              </div>
              <button
                type="button"
                className="rounded-md p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                onClick={() => setShowCreateModal(false)}
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleCreateTenant} className="grid gap-4 p-5 md:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">Tenant Name</label>
                <input
                  type="text"
                  value={createForm.name}
                  onChange={(e) => setCreateForm((current) => ({ ...current, name: e.target.value }))}
                  className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm outline-none transition focus:border-primary-500 focus:ring-2 focus:ring-primary-100"
                  required
                />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">Slug</label>
                <input
                  type="text"
                  value={createForm.slug}
                  onChange={(e) => setCreateForm((current) => ({
                    ...current,
                    slug: e.target.value.toLowerCase().replace(/\s+/g, "-")
                  }))}
                  className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm outline-none transition focus:border-primary-500 focus:ring-2 focus:ring-primary-100"
                  placeholder="tenant-slug"
                  required
                />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">Plan</label>
                <select
                  value={createForm.plan}
                  onChange={(e) => setCreateForm((current) => ({ ...current, plan: normalizePlan(e.target.value) }))}
                  className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm outline-none transition focus:border-primary-500 focus:ring-2 focus:ring-primary-100"
                >
                  <option value="free">Free</option>
                  <option value="basic">Basic</option>
                  <option value="pro">Pro</option>
                </select>
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">Admin Full Name</label>
                <input
                  type="text"
                  value={createForm.adminName}
                  onChange={(e) => setCreateForm((current) => ({ ...current, adminName: e.target.value }))}
                  className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm outline-none transition focus:border-primary-500 focus:ring-2 focus:ring-primary-100"
                  required
                />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">Admin Username</label>
                <input
                  type="text"
                  value={createForm.adminUsername}
                  onChange={(e) => setCreateForm((current) => ({ ...current, adminUsername: e.target.value }))}
                  className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm outline-none transition focus:border-primary-500 focus:ring-2 focus:ring-primary-100"
                  required
                />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">Admin Password</label>
                <input
                  type="password"
                  value={createForm.adminPassword}
                  onChange={(e) => setCreateForm((current) => ({ ...current, adminPassword: e.target.value }))}
                  className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm outline-none transition focus:border-primary-500 focus:ring-2 focus:ring-primary-100"
                  minLength={4}
                  required
                />
              </div>

              <div className="md:col-span-2 flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-semibold text-gray-700 transition hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="rounded-xl bg-primary-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-primary-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {creating ? "Creating..." : "Create Tenant"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
