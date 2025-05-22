import { Skeleton } from "@chakra-ui/react";
import { useGetQuotesDraft } from "../../quotes/hooks/queries/quotesQueries";
import { useNavigate } from "react-router-dom";
import { Button } from "@chakra-ui/react";

export function History(){
    const { data: draftQuotes, isLoading: draftQuotesLoading, error: draftQuotesError } = useGetQuotesDraft();
    const navigate = useNavigate();
    console.log(draftQuotes);
    if (draftQuotesLoading) return <Skeleton height="20px" width="200px" />;
    if (draftQuotesError) return <div>Error: {draftQuotesError.message}</div>;
    return (
        <div>
            <h1>History</h1>
            {draftQuotes.map((item) => (
                <>
                    <div key={item.id}>
                        <h2>{item.id}</h2>
                        <h2>{item.clientId}</h2>
                    </div>
                    <Button onClick={() => navigate(`/quotes/${item.id}`)}>Ver</Button>
                </>
            ))}
        </div>
    );
}
