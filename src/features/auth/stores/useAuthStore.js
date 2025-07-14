import { create } from 'zustand';

export const useAuthStore = create((set) => ({
  userId: localStorage.getItem('userId'),
  token: localStorage.getItem('token'),
  role: localStorage.getItem('role'),
  salesEmployeeCode: localStorage.getItem('salesEmployeeCode'),
  isAuthenticated: !!localStorage.getItem('token'),

  login: (token, role, userId, salesEmployeeCode) => {
    localStorage.setItem('token', token);
    localStorage.setItem('role', role);
    localStorage.setItem('userId', userId);
    localStorage.setItem('salesEmployeeCode', salesEmployeeCode);
    set({ token, role, userId, salesEmployeeCode, isAuthenticated: true });
  },

  logout: () => {
    localStorage.removeItem('token');
    localStorage.removeItem('role');
    localStorage.removeItem('userId');
    localStorage.removeItem('salesEmployeeCode');
    set({ token: null, role: null, userId: null, salesEmployeeCode: null, isAuthenticated: false });
  },

  setToken: (token) => {
    localStorage.setItem('token', token);
    set({ token, isAuthenticated: true });
  },
}));
