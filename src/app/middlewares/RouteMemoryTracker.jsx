import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { useAuthStore } from "../../features/auth/stores/useAuthStore";
import { axiosInstance } from "../../shared/lib/axiosInstance";

export function RouteMemoryTracker() {
  const location = useLocation();
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

  // 1. Guardar la última ruta visitada (excluyendo rutas públicas y de autenticación)
  useEffect(() => {
    if (isAuthenticated) {
      const publicRoutes = ["/", "/register"];
      const isPublic = publicRoutes.includes(location.pathname) || 
                       location.pathname.startsWith("/s/") || 
                       location.pathname.startsWith("/statement/") || 
                       location.pathname.startsWith("/estado-cuenta/");

      if (!isPublic) {
        localStorage.setItem("lastRoute", location.pathname + location.search);
      }
    }
  }, [location, isAuthenticated]);

  // 2. Temporizador nocturno (03:00 AM) para renovar sesión silenciosamente sin interrumpir al usuario
  useEffect(() => {
    if (!isAuthenticated) return;

    let timeoutId;
    const scheduleNightlyRefresh = () => {
      const now = new Date();
      const targetTime = new Date();
      targetTime.setHours(3, 0, 0, 0); // 03:00 AM

      if (now >= targetTime) {
        targetTime.setDate(targetTime.getDate() + 1);
      }

      const delay = targetTime.getTime() - now.getTime();

      timeoutId = setTimeout(async () => {
        try {
          console.log("🌙 [NIGHTLY AUTO-REFRESH] Ejecutando renovación nocturna de sesión a las 03:00 AM...");
          await axiosInstance.post("/authModule/refresh-token", {}, { withCredentials: true });
          console.log("✅ [NIGHTLY AUTO-REFRESH] Sesión y cookies renovadas con éxito para la jornada.");
        } catch (err) {
          console.warn("⚠️ [NIGHTLY AUTO-REFRESH] Intento de renovación:", err?.message);
        }
        scheduleNightlyRefresh();
      }, delay);
    };

    scheduleNightlyRefresh();

    return () => {
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [isAuthenticated]);

  return null;
}
