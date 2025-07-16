import { create } from 'zustand';

const getSafeValue = (key) => {
  const value = localStorage.getItem(key);
  return (value === null || value === "null" || value === "undefined") ? null : value;
};

export const useAuthStore = create((set) => ({
  userId: getSafeValue('userId'),
  token: getSafeValue('token'),
  role: getSafeValue('role'),
  salesEmployeeCode: getSafeValue('salesEmployeeCode'),
  isAuthenticated: !!getSafeValue('token'),

  login: (token, role, userId, salesEmployeeCode) => {
    // Asegúrate de no guardar "null" como string
    const safeValues = {
      token: token || null,
      role: role || null,
      userId: userId || null,
      salesEmployeeCode: salesEmployeeCode || null
    };

    Object.entries(safeValues).forEach(([key, value]) => {
      if (value !== null) {
        localStorage.setItem(key, value);
      } else {
        localStorage.removeItem(key);
      }
    });

    set({ 
      token: safeValues.token, 
      role: safeValues.role, 
      userId: safeValues.userId, 
      salesEmployeeCode: safeValues.salesEmployeeCode, 
      isAuthenticated: !!safeValues.token 
    });
  },

  logout: () => {
    localStorage.removeItem('token');
    localStorage.removeItem('role');
    localStorage.removeItem('userId');
    localStorage.removeItem('salesEmployeeCode');
    set({ token: null, role: null, userId: null, salesEmployeeCode: null, isAuthenticated: false });
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