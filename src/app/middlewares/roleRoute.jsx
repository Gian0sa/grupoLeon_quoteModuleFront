import { Navigate } from "react-router-dom";
import { useAuthStore } from "../../features/auth/stores/useAuthStore";
import { useIsAdmin, useHasAccess } from "../../shared/utils/permissions";

export const RoleRoute = ({ children, requiredPermission = null, roles = [] }) => {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const role = useAuthStore((state) => state.role);
  const isAdmin = useIsAdmin();
  const hasAccess = useHasAccess();

  if (!isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  // Los administradores maestros tienen acceso total
  if (isAdmin) {
    return children;
  }

  // Si se especificó un permiso puntual (ej. "POST:/register")
  if (requiredPermission && hasAccess(requiredPermission)) {
    return children;
  }

  // Si se especificaron roles permitidos
  if (roles.length > 0) {
    const roleUpper = String(role || "").toUpperCase();
    const hasRole = roles.map((r) => r.toUpperCase()).includes(roleUpper);
    if (hasRole) {
      return children;
    }
  }

  return <Navigate to="/dashboard" replace />;
};
