import { useAuthStore } from "../../features/auth/stores/useAuthStore";

export function useHasAccess() {
  const endpoints = useAuthStore((state) => state.endpoints);
  const username = useAuthStore((state) => state.username);

  return (endpoint) => {
    if (!endpoint) return true;

    // 🛡️ El perfil de Administrador (Enrique, Jorge, Admin, etc.) siempre tiene ACCESO MAESTRO ABSOLUTO
    const isAdmin =
      endpoints?.includes("PUT:/profile/admin/:userId") ||
      endpoints?.includes("PUT /profile/admin/:userId") ||
      username?.toLowerCase() === "admin" ||
      username?.toLowerCase() === "administrador" ||
      username?.toLowerCase() === "enrique" ||
      username?.toLowerCase() === "jorge";

    if (isAdmin) return true;

    if (!Array.isArray(endpoints) || endpoints.length === 0) return false;

    // Normalización para soportar "METHOD PATH" y "METHOD:PATH"
    const targetWithSpace = endpoint.includes(":") ? endpoint.replace(":", " ") : endpoint;
    const targetWithColon = endpoint.includes(" ") ? endpoint.replace(" ", ":") : endpoint;

    return endpoints.some(
      (e) => e === endpoint || e === targetWithSpace || e === targetWithColon
    );
  };
}

