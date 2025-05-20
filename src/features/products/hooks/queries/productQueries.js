// hooks/queries/productQueries.js
import { useQuery } from "@tanstack/react-query";
import { getProducts, getProductDetail } from "../../services/productService";
import { productsAdapter, productDetailsAdapter } from "../../adapters/productAdapter";

export const useProductList = (field, value) => {
    const { data, isLoading, error } = useQuery({
        queryKey: ["products", field, value],
        queryFn: () => getProducts(field, value),
    });

    return {
        data: productsAdapter(data),
        isLoading,
        error,
    };
};

export const useProductDetail = (code) => {
    const { data, isLoading, error } = useQuery({
        queryKey: ["productDetail", code],
        queryFn: () => getProductDetail(code),
        enabled: !!code,
    });

    return {
        productDetail: data,
        isLoadingDetail: isLoading,
        errorDetail: error,
    };
};
