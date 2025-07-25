import { useMutation } from "@tanstack/react-query";
import { loginUser, registerUser, logoutUser } from "../../services/auhtService";
import { useNavigate } from "react-router-dom";
import { useAuthStore } from "../../stores/useAuthStore";

export function useAuthMutations() {
  const { login, logout } = useAuthStore();
  const navigate = useNavigate();

  const loginMutation = useMutation({
  mutationFn: loginUser,
    onSuccess: (res) => {
      login({
        token: res.token,
        refreshToken: res.refreshToken,
        userId: res.userId,
        username: res.username,
        salesEmployeeCode: res.salesEmployeeCode,
        endpoints: res.endpoints,
        sapCookies: res.sapCookies,
      });
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
