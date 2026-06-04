import { axiosInstance } from '../../../shared/lib/axiosInstance';

export const entradaService = {
  checkTodayAttendance: async () => {
    try {
      const response = await axiosInstance.get('/reportModule/attendance/today');
      return response.data; // Devuelve { registered: boolean, attendance: object|null }
    } catch (error) {
      console.error("Error checking today's attendance:", error);
      return { registered: false, attendance: null };
    }
  },

  marcarIngreso: async (vendorCode, location, imageFile) => {
    try {
      const formData = new FormData();
      formData.append('latitude', location.lat);
      formData.append('longitude', location.lng);
      if (vendorCode) {
        formData.append('vendorCode', vendorCode);
      }
      if (imageFile) {
        formData.append('image', imageFile);
      }

      const response = await axiosInstance.post('/reportModule/attendance', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });
      return response.data; // Devuelve { message: string, attendance: object }
    } catch (error) {
      console.error("Error marking attendance:", error);
      throw error;
    }
  },

  getAllAttendance: async (filters = {}) => {
    try {
      const params = new URLSearchParams();
      if (filters.vendor) {
        params.append('vendor', filters.vendor);
      }
      if (filters.dateFrom) {
        params.append('from', filters.dateFrom);
      }
      if (filters.dateTo) {
        params.append('to', filters.dateTo);
      }

      const response = await axiosInstance.get(`/reportModule/attendance?${params.toString()}`);
      return response.data; // Devuelve { total: number, logs: array }
    } catch (error) {
      console.error("Error getting all attendance logs:", error);
      return { total: 0, logs: [] };
    }
  }
};
