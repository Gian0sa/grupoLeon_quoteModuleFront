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
  salesEmployeeCode: getSafeValue('salesEmployeeCode'),
  endpoints: getSafeJsonValue('endpoints') || [],
  isAuthenticated: !!getSafeValue('userId'),

  login: ({ userId, username, salesEmployeeCode, endpoints }) => {
    const safeValues = {
      userId: userId?.toString() || null,
      username: username || null,
      salesEmployeeCode: salesEmployeeCode || null,
      endpoints: endpoints || [],
    };

    // Guardar en localStorage solo lo público
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

    set({
      ...safeValues,
      isAuthenticated: true,
    });
  },

  logout: () => {
    ['userId', 'username', 'salesEmployeeCode', 'endpoints'].forEach((key) =>
      localStorage.removeItem(key)
    );

    set({
      userId: null,
      username: null,
      salesEmployeeCode: null,
      endpoints: [],
      isAuthenticated: false,
    });
  },
}));
