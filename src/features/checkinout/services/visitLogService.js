import { axiosInstance } from "../../../shared/lib/axiosInstance";

export const createVisitLog = async (data) => {
  const debugObj = {};
  for (const [key, value] of data.entries()) {
    debugObj[key] = value instanceof File ? value.name : value;
  }

  console.log("📥 Datos a enviar:", debugObj);
  const startTime = Date.now();

  try {
    const response = await axiosInstance.post(`/reportModule/visit-logs`, data);
    const endTime = Date.now();
    console.log(`✅ Check-in completado en ${endTime - startTime} ms`, response.data);
    return response.data;
  } catch (error) {
    const endTime = Date.now();
    console.error(`❌ Error al crear VisitLog (duró ${endTime - startTime} ms):`, error);
    throw error;
  }
};

export const getAllVisitLogs = async (filters = {}) => {
  try {
    const params = new URLSearchParams();

    if (filters.vendor && filters.vendor !== "all") {
      params.append("vendor", filters.vendor);
    }

    if (filters.status && filters.status !== "all") {
      params.append("status", filters.status);
    }

    if (filters.dateFrom) {
      params.append("from", filters.dateFrom);
    }

    if (filters.dateTo) {
      params.append("to", filters.dateTo);
    }

    if (filters.search) {
      params.append("search", filters.search);
    }

    const response = await axiosInstance.get(
      `/reportModule/visit-logs?${params.toString()}`
    );

    return response.data;

  } catch (error) {
    console.error("Error al obtener VisitLogs:", error);
    return { visits: [] };
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

export const getClientImage = async (sapCode) => {
  console.log("sapCode", sapCode);
  const startTime = Date.now();

  try {
    if (!sapCode) {
      throw new Error("sapCode es requerido");
    }

    const response = await axiosInstance.get(
      `/reportModule/last-image/${sapCode}`
    );

    const endTime = Date.now();
    console.log(
      `🖼️ Imagen cliente obtenida en ${endTime - startTime} ms`,
      response.data
    );

    return response.data;
  } catch (error) {
    const endTime = Date.now();

    console.error(
      `❌ Error obteniendo imagen del cliente (${endTime - startTime} ms):`,
      error
    );

    return {
      hasImage: false,
      imageUrl: null,
      isValid: false,
      message: "Error obteniendo imagen",
    };
  }
};