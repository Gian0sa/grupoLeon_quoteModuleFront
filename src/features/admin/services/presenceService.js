import { axiosInstance } from "../../../shared/lib/axiosInstance";

/**
 * Servicio para consultar el monitor de presencia y utilidades de traducción de rutas y dispositivos
 */

export const getPresenceUsers = async () => {
  const response = await axiosInstance.get("/quoteModule/presence/users");
  return response.data || [];
};

// ─── Diccionario de Traducción de Rutas del Sistema ───────────────────────────
export const PAGE_NAMES = {
  "/": "Inicio de Sesión",
  "/dashboard": "Inicio / Métricas",
  "/historyquotes": "Gestión de Cotizaciones",
  "/newquotes": "Nueva Cotización",
  "/reports": "Pedidos y Facturación",
  "/receivable": "Cuentas por Cobrar",
  "/productsPriceList": "Lista de Precios",
  "/catalog": "Catálogo de Productos",
  "/importaciones": "Importaciones",
  "/visitLog": "Registro de Visitas",
  "/visitMap": "Mapa de Visitas",
  "/VisitMap": "Mapa de Visitas",
  "/myVisits": "Mis Visitas",
  "/newClients": "Clientes Nuevos",
  "/entrada": "Control de Asistencia",
  "/admin/attendance": "Gestión de Asistencias (Admin)",
  "/profileAdmin": "Gestión de Usuarios",
  "/notification": "Gestión de Notificaciones",
  "/profile": "Mi Perfil",
  "/faq": "Preguntas Frecuentes",
  "/admin/online-users": "Monitor de Usuarios en Línea",
  "/clienteBusqueda": "Búsqueda de Clientes",
  "/OrdersDashboard": "Monitoreo de Pedidos",
  "/clienteInfo": "Información de Cliente",
  "/approvals": "Aprobación de Cotizaciones",
  "/configrules": "Reglas y Parámetros",
};

/**
 * Traduce una ruta técnica a un título legible para el negocio
 */
export function translateRoute(path) {
  if (!path || typeof path !== "string") return "Desconocida";
  const cleanPath = path.split("?")[0].replace(/\/+$/, "") || "/";

  // Coincidencia exacta
  if (PAGE_NAMES[cleanPath]) {
    return PAGE_NAMES[cleanPath];
  }

  // Rutas dinámicas
  if (cleanPath.startsWith("/catalog/product/")) {
    return "Detalle de Producto";
  }
  if (cleanPath.startsWith("/catalog/edit/")) {
    return "Editar Producto de Catálogo";
  }
  if (cleanPath === "/catalog/create") {
    return "Crear Producto de Catálogo";
  }
  if (cleanPath.startsWith("/s/") || cleanPath.startsWith("/statement/") || cleanPath.startsWith("/estado-cuenta/")) {
    return "Estado de Cuenta Cliente";
  }

  return cleanPath;
}

/**
 * Detección nativa ultra liviana de dispositivo, navegador y sistema operativo
 * Sin librerías pesadas ni fingerprinting invasivo
 */
export function getDeviceDetails() {
  if (typeof window === "undefined" || !navigator) {
    return { type: "Desktop", browser: "Web", os: "Desconocido" };
  }

  const ua = navigator.userAgent || "";

  // 1. Tipo de Dispositivo
  let type = "Desktop";
  if (/(tablet|ipad|playbook|silk)|(android(?!.*mobi))/i.test(ua)) {
    type = "Tablet";
  } else if (/Mobile|Android|iP(hone|od)|IEMobile|BlackBerry|Kindle|Silk-Accelerated|(hpw|web)OS|Opera M(obi|ini)/i.test(ua)) {
    type = "Mobile";
  }

  // 2. Sistema Operativo
  let os = "Desconocido";
  if (/Windows NT 10.0/i.test(ua)) os = "Windows 10/11";
  else if (/Windows NT 6.3/i.test(ua)) os = "Windows 8.1";
  else if (/Windows NT 6.1/i.test(ua)) os = "Windows 7";
  else if (/Windows/i.test(ua)) os = "Windows";
  else if (/Android/i.test(ua)) os = "Android";
  else if (/iPhone|iPad|iPod/i.test(ua)) os = "iOS";
  else if (/Macintosh|Mac OS X/i.test(ua)) os = "macOS";
  else if (/Linux/i.test(ua)) os = "Linux";

  // 3. Navegador
  let browser = "Navegador Web";
  if (/Edg\//i.test(ua)) browser = "Edge";
  else if (/OPR\/|Opera/i.test(ua)) browser = "Opera";
  else if (/Chrome\//i.test(ua)) browser = "Chrome";
  else if (/Safari\//i.test(ua) && !/Chrome\//i.test(ua)) browser = "Safari";
  else if (/Firefox\//i.test(ua)) browser = "Firefox";

  return { type, browser, os };
}

/**
 * Formatea la última actividad en texto amigable ("Ahora", "Hace 2 min", etc.)
 */
export function formatRelativeActivity(timestamp) {
  if (!timestamp) return "Desconocida";
  const now = Date.now();
  const diffSec = Math.floor((now - timestamp) / 1000);

  if (diffSec < 15) return "Ahora";
  if (diffSec < 60) return `Hace ${diffSec} s`;

  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `Hace ${diffMin} min`;

  const diffHours = Math.floor(diffMin / 60);
  if (diffHours < 24) return `Hace ${diffHours} h`;

  const diffDays = Math.floor(diffHours / 24);
  return `Hace ${diffDays} día${diffDays > 1 ? "s" : ""}`;
}

/**
 * Calcula la duración de sesión ("32 min", "1 h 12 min")
 */
export function formatSessionDuration(connectedAt) {
  if (!connectedAt) return "-";
  const now = Date.now();
  const diffMin = Math.floor((now - connectedAt) / 60000);

  if (diffMin < 1) return "< 1 min";
  if (diffMin < 60) return `${diffMin} min`;

  const hours = Math.floor(diffMin / 60);
  const remainingMin = diffMin % 60;
  return `${hours} h ${remainingMin} min`;
}
