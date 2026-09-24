import { useAuthStore } from "../../features/auth/stores/useAuthStore";

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
    endpointsList.includes("GET:/adminUsers") ||
    endpointsList.includes("GET /adminUsers") ||
    // Nombres o alias reconocidos de administradores del sistema
    normUser === "admin" ||
    normUser === "administrador" ||
    normUser.includes("misael") ||
    normUser.includes("cumapa") ||
    normUser.includes("enrique") ||
    normUser.includes("jorge") ||
    normUser.includes("edwin") ||
    normUser.includes("jimmy") ||
    ((normUser === "julio" || normUser.startsWith("julio ")) && !normUser.includes("flores"))
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

  // 🛡️ Si el usuario tiene asignado un código de vendedor comercial en SAP (≠ 20 Oficina Admin),
  // es estrictamente un VENDEDOR, nunca administrador maestro
  const slpNum = Number(salesEmployeeCode);
  if (salesEmployeeCode && !isNaN(slpNum) && slpNum > 0 && slpNum !== 20) {
    return false;
  }

  const roleUpper = String(role || "").toUpperCase();
  if (roleUpper === "ADMIN") {
    return true;
  }

  return checkIsAdmin(endpoints, username);
}

export function useHasAccess() {
  const endpoints = useAuthStore((state) => state.endpoints);
  const username = useAuthStore((state) => state.username);
  const role = useAuthStore((state) => state.role);

  return (endpoint) => {
    if (!endpoint) return true;

    // 🛡️ Únicamente el Administrador Maestro posee pase absoluto a nivel de interfaz
    const roleUpper = String(role || "").toUpperCase();
    if (roleUpper === "ADMIN" || checkIsAdmin(endpoints, username)) {
      return true;
    }

    if (!Array.isArray(endpoints) || endpoints.length === 0) return false;

    // Normalización para soportar "METHOD PATH" y "METHOD:PATH"
    const targetWithSpace = endpoint.includes(":") ? endpoint.replace(":", " ") : endpoint;
    const targetWithColon = endpoint.includes(" ") ? endpoint.replace(" ", ":") : endpoint;

    // Soporte de equivalencias para compatibilidad transparente de permisos
    const candidateList = [endpoint, targetWithSpace, targetWithColon];
    if (endpoint.includes("/quotations")) {
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

