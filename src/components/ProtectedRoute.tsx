// ─── Protected Route Component (Permission-Based Access) ────────
import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { usePermissions } from "../context/PermissionContext";

interface ProtectedRouteProps {
  children: React.ReactNode;
  permission?: string; // permission code e.g. "products", "billing"
}

export default function ProtectedRoute({ children, permission }: ProtectedRouteProps) {
  const { user, isLoading: authLoading } = useAuth();
  const { hasPermission, isLoading: permLoading } = usePermissions();

  if (authLoading || permLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  // Not authenticated → redirect to login
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Authenticated but no permission → show access denied
  if (permission && !hasPermission(permission)) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center p-8">
          <div className="text-6xl mb-4">🚫</div>
          <h2 className="text-xl font-bold text-gray-800 mb-2">Access Denied</h2>
          <p className="text-gray-500 text-sm">
            You don't have permission to access this page.
            <br />
            Your role: <span className="font-semibold capitalize">{user.role}</span>
          </p>
          <a href="/" className="inline-block mt-4 text-sm text-primary-600 hover:underline">
            ← Go to Dashboard
          </a>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
