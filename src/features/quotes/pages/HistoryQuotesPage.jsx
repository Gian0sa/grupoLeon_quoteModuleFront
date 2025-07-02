import { useClientService } from "../services/clientService";
import { NewProductSection } from "../components/NewProductSection";
import { NewClientSection } from "../components/NewClientSection";
import { NewSellTerms } from "../components/NewSellTerms";
import { useQuoteStore } from "../stores/quoteStore";
import { MainLayout } from "../../../components/layouts/MainLayout";
import { useAuthStore } from "../../auth/stores/useAuthStore";
import { useQuoteMutations } from "../hooks/mutations/quotesMutations";
import { useState } from "react";
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
  const { quoteId } = useQuoteStore.getState();
  const { id , isLoading, error, dataTransports, dataDeliveryPoints , dataDeliveryForms , dataPaymentTypes } = useClientService(quoteId);

  
  const { uploadImageMutation, deleteImageMutation } = useQuoteMutations();
  const { createQuoteMutation } = useQuoteMutations();
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
    opNum,
    setSelectedPoint,
    setSelectedTransport,
    setPaymentImg,
    setSelectedDeliveryForm,
    setSelectedPaymentType,
    setComment,
    setDeliveryDate,
    setOpNum,

  } = useQuoteStore();
  console.log("products : ",products);

  
  console.log("el selected type en la vista padre es : ",selectedPaymentType);

  
    const [tempImage, setTempImage] = useState(null);

  const { updateQuoteMutation } = useQuoteMutations();

  const handleSave = async () => {
    const {
      client,
      products,
      selectedPoint,
      selectedTransport,
      selectedDeliveryForm,
      selectedPaymentType,
      comment,
      deliveryDate,
      opNum,
    } = useQuoteStore.getState();

  
    const { userId } = useAuthStore.getState();
  
    let imagePath = paymentImg;
    if (tempImage) {
      const formData = new FormData();
      formData.append("file", tempImage);
      try {
        const response = await uploadImageMutation.mutateAsync(tempImage);
        if (response?.imagePath) {
          imagePath = response.imagePath;
        } else {
          throw new Error("No se pudo obtener el nombre de archivo de la imagen subida.");
        }
      } catch (error) {
        console.error("Error subiendo imagen", error);
        return;
      }
    }
  
    const payload = {
      id: Number(quoteId),
      clientName: client.CardName,
      clientDocument: client.CardCode,
      clientAddress: client.Address,
      deliveryPoint: selectedPoint || [],
      deliveryForm: selectedDeliveryForm?.TrnspName || "",
      transport: selectedTransport?.Name || "",
      transportDirection: selectedTransport?.U_TQC_DIREC || "",
      paymentType: selectedPaymentType || null,
      pathImg: imagePath || "",
      userId: Number(userId),
      comment: comment || "",
      deliveryDate: deliveryDate || null,
      opNum: opNum || null,
      state: "draft",
      items: products.map((product) => ({
        sigla: product.sigla,
        productCode: product.id,
        productName: product.name,
        unitPrice: Number(product.price),
        discount: Number(product.discount) || 0,
        importe: Number(product.importe) || 0,
        quantity: Number(product.quantity),
        totalPrice: Number(product.quantity) * Number(product.importe),
      })),
    };

    console.log("el payload de creacion es : ",payload);
  
    updateQuoteMutation.mutate(payload);
  };
  
  const handleApprove = async () => {
    const {
      client,
      products,
      selectedPoint,
      selectedTransport,
      selectedDeliveryForm,
      selectedPaymentType,
      comment,
      deliveryDate,
      opNum,
    } = useQuoteStore.getState();
  
    const { userId } = useAuthStore.getState();
  
    if (!client || products.length === 0) {
      console.warn("Faltan datos del cliente o productos");
      return;
    }
  
    let imagePath = paymentImg;
    if (tempImage) {
      const formData = new FormData();
      formData.append("file", tempImage);
      try {
        const response = await uploadImageMutation.mutateAsync(tempImage);
        if (response?.imagePath) {
          imagePath = response.imagePath;
        } else {
          throw new Error("No se pudo obtener el nombre de archivo de la imagen subida.");
        }
      } catch (error) {
        console.error("Error subiendo imagen", error);
        return;
      }
    }
  
    const payload = {
      id: Number(quoteId),
      clientName: client.CardName,
      clientDocument: client.CardCode,
      clientAddress: client.Address,
      deliveryPoint: selectedPoint || [],
      deliveryForm: selectedDeliveryForm?.TrnspName || "",
      transport: selectedTransport?.Name || "",
      transportDirection: selectedTransport?.U_TQC_DIREC || "",
      paymentType: selectedPaymentType || 0,
      pathImg: imagePath || "",
      userId: Number(userId),
      comment: comment || "",
      deliveryDate: deliveryDate || null,
      opNum: opNum || null,
      state: "approved_seller",
      items: products.map((product) => ({
        sigla: product.sigla,
        productCode: product.id,
        productName: product.name,
        unitPrice: Number(product.price),
        discount: Number(product.discount) || 0,
        importe: Number(product.importe) || 0,
        quantity: Number(product.quantity),
        totalPrice: Number(product.quantity) * Number(product.importe),
      })),
    };
  
    console.log("Payload de aprobación: ", payload);
  
    updateQuoteMutation.mutate(payload);
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
                deliveryForms= {dataDeliveryForms}
                paymentTypes= {dataPaymentTypes}
                selectedPoint={selectedPoint}
                selectedTransport={selectedTransport}
                selectedDeliveryForm={selectedDeliveryForm}
                selectedPaymentType={selectedPaymentType}
                paymentImg= {paymentImg}
                setSelectedTransport={setSelectedTransport}
                setSelectedPoint={setSelectedPoint}
                setSelectedPaymentType={setSelectedPaymentType}
                setSelectedDeliveryForm={setSelectedDeliveryForm}
                comment={comment}
                setComment={setComment}
                deliveryDate={deliveryDate}
                setDeliveryDate={setDeliveryDate}
                tempImage={tempImage}
                setTempImage={setTempImage}
                setPaymentImg={setPaymentImg}
                opNum={opNum}
                setOpNum={setOpNum}
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
            <NewSellTerms
                client={client}
                transports={dataTransports}
                deliveryPoints={dataDeliveryPoints}
                deliveryForms= {dataDeliveryForms}
                paymentTypes= {dataPaymentTypes}
                selectedPoint={selectedPoint}
                selectedTransport={selectedTransport}
                selectedDeliveryForm={selectedDeliveryForm}
                selectedPaymentType={selectedPaymentType}
                paymentImg= {paymentImg}
                setSelectedTransport={setSelectedTransport}
                setSelectedPoint={setSelectedPoint}
                setSelectedPaymentType={setSelectedPaymentType}
                setSelectedDeliveryForm={setSelectedDeliveryForm}
                comment={comment}
                setComment={setComment}
                deliveryDate={deliveryDate}
                setDeliveryDate={setDeliveryDate}
                tempImage={tempImage}
                setTempImage={setTempImage}
                setPaymentImg={setPaymentImg}
                opNum={opNum}
                setOpNum={setOpNum}
              />
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
