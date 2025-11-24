import { useMutation } from "@tanstack/react-query";
import { updateProfileAdmin } from "../../services/authAdminService";
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
      toast({
        title: "Perfil actualizado",
        description: "Los cambios se guardaron correctamente.",
        status: "success",
        duration: 5000,
        isClosable: true,
      });
      queryClient.invalidateQueries({ queryKey: ["adminUsers"] });
      navigate("/dashboard");
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

  return {
    updateProfileAdmin: updateProfileAdminMutation
  };
}

export function useUserActiveMutations() {
  const toast = useToast();

  const updateUserActive = useMutation({
    mutationFn: updateUserActiveService,
    onSuccess: () => {
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