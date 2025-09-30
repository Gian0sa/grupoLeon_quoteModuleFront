import { useQuery } from "@tanstack/react-query";
import {
  getAllProducts,
  searchProducts,
  getProductById,
  getVehicleModels,
} from "../../services/catalogServices";

// Obtener todos los productos
export const useProducts = () => {
  return useQuery({
    queryKey: ["products"],
    queryFn: getAllProducts,
  });
};

// Buscar productos
export const useSearchProducts = (query) => {
  return useQuery({
    queryKey: ["productsSearch", query],
    queryFn: () => searchProducts(query),
    enabled: !!query,
  });
};

// Obtener producto por ID
export const useProductById = (id) => {
  return useQuery({
    queryKey: ["product", id],
    queryFn: () => getProductById(id),
    enabled: !!id,
  });
};

// Obtener modelos de vehículos
export const useVehicleModels = () => {
  return useQuery({
    queryKey: ["vehicleModels"],
    queryFn: getVehicleModels,
  });
};
