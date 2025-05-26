import { NewProductSection } from "../components/NewProductSection";
import { NewClientSection } from "../components/NewClientSection";
import { MainLayout } from "../../../components/layouts/MainLayout";
import { Button, Flex, Skeleton } from "@chakra-ui/react";
import { useQuoteStore } from "../stores/quoteStore";
import { useQuoteMutations } from "../hooks/mutations/quotesMutations";
import { useGetTransports } from "../hooks/queries/quotesQueries";
import { useClientPointsDelivery } from "../../clients/hooks/queries/clientQueries";

export function NewQuotesPage() {
  const {
    client,
    products,
    selectedPoint,
    selectedTransport,
    paymentMethod,
    deposit,
    bank,
    check,
    setPaymentMethod,
    setDeposit,
    setBank,
    setCheck,
  } = useQuoteStore();
  

  
  const setSelectedPoint = useQuoteStore((state) => state.setSelectedPoint);
  const setSelectedTransport = useQuoteStore((state)=> state.setSelectedTransport)

  const { dataTransports, isLoadingTransports } = useGetTransports();
  console.log(dataTransports);
  const { dataDeliveryPoints, isLoadingDeliveryPoints } = useClientPointsDelivery(client?.CardCode);
  console.log(dataDeliveryPoints);

  console.log("selected point", selectedPoint);
  console.log("selected transport : ",selectedTransport);

  const { createQuoteDraftMutation } = useQuoteMutations();

  const handleSave = () => {
    const {
      selectedPoint,
      selectedTransport,
      paymentMethod,
      deposit,
      bank,
      check,
    } = useQuoteStore.getState();

    console.log("Guardar cotización:", {
      client,
      products,
      selectedPoint,
      selectedTransport,
      paymentMethod,
      deposit,
      bank,
      check,
    });

    // Aquí iría tu lógica para guardar el borrador (ej. createQuoteDraftMutation.mutate(...))
  };

  const handleApprove = () => {
    console.log("Aprobar");
  };

  if (isLoadingTransports || isLoadingDeliveryPoints) return <Skeleton height="100vh" />;

  return (
    <MainLayout>
      <NewClientSection
        client={client}
        transports={dataTransports}
        deliveryPoints={dataDeliveryPoints}
        selectedPoint={selectedPoint}
        selectedTransport={selectedTransport}
        paymentMethod={paymentMethod}
        deposit={deposit}
        bank={bank}
        check={check}
        setSelectedTransport={setSelectedTransport}
        setSelectedPoint={setSelectedPoint}
        setPaymentMethod={setPaymentMethod}
        setDeposit={setDeposit}
        setBank={setBank}
        setCheck={setCheck}
      />


      <Flex gap={4} mt={6}>
        <NewProductSection products={products} />
        <Button onClick={handleSave} colorScheme="blue">
          Guardar
        </Button>
        <Button onClick={handleApprove} colorScheme="green">
          Aprobar
        </Button>
      </Flex>
    </MainLayout>
  );
}
