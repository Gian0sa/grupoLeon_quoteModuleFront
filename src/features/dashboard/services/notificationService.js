// src/modules/notifications/api/notificationsService.js
import { axiosInstance } from "../../../shared/lib/axiosInstance";

// Obtener todas las notificaciones
export const getNotifications = async () => {
  const response = await axiosInstance.get("/reportModule/notifications");
  return response.data;
};

// Obtener una notificación por ID
export const getNotificationById = async (id) => {
  const response = await axiosInstance.get(`/reportModule/notifications/${id}`);
  return response.data;
};

// Crear una nueva notificación
export const createNotification = async (data) => {
  const response = await axiosInstance.post("/reportModule/notifications", data);
  return response.data;
};

// Actualizar una notificación existente
export const updateNotification = async (id, data) => {
  const response = await axiosInstance.put(
    `/reportModule/notifications/${id}`,
    data
  );
  return response.data;
};

// Eliminar una notificación
export const deleteNotification = async (id) => {
  const response = await axiosInstance.delete(
    `/reportModule/notifications/${id}`
  );
  return response.data;
};
