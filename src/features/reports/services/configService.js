// src/shared/api/configModuleService.js
import { axiosInstance } from "../../../shared/lib/axiosInstance";

/**
 * Obtener todas las reglas activas
 */
export const getAllRules = async () => {
  try {
    const response = await axiosInstance.get("/reportModule/rules");
    return response.data;
  } catch (error) {
    console.error("Error al obtener las reglas:", error);
    return null;
  }
};

/**
 * Obtener una regla por ID
 * @param {string} id - ID de la regla
 */
export const getRuleById = async (id) => {
  try {
    const response = await axiosInstance.get(`/reportModule/rules/${id}`);
    return response.data;
  } catch (error) {
    console.error("Error al obtener la regla:", error);
    return null;
  }
};

/**
 * Crear una nueva regla
 * @param {Object} ruleData - Datos de la regla (ej. nombre, valor, etc.)
 */
export const createRule = async (ruleData) => {
  try {
    const response = await axiosInstance.post("/reportModule/rules", ruleData);
    return response.data;
  } catch (error) {
    console.error("Error al crear la regla:", error);
    return null;
  }
};

/**
 * Actualizar una regla existente
 * @param {string} id - ID de la regla
 * @param {Object} updatedData - Datos actualizados
 */
export const updateRule = async (id, updatedData) => {
  try {
    const response = await axiosInstance.put(`/reportModule/rules/${id}`, updatedData);
    return response.data;
  } catch (error) {
    console.error("Error al actualizar la regla:", error);
    return null;
  }
};

/**
 * Desactivar (soft delete) una regla
 * @param {string} id - ID de la regla
 */
export const deleteRule = async (id) => {
  try {
    const response = await axiosInstance.delete(`/reportModule/rules/${id}`);
    return response.data;
  } catch (error) {
    console.error("Error al eliminar la regla:", error);
    return null;
  }
};
