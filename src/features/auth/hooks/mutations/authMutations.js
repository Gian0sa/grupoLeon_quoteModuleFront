import { useMutation } from "@tanstack/react-query";
import { loginUser,registerUser,logoutUser } from "../../services/auhtService";
import { useNavigate } from "react-router-dom";
import { useAuthStore } from "../../stores/useAuthStore";

export function useAuthMutations(){
    const {login} = useAuthStore();
    const navigate= useNavigate();

    const loginMutation = useMutation({
        mutationFn: loginUser,
        onSuccess: (response) => {
          login(response.token);
          navigate("/dashboard");
        },
        onError: (error) => {
          console.error("Error al iniciar sesión:", error);
        },
      });
    const registerMutation = useMutation({
        mutationFn: registerUser,
        onSuccess: () => {
            navigate("/dashboard");
        },
        onError: (error) => {
            if (error.response && error.response.data && error.response.data.message) {
                console.error("Error al registrar usuario:", error.response.data.message);
            } else {
                console.error("Error al registrar usuario:", error);
            }
        },
    });
    const logoutMutation = useMutation({
        mutationFn: logoutUser,
        onSuccess: () => {
            logout();
            navigate("/login");
        },
        onError: (error) => {
            console.error("Error al cerrar sesión:", error);
        },
    });

      return {
        login: {
          mutate: loginMutation.mutate,
          isPending: loginMutation.isPending,
          isError: loginMutation.isError,
          error: loginMutation.error
        },
        registerMutation : {
          mutate: registerMutation.mutate,
          isPending: registerMutation.isPending,
          isError: registerMutation.isError,
          error: registerMutation.error
        },
        logout : {
          mutate: logoutMutation.mutate,
          isPending: logoutMutation.isPending,
          isError: logoutMutation.isError,
          error: logoutMutation.error
        }
      };
};
