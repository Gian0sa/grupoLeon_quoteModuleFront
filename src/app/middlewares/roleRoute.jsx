import { Navigate } from "react-router-dom";
import { useAuthStore } from "../../features/auth/stores/useAuthStore";
import { checkIsAdmin } from "../../shared/utils/permissions";

export const RoleRoute = ({ children, roles = [] }) => {
  const { isAuthenticated, username, endpoints = [], role } = useAuthStore();

  if (!isAuthenticated) return <Navigate to="/" />;

  const roleUpper = String(role || "").toUpperCase();
  const isAdmin =
    roleUpper === "ADMIN" ||
    roleUpper === "FACTURACION" ||
    roleUpper === "SUPERVISOR" ||
    checkIsAdmin(endpoints, username);

  if (isAdmin) return children;

  return children;
};
