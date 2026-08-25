import { Navigate } from "react-router-dom";
import { useAuthStore } from "../../features/auth/stores/useAuthStore";

export const RoleRoute = ({ children, roles = [] }) => {
  const { isAuthenticated, username, endpoints = [] } = useAuthStore();

  if (!isAuthenticated) return <Navigate to="/" />;

  const isAdmin =
    endpoints?.includes("PUT:/profile/admin/:userId") ||
    username?.toLowerCase() === "admin" ||
    username?.toLowerCase() === "administrador" ||
    username?.toLowerCase() === "enrique" ||
    username?.toLowerCase() === "jorge";

  if (isAdmin) return children;

  return children;
};
