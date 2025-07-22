import { useMutation } from "@tanstack/react-query";
import {
  createRule,
  updateRule,
  deleteRule,
} from "../../../shared/api/configModuleService";

export function useRuleMutations() {
  const createRuleMutation = useMutation({
    mutationFn: createRule,
    onSuccess: (data) => {
      console.log("Regla creada:", data);
      // Aquí puedes hacer más cosas, como redirigir o limpiar un store si usas Zustand
    },
    onError: (error) => {
      console.error("Error al crear regla:", error);
    },
  });

  const updateRuleMutation = useMutation({
    mutationFn: ({ id, updatedData }) => updateRule(id, updatedData),
    onSuccess: (data) => {
      console.log("Regla actualizada:", data);
    },
    onError: (error) => {
      console.error("Error al actualizar regla:", error);
    },
  });

  const deleteRuleMutation = useMutation({
    mutationFn: deleteRule,
    onSuccess: (data) => {
      console.log("Regla eliminada:", data);
    },
    onError: (error) => {
      console.error("Error al eliminar regla:", error);
    },
  });

  return {
    createRuleMutation,
    updateRuleMutation,
    deleteRuleMutation,
  };
}
