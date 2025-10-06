import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@chakra-ui/react";
import {
  postCreateProduct,
  updateProduct,
  deleteProduct,
} from "../../services/catalogServices";

// Crear producto
export const useCreateProduct = () => {
  const queryClient = useQueryClient();
  const toast = useToast();

  return useMutation({
    mutationFn: (data) => postCreateProduct(data),
    onSuccess: () => {
      queryClient.invalidateQueries(["products"]);
      toast({
        title: "Producto creado",
        description: "El producto se creó correctamente.",
        status: "success",
        duration: 4000,
        isClosable: true,
        position: "top",
      });
    },
    onError: (error) => {
     toast({
        title: "Error al crear producto",
        description: error?.response?.data?.message || "No se pudo crear el producto.",
        status: "error",
        duration: 4000,
        isClosable: true,
        position: "top",
      });
    },
  });
};

// Actualizar producto
export const useUpdateProduct = () => {
  const queryClient = useQueryClient();
  const toast = useToast();

  return useMutation({
    mutationFn: ({ id, data }) => updateProduct(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries(["products"]);
      queryClient.invalidateQueries(["product", variables.id]);
      toast({
        title: "Producto actualizado",
        description: "El producto se actualizó correctamente.",
        status: "success",
        duration: 4000,
        isClosable: true,
        position: "top",
      });
    },
    onError: (error) => {
      toast({
        title: "Error al actualizar",
        description: error?.response?.data?.message || "No se pudo actualizar el producto.",
        status: "error",
        duration: 4000,
        isClosable: true,
        position: "top",
      });
    },
  });
};

// Eliminar producto
export const useDeleteProduct = () => {
  const queryClient = useQueryClient();
  const toast = useToast();

  return useMutation({
    mutationFn: (id) => deleteProduct(id),
    onSuccess: () => {
      queryClient.invalidateQueries(["products"]);
      toast({
        title: "Producto eliminado",
        description: "El producto se eliminó correctamente.",
        status: "success",
        duration: 4000,
        isClosable: true,
        position: "top",
      });
    },
    onError: (error) => {
      toast({
        title: "Error al eliminar",
        description: error?.response?.data?.message || "No se pudo eliminar el producto.",
        status: "error",
        duration: 4000,
        isClosable: true,
        position: "top",
      });
    },
  });
};