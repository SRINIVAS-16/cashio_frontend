// ─── Role Permissions Configuration ──────────────────────────────
import { useState, useEffect, useMemo } from "react";
import { Shield, Save, RefreshCw, Loader2, Check, Lock } from "lucide-react";
import { permissionApi } from "../api/client";
import { ALL_ROLES } from "../types";
import { usePermissions } from "../context/PermissionContext";
import toast from "react-hot-toast";

interface Permission {
  code: string;
  name: string;
  description: string;
  group: string;
  isEntity: boolean;
}

interface PermissionMatrix {
  permissions: Permission[];
  // role -> code -> string[] of granted actions
  matrix: Record<string, Record<string, string[]>>;
}

const ENTITY_ACTIONS = ["read", "create", "update", "delete"] as const;
const ACTION_META: Record<string, { label: string; short: string }> = {
  read:   { label: "Read",   short: "R" },
  create: { label: "Create", short: "C" },
  update: { label: "Update", short: "U" },
  delete: { label: "Delete", short: "D" },
  access: { label: "Access", short: "✓" },
};

// draft[role][code] = Set of granted actions
type Draft = Record<string, Record<string, Set<string>>>;

export default function RolePermissions() {
  const { hasPermission } = usePermissions();
  const canEdit = hasPermission("roles", "update");
  const [matrix, setMatrix] = useState<PermissionMatrix | null>(null);
  const [draft, setDraft] = useState<Draft>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [activeRole, setActiveRole] = useState<string>(ALL_ROLES[0]);

  const buildDraft = (data: PermissionMatrix): Draft => {
    const d: Draft = {};
    for (const role of ALL_ROLES) {
      d[role] = {};
      for (const perm of data.permissions) {
        d[role][perm.code] = new Set(data.matrix[role]?.[perm.code] || []);
      }
    }
    return d;
  };

  const fetchMatrix = async () => {
    setLoading(true);
    try {
      const res = await permissionApi.getMatrix();
      const data: PermissionMatrix = res.data;
      setMatrix(data);
      setDraft(buildDraft(data));
    } catch {
      toast.error("Failed to load permissions");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMatrix();
  }, []);

  const toggle = (role: string, code: string, action: string) => {
    if (!canEdit) return;
    setDraft((prev) => {
      const next: Draft = { ...prev, [role]: { ...prev[role] } };
      const set = new Set(next[role][code]);
      if (set.has(action)) set.delete(action);
      else set.add(action);
      next[role][code] = set;
      return next;
    });
  };

  const setAllActions = (role: string, code: string, actions: readonly string[], on: boolean) => {
    if (!canEdit) return;
    setDraft((prev) => {
      const next: Draft = { ...prev, [role]: { ...prev[role] } };
      next[role][code] = on ? new Set(actions) : new Set();
      return next;
    });
  };

  const dirtyRoles = useMemo(() => {
    if (!matrix) return new Set<string>();
    const dirty = new Set<string>();
    for (const role of ALL_ROLES) {
      for (const perm of matrix.permissions) {
        const original = new Set(matrix.matrix[role]?.[perm.code] || []);
        const current = draft[role]?.[perm.code] || new Set();
        if (original.size !== current.size) {
          dirty.add(role);
          break;
        }
        let same = true;
        for (const a of original) {
          if (!current.has(a)) {
            same = false;
            break;
          }
        }
        if (!same) {
          dirty.add(role);
          break;
        }
      }
    }
    return dirty;
  }, [draft, matrix]);

  const saveRole = async (role: string) => {
    if (!matrix) return;
    setSaving(role);
    try {
      const entries: { code: string; action: string }[] = [];
      for (const perm of matrix.permissions) {
        const set = draft[role]?.[perm.code] || new Set();
        for (const action of set) entries.push({ code: perm.code, action });
      }
      await permissionApi.updateRolePermissions(role, entries);
      toast.success(`${role} permissions saved`);
      await fetchMatrix();
    } catch {
      toast.error(`Failed to save ${role} permissions`);
    } finally {
      setSaving(null);
    }
  };

  const resetRole = (role: string) => {
    if (!matrix) return;
    setDraft((prev) => {
      const next: Draft = { ...prev, [role]: {} };
      for (const perm of matrix.permissions) {
        next[role][perm.code] = new Set(matrix.matrix[role]?.[perm.code] || []);
      }
      return next;
    });
  };

  const stats = useMemo(() => {
    if (!matrix) return null;
    const out: Record<string, { granted: number; total: number }> = {};
    for (const role of ALL_ROLES) {
      let granted = 0;
      let total = 0;
      for (const perm of matrix.permissions) {
        const actions = perm.isEntity ? ENTITY_ACTIONS.length : 1;
        total += actions;
        granted += draft[role]?.[perm.code]?.size || 0;
      }
      out[role] = { granted, total };
    }
    return out;
  }, [draft, matrix]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 animate-spin text-primary-600" />
      </div>
    );
  }

  if (!matrix) return null;

  const groups = [...new Set(matrix.permissions.map((p) => p.group))];
  const isDirty = dirtyRoles.has(activeRole);

  return (
    <div className="space-y-5">
      {/* ── Header ─────────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary-50 rounded-lg">
            <Shield className="w-5 h-5 text-primary-600" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-gray-800">Role Permissions</h1>
            <p className="text-xs text-gray-500">
              {canEdit
                ? "Configure CRUD actions per role. Changes apply only after saving."
                : "Read-only view. You don’t have permission to modify roles."}
            </p>
          </div>
        </div>
        {!canEdit && (
          <span className="flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-medium text-amber-700 bg-amber-50 border border-amber-200 rounded-md">
            <Lock className="w-3 h-3" /> View only
          </span>
        )}
        <button
          onClick={fetchMatrix}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50"
        >
          <RefreshCw className="w-3.5 h-3.5" /> Refresh
        </button>
      </div>

      {/* ── Role tabs ─────────────────────────────────────────── */}
      <div className="bg-white rounded-xl border border-gray-200 p-1.5 inline-flex gap-1">
        {ALL_ROLES.map((role) => {
          const s = stats?.[role];
          const dirty = dirtyRoles.has(role);
          const active = activeRole === role;
          return (
            <button
              key={role}
              onClick={() => setActiveRole(role)}
              className={`relative flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                active
                  ? "bg-primary-600 text-white shadow-sm"
                  : "text-gray-600 hover:bg-gray-50"
              }`}
            >
              <span className="capitalize">{role}</span>
              {s && (
                <span
                  className={`text-[11px] px-1.5 py-0.5 rounded ${
                    active ? "bg-primary-700/40 text-white" : "bg-gray-100 text-gray-500"
                  }`}
                >
                  {s.granted}/{s.total}
                </span>
              )}
              {dirty && (
                <span
                  className={`w-1.5 h-1.5 rounded-full ${
                    active ? "bg-yellow-300" : "bg-amber-500"
                  }`}
                  title="Unsaved changes"
                />
              )}
            </button>
          );
        })}
      </div>

      {/* ── Permission groups for the active role ─────────────── */}
      <div className="space-y-5">
        {groups.map((group) => {
          const perms = matrix.permissions.filter((p) => p.group === group);
          return (
            <section key={group} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <header className="px-5 py-2.5 border-b border-gray-100 bg-gray-50/60">
                <h2 className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">
                  {group}
                </h2>
              </header>
              <ul className="grid grid-cols-1 sm:grid-cols-2 gap-px bg-gray-100">
                {perms.map((perm) => {
                  const actions: readonly string[] = perm.isEntity
                    ? ENTITY_ACTIONS
                    : (["access"] as const);
                  const granted = draft[activeRole]?.[perm.code] || new Set<string>();
                  const allOn = actions.every((a) => granted.has(a));
                  const anyOn = actions.some((a) => granted.has(a));

                  return (
                    <li
                      key={perm.code}
                      className="bg-white px-4 py-3.5 hover:bg-gray-50/40 transition-colors flex flex-col gap-2.5"
                    >
                      {/* Header row: name + quick toggle */}
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <div className="text-sm font-semibold text-gray-800 truncate">{perm.name}</div>
                            <span className="shrink-0 text-[10px] font-medium text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded">
                              {perm.isEntity ? "CRUD" : "Toggle"}
                            </span>
                          </div>
                          <div className="text-[11px] text-gray-400 mt-0.5 line-clamp-2">{perm.description}</div>
                        </div>
                        {perm.isEntity && canEdit && (
                          <button
                            type="button"
                            onClick={() => setAllActions(activeRole, perm.code, actions, !allOn)}
                            className={`shrink-0 text-[10px] font-medium px-2 py-1 rounded-md transition-colors ${
                              allOn
                                ? "text-gray-500 hover:bg-gray-100"
                                : anyOn
                                ? "text-primary-600 hover:bg-primary-50"
                                : "text-gray-400 hover:bg-gray-100"
                            }`}
                          >
                            {allOn ? "Clear" : "All"}
                          </button>
                        )}
                      </div>

                      {/* Action pills */}
                      <div className="flex flex-wrap gap-1.5">
                        {actions.map((a) => {
                          const meta = ACTION_META[a];
                          const on = granted.has(a);
                          return (
                            <button
                              key={a}
                              type="button"
                              onClick={() => toggle(activeRole, perm.code, a)}
                              disabled={!canEdit}
                              className={`inline-flex items-center gap-1.5 h-7 px-2.5 rounded-md text-[11px] font-medium transition-all border ${
                                on
                                  ? canEdit
                                    ? "bg-primary-600 border-primary-600 text-white shadow-sm hover:bg-primary-700"
                                    : "bg-primary-100 border-primary-200 text-primary-700"
                                  : canEdit
                                  ? "bg-white border-gray-200 text-gray-500 hover:border-primary-400 hover:text-primary-600"
                                  : "bg-gray-50 border-gray-200 text-gray-400"
                              } ${!canEdit ? "cursor-not-allowed" : ""}`}
                            >
                              {on ? (
                                <Check className="w-3 h-3 shrink-0" strokeWidth={3} />
                              ) : (
                                <span className="inline-flex items-center justify-center w-3 h-3 text-[10px] font-bold shrink-0">
                                  {meta.short}
                                </span>
                              )}
                              <span>{meta.label}</span>
                            </button>
                          );
                        })}
                      </div>
                    </li>
                  );
                })}
              </ul>
            </section>
          );
        })}
      </div>

      {/* ── Save bar (sticky-like, bottom) ────────────────────── */}
      {canEdit && (
        <div className="sticky bottom-0 -mx-2 px-2 py-3 bg-gradient-to-t from-white via-white to-transparent">
        <div className="bg-white border border-gray-200 rounded-xl shadow-sm px-4 py-3 flex items-center justify-between">
          <div className="text-xs text-gray-500">
            {isDirty ? (
              <span className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                Unsaved changes for <span className="font-semibold capitalize text-gray-700">{activeRole}</span>
              </span>
            ) : (
              <span className="text-gray-400">No changes</span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => resetRole(activeRole)}
              disabled={!isDirty || saving === activeRole}
              className="px-3 py-1.5 text-xs font-medium text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Reset
            </button>
            <button
              onClick={() => saveRole(activeRole)}
              disabled={!isDirty || saving === activeRole}
              className={`flex items-center gap-1.5 px-4 py-1.5 text-xs font-medium rounded-lg transition-all ${
                isDirty && saving !== activeRole
                  ? "bg-primary-600 text-white hover:bg-primary-700 shadow-sm"
                  : "bg-gray-100 text-gray-400 cursor-not-allowed"
              }`}
            >
              {saving === activeRole ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Save className="w-3.5 h-3.5" />
              )}
              Save <span className="capitalize">{activeRole}</span>
            </button>
          </div>
        </div>
      </div>
      )}
    </div>
  );
}
