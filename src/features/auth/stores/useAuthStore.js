import { create } from 'zustand';

const getSafeValue = (key) => {
  const value = localStorage.getItem(key);
  return (value === null || value === "null" || value === "undefined") ? null : value;
};

const getSafeJsonValue = (key) => {
  try {
    const item = localStorage.getItem(key);
    return item ? JSON.parse(item) : null;
  } catch {
    return null;
  }
};

export const useAuthStore = create((set) => ({
  userId: getSafeValue('userId'),
  username: getSafeValue('username'),
  token: getSafeValue('token'),
  salesEmployeeCode: getSafeValue('salesEmployeeCode'),
  endpoints: getSafeJsonValue('endpoints'),
  isAuthenticated: !!getSafeValue('token'),

  login: ({ token, userId, username, salesEmployeeCode, endpoints }) => {
    const safeValues = {
      token: token || null,
      userId: userId?.toString() || null,
      username: username || null,
      salesEmployeeCode: salesEmployeeCode || null,
      endpoints: endpoints || [],
    };

    // Guardar en localStorage
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

    // Actualizar estado
    set({
      token: safeValues.token,
      userId: safeValues.userId,
      username: safeValues.username,
      salesEmployeeCode: safeValues.salesEmployeeCode,
      endpoints: safeValues.endpoints,
      isAuthenticated: !!safeValues.token,
    });
  },

  logout: () => {
    ['token', 'userId', 'username', 'salesEmployeeCode', 'endpoints'].forEach((key) =>
      localStorage.removeItem(key)
    );

    set({
      token: null,
      userId: null,
      username: null,
      salesEmployeeCode: null,
      endpoints: null,
      isAuthenticated: false,
    });
  },

  setToken: (token) => {
    const safeToken = token || null;
    if (safeToken) {
      localStorage.setItem('token', safeToken);
    } else {
      localStorage.removeItem('token');
    }
    set({ token: safeToken, isAuthenticated: !!safeToken });
  },
}));
