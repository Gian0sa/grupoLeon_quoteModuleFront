// hooks/queries/productQueries.js
import { useQuery } from "@tanstack/react-query";
import { getProductDetail , getProductsPriceList , getBrandTypeSubtype } from "../../services/productService";
import { ca } from "date-fns/locale";

export const useProductDetail = (code) => {
    const { data, isLoading, error } = useQuery({
        queryKey: ["productDetail", code],
        queryFn: () => getProductDetail(code)
    });

    return {
        productDetail: data,
        isLoadingDetail: isLoading,
        errorDetail: error,
    };
};

export const useProductsPriceList = ({ 
  itemName = '', 
  itemCode = '', 
  marca = '', 
  tipo = '', 
  subtipo = '', 
  stock = 'N', 
  page = 1,      
  enabled 
}) => {
  return useQuery({
    queryKey: [
      "productsPriceList", 
      itemName, 
      itemCode, 
      marca, 
      tipo, 
      subtipo, 
      stock,
      page,
    ],
    queryFn: () => 
      getProductsPriceList({ 
        itemName, 
        itemCode, 
        marca, 
        tipo, 
        subtipo, 
        stock,
        page,
      }),
    enabled,
    keepPreviousData: true,
  });
};

export const useBrandTypeSubtype = () => {
  const { data, isLoading, error } = useQuery({
    queryKey: ["brandTypeSubtype"],
    queryFn: () => getBrandTypeSubtype(),
  });

  return {
    brandTypeSubtype: data,
    isLoadingBrandTypeSubtype: isLoading,
    errorBrandTypeSubtype: error,
  };
};