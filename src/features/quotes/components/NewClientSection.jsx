import {
  Box,
  Text,
  Input,
  FormLabel,
  VStack,
  Textarea,
} from "@chakra-ui/react";
import ReactSelect from "react-select";
import { adaptBusinessPartner } from "../adapters/quotesAdapter";
import { useQuoteMutations } from "../hooks/mutations/quotesMutations";
import { DatePickerField } from "../../../components/DatePickerField";

export function NewClientSection({
  client,
  transports,
  deliveryPoints,
  deliveryForms,
  paymentTypes,
  selectedPaymentType,
  setPaymentType,
  selectedPoint,
  selectedTransport,
  selectedDeliveryForm,
  setSelectedDeliveryForm,
  paymentImg,
  setSelectedTransport,
  setSelectedPoint,
  comment,
  setComment,
  deliveryDate,
  setDeliveryDate,
}) {

  console.log(deliveryForms);
  console.log(paymentTypes);
  const {uploadImageMutation , deleteImageMutation} = useQuoteMutations();

  const handleUploadPaymentImage = async (file) => {
    try {
      if (paymentImg) {
        deleteImageMutation.mutate(paymentImg);
      }
  
      uploadImageMutation.mutate(file);
    } catch (error) {
      console.error("Error al subir imagen:", error);
    }
  };
  
  console.log(client);
  if (!client) return <Text>Cargando cliente...</Text>;

  const clientAdapted = adaptBusinessPartner(client);

  const deliveryOptions = deliveryPoints.map((point) => ({
    value: point.AddressName,
    label: `${point.AddressName} - ${point.Street}`,
  }));

  const transportOptions = transports.map((transport) => ({
    value: transport.Name,
    label: (
      <div>
        <div>
          <strong>Nombre:</strong> {transport.Name}
        </div>
        <div style={{ fontSize: "smaller", color: "Black" }}>
          Dirección: {transport.U_TQC_DIREC}
        </div>
      </div>
    ),
  }));

  const deliveryFormsOptions = Array.isArray(deliveryForms)
  ? deliveryForms.map((deliveryForm) => ({
      value: deliveryForm.Name,
      label: deliveryForm.Description,
    }))
  : [];

const paymentTypesOptions = Array.isArray(paymentTypes)
  ? paymentTypes.map((type) => ({
      value: type.GroupNum,
      label: type.PymntGroup,
    }))
  : [];


  
  return (
    <Box>
      <Text>Codigo: {clientAdapted.cardCode}</Text>
      <Text>Nombre: {clientAdapted.cardName}</Text>
      <Text>Dirección: {clientAdapted.address}</Text>

      <Box mt={4}>
  <FormLabel>Forma de entrega</FormLabel>
  <ReactSelect
    options={deliveryFormsOptions}
    value={
      selectedDeliveryForm
        ? {
            value: selectedDeliveryForm.Name,
            label: selectedDeliveryForm.Description,
          }
        : null
    }
    onChange={(selected) => {
      const selectedObj = deliveryForms.find(
        (form) => form.Name === selected.value
      );
      setSelectedDeliveryForm(selectedObj);
    }}
    placeholder="Selecciona una forma de entrega"
    styles={{
      container: (provided) => ({
        ...provided,
        maxWidth: "800px",
        width: "100%",
        color: "black",
      }),
    }}
  />
</Box>


<Box mt={4}>
        <FormLabel>Tipo de pago</FormLabel>
        <ReactSelect
          options={paymentTypesOptions}
          value={
            paymentTypesOptions.find((opt) => opt.value === paymentMethod.PymntGroup) || null
          }
          onChange={(selected) => {
            setPaymentMethod(selected.value);
          }}
          placeholder="Selecciona un tipo de pago"
          styles={{
            container: (provided) => ({
              ...provided,
              maxWidth: "800px",
              width: "100%",
              color: "black",
            }),
          }}
        />
      </Box>

      <Box mt={4}>
        <FormLabel>Punto de llegada</FormLabel>
        <ReactSelect
          options={deliveryOptions}
          value={
            selectedPoint
              ? {
                  value: selectedPoint.AddressName,
                  label: `${selectedPoint.AddressName} - ${selectedPoint.Street}`,
                }
              : null
          }
          onChange={(selected) => {
            const selectedObj = deliveryPoints.find(
              (p) => p.AddressName === selected.value
            );
            setSelectedPoint(selectedObj);
          }}
          placeholder="Selecciona un punto de llegada"
          styles={{
            container: (provided) => ({
              ...provided,
              maxWidth: "800px",
              width: "100%",
              color: "black",
            }),
          }}
        />
      </Box>

      <Box mt={4}>
        <FormLabel>Transporte</FormLabel>
        <ReactSelect
          options={transportOptions}
          value={
            selectedTransport
              ? {
                  value: selectedTransport.Name,
                  label: (
                    <div>
                      <div style={{ fontSize: "smaller", color: "Black" }}>
                        Nombre: {selectedTransport.Name}
                      </div>
                      <div style={{ fontSize: "smaller", color: "Black" }}>
                        Dirección: {selectedTransport.U_TQC_DIREC}
                      </div>
                    </div>  
                  ),
                }
              : null
          }
          onChange={(selected) => {
            const selectedObj = transports.find(
              (t) => t.Name === selected.value
            );
            setSelectedTransport(selectedObj);
          }}
          placeholder="Selecciona un transporte"
          styles={{
            container: (provided) => ({
              ...provided,
              maxWidth: "800px",
              width: "100%",
              color: "black",
            }),
            singleValue: (provided) => ({
              ...provided,
              whiteSpace: "normal",
            }),
            option: (provided) => ({
              ...provided,
              whiteSpace: "normal",
            }),
          }}
        />
      </Box>


      <DatePickerField
        label="Fecha de entrega"
        selectedDate={deliveryDate} 
        setSelectedDate={setDeliveryDate}
      />


      <VStack spacing={4} mt={6} align="stretch">
        <Box>
          <FormLabel>Comprobante</FormLabel>
          <Input
            type="file"
            accept="image/*"
            capture="environment"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) {
                handleUploadPaymentImage(file);
              }
            }}
          />
          {paymentImg && (
            <Box mt={2}>
              <img src={`${import.meta.env.VITE_API_URL}/quoteModule/${paymentImg}`} />
            </Box>
          )}
        </Box>

        <Box>
          <FormLabel>Comentarios</FormLabel>
          <Textarea
            placeholder="Ingrese comentarios adicionales..."
            value={comment}
            onChange={(e) => setComment(e.target.value)}
          />
        </Box>
      </VStack>
    </Box>
  );
}
