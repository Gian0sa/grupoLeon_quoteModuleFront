import { Skeleton } from "@chakra-ui/react";
import { useGetQuotes } from "../../quotes/hooks/queries/quotesQueries";
import { useNavigate } from "react-router-dom";
import { Button } from "@chakra-ui/react";
import { useQuoteStore } from "../../quotes/stores/quoteStore";
import React from "react";

export function History(){
    const { data: Quotes, isLoading: quotesLoading, error: quotesError } = useGetQuotes();
    const setQuoteId = useQuoteStore((state) => state.setQuoteId);
    const navigate = useNavigate();
    if (quotesLoading) return <Skeleton height="20px" width="200px" />;
    if (quotesError) return <div>Error: {quotesError.message}</div>;
    return (
        <div>
            <h1>History</h1>
            {Quotes.map((item) => (
                <React.Fragment key={item.id}>
                    <div>
                    <h2>{item.id}</h2>
                    <h2>{item.clientId}</h2>
                    </div>
                    <Button
                    onClick={() => {
                        setQuoteId(item.id);
                        navigate(`/historyquotes`);
                    }}
                    >
                    Ver
                    </Button>
                </React.Fragment>
                ))}
        </div>
    );
}
