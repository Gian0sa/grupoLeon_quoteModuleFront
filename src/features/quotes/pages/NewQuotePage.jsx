import { NewProductSection } from "../components/NewProductSection";
import { NewClientSection } from "../components/NewClientSection";
import { MainLayout } from "../../../components/layouts/MainLayout";
import {
  Button,
  Flex,
  Skeleton,
  Accordion,
  AccordionItem,
  AccordionButton,
  AccordionPanel,
  AccordionIcon,
  Box,
  Text,
} from "@chakra-ui/react";
import { useQuoteStore } from "../stores/quoteStore";
import { useAuthStore } from "../../auth/stores/useAuthStore";
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
    paymentImg,
    setPaymentMethod,
    setPaymentImg,
  } = useQuoteStore();

  const setSelectedPoint = useQuoteStore((state) => state.setSelectedPoint);
  const setSelectedTransport = useQuoteStore(
    (state) => state.setSelectedTransport
  );

  const { dataTransports, isLoadingTransports } = useGetTransports();
  const { dataDeliveryPoints, isLoadingDeliveryPoints } =
    useClientPointsDelivery(client?.CardCode);

  const { createQuoteDraftMutation } = useQuoteMutations();

  const handleSave = () => {
    const {
      client,
      products,
      selectedPoint,
      selectedTransport,
      paymentMethod,
      paymentImg,
    } = useQuoteStore.getState();

    const { userId } = useAuthStore.getState();
    if (!client || products.length === 0) {
      console.warn("Faltan datos del cliente o productos");
      return;
    }

    const payload = {
      clientName: client.CardName,
      clientDocument: client.CardCode,
      clientAddress: client.Address,
      deliveryPoint: selectedPoint || [],
      transport: selectedTransport.Name || "",
      transportDirection: selectedTransport?.U_TQC_DIREC || "",
      paymentType: paymentMethod || null,
      pathImg: paymentImg || "",
      userId: Number(userId),
      state: "draft",
      items: products.map((product) => ({
        sigla: product.sigla,
        productCode: product.id,
        productName: product.name,
        unitPrice: Number(product.price),
        discount:  Number(product.discount) || 0,
        importe:  Number(product.importe) || 0,
        quantity:  Number(product.quantity),
        totalPrice: Number(product.quantity) * Number(product.importe),
      })),
    };
    
    createQuoteDraftMutation.mutate(payload);
  };

  const handleApprove = () => {
    console.log("Aprobar");
  };

  if (isLoadingTransports || isLoadingDeliveryPoints)
    return <Skeleton height="100vh" />;

  return (
    <MainLayout>
      <Accordion allowMultiple>
        <AccordionItem>
          <h2>
            <AccordionButton>
              <Box as='span' flex='1' textAlign='left'>
                <Text fontSize="xl" fontWeight="bold" mb={4}>
                  Seccion de Cliente
                </Text>
              </Box>
              <AccordionIcon />
            </AccordionButton>
          </h2>
          <AccordionPanel pb={4}>
            <NewClientSection
              client={client}
              transports={dataTransports}
              deliveryPoints={dataDeliveryPoints}
              selectedPoint={selectedPoint}
              selectedTransport={selectedTransport}
              paymentMethod={paymentMethod}
              paymentImg= {paymentImg}
              setSelectedTransport={setSelectedTransport}
              setSelectedPoint={setSelectedPoint}
              setPaymentMethod={setPaymentMethod}
              setPaymentImg={setPaymentImg}
            />
          </AccordionPanel>
        </AccordionItem>

        <AccordionItem>
          <h2>
            <AccordionButton>
              <Box as="span" flex="1" textAlign="left">
                <Text fontSize="xl" fontWeight="bold" mb={4}>
                  Seccion de Productos
                </Text>
              </Box>
              <AccordionIcon />
            </AccordionButton>
          </h2>
          <AccordionPanel pb={4}>
            <NewProductSection products={products} />
          </AccordionPanel>
        </AccordionItem>
      </Accordion>

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
