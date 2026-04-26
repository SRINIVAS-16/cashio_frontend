// ─── Role Permissions Configuration ──────────────────────────────
import { useState, useEffect } from "react";
import { Shield, Save, RefreshCw, Loader2 } from "lucide-react";
import { permissionApi } from "../api/client";
import { ALL_ROLES, UserRole } from "../types";
import toast from "react-hot-toast";

interface Permission {
  code: string;
  name: string;
  description: string;
  group: string;
}

interface PermissionMatrix {
  permissions: Permission[];
  roles: Record<string, string[]>;
}

export default function RolePermissions() {
  const [matrix, setMatrix] = useState<PermissionMatrix | null>(null);
  const [draft, setDraft] = useState<Record<string, Set<string>>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);

  const fetchMatrix = async () => {
    setLoading(true);
    try {
      const res = await permissionApi.getMatrix();
      const data: PermissionMatrix = res.data;
      setMatrix(data);
      // Build editable draft from server data
      const d: Record<string, Set<string>> = {};
      for (const role of ALL_ROLES) {
        d[role] = new Set(data.roles[role] || []);
      }
      setDraft(d);
    } catch {
      toast.error("Failed to load permissions");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchMatrix(); }, []);

  const toggle = (role: string, code: string) => {
    setDraft((prev) => {
      const next = { ...prev };
      const s = new Set(next[role]);
      if (s.has(code)) s.delete(code); else s.add(code);
      next[role] = s;
      return next;
    });
  };

  const isDirty = (role: string) => {
    if (!matrix) return false;
    const original = new Set(matrix.roles[role] || []);
    const current = draft[role] || new Set();
    if (original.size !== current.size) return true;
    for (const c of original) if (!current.has(c)) return true;
    return false;
  };

  const saveRole = async (role: string) => {
    setSaving(role);
    try {
      await permissionApi.updateRolePermissions(role, Array.from(draft[role] || []));
      toast.success(`${role} permissions saved`);
      await fetchMatrix(); // refresh from server
    } catch {
      toast.error(`Failed to save ${role} permissions`);
    } finally {
      setSaving(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 animate-spin text-primary-600" />
      </div>
    );
  }

  if (!matrix) return null;

  // Group permissions for display
  const groups = [...new Set(matrix.permissions.map((p) => p.group))];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary-50 rounded-lg">
            <Shield className="w-5 h-5 text-primary-600" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-gray-800">Role Permissions</h1>
            <p className="text-xs text-gray-500">Configure which screens each role can access</p>
          </div>
        </div>
        <button
          onClick={fetchMatrix}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50"
        >
          <RefreshCw className="w-3.5 h-3.5" /> Refresh
        </button>
      </div>

      {/* Matrix table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100">
              <th className="text-left px-4 py-3 font-semibold text-gray-700 w-52">Permission</th>
              {ALL_ROLES.map((role) => (
                <th key={role} className="px-4 py-3 text-center font-semibold text-gray-700 capitalize w-32">
                  {role}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {groups.map((group) => (
              <>
                <tr key={`group-${group}`}>
                  <td
                    colSpan={ALL_ROLES.length + 1}
                    className="px-4 py-2 bg-gray-50 text-xs font-bold text-gray-500 uppercase tracking-wide"
                  >
                    {group}
                  </td>
                </tr>
                {matrix.permissions
                  .filter((p) => p.group === group)
                  .map((perm) => (
                    <tr key={perm.code} className="border-b border-gray-50 hover:bg-gray-50/50">
                      <td className="px-4 py-2.5">
                        <div className="font-medium text-gray-800">{perm.name}</div>
                        <div className="text-[11px] text-gray-400">{perm.description}</div>
                      </td>
                      {ALL_ROLES.map((role) => (
                        <td key={role} className="px-4 py-2.5 text-center">
                          <label className="inline-flex items-center justify-center cursor-pointer">
                            <input
                              type="checkbox"
                              checked={draft[role]?.has(perm.code) || false}
                              onChange={() => toggle(role, perm.code)}
                              className="w-4 h-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500 cursor-pointer"
                            />
                          </label>
                        </td>
                      ))}
                    </tr>
                  ))}
              </>
            ))}
          </tbody>
        </table>
      </div>

      {/* Save buttons per role */}
      <div className="flex flex-wrap gap-3">
        {ALL_ROLES.map((role) => (
          <button
            key={role}
            onClick={() => saveRole(role)}
            disabled={!isDirty(role) || saving === role}
            className={`flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-lg transition-all ${
              isDirty(role)
                ? "bg-primary-600 text-white hover:bg-primary-700 shadow-sm"
                : "bg-gray-100 text-gray-400 cursor-not-allowed"
            }`}
          >
            {saving === role ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Save className="w-3.5 h-3.5" />
            )}
            Save {role}
          </button>
        ))}
      </div>
    </div>
  );
}
