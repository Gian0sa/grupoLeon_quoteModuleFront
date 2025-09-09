import { axiosInstance } from "../../../shared/lib/axiosInstance";

// services/receivableService.js
export const getAccountsReceivable = async ({ vendedor, cliente, clientecode, page = 1 }) => {
  try {
    let url = `/reportModule/accountsReceivable?vendedor=${vendedor}&page=${page}`;
    if (cliente) url += `&cliente=${cliente}`;
    if (clientecode) url += `&clientecode=${clientecode}`;

    const response = await axiosInstance.get(url);
    return response.data;
  } catch (error) {
    console.error("Error al obtener cuentas por cobrar:", error);
    return null;
  }
};
