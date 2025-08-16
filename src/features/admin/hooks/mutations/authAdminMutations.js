import { useMutation } from "@tanstack/react-query";
import { updateProfileAdmin } from "../../services/authAdminService";
import { useToast } from "@chakra-ui/react";
import { useNavigate } from "react-router-dom";

export function useAuthAdminMutations() {
  const toast = useToast();
  const navigate = useNavigate();

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
