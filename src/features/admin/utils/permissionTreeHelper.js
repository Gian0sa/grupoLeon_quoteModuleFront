/**
 * Helper dinámico para estructurar los servicios y permisos en un árbol jerárquico visual
 * respetando 100% las categorías y endpoints de la base de datos sin omitir ninguna opción.
 */

/**
 * Organiza la lista completa de servicios recibidos del backend en categorías dinámicas 100% fieles a la BD
 */
export function buildPermissionTree(services = []) {
  if (!Array.isArray(services) || services.length === 0) return [];

  const categoriesMap = new Map();

  services.forEach((service) => {
    let rawCategory = "Otros";
    let displayName = service.name || "Servicio";

    if (service.name && service.name.includes(" - ")) {
      const parts = service.name.split(" - ");
      rawCategory = parts[0].trim();
      displayName = parts.slice(1).join(" - ").trim();
    } else if (service.name && service.name.includes("-")) {
      const parts = service.name.split("-");
      rawCategory = parts[0].trim();
      displayName = parts.slice(1).join("-").trim();
    } else if (service.name) {
      rawCategory = service.name.trim();
      displayName = service.name.trim();
    } else if (service.path) {
      rawCategory = service.path.split("/")[1] || "API";
      displayName = `${service.method || "GET"} ${service.path}`;
    }

    const catKey = rawCategory.toLowerCase();

    if (!categoriesMap.has(catKey)) {
      const cleanCode = rawCategory
        .toLowerCase()
        .replace(/[^a-z0-9]/g, "_")
        .replace(/_+/g, "_")
        .replace(/^_+|_+$/g, "") || "modulo";

      categoriesMap.set(catKey, {
        key: catKey,
        name: rawCategory,
        code: cleanCode,
        services: []
      });
    }

    categoriesMap.get(catKey).services.push({
      ...service,
      displayName: displayName || service.name,
      endpointCode: service.method ? `${service.method} ${service.path || ""}` : (service.path || service.name)
    });
  });

  const categoryOrder = [
    "dashboard",
    "cotizaciones",
    "ventas",
    "catálogo",
    "visitas",
    "asistencia",
    "clientes",
    "compras",
    "notificaciones",
    "admin",
    "otros"
  ];

  const result = Array.from(categoriesMap.values()).map((cat) => ({
    ...cat,
    services: cat.services.sort((a, b) => a.displayName.localeCompare(b.displayName))
  }));

  return result.sort((a, b) => {
    const idxA = categoryOrder.indexOf(a.key);
    const idxB = categoryOrder.indexOf(b.key);

    if (idxA !== -1 && idxB !== -1) return idxA - idxB;
    if (idxA !== -1) return -1;
    if (idxB !== -1) return 1;
    return a.name.localeCompare(b.name);
  });
}

/**
 * Determina el estado de selección de un conjunto de servicios
 * @returns {"all" | "partial" | "none"}
 */
export function getSelectionState(serviceList, permittedServices = []) {
  if (!serviceList || serviceList.length === 0) return "none";
  const permSet = new Set((permittedServices || []).map((id) => Number(id)));
  const selectedCount = serviceList.filter((s) => permSet.has(Number(s.id))).length;

  if (selectedCount === 0) return "none";
  if (selectedCount === serviceList.length) return "all";
  return "partial";
}

/**
 * Plantillas predefinidas de roles operativos comunes (1 solo clic)
 */
export const ROLE_PRESETS = {
  vendedor: {
    key: "vendedor",
    label: "Vendedor",
    roleName: "Comercial / Ventas",
    description: "Acceso completo a cotizaciones, catálogo, clientes, visitas, reporte de órdenes y métricas propias.",
    badgeBg: "#dcfce7",
    badgeColor: "#15803d",
    badgeBorder: "#bbf7d0",
    hoverBg: "#bbf7d0",
    patterns: [
      "GET /quotesSellers/:slpCode/:month",
      "GET /quotes",
      "POST /quotes",
      "GET /quotes/:id",
      "PUT /quotes/:id",
      "DELETE /quotes/:id",
      "POST /quotes/sap/create",
      "GET /requestQuotes",
      "GET /orderswithStatus/:code/:estadopedido",
      "GET /order/:code",
      "GET /deliveryNote/:code",
      "GET /invoice/:code",
      "GET /accountsReceivable",
      "GET /reports/:code",
      "GET /pdf/:code",
      "GET /compareOrderDelivery/:orderCode/:deliveryCode",
      "GET /invoiceDeliveryNoteperOrder/:docEntry",
      "POST /statement/share",
      "GET /catalogProducts",
      "GET /catalogProducts/search",
      "GET /catalogProducts/:id",
      "GET /catalogProducts/equivalents",
      "GET /vehicleModels",
      "GET /priceList",
      "GET /brandTypeSubtype",
      "GET /catalogProducts/filters",
      "POST /visit-logs",
      "GET /visit-logs/:id",
      "GET /visit-logs/active/:vendorName",
      "GET /attendance",
      "POST /attendance",
      "GET /clients/:code",
      "GET /historyClient",
      "GET /priceListByItemCodes",
      "GET /clients/transports",
      "GET /clients/payment-terms",
      "GET /notifications",
      "GET /notifications/:id",
      "PUT /profile"
    ]
  },
  facturacion: {
    key: "facturacion",
    label: "Facturación",
    roleName: "Créditos y Cobranzas",
    description: "Aprobación de cotizaciones, conversión a SAP, cuentas por cobrar y reportes de facturación.",
    badgeBg: "#e0f2fe",
    badgeColor: "#0369a1",
    badgeBorder: "#bae6fd",
    hoverBg: "#bae6fd",
    patterns: [
      "GET /quotes",
      "GET /quotes/:id",
      "POST /quotes/approval",
      "POST /quotes/sap/:id/copy-to-order",
      "POST /quotes/sap/:id/copy-to-invoice",
      "GET /orderswithStatus/:code/:estadopedido",
      "GET /orders",
      "GET /order/:code",
      "GET /deliveryNote/:code",
      "GET /invoice/:code",
      "GET /accountsReceivable",
      "GET /reports",
      "GET /reports/:code",
      "GET /pdf/:code",
      "GET /invoiceDeliveryNoteperOrder/:docEntry",
      "POST /statement/share",
      "GET /clients/:code",
      "GET /historyClient",
      "GET /historyClientAdmin",
      "GET /clients/payment-terms",
      "GET /purchaseOrdersImportacion",
      "GET /notifications",
      "GET /notifications/:id",
      "PUT /profile",
      "GET /attendance",
      "POST /attendance"
    ]
  },
  supervisor: {
    key: "supervisor",
    label: "Supervisor",
    roleName: "Jefatura Comercial",
    description: "Todo el perfil comercial + panel global de metas, aprobación de cotizaciones y reglas comerciales.",
    badgeBg: "#f3e8ff",
    badgeColor: "#7e22ce",
    badgeBorder: "#e9d5ff",
    hoverBg: "#e9d5ff",
    patterns: [
      "GET /quotesSellers/:slpCode/:month",
      "GET /AdminQuotesSellers/:slpCode/:month",
      "GET /sellers",
      "GET /quotes",
      "POST /quotes",
      "GET /quotes/:id",
      "PUT /quotes/:id",
      "DELETE /quotes/:id",
      "POST /quotes/sap/create",
      "POST /quotes/approval",
      "POST /quotes/sap/:id/copy-to-order",
      "POST /quotes/sap/:id/copy-to-invoice",
      "GET /requestQuotes",
      "POST /promotions",
      "GET /orderswithStatus/:code/:estadopedido",
      "GET /orders",
      "GET /order/:code",
      "GET /deliveryNote/:code",
      "GET /invoice/:code",
      "GET /accountsReceivable",
      "GET /reports",
      "GET /reports/:code",
      "GET /pdf/:code",
      "GET /compareOrderDelivery/:orderCode/:deliveryCode",
      "GET /invoiceDeliveryNoteperOrder/:docEntry",
      "POST /statement/share",
      "GET /catalogProducts",
      "GET /catalogProducts/search",
      "GET /catalogProducts/:id",
      "GET /catalogProducts/equivalents",
      "GET /vehicleModels",
      "GET /priceList",
      "GET /brandTypeSubtype",
      "GET /catalogProducts/filters",
      "GET /visit-logs",
      "GET /visit-logs/:id",
      "POST /visit-logs",
      "GET /visit-logs/active/:vendorName",
      "GET /visit-logs/seller/:sellerCode",
      "GET /attendance",
      "POST /attendance",
      "GET /clients/:code",
      "GET /historyClient",
      "GET /historyClientAdmin",
      "GET /priceListByItemCodes",
      "GET /clients/transports",
      "GET /clients/payment-terms",
      "GET /rules",
      "GET /rules/:id",
      "GET /exchangeRate",
      "GET /notifications",
      "GET /notifications/:id",
      "PUT /profile"
    ]
  },
  admin: {
    key: "admin",
    label: "Admin",
    roleName: "Acceso Total",
    description: "Selecciona el 100% de los servicios y rutas del sistema sin restricciones.",
    badgeBg: "#fee2e2",
    badgeColor: "#b91c1c",
    badgeBorder: "#fecaca",
    hoverBg: "#fecaca"
  },
  limpiar: {
    key: "limpiar",
    label: "Limpiar",
    roleName: "Desmarcar Todo",
    description: "Desmarca todos los permisos para configurar un perfil personalizado desde cero.",
    badgeBg: "#f1f5f9",
    badgeColor: "#475569",
    badgeBorder: "#e2e8f0",
    hoverBg: "#e2e8f0"
  }
};

/**
 * Obtiene la lista de IDs de servicios según la plantilla de rol seleccionada
 */
export function getPresetServiceIds(presetKey, allServices = []) {
  if (!presetKey || !Array.isArray(allServices) || allServices.length === 0) return [];

  if (presetKey === "admin") {
    return allServices.map((s) => Number(s.id));
  }

  if (presetKey === "limpiar" || presetKey === "clear") {
    return [];
  }

  const preset = ROLE_PRESETS[presetKey];
  if (!preset || !Array.isArray(preset.patterns)) return [];

  const patternSet = new Set(preset.patterns.map((p) => p.trim()));
  const matchedIds = new Set();

  allServices.forEach((service) => {
    const sId = Number(service.id);
    const key = `${(service.method || "").toUpperCase()} ${(service.path || "").trim()}`.trim();
    if (patternSet.has(key)) {
      matchedIds.add(sId);
    }
  });

  return Array.from(matchedIds);
}
