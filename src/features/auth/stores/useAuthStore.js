import { create } from 'zustand';
import { updateSocketAuth, socket } from '../../../shared/lib/socket';
import { clearSessionCaches } from '../../../shared/lib/queryClient';

const getSafeValue = (key) => {
  try {
    const value = localStorage.getItem(key);
    return (value === null || value === "null" || value === "undefined") ? null : value;
  } catch {
    return null;
  }
};

const getSafeJsonValue = (key) => {
  try {
    const item = localStorage.getItem(key);
    return item ? JSON.parse(item) : null;
  } catch {
    return null;
  }
};

const SESSION_MAX_DURATION_MS = 5 * 60 * 60 * 1000; // 5 horas exactas

const isSessionExpired = () => {
  const loginTime = Number(getSafeValue('sessionLoginTime') || 0);
  if (!loginTime) return false;
  return Date.now() - loginTime > SESSION_MAX_DURATION_MS;
};

// Si expiró la sesión al abrir/recargar la app, limpiar de inmediato
if (isSessionExpired()) {
  ['userId', 'username', 'salesEmployeeCode', 'endpoints', 'lastRoute', 'sessionLoginTime'].forEach((key) => {
    try { localStorage.removeItem(key); } catch (e) {}
  });
}

export const useAuthStore = create((set) => ({
  userId: isSessionExpired() ? null : getSafeValue('userId'),
  username: isSessionExpired() ? null : (typeof getSafeValue('username') === 'string' ? getSafeValue('username').trim() : getSafeValue('username')),
  salesEmployeeCode: isSessionExpired() ? null : getSafeValue('salesEmployeeCode'),
  endpoints: isSessionExpired() ? [] : (getSafeJsonValue('endpoints') || []),
  isAuthenticated: !isSessionExpired() && !!getSafeValue('userId'),

  login: ({ userId, username, salesEmployeeCode, endpoints }) => {
    const cleanUsername = typeof username === 'string' ? username.trim() : username;
    const safeValues = {
      userId: userId?.toString() || null,
      username: cleanUsername || null,
      salesEmployeeCode: salesEmployeeCode || null,
      endpoints: endpoints || [],
      sessionLoginTime: Date.now().toString(),
    };

    // Guardar en localStorage solo lo público
    try {
      Object.entries(safeValues).forEach(([key, value]) => {
        if (value !== null && value !== undefined) {
          if (key === "endpoints") {
            localStorage.setItem(key, JSON.stringify(value));
          } else {
            localStorage.setItem(key, value);
          }
        } else {
          localStorage.removeItem(key);
        }
      });
    } catch (e) {
      console.warn("Storage write restricted by browser:", e);
    }

    set({
      userId: safeValues.userId,
      username: safeValues.username,
      salesEmployeeCode: safeValues.salesEmployeeCode,
      endpoints: safeValues.endpoints,
      isAuthenticated: true,
    });

    // Sincronizar y autenticar WebSockets en tiempo real
    updateSocketAuth();
  },

  updateEndpoints: (newEndpoints) => {
    if (Array.isArray(newEndpoints)) {
      try {
        localStorage.setItem("endpoints", JSON.stringify(newEndpoints));
      } catch (e) {}
      set({ endpoints: newEndpoints });
      updateSocketAuth();
    }
  },

  checkSessionExpiry: () => {
    if (useAuthStore.getState().isAuthenticated && isSessionExpired()) {
      useAuthStore.getState().logout();
      if (typeof window !== "undefined" && window.location.pathname !== "/") {
        window.location.href = "/";
      }
      return true;
    }
    return false;
  },

  logout: () => {
    try {
      const currentUserId = useAuthStore.getState().userId || localStorage.getItem('userId');
      if (socket && socket.connected) {
        socket.emit('presence:logout', {
          userId: currentUserId ? Number(currentUserId) : null,
          timestamp: Date.now(),
        });
        socket.disconnect();
      }
    } catch (e) {
      console.warn("⚠️ Error emitiendo logout de presencia:", e);
    }

    try {
      ['userId', 'username', 'salesEmployeeCode', 'endpoints', 'lastRoute', 'sessionLoginTime'].forEach((key) =>
        localStorage.removeItem(key)
      );
    } catch (e) {}

    // Limpieza profunda de memoria RAM (React Query), sessionStorage y cachés volátiles
    clearSessionCaches();

    set({
      userId: null,
      username: null,
      salesEmployeeCode: null,
      endpoints: [],
      isAuthenticated: false,
    });

    updateSocketAuth();
  },
}));

if (typeof window !== "undefined") {
  const handleWakeup = () => {
    const store = useAuthStore.getState();
    if (store?.isAuthenticated && typeof store.checkSessionExpiry === "function") {
      store.checkSessionExpiry();
    }
  };
  window.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") handleWakeup();
  });
  window.addEventListener("focus", handleWakeup);
}
