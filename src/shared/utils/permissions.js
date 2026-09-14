import { useAuthStore } from "../../features/auth/stores/useAuthStore";

/**
 * Función pura para validar si un usuario posee privilegios de Administrador / Maestro
 * Puede recibir endpoints (array) y username (string)
 */
export function checkIsAdmin(endpoints = [], username = "") {
  const normUser = String(username || "").toLowerCase().trim();
  const endpointsList = Array.isArray(endpoints) ? endpoints : [];

  return (
    // Endpoints maestros de administración en backend
    endpointsList.includes("PUT:/profile/admin/:userId") ||
    endpointsList.includes("PUT /profile/admin/:userId") ||
    endpointsList.includes("GET:/adminUsers") ||
    endpointsList.includes("GET /adminUsers") ||
    endpointsList.includes("POST:/quotes/approval") ||
    endpointsList.includes("POST /quotes/approval") ||
    // Nombres o alias reconocidos de administradores del sistema
    normUser === "admin" ||
    normUser === "administrador" ||
    normUser.includes("misael") ||
    normUser.includes("cumapa") ||
    normUser.includes("enrique") ||
    normUser.includes("jorge")
  );
}

/**
 * Hook reactivo para determinar si el usuario en sesión es Administrador
 */
export function useIsAdmin() {
  const endpoints = useAuthStore((state) => state.endpoints);
  const username = useAuthStore((state) => state.username);
  const role = useAuthStore((state) => state.role);

  const roleUpper = String(role || "").toUpperCase();
  if (roleUpper === "ADMIN" || roleUpper === "FACTURACION" || roleUpper === "SUPERVISOR") {
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

    // 🛡️ El perfil de Administrador siempre tiene ACCESO MAESTRO ABSOLUTO
    const roleUpper = String(role || "").toUpperCase();
    if (
      roleUpper === "ADMIN" ||
      roleUpper === "FACTURACION" ||
      roleUpper === "SUPERVISOR" ||
      checkIsAdmin(endpoints, username)
    ) {
      return true;
    }

    if (!Array.isArray(endpoints) || endpoints.length === 0) return false;

    // Normalización para soportar "METHOD PATH" y "METHOD:PATH"
    const targetWithSpace = endpoint.includes(":") ? endpoint.replace(":", " ") : endpoint;
    const targetWithColon = endpoint.includes(" ") ? endpoint.replace(" ", ":") : endpoint;

    return endpoints.some(
      (e) => e === endpoint || e === targetWithSpace || e === targetWithColon
    );
  };
}

