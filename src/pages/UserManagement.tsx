// ─── User Management Page ────────────────────────────────────────
import { useState, useEffect } from "react";
import { UserCog, Plus, Pencil, Trash2, Loader2, X, Eye, EyeOff } from "lucide-react";
import { userApi } from "../api/client";
import { ALL_ROLES, UserRole } from "../types";
import { useAuth } from "../context/AuthContext";
import { usePermissions } from "../context/PermissionContext";
import toast from "react-hot-toast";

interface ManagedUser {
  id: number;
  username: string;
  name: string;
  email?: string;
  role: UserRole;
  provider?: string;
}

interface UserForm {
  username: string;
  password: string;
  name: string;
  email: string;
  role: UserRole;
}

const emptyForm: UserForm = { username: "", password: "", name: "", email: "", role: "cashier" };

export default function UserManagement() {
  const { user: currentUser } = useAuth();
  const { hasPermission } = usePermissions();
  const canCreate = hasPermission("users", "create");
  const canUpdate = hasPermission("users", "update");
  const canDelete = hasPermission("users", "delete");
  const [users, setUsers] = useState<ManagedUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [form, setForm] = useState<UserForm>({ ...emptyForm });
  const [submitting, setSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const res = await userApi.getAll();
      setUsers(res.data);
    } catch {
      toast.error("Failed to load users");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchUsers(); }, []);

  const openCreate = () => {
    setEditId(null);
    setForm({ ...emptyForm });
    setShowForm(true);
    setShowPassword(false);
  };

  const openEdit = (u: ManagedUser) => {
    setEditId(u.id);
    setForm({ username: u.username, password: "", name: u.name, email: u.email || "", role: u.role });
    setShowForm(true);
    setShowPassword(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      if (editId) {
        const payload: Record<string, string | undefined> = { name: form.name, role: form.role };
        if (form.password) payload.password = form.password;
        await userApi.update(editId, payload);
        toast.success("User updated");
      } else {
        await userApi.create({ username: form.username, password: form.password, name: form.name, role: form.role });
        toast.success("User created");
      }
      setShowForm(false);
      fetchUsers();
    } catch (err: any) {
      toast.error(err.response?.data?.error || "Failed to save user");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (u: ManagedUser) => {
    if (u.id === currentUser?.id) {
      toast.error("Cannot delete your own account");
      return;
    }
    if (!confirm(`Delete user "${u.name}"?`)) return;
    try {
      await userApi.delete(u.id);
      toast.success("User deleted");
      fetchUsers();
    } catch (err: any) {
      toast.error(err.response?.data?.error || "Failed to delete user");
    }
  };

  const roleBadgeColor: Record<UserRole, string> = {
    admin: "bg-red-50 text-red-700",
    manager: "bg-blue-50 text-blue-700",
    cashier: "bg-green-50 text-green-700",
    viewer: "bg-gray-100 text-gray-600",
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary-50 rounded-lg">
            <UserCog className="w-5 h-5 text-primary-600" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-gray-800">User Management</h1>
            <p className="text-xs text-gray-500">{users.length} user{users.length !== 1 ? "s" : ""}</p>
          </div>
        </div>
        {canCreate && (
          <button
            onClick={openCreate}
            className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-700 shadow-sm"
          >
            <Plus className="w-4 h-4" /> Add User
          </button>
        )}
      </div>

      {/* Users Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-6 h-6 animate-spin text-primary-600" />
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50/50">
                <th className="text-left px-4 py-3 font-semibold text-gray-700">Name</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-700">Username</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-700">Email</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-700">Role</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-700">Provider</th>
                <th className="px-4 py-3 w-24"></th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id} className="border-b border-gray-50 hover:bg-gray-50/50">
                  <td className="px-4 py-2.5 font-medium text-gray-800">
                    {u.name}
                    {u.id === currentUser?.id && (
                      <span className="ml-1.5 text-[10px] text-primary-600 font-semibold">(you)</span>
                    )}
                  </td>
                  <td className="px-4 py-2.5 text-gray-600">{u.username}</td>
                  <td className="px-4 py-2.5 text-gray-500">{u.email || "—"}</td>
                  <td className="px-4 py-2.5">
                    <span className={`inline-block px-2 py-0.5 text-xs font-semibold rounded-full capitalize ${roleBadgeColor[u.role]}`}>
                      {u.role}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 text-gray-400 text-xs capitalize">{u.provider || "local"}</td>
                  <td className="px-4 py-2.5">
                    <div className="flex items-center gap-1 justify-end">
                      {canUpdate && (
                        <button
                          onClick={() => openEdit(u)}
                          className="p-1.5 rounded-md text-gray-400 hover:text-primary-600 hover:bg-primary-50"
                          title="Edit"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                      )}
                      {canDelete && u.id !== currentUser?.id && (
                        <button
                          onClick={() => handleDelete(u)}
                          className="p-1.5 rounded-md text-gray-400 hover:text-red-600 hover:bg-red-50"
                          title="Delete"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {users.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-gray-400">
                    No users found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>

      {/* Create / Edit Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => setShowForm(false)}>
          <div
            className="bg-white rounded-xl shadow-xl w-full max-w-md"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <h2 className="text-base font-bold text-gray-800">
                {editId ? "Edit User" : "Create User"}
              </h2>
              <button onClick={() => setShowForm(false)} className="p-1 text-gray-400 hover:text-gray-600">
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-5 space-y-4">
              {/* Username (only for create) */}
              {!editId && (
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Username</label>
                  <input
                    type="text"
                    required
                    value={form.username}
                    onChange={(e) => setForm((f) => ({ ...f, username: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    placeholder="e.g. john_doe"
                  />
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Full Name</label>
                <input
                  type="text"
                  required
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">
                  Password {editId && <span className="text-gray-400 font-normal">(leave empty to keep current)</span>}
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    required={!editId}
                    value={form.password}
                    onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                    className="w-full px-3 py-2 pr-10 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    minLength={4}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Role</label>
                <select
                  value={form.role}
                  onChange={(e) => setForm((f) => ({ ...f, role: e.target.value as UserRole }))}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent capitalize"
                >
                  {ALL_ROLES.map((r) => (
                    <option key={r} value={r} className="capitalize">{r}</option>
                  ))}
                </select>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 px-4 py-2 text-sm font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-700 disabled:opacity-60 flex items-center justify-center gap-1.5"
                >
                  {submitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  {editId ? "Update" : "Create"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
