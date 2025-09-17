import { axiosInstance } from "../../../shared/lib/axiosInstance";

export const getProductDetail = async (code) => {
    const response = await axiosInstance.get(`/quoteModule/products/${code}`);
    return response.data;
};

export const getProductsPriceList = async ({ 
  itemName = '',
  itemCode = '', 
  marca = '', 
  tipo = '', 
  subtipo = '',  
  stock = 'N',
  page = 1
}) => {
  try {
    const params = new URLSearchParams();

    if (itemName) params.append('itemName', itemName);
    if (itemCode) params.append('itemCode', itemCode);
    if (marca) params.append('marca', marca);
    if (tipo) params.append('tipo', tipo);
    if (subtipo) params.append('subtipo', subtipo);
    if (stock) params.append('stock', stock);

    params.append('page', page);

    const url = `/reportModule/priceList?${params.toString()}`;
    console.log("Consultando:", url);

    const response = await axiosInstance.get(url);
    return response.data;
  } catch (error) {
    console.error("Error al obtener la lista de precios:", error);
    return null;
  }
};
