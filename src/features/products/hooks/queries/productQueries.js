// hooks/queries/productQueries.js
import { useQuery } from "@tanstack/react-query";
import { getProductDetail , getProductsPriceList } from "../../services/productService";
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

export const useProductsPriceList = ({ cardCode, marca, tipo, itemName, enabled }) => {
  return useQuery({
    queryKey: ["productsPriceList", cardCode, marca, tipo, itemName],
    queryFn: () => getProductsPriceList({ cardCode, marca, tipo, itemName }),
    enabled, 
  });
};
