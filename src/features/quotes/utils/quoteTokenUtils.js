import { axiosInstance } from "../../../shared/lib/axiosInstance";

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

/**
 * Genera un código corto único, dinámico y legible para la cotización
 * Formato: q-<identificador>-<randomHex>
 * Ejemplo: q-00027-a1b2, q-339-e4d8
 */
export const generateShortQuoteCode = (quote) => {
  let idPart = "";
  if (quote?.docNumber) {
    idPart = String(quote.docNumber).replace(/\D/g, "");
  }
  if (!idPart && quote?.id) {
    idPart = String(quote.id);
  }
  if (!idPart && quote?.sapDocNum) {
    idPart = String(quote.sapDocNum);
  }
  if (!idPart && (quote?.clientDocument || quote?.clientRuc || quote?.clientCode)) {
    idPart = String(quote.clientDocument || quote.clientRuc || quote.clientCode).replace(/\D/g, "").slice(-4);
  }
  idPart = idPart ? idPart.slice(-5) : "doc";

  const randomPart = Math.random().toString(36).substring(2, 6);
  return `q-${idPart}-${randomPart}`;
};

/**
 * Guarda localmente en localStorage con vigencia estricta de 7 días
 */
export const saveLocalQuote = (code, quote) => {
  try {
    if (!code || !quote) return;
    const key = `quote_share_${code}`;
    const expiresAt = Date.now() + SEVEN_DAYS_MS;
    localStorage.setItem(key, JSON.stringify({ ...quote, shareCode: code, shareExpiresAt: expiresAt }));

    const indexKey = "quote_share_index";
    const existing = JSON.parse(localStorage.getItem(indexKey) || "[]");
    if (!existing.includes(code)) {
      existing.unshift(code);
      if (existing.length > 50) existing.pop();
      localStorage.setItem(indexKey, JSON.stringify(existing));
    }
  } catch (err) {
    console.warn("No se pudo guardar cotización en localStorage:", err);
  }
};

/**
 * Recupera la cotización desde localStorage comprobando que no esté expirada
 */
export const getLocalQuote = (code) => {
  try {
    if (!code) return null;
    const key = `quote_share_${code}`;
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed.shareExpiresAt && Date.now() > parsed.shareExpiresAt) {
      localStorage.removeItem(key);
      return { expired: true, message: "Enlace vencido. Las cotizaciones tienen una vigencia máxima de 7 días." };
    }
    return parsed;
  } catch {
    return null;
  }
};

/**
 * Genera el enlace corto público dinámico y seguro (vigencia de 7 días)
 */
export const createShortQuoteUrl = async (quote) => {
  if (!quote) return "";

  const baseUrl = typeof window !== "undefined" ? window.location.origin : "";
  const code = generateShortQuoteCode(quote);
  saveLocalQuote(code, quote);

  try {
    const response = await axiosInstance.post("/quoteModule/quotes/share", {
      code,
      quote,
    });
    if (response.data?.code) {
      const finalCode = response.data.code;
      saveLocalQuote(finalCode, quote);
      return `${baseUrl}/c/${finalCode}`;
    }
  } catch (error) {
    console.warn("Backend offline o error al sincronizar enlace de cotización:", error?.message);
  }

  return `${baseUrl}/c/${code}`;
};

/**
 * Consulta pública de una cotización por su código corto
 */
export const fetchPublicQuoteByCode = async (code) => {
  if (!code) return null;

  // 1. Intentar desde el backend con timestamp para forzar lectura fresca
  try {
    const response = await axiosInstance.get(`/quoteModule/quotes/share/${encodeURIComponent(code)}?_t=${Date.now()}`, {
      headers: { "Cache-Control": "no-cache", Pragma: "no-cache" },
    });
    if (response.data) {
      if (response.data.expired) {
        try { localStorage.removeItem(`quote_share_${code}`); } catch {}
        return response.data;
      }
      saveLocalQuote(code, response.data);
      return response.data;
    }
  } catch (error) {
    if (error?.response?.status === 410 || error?.response?.data?.expired) {
      try { localStorage.removeItem(`quote_share_${code}`); } catch {}
      return { expired: true, message: error?.response?.data?.message || "Enlace vencido. Las cotizaciones tienen una vigencia máxima de 7 días." };
    }
    console.warn("No se pudo consultar al backend quoteModule, verificando almacenamiento local:", error?.message);
  }

  // 2. Fallback a almacenamiento local si no hay internet o está en caché
  return getLocalQuote(code);
};
