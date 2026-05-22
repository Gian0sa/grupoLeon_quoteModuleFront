import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@chakra-ui/react";
import { createVisitLog } from "../../services/visitLogService";
import { addToQueue } from "../../services/visitLogQueue";
import { useNavigate } from "react-router-dom";

export const useCreateVisitLog = () => {
  const queryClient = useQueryClient();
  const toast = useToast();
  const navigate = useNavigate();

  return useMutation({
    mutationFn: (formData) => {
      const debugObj = {};
      for (const [key, value] of formData.entries()) {
        debugObj[key] = value instanceof File ? value.name : value;
      }
      console.log("🚀 Iniciando check-in con formData:", debugObj);
      console.time("CheckInDuration");
      return createVisitLog(formData);
    },

    onSuccess: (response, variables) => {
      console.timeEnd("CheckInDuration");
      queryClient.invalidateQueries(["visitLogs"]);

      const type = variables.get("type");
      const storeName = variables.get("storeName");

      toast({
        title: type === "IN" ? "Check-in registrado" : "Check-out registrado",
        description: "La visita se registró correctamente.",
        status: "success",
        duration: 4000,
        isClosable: true,
        position: "top",
      });

      if (type === "IN") {
        navigate(`/clienteBusqueda?storeName=${encodeURIComponent(storeName)}`);
      }
    },

    onError: async (error, variables) => {
      console.timeEnd("CheckInDuration");

      const isNetworkError =
        !error?.response ||
        error?.code === "ECONNABORTED" ||
        error?.message === "Network Error";

      if (isNetworkError) {
        await addToQueue(variables);
        toast({
          title: "Sin conexión",
          description: "El check-in se guardó localmente y se enviará cuando haya red.",
          status: "warning",
          icon: "📦",
          duration: 5000,
          isClosable: true,
          position: "top",
        });
      } else {
        toast({
          title: "Error al registrar visita",
          description:
            error?.response?.data?.message || "No se pudo registrar la visita.",
          status: "error",
          duration: 4000,
          isClosable: true,
          position: "top",
        });
      }
    },
  });
};