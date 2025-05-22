import { Navigate } from "react-router-dom";
import { useAuthStore } from "../../features/auth/stores/useAuthStore";

export const RoleRoute = ({ children, roles }) => {
  const { isAuthenticated, role } = useAuthStore();

  if (!isAuthenticated) return <Navigate to="/" />;

  return roles.includes(role) ? children : <Navigate to="/dashboard" />;
};
