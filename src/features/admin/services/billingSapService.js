import { axiosInstance } from "../../../shared/lib/axiosInstance";

/**
 * Servicio para consultar y guardar credenciales SAP personales para usuarios de Facturación.
 */

export const getBillingSapCredentials = async () => {
  const response = await axiosInstance.get("/quoteModule/billing-sap-credentials");
  return response.data?.data || [];
};

export const saveBillingSapCredentials = async (data) => {
  const response = await axiosInstance.post("/quoteModule/billing-sap-credentials", data);
  return response.data;
};

export const deleteBillingSapCredentials = async (identifier) => {
  const response = await axiosInstance.delete(`/quoteModule/billing-sap-credentials/${identifier}`);
  return response.data;
};

