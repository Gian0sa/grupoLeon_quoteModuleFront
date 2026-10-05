import { useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import { socket } from "../../../shared/lib/socket";
import { useAuthStore } from "../../auth/stores/useAuthStore";
import { getDeviceDetails } from "../services/presenceService";

const HEARTBEAT_INTERVAL_MS = 20 * 1000; // Cada 20 segundos
const ACTIVITY_THROTTLE_MS = 20 * 1000;  // Máximo 1 evento de actividad cada 20 segundos

function getUserPayload() {
  try {
    const authState = useAuthStore.getState();
    const rawId = authState.userId || localStorage.getItem("userId");
    return {
      userId: rawId ? Number(rawId) : null,
      username: authState.username || localStorage.getItem("username") || null,
      salesEmployeeCode: authState.salesEmployeeCode || localStorage.getItem("salesEmployeeCode") || null,
      permissions: authState.endpoints || JSON.parse(localStorage.getItem("endpoints") || "[]"),
    };
  } catch {
    return null;
  }
}

/**
 * Hook global que reporta la presencia, actividad real y cambios de pantalla del usuario autenticado
 */
export function usePresenceHeartbeat() {
  const location = useLocation();
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const lastActivityReportRef = useRef(0);
  const deviceDetailsRef = useRef(null);

  if (!deviceDetailsRef.current) {
    deviceDetailsRef.current = getDeviceDetails();
  }

  // 1. Cambio de página en React Router (sin polling)
  useEffect(() => {
    if (!isAuthenticated) return;

    const reportPage = () => {
      if (socket.connected) {
        socket.emit("presence:page", {
          user: getUserPayload(),
          page: location.pathname,
          timestamp: Date.now(),
        });
      }
    };

    reportPage();

    socket.on("connect", reportPage);
    return () => {
      socket.off("connect", reportPage);
    };
  }, [location.pathname, isAuthenticated]);

  // 2. Heartbeat periódico, reconexión móvil y detección de actividad con throttle
  useEffect(() => {
    if (!isAuthenticated) return;

    // Conectar socket si no estuviera activo y hay conexión a internet
    if (!socket.connected && (typeof navigator === "undefined" || navigator.onLine)) {
      socket.connect();
    }

    const sendHeartbeat = () => {
      if (typeof navigator !== "undefined" && !navigator.onLine) return;
      if (socket.connected) {
        const user = getUserPayload();
        if (user && user.userId) {
          socket.emit("presence:heartbeat", {
            user,
            page: location.pathname,
            device: deviceDetailsRef.current,
            timestamp: Date.now(),
          });
        }
      }
    };

    // Heartbeat inicial al montar
    sendHeartbeat();

    // Reaccionar inmediatamente cuando el socket conecta o reconecta
    socket.on("connect", sendHeartbeat);

    // Intervalo de heartbeat cada 20 segundos
    const heartbeatTimer = setInterval(sendHeartbeat, HEARTBEAT_INTERVAL_MS);

    // Throttle para actividad real (click, keydown, mousemove, scroll, touchstart)
    const handleUserActivity = () => {
      if (typeof navigator !== "undefined" && !navigator.onLine) return;
      const now = Date.now();
      if (now - lastActivityReportRef.current >= ACTIVITY_THROTTLE_MS) {
        lastActivityReportRef.current = now;
        if (socket.connected) {
          socket.emit("presence:activity", {
            user: getUserPayload(),
            page: location.pathname,
            timestamp: now,
          });
        }
      }
    };

    // 📱 Re-activar inmediatamente cuando la app vuelve al primer plano en el celular o recupera señal
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        sendHeartbeat();
      }
    };

    const handleOnline = () => {
      sendHeartbeat();
    };

    const eventOptions = { passive: true };
    const activityEvents = ["click", "keydown", "mousemove", "scroll", "touchstart"];

    activityEvents.forEach((event) => {
      window.addEventListener(event, handleUserActivity, eventOptions);
    });
    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("online", handleOnline);

    return () => {
      clearInterval(heartbeatTimer);
      socket.off("connect", sendHeartbeat);
      activityEvents.forEach((event) => {
        window.removeEventListener(event, handleUserActivity, eventOptions);
      });
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("online", handleOnline);
    };
  }, [isAuthenticated, location.pathname]);
}
