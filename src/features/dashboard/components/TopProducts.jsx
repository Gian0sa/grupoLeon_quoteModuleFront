import { Flex, Skeleton } from "@chakra-ui/react";
import { useDashboardQueries } from "../hooks/queries/DashboardQueries"

export function TopProducts(){
    const { topProducts, topProductsLoading, topProductsError } = useDashboardQueries();
    if (topProductsLoading) return <Skeleton height="20px" width="200px" />;
    if (topProductsError) return <div>Error: {topProductsError.message}</div>;
    return(
        <>
            <Flex>
                <div>Top Products</div>
                {topProducts.map((product) => (
                    <div key={product.id}>
                        <h2>{product.name}</h2>
                        <p>{product.price}</p>
                    </div>
                ))}
            </Flex>
        </>
    )
}
