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
const isLocal = SOCKET_URL.includes("localhost") || SOCKET_URL.includes("127.0.0.1");
const SOCKET_PATH = import.meta.env.VITE_WS_PATH || (isLocal ? "/socket.io" : "/api/socket.io");

export const getCurrentSocketAuth = () => {
  try {
    const rawUser = localStorage.getItem("userId");
    const username = localStorage.getItem("username");
    const endpoints = JSON.parse(localStorage.getItem("endpoints") || "[]");
    const salesEmployeeCode = localStorage.getItem("salesEmployeeCode");
    return {
      userId: rawUser ? Number(rawUser) : null,
      username: username || null,
      permissions: endpoints,
      salesEmployeeCode: salesEmployeeCode ? Number(salesEmployeeCode) : null,
    };
  } catch {
    return {};
  }
};

const isOnline = () => typeof navigator === "undefined" || navigator.onLine !== false;

export const socket = io(SOCKET_URL, {
  path: SOCKET_PATH,
  transports: ["polling", "websocket"],
  upgrade: true,
  autoConnect: isOnline(),
  reconnection: true,
  reconnectionAttempts: Infinity,
  reconnectionDelay: 2500,
  reconnectionDelayMax: 10000,
  withCredentials: true,
  auth: (cb) => {
    cb(getCurrentSocketAuth());
  },
});

export const updateSocketAuth = () => {
  try {
    if (typeof navigator !== "undefined" && !navigator.onLine) {
      // Si el dispositivo está sin conexión, no forzar conexión
      return;
    }
    const authData = getCurrentSocketAuth();
    socket.auth = authData;
    if (socket.connected) {
      if (authData.userId) {
        socket.emit("presence:identify", { user: authData });
      }
    } else {
      socket.connect();
    }
  } catch (e) {
    console.warn("⚠️ [WS] Error actualizando auth de socket:", e);
  }
};

socket.on("connect", () => {
  console.log("⚡ [WS] Conectado en tiempo real con Socket.io a:", SOCKET_URL);
  const currentAuth = getCurrentSocketAuth();
  if (currentAuth.userId) {
    socket.emit("presence:identify", { user: currentAuth });
  }
});

socket.on("disconnect", (reason) => {
  console.log("🔌 [WS] Desconectado de Socket.io:", reason);
});

socket.on("connect_error", (err) => {
  if (typeof navigator !== "undefined" && !navigator.onLine) {
    // Si estamos sin conexión a internet, pausar intentos para evitar spam de ERR_INTERNET_DISCONNECTED
    socket.disconnect();
  } else {
    console.warn("⚠️ [WS] Reconectando Socket.io en tiempo real...", err.message);
  }
});

// 🌐 Ciclo de vida Offline / Online en el navegador
if (typeof window !== "undefined") {
  window.addEventListener("offline", () => {
    console.log("📶 [WS] Sin conexión a internet. Pausando Socket.io para preservar batería y ancho de banda.");
    socket.disconnect();
  });

  window.addEventListener("online", () => {
    console.log("📶 [WS] Conexión a internet restablecida. Reconectando Socket.io en tiempo real...");
    updateSocketAuth();
  });
}

