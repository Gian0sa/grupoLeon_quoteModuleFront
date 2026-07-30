import { axiosInstance } from "../../../shared/lib/axiosInstance";

// Obtener productos paginados con filtros (retorna JSON data array)
export const getProducts = async (page = 1, limit = 9, filters = {}) => {
  try {
    const params = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString()
    });

    if (filters.fabricanteId) params.append('fabricanteId', filters.fabricanteId);
    if (filters.marcaId) params.append('marcaId', filters.marcaId);
    if (filters.tipoId) params.append('tipoId', filters.tipoId);
    if (filters.segmentoId) params.append('segmentoId', filters.segmentoId);
    if (filters.documentoOrigenId) params.append('documentoOrigenId', filters.documentoOrigenId);
    if (filters.code) params.append('code', filters.code.trim());
    if (filters.slug) params.append('slug', filters.slug);
    if (filters.esPropio !== undefined && filters.esPropio !== '') {
      params.append('esPropio', filters.esPropio);
    }
    
    if (filters.medidas && Object.keys(filters.medidas).length > 0) {
      params.append('medidas', JSON.stringify(filters.medidas));
    }

    const response = await axiosInstance.get(`/catalogModule/catalogProducts/raw-feed?${params.toString()}`);
    console.log("RAW_FEED_RESPONSE", response.data);
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
export const getProductEquivalents = async (slug, page = 1, limit = 9, tipoId = null, documentoOrigenId = null, searchCode = null, mode = 'deep') => {
  try {
    const params = new URLSearchParams({
      slug,
      page: page.toString(),
      limit: limit.toString(),
      mode
    });
    
    if (tipoId) params.append('tipoId', tipoId.toString());
    if (documentoOrigenId) params.append('documentoOrigenId', documentoOrigenId.toString());
    if (searchCode) params.append('searchCode', searchCode);

    const response = await axiosInstance.get(`/catalogModule/catalogProducts/equivalents/raw-feed?${params.toString()}`);
    return response.data;
  } catch (error) {
    console.error("Error al obtener equivalentes:", error);
    throw error;
  }
};

// Obtener trazabilidad de una equivalencia (por qué conecta A con B)
export const getTraceEquivalence = async (slugA, slugB) => {
  try {
    const params = new URLSearchParams({ slugA, slugB });
    const response = await axiosInstance.get(`/catalogModule/catalogProducts/trace-equivalence?${params.toString()}`);
    return response.data;
  } catch (error) {
    console.error("Error al obtener trazabilidad de la equivalencia:", error);
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
