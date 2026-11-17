import { axiosInstance } from "../shared/lib/axiosInstance";

/**
 * Obtiene la configuración vigente del tema de cabeceras y accesos del usuario autenticado.
 * GET /quoteModule/header-theme
 */
export async function getHeaderTheme() {
  const res = await axiosInstance.get("/quoteModule/header-theme");
  return res.data?.data;
}

/**
 * Actualiza el tema global de cabeceras (solo autorizado para Misael Cumapa en backend).
 * PUT /quoteModule/header-theme
 */
export async function updateHeaderTheme(payload) {
  const res = await axiosInstance.put("/quoteModule/header-theme", payload);
  return res.data?.data ?? res.data;
}

/**
 * Asigna un color de tema individual o concede/revoca acceso para un usuario específico.
 * PUT /quoteModule/header-theme/user-access/:userId
 *
 * @param {number|string} userId
 * @param {boolean | { enabled?: boolean, themeKey?: string | null }} optionsOrEnabled
 */
export async function setUserHeaderThemeAccess(userId, optionsOrEnabled) {
  const payload =
    typeof optionsOrEnabled === "boolean"
      ? { enabled: Boolean(optionsOrEnabled) }
      : optionsOrEnabled && typeof optionsOrEnabled === "object"
      ? {
          ...(optionsOrEnabled.themeKey !== undefined
            ? { themeKey: optionsOrEnabled.themeKey }
            : {}),
          ...(typeof optionsOrEnabled.enabled === "boolean"
            ? { enabled: optionsOrEnabled.enabled }
            : {}),
        }
      : { enabled: false };

  const res = await axiosInstance.put(
    `/quoteModule/header-theme/user-access/${userId}`,
    payload
  );
  return res.data?.data ?? res.data;
}
