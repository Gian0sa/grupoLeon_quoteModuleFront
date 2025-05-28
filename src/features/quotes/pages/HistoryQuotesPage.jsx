import { useClientService } from "../services/clientService";
import { useQuoteStore } from "../stores/quoteStore";

export function HistoryQuotesPage() {
  const { draftId } = useQuoteStore.getState();
  const { isLoading, error, dataTransports, dataDeliveryPoints } = useClientService(draftId);

  if (isLoading) return <div>Cargando...</div>;
  if (error) return <div>Error cargando datos</div>;

  console.log("mis delivery points son : ",dataDeliveryPoints);

  return <div>history</div>;
}
