import { axiosInstance } from "../../../shared/lib/axiosInstance";

// Crear producto
export const postCreateProduct = async (data) => {
  try {
    const response = await axiosInstance.post(`/catalogModule/catalogProducts`, data);
    return response.data;
  } catch (error) {
    console.error("Error al crear producto:", error);
    return null;
  }
};

// Obtener todos los productos
export const getAllProducts = async () => {
  try {
    const response = await axiosInstance.get(`/catalogModule/catalogProducts`);
    return response.data;
  } catch (error) {
    console.error("Error al obtener productos:", error);
    return [];
  }
};

// Buscar productos (ejemplo: ?q=nombre)
export const searchProducts = async (query) => {
  try {
    const response = await axiosInstance.get(`/catalogModule/catalogProducts/search`, {
      params: { q: query },
    });
    return response.data;
  } catch (error) {
    console.error("Error al buscar productos:", error);
    return [];
  }
};

// Obtener producto por ID
export const getProductById = async (id) => {
  try {
    const response = await axiosInstance.get(`/catalogModule/catalogProducts/${id}`);
    return response.data;
  } catch (error) {
    console.error("Error al obtener producto por ID:", error);
    return null;
  }
};

// Actualizar producto
export const updateProduct = async (id, data) => {
  try {
    const response = await axiosInstance.put(`/catalogModule/catalogProducts/${id}`, data);
    return response.data;
  } catch (error) {
    console.error("Error al actualizar producto:", error);
    return null;
  }
};

// Eliminar producto (lógico)
export const deleteProduct = async (id) => {
  try {
    const response = await axiosInstance.delete(`/catalogModule/catalogProducts/${id}`);
    return response.data;
  } catch (error) {
    console.error("Error al eliminar producto:", error);
    return null;
  }
};

// Obtener modelos de vehículos
export const getVehicleModels = async () => {
  try {
    const response = await axiosInstance.get(`/catalogModule/vehicleModels`);
    return response.data;
  } catch (error) {
    console.error("Error al obtener modelos de vehículos:", error);
    return [];
  }
};
