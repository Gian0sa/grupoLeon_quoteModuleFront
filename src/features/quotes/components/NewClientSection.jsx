import {
  Box,
  Text,
  Input,
  FormLabel,
  VStack,
  Textarea,
  Button,
} from "@chakra-ui/react";
import ReactSelect from "react-select";
import { adaptBusinessPartner } from "../adapters/quotesAdapter";
import { useQuoteMutations } from "../hooks/mutations/quotesMutations";
import { DatePickerField } from "../../../components/DatePickerField";
import Tesseract from "tesseract.js";

export function NewClientSection({
  client,
  transports = [],
  deliveryPoints = [],
  deliveryForms = [],
  paymentTypes = [],
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
  tempImage,
  setTempImage,
  setPaymentImg,
  opNum,
  setOpNum
}) {
  const { uploadImageMutation, deleteImageMutation } = useQuoteMutations();

  const extractOperationNumber = async (imageFile, setOpNum) => {
    try {
      const { data } = await Tesseract.recognize(imageFile, "spa", {
        logger: (m) => console.log(m), // opcional: para ver progreso
      });
  
      const text = data.text;
      console.log("Texto detectado:", text);
  
      const match = text.match(
        /(?:n[úu]m(?:ero)?|nmr|no|n°|n\.?|ope\.?|op\.?|operaci[oó]n)[^\d]{0,10}(\d[\d\.]{6,})/i
      );      
      if (match) {
        setOpNum(match[1]);
      } else {
        console.warn("No se detectó el número de operación.");
      }
    } catch (err) {
      console.error("Error usando OCR:", err);
    }
  };

  console.log("el tipo de pago seleccionado es : ",selectedPaymentType);

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
        <strong>Nombre:</strong> {transport.Name}
        <br />
        <span style={{ fontSize: "smaller", color: "black" }}>
          Dirección: {transport.U_TQC_DIREC}
        </span>
      </div>
    ),
  }));

  const deliveryFormsOptions = deliveryForms.map((form) => ({
    value: form.TrnspCode,
    label: form.TrnspName,
  }));

  const paymentTypesOptions = paymentTypes.map((type) => ({
    value: String(type.GroupNum),
    label: type.PymntGroup,
  }));

  console.log(selectedDeliveryForm);

  const isPickupInStoreForm = (form) =>
    Number(form?.TrnspCode) === 1;
  
  const isOwnPickupInStoreForm = (form) =>
    Number(form?.TrnspCode) === 2;
  

  const isPickupInStore = isPickupInStoreForm(selectedDeliveryForm)

  const isOwnPickupInStore = isOwnPickupInStoreForm(selectedDeliveryForm)

  const handleDeliveryFormChange = (selected) => {
    const selectedObj = deliveryForms.find(
      (form) => form.TrnspCode === selected.value
    );
    setSelectedDeliveryForm(selectedObj);

    if (isPickupInStoreForm(selectedObj)) {
      setSelectedPoint(null);
      setSelectedTransport(null);
    }
  };

  return (
    <Box>
      <Text>Codigo: {clientAdapted.cardCode}</Text>
      <Text>Nombre: {clientAdapted.cardName}</Text>
      <Text>Dirección: {clientAdapted.address}</Text>

      {/* Forma de entrega */}
      <Box mt={4}>
        <FormLabel>Forma de entrega</FormLabel>
        <ReactSelect
          options={deliveryFormsOptions}
          value={
            selectedDeliveryForm && {
              value: selectedDeliveryForm.TrnspCode,
              label: selectedDeliveryForm.TrnspName,
            }
          }
          onChange={handleDeliveryFormChange}
          placeholder="Selecciona una forma de entrega"
          styles={{ container: (p) => ({ ...p, maxWidth: "800px", width: "100%", color: "black" }) }}
        />
      </Box>

      {/* Tipo de pago */}
      <Box mt={4}>
        <FormLabel>Tipo de pago</FormLabel>
        <ReactSelect
          options={paymentTypesOptions}
          value={
            selectedPaymentType && {
              value: String(selectedPaymentType.GroupNum),
              label: selectedPaymentType.PymntGroup,
            }
          }
          onChange={(selected) => {
            const obj = paymentTypes.find(
              (type) => String(type.GroupNum) === selected.value
            );
            setSelectedPaymentType(obj);
          }}
          placeholder="Selecciona un tipo de pago"
          styles={{ container: (p) => ({ ...p, maxWidth: "800px", width: "100%", color: "black" }) }}
        />
      </Box>

      {/* Punto de llegada */}
      {!isPickupInStore && (
        <Box mt={4}>
          <FormLabel>Punto de llegada</FormLabel>
          <ReactSelect
            options={deliveryOptions}
            value={
              selectedPoint && {
                value: selectedPoint.AddressName,
                label: `${selectedPoint.AddressName} - ${selectedPoint.Street}`,
              }
            }
            onChange={(selected) => {
              const obj = deliveryPoints.find(
                (p) => p.AddressName === selected.value
              );
              setSelectedPoint(obj);
            }}
            placeholder="Selecciona un punto de llegada"
            styles={{ container: (p) => ({ ...p, maxWidth: "800px", width: "100%", color: "black" }) }}
          />
        </Box>
      )}

      {/* Transporte */}
      {!(isPickupInStore || isOwnPickupInStore)&& (
        <Box mt={4}>
          <FormLabel>Transporte</FormLabel>
          <ReactSelect
            options={transportOptions}
            value={
              selectedTransport && {
                value: selectedTransport.Name,
                label: (
                  <div>
                    <div style={{ fontSize: "smaller", color: "black" }}>
                      Nombre: {selectedTransport.Name}
                    </div>
                    <div style={{ fontSize: "smaller", color: "black" }}>
                      Dirección: {selectedTransport.U_TQC_DIREC}
                    </div>
                  </div>
                ),
              }
            }
            onChange={(selected) => {
              const obj = transports.find((t) => t.Name === selected.value);
              setSelectedTransport(obj);
            }}
            placeholder="Selecciona un transporte"
            styles={{
              container: (p) => ({ ...p, maxWidth: "800px", width: "100%", color: "black" }),
              singleValue: (p) => ({ ...p, whiteSpace: "normal" }),
              option: (p) => ({ ...p, whiteSpace: "normal" }),
            }}
          />
        </Box>
      )}

      {/* Fecha de entrega */}
      <DatePickerField
        label="Fecha de entrega"
        selectedDate={deliveryDate}
        setSelectedDate={setDeliveryDate}
      />

      {/* Comentarios y comprobante */}
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
            onClick={(e) => {
              e.target.value = null;
            }}
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) {
                setTempImage(file);
                setPaymentImg(URL.createObjectURL(file));
                extractOperationNumber(file, setOpNum);
              }
            }}
          />
          <Box>
          <FormLabel>Número de Operación</FormLabel>
          <Input
            type="text"
            placeholder="Ingrese el número de operación"
            value={opNum ?? ""}
            onChange={(e) => setOpNum(e.target.value)}
          />
          </Box>
          {paymentImg && (
            <Box mt={2}>
              <img
                src={
                  typeof paymentImg === 'string' && paymentImg.startsWith('blob:')
                    ? paymentImg // vista previa local
                    : `${import.meta.env.VITE_API_URL}/quoteModule/${paymentImg}`
                }
              />
              <Button
                mt={2}
                colorScheme="red"
                size="sm"
                onClick={() => {
                  setPaymentImg(null);
                  setTempImage(null);
                }}
              >
                Eliminar imagen
              </Button>
            </Box>
          )}

        </Box>
      </VStack>
    </Box>
  );
}
