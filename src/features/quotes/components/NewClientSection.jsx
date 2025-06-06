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
  selectedPoint,
  selectedTransport,
  selectedDeliveryForm,
  selectedPaymentType,
  paymentImg,
  setSelectedTransport,
  setSelectedPoint,
  setSelectedPaymentType,
  setSelectedDeliveryForm,
  comment,
  setComment,
  deliveryDate,
  setDeliveryDate,
}) {
  const { uploadImageMutation, deleteImageMutation } = useQuoteMutations();

  console.log("los transportistas son : ",transports);

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
        value: deliveryForm.TrnspCode,
        label: deliveryForm.TrnspName,
      }))
    : [];

  const paymentTypesOptions = Array.isArray(paymentTypes)
    ? paymentTypes.map((type) => ({
        value: String(type.GroupNum),
        label: type.PymntGroup,
      }))
    : [];

  // ✅ LÓGICA PARA DETERMINAR SI ES RECOJO EN TIENDA
  const isPickupInStore = selectedDeliveryForm?.TrnspName?.toLowerCase().includes('recojo') ||
                         selectedDeliveryForm?.TrnspName?.toLowerCase().includes('tienda') ||
                         selectedDeliveryForm?.TrnspCode === '04'; // Si conoces el código específico

  // ✅ LIMPIAR SELECCIONES CUANDO CAMBIA A RECOJO EN TIENDA
  const handleDeliveryFormChange = (selected) => {
    const selectedObj = deliveryForms.find(
      (form) => form.TrnspCode === selected.value
    );
    setSelectedDeliveryForm(selectedObj);

    // Si cambia a recojo en tienda, limpiar punto de llegada y transporte
    if (selectedObj?.TrnspName?.toLowerCase().includes('recojo') ||
        selectedObj?.TrnspName?.toLowerCase().includes('tienda') ||
        selectedObj?.TrnspCode === '04') {
      setSelectedPoint(null);
      setSelectedTransport(null);
    }
  };

  return (
    <Box>
      <Text>Codigo: {clientAdapted.cardCode}</Text>
      <Text>Nombre: {clientAdapted.cardName}</Text>
      <Text>Dirección: {clientAdapted.address}</Text>

      {/* SELECTOR DE FORMA DE ENTREGA */}
      <Box mt={4}>
        <FormLabel>Forma de entrega</FormLabel>
        <ReactSelect
          options={deliveryFormsOptions}
          value={
            selectedDeliveryForm
              ? {
                  value: selectedDeliveryForm.TrnspCode,
                  label: selectedDeliveryForm.TrnspName,
                }
              : null
          }
          onChange={handleDeliveryFormChange} // ✅ Usar la nueva función
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

      {/* SELECTOR DE TIPO DE PAGO */}
      <Box mt={4}>
        <FormLabel>Tipo de pago</FormLabel>
        <ReactSelect
          options={paymentTypesOptions}
          value={
            selectedPaymentType
              ? {
                  value: String(selectedPaymentType.GroupNum),
                  label: selectedPaymentType.PymntGroup,
                }
              : null
          }
          onChange={(selected) => {
            const selectedObj = paymentTypes.find(
              (type) => String(type.GroupNum) === selected.value
            );
            setSelectedPaymentType(selectedObj);
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

      {/* ✅ PUNTO DE LLEGADA - SOLO SI NO ES RECOJO EN TIENDA */}
      {!isPickupInStore && (
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
      )}

      {/* ✅ TRANSPORTE - SOLO SI NO ES RECOJO EN TIENDA */}
      {!isPickupInStore && (
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
      )}

      <DatePickerField
        label="Fecha de entrega"
        selectedDate={deliveryDate}
        setSelectedDate={setDeliveryDate}
      />

      <VStack spacing={4} mt={6} align="stretch">
        <Box>
          <FormLabel>Comentarios</FormLabel>
          <Textarea
            placeholder="Ingrese comentarios adicionales..."
            value={comment}
            onChange={(e) => setComment(e.target.value)}
          />
        </Box>

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
              <img
                src={`${import.meta.env.VITE_API_URL}/quoteModule/${paymentImg}`}
              />
            </Box>
          )}
        </Box>
      </VStack>
    </Box>
  );
}