import { axiosInstance } from "../../../shared/lib/axiosInstance";

// services/receivableService.js
export const getAccountsReceivable = async ({ vendedor, cliente, page = 1 }) => {
  console.log("Llamando a getAccountsReceivable con:", { vendedor, cliente, page });
  try {
    let url = `/reportModule/accountsReceivable?vendedor=${vendedor}&page=${page}`;
    if (cliente) url += `&cliente=${cliente}`;

    const response = await axiosInstance.get(url);
    console.log("Respuesta de gee:", response.data); // Log the full response data
    return response.data;
  } catch (error) {
    console.error("Error al obtener cuentas por cobrar:", error);
    return null;
  }
};
