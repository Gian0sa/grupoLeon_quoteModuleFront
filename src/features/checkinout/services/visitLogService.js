import { axiosInstance } from "../../../shared/lib/axiosInstance";

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

export const getActiveVisitByVendor = async (vendorName) => {
  try {
    const response = await axiosInstance.get(
      `/reportModule/visit-logs/active/${vendorName}`
    );

    console.log(response.data);

    return response.data;
  } catch (error) {
    if (error.response?.status === 404) {
      return null;
    }

    console.error("Error al obtener visita activa:", error);
    throw error;
  }
};

export const getMyVisitLogs = async () => {
  try {
    const response = await axiosInstance.get(
      `/reportModule/my-visits`
    );

    return response.data;
  } catch (error) {
    console.error("Error al obtener mis VisitLogs:", error);
    return { total: 0, visits: [] };
  }
};