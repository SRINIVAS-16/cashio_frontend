// ─── Permission Context (Dynamic Access Control) ─────────────────
import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from "react";
import { useAuth } from "./AuthContext";
import { permissionApi } from "../api/client";

interface PermissionContextType {
  permissions: string[];
  hasPermission: (code: string) => boolean;
  isLoading: boolean;
  refresh: () => Promise<void>;
}

const PermissionContext = createContext<PermissionContextType | undefined>(undefined);

export function PermissionProvider({ children }: { children: ReactNode }) {
  const { user, token } = useAuth();
  const [permissions, setPermissions] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchPermissions = useCallback(async () => {
    if (!user || !token) {
      setPermissions([]);
      setIsLoading(false);
      return;
    }
    try {
      const res = await permissionApi.getMyPermissions();
      setPermissions(res.data.permissions || []);
    } catch {
      setPermissions([]);
    } finally {
      setIsLoading(false);
    }
  }, [user, token]);

  useEffect(() => {
    fetchPermissions();
  }, [fetchPermissions]);

  const hasPermission = useCallback(
    (code: string) => permissions.includes(code),
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
