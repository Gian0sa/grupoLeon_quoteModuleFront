// hooks/queries/productQueries.js
import { useQuery } from "@tanstack/react-query";
import { getProductDetail } from "../../services/productService";

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
