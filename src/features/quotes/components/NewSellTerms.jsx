import {
  Box,
  Text,
  Input,
  FormLabel,
  VStack,
  Textarea,
  Button,
  Badge,
  HStack,
} from "@chakra-ui/react";
import CreatableSelect from "react-select/creatable";
import { adaptBusinessPartner } from "../adapters/quotesAdapter";
import { useQuoteMutations } from "../hooks/mutations/quotesMutations";
import { DatePickerField } from "../../../components/DatePickerField";
import Tesseract from "tesseract.js";
import { useState } from "react";

// Opciones predeterminadas de resguardo (Fallbacks B2B para boleta de campo)
const DEFAULT_PAYMENT_TYPES = [
  { GroupNum: "CONTADO", PymntGroup: "Contado / Transferencia Inmediata" },
  { GroupNum: "ANTICIPADO", PymntGroup: "Anticipado / Depósito Bancario" },
  { GroupNum: "CRED_15", PymntGroup: "Crédito 15 días" },
  { GroupNum: "CRED_30", PymntGroup: "Crédito 30 días" },
  { GroupNum: "CRED_45", PymntGroup: "Crédito 45 días" },
  { GroupNum: "CRED_60", PymntGroup: "Crédito 60 días" },
];

const DEFAULT_DELIVERY_FORMS = [
  { TrnspCode: 1, TrnspName: "RECOJO EN ALMACÉN / TIENDA" },
  { TrnspCode: 2, TrnspName: "ENTREGA CON TRANSPORTE DE AGENCIA (PROVINCIA)" },
  { TrnspCode: 3, TrnspName: "DESPACHO A DOMICILIO CON MOVILIDAD PROPIA" },
];

const DEFAULT_DELIVERY_POINTS = [
  { AddressName: "ENVÍO A PROVINCIA", Street: "Lima - Cañete - San Vicente de Cañete" },
  { AddressName: "ALMACÉN PRINCIPAL", Street: "Av. Industrial 123, Lima" },
  { AddressName: "SUCURSAL DESTINO", Street: "Dirección de Agencia / Tienda Destino" },
];

const DEFAULT_TRANSPORTS = [
  { Name: "Cód. 103 - ETTUSA (Emp. Transp. Unidos SA)", U_TQC_DIREC: "San Vicente de Cañete / Provincia" },
  { Name: "SHALOM EXPRESS", U_TQC_DIREC: "Agencia Principal Shalom" },
  { Name: "MARVISUR CARGA", U_TQC_DIREC: "Agencia Marvisur Carga" },
  { Name: "OLVA COURIER", U_TQC_DIREC: "Oficina Olva Express" },
];

export function NewSellTerms({
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
  const [ocrText, setOcrText] = useState("");

  const extractOperationNumber = async (imageFile, setOpNum) => {
    try {
      const { data } = await Tesseract.recognize(imageFile, "spa", {
        logger: (m) => console.log(m),
      });
      setOcrText(data.text);
      const text = data.text;
      const match = text.match(
        /(?:n[úu]m(?:ero)?|nmr|no\.?|n°|ope\.?|op\.?|operaci[oó]n)[^\d]{0,10}(\d[\d\s\.]{4,})/i
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

  const clientAdapted = client ? adaptBusinessPartner(client) : null;

  // Combinación inteligente de datos SAP + Opciones por defecto
  const allPaymentTypes = paymentTypes.length > 0 ? paymentTypes : DEFAULT_PAYMENT_TYPES;
  const allDeliveryForms = deliveryForms.length > 0 ? deliveryForms : DEFAULT_DELIVERY_FORMS;
  const allDeliveryPoints = (deliveryPoints.length > 0 ? deliveryPoints : DEFAULT_DELIVERY_POINTS);
  const allTransports = transports.length > 0 ? transports : DEFAULT_TRANSPORTS;

  // Opciones para CreatableSelect
  const paymentTypesOptions = allPaymentTypes.map((type) => ({
    value: String(type.GroupNum || type.value || type.PymntGroup),
    label: type.PymntGroup || type.label || String(type.GroupNum),
  }));

  const deliveryFormsOptions = allDeliveryForms.map((form) => ({
    value: String(form.TrnspCode || form.value || form.TrnspName),
    label: form.TrnspName || form.label || String(form.TrnspCode),
  }));

  const deliveryOptions = allDeliveryPoints.map((point) => ({
    value: point.AddressName || point.value || point.Street,
    label: `${point.AddressName || 'Punto'} - ${point.Street || point.Address || ''}`,
  }));

  const transportOptions = allTransports.map((transport) => ({
    value: transport.Name || transport.value,
    label: `${transport.Name}${transport.U_TQC_DIREC ? ` (${transport.U_TQC_DIREC})` : ''}`,
  }));

  const isPickupInStoreForm = (form) => Number(form?.TrnspCode) === 1 || String(form?.TrnspName).toLowerCase().includes("recojo");
  const isOwnPickupInStoreForm = (form) => Number(form?.TrnspCode) === 2;

  const isPickupInStore = isPickupInStoreForm(selectedDeliveryForm);
  const isOwnPickupInStore = isOwnPickupInStoreForm(selectedDeliveryForm);

  const handleDeliveryFormChange = (selected) => {
    if (!selected) {
      setSelectedDeliveryForm(null);
      return;
    }
    const found = allDeliveryForms.find(
      (form) => String(form.TrnspCode) === String(selected.value) || form.TrnspName === selected.label
    );
    const selectedObj = found || { TrnspCode: selected.value, TrnspName: selected.label };
    setSelectedDeliveryForm(selectedObj);

    if (isPickupInStoreForm(selectedObj)) {
      setSelectedPoint(null);
      setSelectedTransport(null);
    }
  };

  const handlePaymentTypeChange = (selected) => {
    if (!selected) {
      setSelectedPaymentType(null);
      return;
    }
    const found = allPaymentTypes.find(
      (type) => String(type.GroupNum) === String(selected.value) || type.PymntGroup === selected.label
    );
    setSelectedPaymentType(found || { GroupNum: selected.value, PymntGroup: selected.label });
  };

  const handleDeliveryPointChange = (selected) => {
    if (!selected) {
      setSelectedPoint(null);
      return;
    }
    const found = allDeliveryPoints.find(
      (p) => p.AddressName === selected.value
    );
    setSelectedPoint(found || { AddressName: selected.value, Street: selected.label });
  };

  const handleTransportChange = (selected) => {
    if (!selected) {
      setSelectedTransport(null);
      return;
    }
    const found = allTransports.find((t) => t.Name === selected.value);
    setSelectedTransport(found || { Name: selected.value, U_TQC_DIREC: selected.label });
  };

  return (
    <Box p={2}>
      {clientAdapted ? (
        <Box p={3} bg="emerald.50" borderRadius="md" border="1px solid" borderColor="emerald.200" mb={4}>
          <HStack justify="space-between" mb={1}>
            <Text fontSize="xs" fontWeight="800" color="emerald.800">CLIENTE SELECCIONADO</Text>
            <Badge colorScheme="emerald" fontSize="xs">SAP OK</Badge>
          </HStack>
          <Text fontSize="xs" color="gray.700"><strong>Código:</strong> {clientAdapted.cardCode}</Text>
          <Text fontSize="xs" color="gray.700"><strong>Nombre:</strong> {clientAdapted.cardName}</Text>
          <Text fontSize="xs" color="gray.700"><strong>Dirección Fiscal:</strong> {clientAdapted.address}</Text>
        </Box>
      ) : (
        <Box p={3} bg="gray.100" borderRadius="md" border="1px dashed" borderColor="gray.300" mb={4}>
          <Text fontSize="xs" color="gray.600" fontStyle="italic">
            💡 Puedes llenar los términos comerciales y de logística a continuación o escribir manualmente los datos si el cliente aún no fue seleccionado.
          </Text>
        </Box>
      )}

      {/* Forma de entrega */}
      <Box mt={3}>
        <FormLabel fontSize="xs" fontWeight="700" color="gray.700">Forma de Entrega</FormLabel>
        <CreatableSelect
          isClearable
          options={deliveryFormsOptions}
          value={
            selectedDeliveryForm
              ? {
                  value: String(selectedDeliveryForm.TrnspCode || selectedDeliveryForm.TrnspName),
                  label: selectedDeliveryForm.TrnspName || String(selectedDeliveryForm.TrnspCode),
                }
              : null
          }
          onChange={handleDeliveryFormChange}
          placeholder="Selecciona o escribe una forma de entrega..."
          formatCreateLabel={(inputValue) => `Escribir: "${inputValue}"`}
          styles={{ container: (p) => ({ ...p, maxWidth: "800px", width: "100%", color: "black" }) }}
        />
      </Box>

      {/* Tipo de pago */}
      <Box mt={3}>
        <FormLabel fontSize="xs" fontWeight="700" color="gray.700">Tipo de Pago / Condición Comercial</FormLabel>
        <CreatableSelect
          isClearable
          options={paymentTypesOptions}
          value={
            selectedPaymentType
              ? {
                  value: String(selectedPaymentType.GroupNum || selectedPaymentType.PymntGroup),
                  label: selectedPaymentType.PymntGroup || String(selectedPaymentType.GroupNum),
                }
              : null
          }
          onChange={handlePaymentTypeChange}
          placeholder="Selecciona o escribe un tipo de pago (Ej: Contado, Crédito 30 días)..."
          formatCreateLabel={(inputValue) => `Escribir: "${inputValue}"`}
          styles={{ container: (p) => ({ ...p, maxWidth: "800px", width: "100%", color: "black" }) }}
        />
      </Box>

      {/* Punto de llegada */}
      {!isPickupInStore && (
        <Box mt={3}>
          <FormLabel fontSize="xs" fontWeight="700" color="gray.700">Punto de Llegada (Destino de Entrega)</FormLabel>
          <CreatableSelect
            isClearable
            options={deliveryOptions}
            value={
              selectedPoint
                ? {
                    value: selectedPoint.AddressName || selectedPoint.Street,
                    label: selectedPoint.Street ? `${selectedPoint.AddressName || 'Punto'} - ${selectedPoint.Street}` : selectedPoint.AddressName,
                  }
                : null
            }
            onChange={handleDeliveryPointChange}
            placeholder="Selecciona o escribe un destino (Ej: ENVÍO A PROVINCIA - SAN VICENTE)..."
            formatCreateLabel={(inputValue) => `Escribir destino libre: "${inputValue}"`}
            styles={{ container: (p) => ({ ...p, maxWidth: "800px", width: "100%", color: "black" }) }}
          />
        </Box>
      )}

      {/* Transporte */}
      {!(isPickupInStore || isOwnPickupInStore) && (
        <Box mt={3}>
          <FormLabel fontSize="xs" fontWeight="700" color="gray.700">Agencia de Transporte</FormLabel>
          <CreatableSelect
            isClearable
            options={transportOptions}
            value={
              selectedTransport
                ? {
                    value: selectedTransport.Name,
                    label: `${selectedTransport.Name}${selectedTransport.U_TQC_DIREC ? ` (${selectedTransport.U_TQC_DIREC})` : ''}`,
                  }
                : null
            }
            onChange={handleTransportChange}
            placeholder="Selecciona o escribe una agencia (Ej: Cód. 103 - ETTUSA, SHALOM)..."
            formatCreateLabel={(inputValue) => `Escribir agencia libre: "${inputValue}"`}
            styles={{
              container: (p) => ({ ...p, maxWidth: "800px", width: "100%", color: "black" }),
              singleValue: (p) => ({ ...p, whiteSpace: "normal" }),
              option: (p) => ({ ...p, whiteSpace: "normal" }),
            }}
          />
        </Box>
      )}

      {/* Fecha de entrega */}
      <Box mt={3}>
        <DatePickerField
          label="Fecha estimada de entrega"
          selectedDate={deliveryDate}
          setSelectedDate={setDeliveryDate}
        />
      </Box>

      {/* Comentarios y comprobante */}
      <VStack spacing={4} mt={5} align="stretch">
        <Box>
          <FormLabel fontSize="xs" fontWeight="700" color="gray.700">Comentarios u Observaciones de Entrega</FormLabel>
          <Textarea
            size="sm"
            borderRadius="md"
            placeholder="Ingrese observaciones de entrega, garantías o especificaciones del transporte..."
            value={comment || ""}
            onChange={(e) => setComment && setComment(e.target.value)}
          />
        </Box>
       
        <Box p={3} bg="gray.50" borderRadius="lg" border="1px solid" borderColor="gray.200">
          <FormLabel fontSize="xs" fontWeight="700" color="gray.800">Adjuntar Váucher / Comprobante de Abono</FormLabel>
          <Input
            type="file"
            size="sm"
            bg="white"
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

          <Box mt={3}>
            <FormLabel fontSize="xs" fontWeight="700" color="gray.700">Número de Operación (Váucher)</FormLabel>
            <Input
              type="text"
              size="sm"
              bg="white"
              borderRadius="md"
              placeholder="Ej: 0169944 (Detectado por OCR o digitado)"
              value={opNum ?? ""}
              onChange={(e) => setOpNum(e.target.value)}
            />
          </Box>

          {paymentImg && (
            <Box mt={3} p={2} bg="white" borderRadius="md" border="1px solid" borderColor="gray.200">
              <img
                style={{ maxHeight: "200px", borderRadius: "8px", objectFit: "contain" }}
                src={
                  typeof paymentImg === 'string' && paymentImg.startsWith('blob:')
                    ? paymentImg
                    : `${import.meta.env.VITE_API_URL}/quoteModule/${paymentImg}`
                }
              />
              <Button
                mt={2}
                colorScheme="red"
                size="xs"
                onClick={() => {
                  setPaymentImg(null);
                  setTempImage(null);
                }}
              >
                Eliminar comprobante
              </Button>
            </Box>
          )}

          {ocrText && (
            <Box mt={3} p={2} bg="gray.100" borderRadius="md">
              <Text fontSize="xs" color="gray.600" fontWeight="700">Texto detectado por escáner OCR:</Text>
              <Text fontSize="xs" color="gray.700" whiteSpace="pre-wrap">
                {ocrText}
              </Text>
            </Box>
          )}
        </Box>
      </VStack>
    </Box>
  );
}