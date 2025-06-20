import { RequestQuoteClientSection } from "../components/RequestQuoteClientSection";
import { RequestQuoteProductSection } from "../components/RequestQuoteProductSection";
import { MainLayout } from "../../../components/layouts/MainLayout";
import { useGetRequestQuoteById } from "../hooks/queries/supervisorQueries";
import { useQuoteStore } from "../../quotes/stores/quoteStore";

import {
  Skeleton,
  Box,
  Text,
} from "@chakra-ui/react";

export function RequestQuotePage() {
  const { quoteId } = useQuoteStore.getState();
  const { data, isLoading, error } = useGetRequestQuoteById(quoteId);

  if (isLoading) {
    return (
      <MainLayout>
        <Skeleton height="100px" />
      </MainLayout>
    );
  }

  if (error || !data) {
    return (
      <MainLayout>
        <Text color="red.500">Error al cargar la cotización.</Text>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <Box px={6} py={4}>
        <RequestQuoteClientSection client={data} />
        <RequestQuoteProductSection products={data.items} />
      </Box>
    </MainLayout>
  );
}
    