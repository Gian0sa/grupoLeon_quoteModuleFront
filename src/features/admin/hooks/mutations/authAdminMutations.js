import { useMutation } from "@tanstack/react-query";
import { updateProfileAdmin, updateUserStatus, unlockUser } from "../../services/authAdminService";
import { useToast } from "@chakra-ui/react";
import { useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";

export function useAuthAdminMutations() {
  const toast = useToast();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const updateProfileAdminMutation = useMutation({
    mutationFn: updateProfileAdmin,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["adminUsers"] });
      queryClient.invalidateQueries({ queryKey: ["allUsersAdmin"] });
    },
    onError: (error) => {
      console.error("Error completo al actualizar perfil:", error);
      toast({
        title: "Error al actualizar",
        description:
          error?.response?.data?.message ||
          error.message ||
          "Ocurrió un error al guardar los cambios.",
        status: "error",
        duration: 5000,
        isClosable: true,
      });
    },
  });

  const unlockUserMutation = useMutation({
    mutationFn: unlockUser,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["adminUsers"] });
      queryClient.invalidateQueries({ queryKey: ["allUsersAdmin"] });
      toast({
        title: "Usuario desbloqueado",
        description: "El usuario ha sido desbloqueado y puede iniciar sesión inmediatamente.",
        status: "success",
        duration: 4000,
        isClosable: true,
      });
    },
    onError: (error) => {
      toast({
        title: "Error al desbloquear",
        description: error?.response?.data?.message || "No se pudo desbloquear el usuario.",
        status: "error",
        duration: 5000,
        isClosable: true,
      });
    },
  });

  return {
    updateProfileAdmin: updateProfileAdminMutation,
    unlockUser: unlockUserMutation,
  };
}

export function useUserActiveMutations() {
  const toast = useToast();
  const queryClient = useQueryClient();

  const updateUserActive = useMutation({
    mutationFn: updateUserStatus,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["adminUsers"] });
      queryClient.invalidateQueries({ queryKey: ["allUsersAdmin"] });
      toast({
        title: "Estado actualizado",
        description: "El usuario ha sido actualizado.",
        status: "success",
        duration: 5000,
        isClosable: true,
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error?.response?.data?.message || "No se pudo actualizar.",
        status: "error",
        duration: 5000,
        isClosable: true,
      });
    }
  });

  return { updateUserActive };
}
