import { axiosInstance } from "../../../shared/lib/axiosInstance";

// Crear producto
export const postCreateProduct = async (data) => {
  try {
    const response = await axiosInstance.post(`/catalogModule/catalogProducts`, data);
    return response.data;
  } catch (error) {
    console.error("Error al crear producto:", error);
    throw error;
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

export const searchProducts = async (searchParams) => {
  try {
    // Si no hay parámetros, retornar array vacío
    if (!searchParams?.query && !searchParams?.year) {
      return [];
    }

    // Construir los query params
    const params = {};
    
    if (searchParams?.query) {
      params.q = searchParams.query;
    }
    
    if (searchParams?.year) {
      params.year = searchParams.year;
    }

    const response = await axiosInstance.get(`/catalogModule/catalogProducts/search`, {
      params
    });
    
    return response.data;
  } catch (error) {
    console.error('Error al buscar productos:', error);
    throw error;
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
