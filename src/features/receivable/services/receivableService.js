import { axiosInstance } from "../../../shared/lib/axiosInstance";

export const getAccountsReceivable = async ({ vendedor, cliente, clientecode, lastClient = null }) => {
  try {
    let url = `/reportModule/accountsReceivable?vendedor=${encodeURIComponent(vendedor)}`;
    if (cliente) url += `&cliente=${encodeURIComponent(cliente)}`;
    if (clientecode) url += `&clientecode=${encodeURIComponent(clientecode)}`;
    if (lastClient) url += `&lastClient=${encodeURIComponent(lastClient)}`;

    const response = await axiosInstance.get(url);
    return response.data;
  } catch (error) {
    console.error("Error al obtener cuentas por cobrar:", error);
    return null;
  }
};
