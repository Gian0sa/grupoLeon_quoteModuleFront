import { axiosInstance } from "../../../shared/lib/axiosInstance";

export const PROMOTIONS_CACHE_KEY = "autopartes_promotions_cache_v1";

/**
 * Lee del almacenamiento local (localStorage) las promociones cacheadas para respuesta instantánea (0ms).
 */
export function getCachedPromotions() {
  try {
    const raw = typeof window !== "undefined" ? localStorage.getItem(PROMOTIONS_CACHE_KEY) : null;
    if (!raw) return undefined;
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === "object" && (parsed.list?.length || Object.keys(parsed.map || {}).length)) {
      return parsed;
    }
  } catch (e) {
    console.warn("Error leyendo promociones en caché de localStorage:", e);
  }
  return undefined;
}

/**
 * Guarda en localStorage las promociones obtenidas del backend.
 */
export function saveCachedPromotions(data) {
  try {
    if (typeof window !== "undefined" && data && (data.list?.length || Object.keys(data.map || {}).length)) {
      localStorage.setItem(PROMOTIONS_CACHE_KEY, JSON.stringify(data));
    }
  } catch (e) {
    console.warn("Error persistiendo promociones en localStorage:", e);
  }
}

/**
 * Obtiene todas las promociones activas desde el backend y actualiza la caché local
 */
export async function fetchActivePromotions(forceRefresh = false) {
  try {
    const res = await axiosInstance.get("/quoteModule/promotions", {
      params: forceRefresh ? { refresh: "true" } : {},
    });
    const data = res.data || { list: [], map: {} };
    if (data && (data.list?.length || Object.keys(data.map || {}).length)) {
      saveCachedPromotions(data);
    }
    return data;
  } catch (error) {
    console.error("Error al obtener promociones:", error);
    const cached = getCachedPromotions();
    if (cached) return cached;
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
