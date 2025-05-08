import { useMutation } from "@tanstack/react-query";
import { loginUser } from "../../services/auhtService";
import { useNavigate } from "react-router-dom";
import { useAuthStore } from "../../stores/useAuthStore";

export function useAuthMutations(){
    const {login} = useAuthStore
    const navigate= useNavigate

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

      return {
        login: {
          mutate: loginMutation.mutate,
          isPending: loginMutation.isPending,
          isError: loginMutation.isError,
          error: loginMutation.error
        }
      };
};
