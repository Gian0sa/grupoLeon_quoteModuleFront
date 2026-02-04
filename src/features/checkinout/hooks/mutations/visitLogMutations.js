import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@chakra-ui/react";
import { createVisitLog } from "../../services/visitLogService";
import { useNavigate } from "react-router-dom";

export const useCreateVisitLog = () => {
  const queryClient = useQueryClient();
  const toast = useToast();
  const navigate = useNavigate();

  return useMutation({
    mutationFn: (formData) => createVisitLog(formData),

    onSuccess: (response, variables) => {
      queryClient.invalidateQueries(["visitLogs"]);

      const type = variables.get("type");
      const storeName = variables.get("storeName");

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

      if (type === "IN") {
        navigate(
          `/clienteBusqueda?storeName=${encodeURIComponent(storeName)}`
        );
      }
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