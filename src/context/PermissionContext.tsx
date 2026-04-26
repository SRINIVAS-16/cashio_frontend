// ─── Permission Context (Dynamic Access Control) ─────────────────
import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from "react";
import { useAuth } from "./AuthContext";
import { permissionApi } from "../api/client";

/**
 * Permissions are stored as a Set of "code:action" strings, e.g.
 *   "products:read", "products:create", "dashboard:access".
 *
 * `hasPermission(code)` (no action) → true if the user has ANY action on that code.
 * `hasPermission(code, action)` → true if exact match.
 */

interface PermissionContextType {
  permissions: Set<string>;
  hasPermission: (code: string, action?: string) => boolean;
  isLoading: boolean;
  refresh: () => Promise<void>;
}

const PermissionContext = createContext<PermissionContextType | undefined>(undefined);

export function PermissionProvider({ children }: { children: ReactNode }) {
  const { user, token } = useAuth();
  const [permissions, setPermissions] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(true);

  const fetchPermissions = useCallback(async () => {
    if (!user || !token) {
      setPermissions(new Set());
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    try {
      const res = await permissionApi.getMyPermissions();
      const list: string[] = res.data.permissions || [];
      setPermissions(new Set(list));
    } catch {
      setPermissions(new Set());
    } finally {
      setIsLoading(false);
    }
  }, [user, token]);

  useEffect(() => {
    fetchPermissions();
  }, [fetchPermissions]);

  const hasPermission = useCallback(
    (code: string, action?: string) => {
      // Allow "code:action" as a single argument.
      if (code.includes(":")) return permissions.has(code);
      if (action) return permissions.has(`${code}:${action}`);
      // No action specified — match any action on this code.
      const prefix = `${code}:`;
      for (const p of permissions) if (p.startsWith(prefix)) return true;
      return false;
    },
    [permissions]
  );

  return (
    <PermissionContext.Provider value={{ permissions, hasPermission, isLoading, refresh: fetchPermissions }}>
      {children}
    </PermissionContext.Provider>
  );
}

export function usePermissions() {
  const context = useContext(PermissionContext);
  if (!context) throw new Error("usePermissions must be used within PermissionProvider");
  return context;
}
