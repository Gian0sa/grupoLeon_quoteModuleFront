import { io } from "socket.io-client";

const rawApiUrl = import.meta.env.VITE_WS_URL || "http://localhost:3002";

// Limpiar trailing slash
const SOCKET_URL = rawApiUrl.replace(/\/$/, "");

export const socket = io(SOCKET_URL, {
  path: "/socket.io",
  transports: ["websocket", "polling"],
  autoConnect: true,
  reconnection: true,
  reconnectionAttempts: 10,
  reconnectionDelay: 2000,
  withCredentials: true,
});

socket.on("connect", () => {
  console.log("⚡ [WS] Conectado en tiempo real con Socket.io a:", SOCKET_URL);
});

socket.on("disconnect", (reason) => {
  console.log("🔌 [WS] Desconectado de Socket.io:", reason);
});

socket.on("connect_error", (err) => {
  console.warn("⚠️ [WS] Advertencia de conexión WebSocket (activo fallback HTTP):", err.message);
});
