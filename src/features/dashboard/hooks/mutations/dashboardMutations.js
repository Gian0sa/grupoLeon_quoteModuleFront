import { useMutation, useQueryClient } from "@tanstack/react-query";
import { 
    createNotification,
    updateNotification,
    deleteNotification,
} from "../../services/notificationService";
import { useToast } from "@chakra-ui/react";

// ✅ Crear notificación
export const useCreateNotification = () => {
  const queryClient = useQueryClient();
  const toast = useToast();

  return useMutation({
    mutationFn: createNotification,
    onSuccess: () => {
      queryClient.invalidateQueries(["notifications"]);
      toast({
        title: "Notificación creada",
        description: "La notificación se creó correctamente.",
        status: "success",
        duration: 4000,
        isClosable: true,
        position: "top",
      });
    },
    onError: (error) => {
      toast({
        title: "Error al crear",
        description: error?.response?.data?.message || "No se pudo crear la notificación.",
        status: "error",
        duration: 4000,
        isClosable: true,
        position: "top",
      });
    },
  });
};

// ✅ Actualizar notificación
export const useUpdateNotification = () => {
  const queryClient = useQueryClient();
  const toast = useToast();

  return useMutation({
    mutationFn: ({ id, data }) => updateNotification(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries(["notifications"]);
      queryClient.invalidateQueries(["notification", variables.id]);
      toast({
        title: "Notificación actualizada",
        description: "La notificación se actualizó correctamente.",
        status: "success",
        duration: 4000,
        isClosable: true,
        position: "top",
      });
    },
    onError: (error) => {
      toast({
        title: "Error al actualizar",
        description: error?.response?.data?.message || "No se pudo actualizar la notificación.",
        status: "error",
        duration: 4000,
        isClosable: true,
        position: "top",
      });
    },
  });
};

// ✅ Eliminar notificación
export const useDeleteNotification = () => {
  const queryClient = useQueryClient();
  const toast = useToast();

  return useMutation({
    mutationFn: deleteNotification,
    onSuccess: () => {
      queryClient.invalidateQueries(["notifications"]);
      toast({
        title: "Notificación eliminada",
        description: "La notificación se eliminó correctamente.",
        status: "success",
        duration: 4000,
        isClosable: true,
        position: "top",
      });
    },
    onError: (error) => {
      toast({
        title: "Error al eliminar",
        description: error?.response?.data?.message || "No se pudo eliminar la notificación.",
        status: "error",
        duration: 4000,
        isClosable: true,
        position: "top",
      });
    },
  });
};
