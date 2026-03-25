import { useMutation } from "@tanstack/react-query";
import {
  loginUser,
  registerUser,
  logoutUser,
  updatePasswordProfile,
} from "../../services/auhtService";
import { useNavigate } from "react-router-dom";
import { useAuthStore } from "../../stores/useAuthStore";
import { useToast } from "@chakra-ui/react";

export function useAuthMutations() {
  const { login, logout } = useAuthStore();
  const navigate = useNavigate();
  const toast = useToast();

  // 🔹 LOGIN
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

    onError: (error) => {
      const status = error?.response?.status;
      const message =
        error?.response?.data?.message || "Error al iniciar sesión";

      if (status === 400) {
        toast({
          title: "Verificación fallida",
          description: "No se pudo validar que eres humano.",
          status: "error",
        });
      } else if (status === 429) {
        toast({
          title: "Demasiados intentos",
          description: "Espera unos minutos antes de intentar nuevamente.",
          status: "warning",
        });
      } else if (status === 403) {
        toast({
          title: "Cuenta inactiva",
          description: message,
          status: "error",
        });
      } else {
        toast({
          title: "Error",
          description: message,
          status: "error",
        });
      }
    },
  });

  // 🔹 REGISTER
  const registerMutation = useMutation({
    mutationFn: registerUser,
    onSuccess: () => {
      toast({
        title: "Registro exitoso",
        description: "El usuario se registró correctamente.",
        status: "success",
        duration: 5000,
        isClosable: true,
        position: "top",
      });
      navigate("/dashboard");
    },
    onError: (error) => {
      const message =
        error?.response?.data?.message || "Error al registrar";

      if (message.includes("email")) {
        toast({
          title: "Correo en uso",
          description: "Este correo ya está registrado.",
          status: "error",
        });
      } else if (message.includes("username")) {
        toast({
          title: "Nombre en uso",
          description: "Este nombre ya está registrado.",
          status: "error",
        });
      } else {
        toast({
          title: "Error",
          description: message,
          status: "error",
        });
      }
    },
  });

  // 🔹 LOGOUT
  const logoutMutation = useMutation({
    mutationFn: logoutUser,
    onSuccess: () => {
      logout();
      navigate("/");
    },
  });

  // 🔹 UPDATE PASSWORD
  const updatePasswordProfileMutation = useMutation({
    mutationFn: updatePasswordProfile,
    onSuccess: () => {
      toast({
        title: "Contraseña actualizada",
        description: "La contraseña se actualizó correctamente.",
        status: "success",
      });
      navigate("/dashboard");
    },
    onError: (error) => {
      toast({
        title: "Error al actualizar",
        description:
          error?.response?.data?.message ||
          "Ocurrió un error al guardar los cambios.",
        status: "error",
      });
    },
  });

  return {
    login: loginMutation,
    register: registerMutation,
    logout: logoutMutation,
    updatePasswordProfile: updatePasswordProfileMutation,
  };
}