import { Navigate } from "react-router-dom";
import { useAuthStore } from "../../features/auth/stores/useAuthStore";

export const PrivateRoute = ({ children }) => {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

  if (!isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  return children;
};