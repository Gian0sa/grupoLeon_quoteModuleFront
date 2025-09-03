import { useMutation } from "@tanstack/react-query";
import { loginUser, registerUser, logoutUser , updatePasswordProfile } from "../../services/auhtService";
import { useNavigate } from "react-router-dom";
import { useAuthStore } from "../../stores/useAuthStore";
import { useToast } from "@chakra-ui/react";

export function useAuthMutations() {
  const { login, logout } = useAuthStore();
  const navigate = useNavigate();
  const toast = useToast();

  const loginMutation = useMutation({
    mutationFn: loginUser,
    onSuccess: (res) => {
      login({
        userId: res.userId,
        username: res.username,
        salesEmployeeCode: res.salesEmployeeCode,
        endpoints: res.endpoints,
      });
      navigate("/dashboard");
    },
  });


  const registerMutation = useMutation({
    mutationFn: registerUser,
  });

  const logoutMutation = useMutation({
    mutationFn: logoutUser,
    onSuccess: () => {
      logout();
      navigate("/");
    }
  });

  const updatePasswordProfileMutation = useMutation({
    mutationFn: updatePasswordProfile,
    onSuccess: () => {
      toast({
        title: "Contraseña actualizada",
        description: "La contraseña se actualizó correctamente.",
        status: "success",
        duration: 5000,
        isClosable: true,
        position: "top",
      });
      navigate("/dashboard");
    },
    onError: (error) => {
      toast({
        title: "Error al actualizar",
        description: error?.response?.data?.message || "Ocurrió un error al guardar los cambios.",
        status: "error",
        duration: 5000,
        isClosable: true,
        position: "top",
      });
    },
  });

  return {
    login: loginMutation,
    register: registerMutation,
    logout: logoutMutation,
    updatePasswordProfile: updatePasswordProfileMutation
  };
}
