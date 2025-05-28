import { create } from 'zustand';

export const useAuthStore = create((set) => ({
  userId: localStorage.getItem('userId'),
  token: localStorage.getItem('token'),
  role: localStorage.getItem('role'),
  isAuthenticated: !!localStorage.getItem('token'),
  login: (token, role, userId) => {
    localStorage.setItem('token', token);
    localStorage.setItem('role', role);
    localStorage.setItem('userId', userId);
    set({ token, role, userId, isAuthenticated: true });
  },
  logout: () => {
    localStorage.removeItem('token');
    localStorage.removeItem('role');
    localStorage.removeItem('userId');
    set({ token: null, role: null, userId: null, isAuthenticated: false });
  },
  setToken : (token) => {
    localStorage.setItem('token', token);
    set({ token, isAuthenticated: true });
  },
}));
