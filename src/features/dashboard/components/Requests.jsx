import { Skeleton, Box, Stack, Heading, Text, Button } from "@chakra-ui/react";
import { useGetQuotes } from "../../quotes/hooks/queries/quotesQueries";
import { useNavigate } from "react-router-dom";
import { useQuoteStore } from "../../quotes/stores/quoteStore";
import { useGetRequestQuotes } from "../../supervisor/hooks/queries/supervisorQueries";
import { BackButton } from "../../../components/BackButton";

export function Requests() {
  const { data: Quotes, isLoading: quotesLoading, error: quotesError } = useGetRequestQuotes();
  const setQuoteId = useQuoteStore((state) => state.setQuoteId);
  const navigate = useNavigate();

  if (quotesLoading) {
    return (
      <Stack spacing={4}>
        {[...Array(3)].map((_, i) => (
          <Skeleton key={i} height="80px" borderRadius="md" />
        ))}
      </Stack>
    );
  }

  if (quotesError) {
    return <Box color="red.500">Error: {quotesError.message}</Box>;
  }

  return (
    <Box p={6}>
      <BackButton />
      <Heading size="lg" mb={4}>Historial de Cotizaciones</Heading>
      <Stack spacing={4}>
        {Quotes.map((item) => (
          <Box
            key={item.id}
            p={4}
            borderWidth="1px"
            borderRadius="lg"
            boxShadow="md"
          >
            <Text fontWeight="bold">ID de Cotización: {item.id}</Text>
            <Text>Cliente: {item.clientId}</Text>
            <Button
              mt={2}
              colorScheme="teal"
              onClick={() => {
                setQuoteId(item.id);
                navigate(`/detailRequests`);
              }}
            >
              Ver detalles
            </Button>
          </Box>
        ))}
      </Stack>
    </Box>
  );
}
