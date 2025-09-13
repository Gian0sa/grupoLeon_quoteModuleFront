import { axiosInstance } from "../../../shared/lib/axiosInstance";

export const getProductDetail = async (code) => {
    const response = await axiosInstance.get(`/quoteModule/products/${code}`);
    return response.data;
};

export const getProductsPriceList = async ({ itemCode = '', marca = '', tipo = '' , itemName = '' }) => {
  try {
    const params = new URLSearchParams();
    if (itemCode) params.append('itemCode', itemCode);
    if (marca) params.append('marca', marca);
    if (tipo) params.append('tipo', tipo);
    if (itemName) params.append('itemName', itemName);

    const url = `/reportModule/priceList?${params.toString()}`;
    console.log("Consultando:", url);

    const response = await axiosInstance.get(url);
    return response.data;
  } catch (error) {
    console.error("Error al obtener la lista de precios:", error);
    return null;
  }
};

