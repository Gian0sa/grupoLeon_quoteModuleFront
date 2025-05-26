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

  const { createQuoteDraftMutation } = useQuoteMutations();

  const handleSave = () => {
    const {
      client,
      products,
      selectedPoint,
      selectedTransport,
      paymentMethod,
      deposit,
      bank,
      check,
    } = useQuoteStore.getState();
  
    if (!client || products.length === 0) {
      console.warn("Faltan datos del cliente o productos");
      return;
    }
  
    const payload = {
      clientName: client.CardName,
      clientDocument: client.LicTradNum,
      clientAddress: client.Address,
      deliveryPoint: selectedPoint?.name || "",
      transport: selectedTransport?.name || "",
      transportDirection: selectedTransport?.address || "",
      paymentMethod: paymentMethod || "",
      abonado: deposit || "0.00",
      bankName: bank || "",
      checkNumber: check || "",
      userId: 1,
      status: "draft",
      items: products.map((product) => ({
        productCode: product.code,
        productName: product.name,
        unitPrice: product.price,
        quantity: product.quantity,
        totalPrice: Number(product.quantity) * Number(product.price),
      })),
    };
  
    console.log("Payload para guardar cotización:", payload);
  
    createQuoteDraftMutation.mutate(payload);
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

      <NewProductSection products={products} /> 

      <Flex gap={4} mt={6}>
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
