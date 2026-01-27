import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@chakra-ui/react";
import { createVisitLog } from "../../services/visitLogService";

// Crear Check IN / OUT
export const useCreateVisitLog = () => {
  const queryClient = useQueryClient();
  const toast = useToast();

  return useMutation({
    mutationFn: (formData) => createVisitLog(formData),

    onSuccess: (response, variables) => {
      queryClient.invalidateQueries(["visitLogs"]);

      const type = variables.get("type");

      toast({
        title: type === "IN"
          ? "Check-in registrado"
          : "Check-out registrado",
        description: "La visita se registró correctamente.",
        status: "success",
        duration: 4000,
        isClosable: true,
        position: "top",
      });
    },

    onError: (error) => {
      toast({
        title: "Error al registrar visita",
        description:
          error?.response?.data?.message ||
          "No se pudo registrar la visita.",
        status: "error",
        duration: 4000,
        isClosable: true,
        position: "top",
      });
    },
  });
};
