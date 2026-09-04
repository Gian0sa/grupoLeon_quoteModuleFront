import { axiosInstance } from "../../../shared/lib/axiosInstance";

/**
 * Obtiene todas las promociones activas desde el backend
 */
export async function fetchActivePromotions() {
  try {
    const res = await axiosInstance.get("/quoteModule/promotions");
    return res.data || { list: [], map: {} };
  } catch (error) {
    console.error("Error al obtener promociones:", error);
    return { list: [], map: {} };
  }
}

/**
 * Guarda o actualiza la promoción para un producto
 */
export async function savePromotion(promotionData) {
  const res = await axiosInstance.post("/quoteModule/promotions", promotionData);
  return res.data;
}

/**
 * Elimina o desactiva la promoción de un producto
 */
export async function deletePromotion(productCode) {
  const res = await axiosInstance.delete(`/quoteModule/promotions/${productCode}`);
  return res.data;
}
