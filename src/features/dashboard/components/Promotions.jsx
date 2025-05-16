import { useDashboardQueries } from "../hooks/queries/DashboardQueries"
import { Skeleton } from "@chakra-ui/react";

export function Promotions(){
    const { promotions, promotionsLoading, promotionsError } = useDashboardQueries();
    if (promotionsLoading) return <Skeleton height="20px" width="200px" />;
    if (promotionsError) return <div>Error: {promotionsError.message}</div>;
    return(
        <div>
            <h1>Promotions</h1>
            {promotions.map((promotion) => (
                <div key={promotion.id}>
                    <h2>{promotion.name}</h2>
                    <p>{promotion.description}</p>
                    <p>{promotion.discount}</p>
                    <p>{promotion.price}</p>
                </div>
            ))}
        </div>
    )
}
