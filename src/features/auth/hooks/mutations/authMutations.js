import { useMutation } from "@tanstack/react-query";
import { loginUser, registerUser, logoutUser } from "../../services/auhtService";
import { useNavigate } from "react-router-dom";
import { useAuthStore } from "../../stores/useAuthStore";

export function useAuthMutations() {
  const { login, logout } = useAuthStore();
  const navigate = useNavigate();

  const loginMutation = useMutation({
    mutationFn: loginUser,
    onSuccess: (response) => {
      login(response.token, response.role, response.userId);
      navigate("/dashboard");
    }
  });

  const registerMutation = useMutation({
    mutationFn: registerUser,
  });

  const logoutMutation = useMutation({
    mutationFn: logoutUser,
    onSuccess: () => {
      logout();
      navigate("/login");
    }
  });

  return {
    login: loginMutation,
    register: registerMutation,
    logout: logoutMutation
  };
}
