import { axiosInstance } from "../../../shared/lib/axiosInstance";

/**
 * Obtiene todas las promociones activas desde el backend
 */
export async function fetchActivePromotions(forceRefresh = false) {
  try {
    const res = await axiosInstance.get("/quoteModule/promotions", {
      params: forceRefresh ? { refresh: "true" } : {},
    });
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
  const cleanCode = String(productCode || "").trim();
  const res = await axiosInstance.delete("/quoteModule/promotions", {
    params: { productCode: cleanCode },
  });
  return res.data;
}
