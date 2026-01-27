import { axiosInstance } from "../../../shared/lib/axiosInstance";

// Crear Check IN / OUT
export const createVisitLog = async (data) => {
  try {
    const debugObj = {};
    for (const [key, value] of data.entries()) {
    debugObj[key] = value instanceof File ? value.name : value;
    }

    console.log(debugObj);


    const response = await axiosInstance.post(
      `/reportModule/visit-logs`,
      data
    );
    return response.data;
  } catch (error) {
    console.error("Error al crear VisitLog:", error);
    throw error;
  }
};

// Obtener todos los registros
export const getAllVisitLogs = async () => {
  try {
    const response = await axiosInstance.get(
      `/reportModule/visit-logs`
    );
    return response.data;
  } catch (error) {
    console.error("Error al obtener VisitLogs:", error);
    return [];
  }
};

// Obtener registro por ID
export const getVisitLogById = async (id) => {
  try {
    const response = await axiosInstance.get(
      `/reportModule/visit-logs/${id}`
    );
    return response.data;
  } catch (error) {
    console.error("Error al obtener VisitLog por ID:", error);
    return null;
  }
};
