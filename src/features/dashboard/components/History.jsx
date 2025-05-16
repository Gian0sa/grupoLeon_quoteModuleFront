import { useDashboardQueries } from "../hooks/queries/DashboardQueries"
import { Skeleton } from "@chakra-ui/react";

export function History(){
    const { history, historyLoading, historyError } = useDashboardQueries();
    if (historyLoading) return <Skeleton height="20px" width="200px" />;
    if (historyError) return <div>Error: {historyError.message}</div>;
    return (
        <div>
            <h1>History</h1>
            {history.map((item) => (
                <div key={item.id}>
                    <h2>{item.name}</h2>
                </div>
            ))}
        </div>
    );
}
