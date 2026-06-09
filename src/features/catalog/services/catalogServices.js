import { axiosInstance } from "../../../shared/lib/axiosInstance";

// Obtener productos paginados con filtros
export const getProducts = async (page = 1, limit = 9, filters = {}) => {
  try {
    const params = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString()
    });

    if (filters.fabricanteId) params.append('filters[fabricanteId]', filters.fabricanteId);
    if (filters.marcaId) params.append('filters[marcaId]', filters.marcaId);
    if (filters.tipoId) params.append('filters[tipoId]', filters.tipoId);
    if (filters.segmentoId) params.append('filters[segmentoId]', filters.segmentoId);
    if (filters.documentoOrigenId) params.append('filters[documentoOrigenId]', filters.documentoOrigenId);
    if (filters.code) params.append('filters[code]', filters.code);
    if (filters.slug) params.append('filters[slug]', filters.slug);
    
    if (filters.medidas) {
      Object.entries(filters.medidas).forEach(([key, val]) => {
        if (val) {
          params.append(`filters[medidas][${key}]`, val);
        }
      });
    }

    const response = await axiosInstance.get(`/catalogModule/catalogProducts?${params.toString()}`);
    return response.data;
  } catch (error) {
    console.error("Error al obtener productos:", error);
    throw error;
  }
};

// Obtener metadata de filtros
export const getFilterMetadata = async () => {
  try {
    const response = await axiosInstance.get(`/catalogModule/catalogProducts/filters`);
    return response.data;
  } catch (error) {
    console.error("Error al obtener metadata de filtros:", error);
    throw error;
  }
};

// Obtener equivalentes
export const getProductEquivalents = async (slug, page = 1, limit = 9, tipoId = null, documentoOrigenId = null, searchCode = null) => {
  try {
    const params = new URLSearchParams({
      slug,
      page: page.toString(),
      limit: limit.toString()
    });
    
    if (tipoId) params.append('tipoId', tipoId.toString());
    if (documentoOrigenId) params.append('documentoOrigenId', documentoOrigenId.toString());
    if (searchCode) params.append('searchCode', searchCode);

    const response = await axiosInstance.get(`/catalogModule/catalogProducts/equivalents?${params.toString()}`);
    return response.data;
  } catch (error) {
    console.error("Error al obtener equivalentes:", error);
    throw error;
  }
};

// Obtener aplicaciones
export const getProductApplications = async (slug, page = 1, limit = 9) => {
  try {
    const params = new URLSearchParams({
      slug,
      page: page.toString(),
      limit: limit.toString()
    });
    const response = await axiosInstance.get(`/catalogModule/catalogProducts/applications?${params.toString()}`);
    return response.data;
  } catch (error) {
    console.error("Error al obtener aplicaciones:", error);
    throw error;
  }
};
