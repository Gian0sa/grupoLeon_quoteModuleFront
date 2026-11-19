import { useAuthStore } from "../../features/auth/stores/useAuthStore";

export const MASTER_ADMIN_IDS = [2, 10, 12, 15, 16, 17, 35, 42];

// Únicos Administradores Maestros con visibilidad/auditoría global de borradores: Enrique (10) y Misael (12)
export const DRAFT_MASTER_ADMIN_IDS = [10, 12];

export function isDraftMasterAdmin({ userId, username, role } = {}) {
  const roleUpper = String(role || "").toUpperCase().trim();
  if (
    roleUpper.includes("FACTUR") ||
    roleUpper.includes("VENDEDOR") ||
    roleUpper.includes("ASESOR") ||
    roleUpper.includes("DIGIT")
  ) {
    return false;
  }

  const numericId = Number(userId);
  if (!Number.isNaN(numericId) && numericId > 0 && DRAFT_MASTER_ADMIN_IDS.includes(numericId)) {
    return true;
  }
  const normUser = String(username || "").toLowerCase().trim();
  if (!normUser) return false;
  return normUser.includes("misael") || normUser.includes("cumapa") || normUser.includes("enrique");
}

export function useIsDraftMasterAdmin() {
  const userId = useAuthStore((state) => state.userId);
  const username = useAuthStore((state) => state.username);
  const role = useAuthStore((state) => state.role);

  return isDraftMasterAdmin({
    userId: userId ?? localStorage.getItem("userId"),
    username: username || localStorage.getItem("username"),
    role: role || localStorage.getItem("role"),
  });
}

/**
 * Función pura para validar si un usuario posee privilegios de Administrador / Maestro
 * Puede recibir endpoints (array) y username (string)
 */
export function checkIsAdmin(endpoints = [], username = "") {
  const normUser = String(username || "").toLowerCase().trim();
  const endpointsList = Array.isArray(endpoints) ? endpoints : [];

  return (
    // Endpoints maestros exclusivos de administración de usuarios y sistema en backend
    endpointsList.includes("PUT:/profile/admin/:userId") ||
    endpointsList.includes("PUT /profile/admin/:userId") ||
    endpointsList.includes("*") ||
    // Nombres o alias reconocidos de administradores del sistema
    normUser === "admin" ||
    normUser === "administrador" ||
    normUser.includes("misael") ||
    normUser.includes("cumapa") ||
    normUser.includes("enrique") ||
    normUser.includes("jorge") ||
    normUser.includes("edwin") ||
    normUser.includes("jimmy") ||
    normUser.includes("punkay") ||
    ((normUser === "julio" || normUser.startsWith("julio ")) && !normUser.includes("flores"))
  );
}

/**
 * Determina si un usuario tiene facultad de Gerencia / Administrador Maestro
 * para aprobar y emitir Transferencias Gratuitas (TaxOnly) a SAP B1.
 * Las usuarias de FACTURACION validan/pre-aprueban y derivan a PENDIENTE_GERENCIA (Juan).
 */
export function canEmitTaxOnlyToSap({ userId, role, username, endpoints = [] } = {}) {
  const numericId = Number(userId);
  if (!Number.isNaN(numericId) && MASTER_ADMIN_IDS.includes(numericId)) {
    return true;
  }

  const roleUpper = String(role || "").toUpperCase().trim();
  if (
    roleUpper.includes("FACTUR") ||
    roleUpper.includes("VENDEDOR") ||
    roleUpper.includes("ASESOR") ||
    roleUpper.includes("COMERCIAL") ||
    roleUpper.includes("DIGIT")
  ) {
    return false;
  }

  if (
    roleUpper === "ADMIN" ||
    roleUpper === "ADMINISTRADOR" ||
    roleUpper.startsWith("ADMIN") ||
    roleUpper.includes("GERENC") ||
    roleUpper === "MASTER"
  ) {
    return true;
  }

  return checkIsAdmin(endpoints, username);
}

/**
 * Hook reactivo para determinar si el usuario en sesión puede emitir
 * Transferencias Gratuitas (TaxOnly) directamente a SAP B1 (Gerencia / Admin Maestro).
 */
export function useCanEmitTaxOnlyToSap() {
  const userId = useAuthStore((state) => state.userId);
  const role = useAuthStore((state) => state.role);
  const username = useAuthStore((state) => state.username);
  const endpoints = useAuthStore((state) => state.endpoints);

  return canEmitTaxOnlyToSap({
    userId: userId ?? localStorage.getItem("userId"),
    role: role || localStorage.getItem("role"),
    username: username || localStorage.getItem("username"),
    endpoints,
  });
}

/**
 * Propiedad estricta de borradores por creador real (userId / createdByUsername).
 * NUNCA compara por sellerName ("001.Ofic Administración") para garantizar que
 * dos cuentas de Facturación (ej. Angela y Celia) NO vean ni borren borradores entre sí.
 */
export function isDraftOwnedByUser(quote, { userId, username } = {}) {
  if (!quote || typeof quote !== "object") return false;

  const qUserId = quote.userId ?? quote.createdByUserId;
  const hasQuoteUserId =
    qUserId !== null &&
    qUserId !== undefined &&
    String(qUserId).trim() !== "" &&
    !Number.isNaN(Number(qUserId)) &&
    Number(qUserId) > 0;

  const hasUserId =
    userId !== null &&
    userId !== undefined &&
    String(userId).trim() !== "" &&
    !Number.isNaN(Number(userId)) &&
    Number(userId) > 0;

  const qCreator = String(quote.createdByUsername || quote.username || "").toLowerCase().trim();
  const currentUser = String(username || "").toLowerCase().trim();

  if (hasQuoteUserId && hasUserId) {
    if (Number(qUserId) === Number(userId)) return true;
    // Si por algún motivo de sesión no coinciden los IDs pero el username exacto del creador sí coincide
    if (qCreator && currentUser && qCreator === currentUser) return true;
    return false;
  }

  // Fallback cuando falta user.userId (ej. null en localStorage) o falta quote.userId (borradores legacy)
  if (!qCreator || !currentUser) return false;
  return qCreator === currentUser;
}

/**
 * Determina si el usuario actual puede visualizar un borrador:
 * - Administradores Maestros (Enrique id: 10, Misael id: 12) ven todos los borradores.
 * - Cualquier otro usuario (Facturación, Vendedores, etc.) solo ve sus propios borradores.
 */
export function canUserViewDraft(quote, { userId, username } = {}) {
  if (!quote || typeof quote !== "object") return false;
  return (
    isDraftMasterAdmin({ userId, username }) ||
    isDraftOwnedByUser(quote, { userId, username })
  );
}

/**
 * Hook reactivo para determinar si el usuario en sesión es Administrador
 */
export function useIsAdmin() {
  const endpoints = useAuthStore((state) => state.endpoints);
  const username = useAuthStore((state) => state.username);
  const role = useAuthStore((state) => state.role);
  const salesEmployeeCode = useAuthStore((state) => state.salesEmployeeCode);

  const roleUpper = String(role || localStorage.getItem("role") || "").toUpperCase();
  if (roleUpper === "ADMIN" || roleUpper === "ADMINISTRADOR" || roleUpper.startsWith("ADMIN")) {
    return true;
  }

  // 🛡️ Si el usuario tiene asignado un código de vendedor comercial en SAP (≠ 20 Oficina Admin),
  // y no tiene rol administrativo, es estrictamente un VENDEDOR
  const slpNum = Number(salesEmployeeCode);
  const isVerifierRole =
    roleUpper.includes("DIGIT") ||
    roleUpper.includes("FACTUR") ||
    roleUpper.includes("SUPERVIS") ||
    roleUpper.includes("CREDIT") ||
    roleUpper.includes("COBRAN") ||
    roleUpper.includes("GERENC") ||
    roleUpper.includes("SISTEMA") ||
    roleUpper.includes("JEFE");

  if (!isVerifierRole && salesEmployeeCode && !isNaN(slpNum) && slpNum > 0 && slpNum !== 20) {
    return false;
  }

  return checkIsAdmin(endpoints, username);
}

export function useHasAccess() {
  const endpoints = useAuthStore((state) => state.endpoints);
  const username = useAuthStore((state) => state.username);
  const role = useAuthStore((state) => state.role);

  return (endpoint) => {
    if (!endpoint) return true;

    // 🛡️ Únicamente el Administrador Maestro posee pase general a nivel de interfaz,
    // EXCEPTO para permisos granulares explícitos como "Ver Borradores de Cotizaciones" (/quotes/drafts),
    // y "Ver Aprobadores y Emisores SAP en Seguimiento" (/quotes/approval-audit),
    // que deben respetar fielmente su activación o desactivación en el perfil del usuario.
    const isGranularPermission =
      endpoint.includes("/quotes/drafts") ||
      endpoint.includes("/quotes/draft") ||
      endpoint.includes("/quotes/approval-audit");
    const roleUpper = String(role || localStorage.getItem("role") || "").toUpperCase();
    if (!isGranularPermission && (roleUpper === "ADMIN" || roleUpper === "ADMINISTRADOR" || roleUpper.startsWith("ADMIN") || checkIsAdmin(endpoints, username))) {
      return true;
    }

    if (!Array.isArray(endpoints) || endpoints.length === 0) return false;

    // Normalización para soportar "METHOD PATH" y "METHOD:PATH"
    const targetWithSpace = endpoint.includes(":") ? endpoint.replace(":", " ") : endpoint;
    const targetWithColon = endpoint.includes(" ") ? endpoint.replace(" ", ":") : endpoint;

    // Soporte de equivalencias para compatibilidad transparente de permisos (sin wildcard "*" para permisos granulares)
    const candidateList = isGranularPermission
      ? [endpoint, targetWithSpace, targetWithColon]
      : [endpoint, targetWithSpace, targetWithColon, "*"];
    if (endpoint.includes("/promotions")) {
      candidateList.push(
        "POST /promotions",
        "POST:/promotions",
        "/promotions",
        "POST /quoteModule/promotions",
        "POST:/quoteModule/promotions"
      );
    } else if (endpoint.includes("/quotes/approval-audit")) {
      candidateList.push(
        "GET /quotes/approval-audit",
        "GET:/quotes/approval-audit",
        "/quotes/approval-audit",
        "GET /quoteModule/quotes/approval-audit",
        "GET:/quoteModule/quotes/approval-audit"
      );
    } else if (endpoint.includes("/quotes/drafts") || endpoint.includes("/quotes/draft")) {
      candidateList.push(
        "GET /quotes/drafts",
        "GET:/quotes/drafts",
        "/quotes/drafts",
        "GET /quotes/draft",
        "GET:/quotes/draft",
        "/quotes/draft",
        "GET /quoteModule/quotes/drafts",
        "GET:/quoteModule/quotes/drafts"
      );
    } else if (endpoint.includes("/quotations")) {
      candidateList.push(endpoint.replace("/quotations", "/quotes"));
      candidateList.push(targetWithSpace.replace("/quotations", "/quotes"));
      candidateList.push(targetWithColon.replace("/quotations", "/quotes"));
    } else if (endpoint.includes("/quotes") && !endpoint.includes("/quotesSellers") && !endpoint.includes("/AdminQuotesSellers") && !endpoint.includes("/requestQuotes")) {
      candidateList.push(endpoint.replace("/quotes", "/quotations"));
      candidateList.push(targetWithSpace.replace("/quotes", "/quotations"));
      candidateList.push(targetWithColon.replace("/quotes", "/quotations"));
    }

    if (endpoint.includes("/receivable")) {
      candidateList.push(endpoint.replace("/receivable", "/accountsReceivable"));
      candidateList.push(targetWithSpace.replace("/receivable", "/accountsReceivable"));
      candidateList.push(targetWithColon.replace("/receivable", "/accountsReceivable"));
    } else if (endpoint.includes("/accountsReceivable")) {
      candidateList.push(endpoint.replace("/accountsReceivable", "/receivable"));
      candidateList.push(targetWithSpace.replace("/accountsReceivable", "/receivable"));
      candidateList.push(targetWithColon.replace("/accountsReceivable", "/receivable"));
    }

    if (endpoint.includes("/orderswithStatus") || endpoint.includes("/reports") || endpoint.includes("/orders")) {
      candidateList.push("GET /orderswithStatus/:code/:estadopedido");
      candidateList.push("GET:/orderswithStatus/:code/:estadopedido");
      candidateList.push("GET /reports");
      candidateList.push("GET:/reports");
      candidateList.push("GET /reports/:code");
      candidateList.push("GET:/reports/:code");
      candidateList.push("GET /orders");
      candidateList.push("GET:/orders");
    }

    if (endpoint === "GET:/quotes" || endpoint === "GET /quotes") {
      candidateList.push("GET /quotes", "GET:/quotes", "POST /quotes", "POST:/quotes", "POST /quotes/approval", "POST:/quotes/approval");
    }

    if (endpoint.includes("/attendance")) {
      candidateList.push("GET /attendance", "GET:/attendance", "POST /attendance", "POST:/attendance");
    }

    if (endpoint.includes("/presence/users")) {
      candidateList.push(
        "GET /presence/users",
        "GET:/presence/users",
        "GET /adminUsers",
        "GET:/adminUsers",
        "PUT /profile/admin/:userId",
        "PUT:/profile/admin/:userId"
      );
    }

    if (endpoint.includes("/quotesSellers") || endpoint.includes("/AdminQuotesSellers")) {
      candidateList.push(
        "GET /quotesSellers/:slpCode",
        "GET:/quotesSellers/:slpCode",
        "GET /quotesSellers/:slpCode/:month",
        "GET:/quotesSellers/:slpCode/:month",
        "GET /AdminQuotesSellers/:slpCode",
        "GET:/AdminQuotesSellers/:slpCode",
        "GET /AdminQuotesSellers/:slpCode/:month",
        "GET:/AdminQuotesSellers/:slpCode/:month"
      );
    }

    return endpoints.some((e) => candidateList.includes(e));
  };
}

/**
 * Módulo de almacén migrado a WMS independiente: retorna siempre false
 */
export function isWarehouseUser() {
  return false;
}

/**
 * Hook reactivo de almacén (siempre false, módulo migrado a WMS)
 */
export function useIsWarehouse() {
  return false;
}

