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

// Sesión por inactividad: 3 horas continuas sin interactuar con la app
const IDLE_TIMEOUT_MS = 3 * 60 * 60 * 1000;

// Pantallas protegidas donde NUNCA se debe expulsar bruscamente al vendedor en medio de trabajo
const PROTECTED_PATHS = ['/visitlog', '/newquotes', '/cotizaciones', '/clientebusqueda'];

export const updateLastActivity = () => {
  try {
    localStorage.setItem('lastUserActivityTime', Date.now().toString());
  } catch (_) {}
};

export const isProtectedCurrentRoute = () => {
  if (typeof window === "undefined") return false;
  const path = String(window.location.pathname || '').toLowerCase();
  return PROTECTED_PATHS.some((p) => path === p || path.startsWith(p + '/'));
};

const isSessionExpired = () => {
  const lastActivity = Number(getSafeValue('lastUserActivityTime') || getSafeValue('sessionLoginTime') || 0);
  if (!lastActivity) return false;
  return Date.now() - lastActivity > IDLE_TIMEOUT_MS;
};

// Si expiró la sesión por inactividad prolongada (y no está en ruta protegida con trabajo), limpiar
if (isSessionExpired() && !isProtectedCurrentRoute()) {
  ['userId', 'username', 'salesEmployeeCode', 'endpoints', 'role', 'lastRoute', 'sessionLoginTime', 'lastUserActivityTime'].forEach((key) => {
    try { localStorage.removeItem(key); } catch (e) {}
  });
}

export const useAuthStore = create((set) => ({
  userId: (isSessionExpired() && !isProtectedCurrentRoute()) ? null : getSafeValue('userId'),
  username: (isSessionExpired() && !isProtectedCurrentRoute()) ? null : (typeof getSafeValue('username') === 'string' ? getSafeValue('username').trim() : getSafeValue('username')),
  salesEmployeeCode: (isSessionExpired() && !isProtectedCurrentRoute()) ? null : getSafeValue('salesEmployeeCode'),
  role: (isSessionExpired() && !isProtectedCurrentRoute()) ? null : (getSafeValue('role') || 'ASESOR_VENTAS'),
  endpoints: (isSessionExpired() && !isProtectedCurrentRoute()) ? [] : (getSafeJsonValue('endpoints') || []),
  isAuthenticated: (!isSessionExpired() || isProtectedCurrentRoute()) && !!getSafeValue('userId'),

  login: ({ userId, username, salesEmployeeCode, endpoints, role }) => {
    const cleanUsername = typeof username === 'string' ? username.trim() : username;
    const safeValues = {
      userId: userId?.toString() || null,
      username: cleanUsername || null,
      salesEmployeeCode: salesEmployeeCode || null,
      role: role || 'ASESOR_VENTAS',
      endpoints: endpoints || [],
      sessionLoginTime: Date.now().toString(),
      lastUserActivityTime: Date.now().toString(),
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
      role: safeValues.role,
      endpoints: safeValues.endpoints,
      isAuthenticated: true,
    });

    // Sincronizar y autenticar WebSockets en tiempo real
    updateSocketAuth();
  },

  updateRole: (newRole) => {
    if (newRole) {
      try {
        localStorage.setItem("role", newRole);
      } catch (e) {}
      set({ role: newRole });
    }
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
    // Si el vendedor está en medio de una visita o cotización, nunca interrumpir su trabajo
    if (isProtectedCurrentRoute()) {
      updateLastActivity();
      return false;
    }

    if (useAuthStore.getState().isAuthenticated && isSessionExpired()) {
      useAuthStore.getState().logout();
      if (typeof window !== "undefined" && window.location.pathname !== "/") {
        window.location.href = "/?reason=session_expired";
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
      ['userId', 'username', 'salesEmployeeCode', 'endpoints', 'lastRoute', 'sessionLoginTime', 'lastUserActivityTime'].forEach((key) =>
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
  // Detección de actividad del usuario: mientras toque la pantalla o interactúe, la sesión se mantiene viva
  let lastRecordedActivity = 0;
  const recordUserActivity = () => {
    const now = Date.now();
    if (now - lastRecordedActivity > 30000) { // Al menos 30 segundos entre escrituras a localStorage
      lastRecordedActivity = now;
      updateLastActivity();
    }
  };

  ['mousedown', 'keydown', 'touchstart', 'scroll'].forEach((evt) => {
    window.addEventListener(evt, recordUserActivity, { passive: true });
  });

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
