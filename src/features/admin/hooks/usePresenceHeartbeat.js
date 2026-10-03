import { useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import { socket } from "../../../shared/lib/socket";
import { useAuthStore } from "../../auth/stores/useAuthStore";
import { getDeviceDetails } from "../services/presenceService";

const HEARTBEAT_INTERVAL_MS = 20 * 1000; // Cada 20 segundos
const ACTIVITY_THROTTLE_MS = 20 * 1000;  // Máximo 1 evento de actividad cada 20 segundos

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

  // 2. Heartbeat periódico y detección de actividad con throttle
  useEffect(() => {
    if (!isAuthenticated) return;

    // Conectar socket si no estuviera activo
    if (!socket.connected) {
      socket.connect();
    }

    const sendHeartbeat = () => {
      if (socket.connected) {
        socket.emit("presence:heartbeat", {
          page: location.pathname,
          device: deviceDetailsRef.current,
          timestamp: Date.now(),
        });
      }
    };

    // Heartbeat inicial al montar
    sendHeartbeat();

    // Intervalo de heartbeat cada 20 segundos
    const heartbeatTimer = setInterval(sendHeartbeat, HEARTBEAT_INTERVAL_MS);

    // Throttle para actividad real (click, keydown, mousemove, scroll, touchstart)
    const handleUserActivity = () => {
      const now = Date.now();
      if (now - lastActivityReportRef.current >= ACTIVITY_THROTTLE_MS) {
        lastActivityReportRef.current = now;
        if (socket.connected) {
          socket.emit("presence:activity", {
            page: location.pathname,
            timestamp: now,
          });
        }
      }
    };

    const eventOptions = { passive: true };
    const activityEvents = ["click", "keydown", "mousemove", "scroll", "touchstart"];

    activityEvents.forEach((event) => {
      window.addEventListener(event, handleUserActivity, eventOptions);
    });

    return () => {
      clearInterval(heartbeatTimer);
      activityEvents.forEach((event) => {
        window.removeEventListener(event, handleUserActivity, eventOptions);
      });
    };
  }, [isAuthenticated, location.pathname]);
}
