import { io } from "socket.io-client";

const resolveSocketUrl = () => {
  if (import.meta.env.VITE_WS_URL) {
    return import.meta.env.VITE_WS_URL.replace(/\/$/, "");
  }
  const apiUrl = import.meta.env.VITE_API_URL || "";
  if (apiUrl.startsWith("http")) {
    try {
      const parsed = new URL(apiUrl);
      // Si apunta al servidor remoto o dominio público, conectar al mismo origin
      if (!parsed.hostname.includes("localhost") && !parsed.hostname.includes("127.0.0.1")) {
        return parsed.origin;
      }
    } catch (e) {
      console.warn("Error parseando VITE_API_URL:", e.message);
    }
  }
  return "http://localhost:3002";
};

const SOCKET_URL = resolveSocketUrl();

export const socket = io(SOCKET_URL, {
  path: "/socket.io",
  transports: ["websocket", "polling"],
  autoConnect: true,
  reconnection: true,
  reconnectionAttempts: Infinity,
  reconnectionDelay: 1500,
  withCredentials: true,
});

socket.on("connect", () => {
  console.log("⚡ [WS] Conectado en tiempo real con Socket.io a:", SOCKET_URL);
});

socket.on("disconnect", (reason) => {
  console.log("🔌 [WS] Desconectado de Socket.io:", reason);
});

socket.on("connect_error", (err) => {
  console.warn("⚠️ [WS] Reconectando Socket.io en tiempo real...", err.message);
});
