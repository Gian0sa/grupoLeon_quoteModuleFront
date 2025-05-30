import { useClientService } from "../services/clientService";
import { NewProductSection } from "../components/NewProductSection";
import { NewClientSection } from "../components/NewClientSection";
import { useQuoteStore } from "../stores/quoteStore";
import { MainLayout } from "../../../components/layouts/MainLayout";
import { useAuthStore } from "../../auth/stores/useAuthStore";
import { useQuoteMutations } from "../hooks/mutations/quotesMutations";
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

export function HistoryQuotesPage() {
  const { draftId } = useQuoteStore.getState();
  const { id , isLoading, error, dataTransports, dataDeliveryPoints } = useClientService(draftId);

  const {
    client,
    products,
    selectedPoint,
    selectedTransport,
    paymentMethod,
    paymentImg,
    setSelectedPoint,
    setSelectedTransport,
    setPaymentMethod,
    setPaymentImg,
  } = useQuoteStore(); 

  const { updateQuoteDraftMutation } = useQuoteMutations();

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
        id: Number(draftId),
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
      
  
      updateQuoteDraftMutation.mutate(payload);
    };
  
    const handleApprove = () => {
      console.log("Aprobar");
    };
  

  if (isLoading) return <Skeleton height="100vh" />;
  if (error) return <div>Error cargando datos</div>;

  return(
    <MainLayout>
          <Accordion allowMultiple defaultIndex={[1]}>
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
  )
}
