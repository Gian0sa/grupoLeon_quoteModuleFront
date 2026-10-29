import { useMutation } from "@tanstack/react-query";
import {
  loginUser,
  registerUser,
  logoutUser,
  updatePasswordProfile,
} from "../../services/auhtService";
import { useNavigate } from "react-router-dom";
import { useAuthStore } from "../../stores/useAuthStore";
import { flushVisitQueue } from "../../../checkinout/services/visitQueueFlush";
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
        role: res.role,
        endpoints: res.endpoints,
      });
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
        error?.response?.data?.message || "Error al registrar usuario";
      const lower = message.toLowerCase();

      if (lower.includes("correo") || lower.includes("email")) {
        toast({
          title: "Correo no disponible",
          description: message,
          status: "warning",
          duration: 5000,
          isClosable: true,
          position: "top",
        });
      } else if (lower.includes("asesor") || lower.includes("vendedor")) {
        toast({
          title: "Vendedor ya asignado",
          description: message,
          status: "warning",
          duration: 5000,
          isClosable: true,
          position: "top",
        });
      } else if (lower.includes("nombre") || lower.includes("username")) {
        toast({
          title: "Nombre en uso",
          description: message,
          status: "warning",
          duration: 5000,
          isClosable: true,
          position: "top",
        });
      } else {
        toast({
          title: "Error al registrar",
          description: message,
          status: "error",
          duration: 5000,
          isClosable: true,
          position: "top",
        });
      }
    },
  });

  // 🔹 LOGOUT
  const logoutMutation = useMutation({
    // Última oportunidad de subir las visitas pendientes: después de esto la
    // sesión deja de ser válida y las marcas tendrían que esperar al próximo
    // ingreso. No bloquea el cierre: si no hay red, se abandona en 4 s y los
    // datos quedan a salvo en IndexedDB.
    mutationFn: async () => {
      await flushVisitQueue();
      return logoutUser();
    },
    onSuccess: () => {
      logout();
      window.location.replace("/");
    },
    onError: () => {
      // Si el backend falla, igual se cierra sesión localmente y se libera memoria.
      logout();
      window.location.replace("/");
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