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
import { useGetDeliveryForms, useGetPaymentType, useGetTransports } from "../hooks/queries/quotesQueries";
import { useClientPointsDelivery } from "../../clients/hooks/queries/clientQueries";

export function NewQuotesPage() {
  const {
    client,
    products,
    selectedPoint,
    selectedTransport,
    paymentImg,
    selectedDeliveryForm,
    selectedPaymentType,
    comment,
    deliveryDate,
  } = useQuoteStore();

  const setSelectedPoint = useQuoteStore((state) => state.setSelectedPoint);
  const setSelectedTransport = useQuoteStore((state) => state.setSelectedTransport);
  const setSelectedPaymentType = useQuoteStore((state) => state.setSelectedPaymentType);
  const setSelectedDeliveryForm = useQuoteStore((state) => state.setSelectedDeliveryForm);
  const setComment = useQuoteStore((state) => state.setComment);
  const setDeliveryDate = useQuoteStore((state) => state.setDeliveryDate);

  const { dataTransports, isLoadingTransports } = useGetTransports();
  const { dataDeliveryPoints, isLoadingDeliveryPoints } = useClientPointsDelivery(client?.CardCode);
  const { dataDeliveryForms, isLoadingDeliveryForms } = useGetDeliveryForms();
  const { dataPaymentTypes, isLoadingPaymentTypes } = useGetPaymentType();

  const { createQuoteMutation } = useQuoteMutations();

 

  if (isLoadingTransports || isLoadingDeliveryPoints || isLoadingDeliveryForms || isLoadingPaymentTypes)
    return <Skeleton height="100vh" />;

  return (
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
              deliveryForms= {dataDeliveryForms}
              paymentTypes= {dataPaymentTypes}
              selectedPoint={selectedPoint}
              selectedTransport={selectedTransport}
              paymentMethod={paymentMethod}
              paymentImg= {paymentImg}
              setSelectedTransport={setSelectedTransport}
              setSelectedPoint={setSelectedPoint}
              setPaymentMethod={setPaymentMethod}
              comment={comment}
              setComment={setComment}
              deliveryDate={deliveryDate}
              setDeliveryDate={setDeliveryDate}
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