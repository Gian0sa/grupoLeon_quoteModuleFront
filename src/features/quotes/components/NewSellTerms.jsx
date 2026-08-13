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
  Grid,
  FormControl,
  Select as ChakraSelect,
} from "@chakra-ui/react";
import CreatableSelect from "react-select/creatable";
import { adaptBusinessPartner } from "../adapters/quotesAdapter";
import { useQuoteMutations } from "../hooks/mutations/quotesMutations";
import { DatePickerField } from "../../../components/DatePickerField";
import Tesseract from "tesseract.js";
import { useState } from "react";
import { Truck, CreditCard, Paperclip, FileCheck, Upload } from "lucide-react";

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
  const [paymentMethod, setPaymentMethod] = useState("DEPOSITO_BANCARIO");
  const [bankAccount, setBankAccount] = useState("BCP_SOLES");
  const [sunatOpType, setSunatOpType] = useState("0101");
  const [attachments, setAttachments] = useState([]);

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
  const paymentTypesOptions = allPaymentTypes.map((type) => {
    const val = String(type.GroupNum ?? type.GroupNumber ?? type.value ?? type.PymntGroup ?? type.PaymentTermsGroupName ?? '');
    const lbl = type.PymntGroup || type.PaymentTermsGroupName || type.label || val || "Sin especificación";
    return {
      value: val,
      label: lbl,
    };
  });

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
      (type) =>
        String(type.GroupNum ?? type.GroupNumber ?? type.value) === String(selected.value) ||
        (type.PymntGroup || type.PaymentTermsGroupName || type.label) === selected.label
    );
    const selectedObj = found || {
      GroupNum: selected.value,
      GroupNumber: selected.value,
      PymntGroup: selected.label,
      PaymentTermsGroupName: selected.label
    };
    setSelectedPaymentType(selectedObj);
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

  const handleAttachmentUpload = (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length > 0) {
      const newFiles = files.map(f => ({ name: f.name, size: (f.size / 1024).toFixed(1) + " KB", file: f }));
      setAttachments(prev => [...prev, ...newFiles]);
    }
  };

  return (
    <VStack align="stretch" spacing={5} py={2}>
      {clientAdapted ? (
        <Box p={3.5} bg="emerald.50" borderRadius="xl" border="1.5px solid" borderColor="emerald.200">
          <HStack justify="space-between" mb={1}>
            <Text fontSize="xs" fontWeight="800" color="emerald.900" textTransform="uppercase">CLIENTE SELECCIONADO</Text>
            <Badge colorScheme="emerald" fontSize="xs">SAP OK</Badge>
          </HStack>
          <Text fontSize="xs" color="gray.700"><strong>Código:</strong> {clientAdapted.cardCode}</Text>
          <Text fontSize="xs" color="gray.700"><strong>Nombre:</strong> {clientAdapted.cardName}</Text>
          <Text fontSize="xs" color="gray.700"><strong>Dirección Fiscal:</strong> {clientAdapted.address}</Text>
        </Box>
      ) : (
        <Box p={3.5} bg="gray.50" borderRadius="xl" border="1.5px dashed" borderColor="gray.300">
          <Text fontSize="xs" color="gray.600" fontWeight="600" fontStyle="italic">
            💡 Completa los parámetros de logística, medios de pago y anexos requeridos para una facturación completa en SAP B1.
          </Text>
        </Box>
      )}

      {/* TARJETA 1: 📦 LOGÍSTICA Y AGENCIA DE TRANSPORTE */}
      <Box bg="white" p={{ base: 4, md: 5 }} borderRadius="2xl" border="1.5px solid" borderColor="#e2e8f0" boxShadow="xs">
        <HStack spacing={2.5} mb={4} pb={2.5} borderBottom="1.5px solid" borderColor="emerald.100">
          <Truck className="w-5 h-5 text-emerald-700 stroke-[2.5]" />
          <Text fontSize="sm" fontWeight="950" color="emerald.900" textTransform="uppercase" letterSpacing="wide">
            1. Logística y Agencia de Transporte
          </Text>
        </HStack>

        <VStack align="stretch" spacing={4}>
          <Box>
            <FormLabel fontSize="xs" fontWeight="800" color="gray.700">Forma de Entrega</FormLabel>
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
              styles={{ container: (p) => ({ ...p, maxWidth: "100%", width: "100%", color: "black" }) }}
            />
          </Box>

          {!isPickupInStore && (
            <Box>
              <FormLabel fontSize="xs" fontWeight="800" color="gray.700">Punto de Llegada (Destino de Entrega)</FormLabel>
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
                styles={{ container: (p) => ({ ...p, maxWidth: "100%", width: "100%", color: "black" }) }}
              />
            </Box>
          )}

          {!(isPickupInStore || isOwnPickupInStore) && (
            <Box>
              <FormLabel fontSize="xs" fontWeight="800" color="gray.700">Agencia de Transporte</FormLabel>
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
                  container: (p) => ({ ...p, maxWidth: "100%", width: "100%", color: "black" }),
                  singleValue: (p) => ({ ...p, whiteSpace: "normal" }),
                  option: (p) => ({ ...p, whiteSpace: "normal" }),
                }}
              />
            </Box>
          )}

          <Box>
            <DatePickerField
              label="Fecha estimada de entrega"
              selectedDate={deliveryDate}
              setSelectedDate={setDeliveryDate}
            />
          </Box>
        </VStack>
      </Box>

      {/* TARJETA 2: 💳 CONDICIÓN DE PAGO Y COMPROBANTE (VOUCHER OCR) */}
      <Box bg="white" p={{ base: 4, md: 5 }} borderRadius="2xl" border="1.5px solid" borderColor="#e2e8f0" boxShadow="xs">
        <HStack spacing={2.5} mb={4} pb={2.5} borderBottom="1.5px solid" borderColor="emerald.100">
          <CreditCard className="w-5 h-5 text-emerald-700 stroke-[2.5]" />
          <Text fontSize="sm" fontWeight="950" color="emerald.900" textTransform="uppercase" letterSpacing="wide">
            2. Condición de Pago y Abono Bancario (Voucher)
          </Text>
        </HStack>

        <VStack align="stretch" spacing={4}>
          <Grid templateColumns={{ base: "1fr", md: "1fr 1fr" }} gap={3}>
            <FormControl>
              <FormLabel fontSize="xs" fontWeight="800" color="gray.700">Tipo de Pago / Condición Comercial</FormLabel>
              <CreatableSelect
                isClearable
                options={paymentTypesOptions}
                value={
                  selectedPaymentType
                    ? {
                        value: String(selectedPaymentType.GroupNum ?? selectedPaymentType.GroupNumber ?? selectedPaymentType.value ?? selectedPaymentType.PymntGroup ?? selectedPaymentType.PaymentTermsGroupName ?? ''),
                        label: selectedPaymentType.PymntGroup || selectedPaymentType.PaymentTermsGroupName || selectedPaymentType.label || String(selectedPaymentType.GroupNum ?? selectedPaymentType.GroupNumber ?? ''),
                      }
                    : null
                }
                onChange={handlePaymentTypeChange}
                placeholder="Selecciona condición de pago..."
                formatCreateLabel={(inputValue) => `Escribir: "${inputValue}"`}
                styles={{ container: (p) => ({ ...p, maxWidth: "100%", width: "100%", color: "black" }) }}
              />
            </FormControl>

            <FormControl>
              <FormLabel fontSize="xs" fontWeight="800" color="gray.700">Medio de Pago (`PaymentMethod` / SUNAT)</FormLabel>
              <ChakraSelect
                size="sm"
                bg="white"
                borderRadius="md"
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value)}
                fontWeight="600"
              >
                <option value="DEPOSITO_BANCARIO">001 - Depósito en Cuenta Bancaria</option>
                <option value="TRANSFERENCIA">003 - Transferencia de Fondos Directa</option>
                <option value="YAPE_PLIN">008 - Yape / Plin / Pago Móvil</option>
                <option value="EFECTIVO">009 - Efectivo / Pago Contra Entrega</option>
                <option value="CHEQUE">002 - Cheque / Abono Diferido</option>
              </ChakraSelect>
            </FormControl>
          </Grid>

          <FormControl>
            <FormLabel fontSize="xs" fontWeight="800" color="gray.700">Banco de Abono Oficial</FormLabel>
            <ChakraSelect
              size="sm"
              bg="white"
              borderRadius="md"
              value={bankAccount}
              onChange={(e) => setBankAccount(e.target.value)}
              fontWeight="600"
            >
              <option value="BCP_SOLES">BCP (Soles) - Cta: 191-0104153-0-60 (CCI: 002-191-000104153060-52)</option>
              <option value="BCP_USD">BCP (Dólares) - Cta: 191-0104154-1-71 (CCI: 002-191-000104154171-55)</option>
              <option value="BBVA_SOLES">BBVA Continental (Soles) - Cta: 0011-0182-0100045231</option>
              <option value="SCOTIA_USD">Scotiabank (USD) - Cta: 000-1245211</option>
            </ChakraSelect>
          </FormControl>

          <Box p={4} bg="gray.50" borderRadius="xl" border="1px solid" borderColor="gray.200">
            <FormLabel fontSize="xs" fontWeight="800" color="gray.800" mb={2}>
              Adjuntar Váucher / Comprobante de Abono Bancario
            </FormLabel>
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

            <Box mt={3.5}>
              <FormLabel fontSize="xs" fontWeight="800" color="gray.700">Número de Operación (Váucher)</FormLabel>
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
              <Box mt={3} p={2.5} bg="white" borderRadius="md" border="1px solid" borderColor="gray.200">
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
          </Box>
        </VStack>
      </Box>

      {/* TARJETA 3: 📎 PARÁMETROS SUNAT, OBSERVACIONES Y ANEXOS */}
      <Box bg="white" p={{ base: 4, md: 5 }} borderRadius="2xl" border="1.5px solid" borderColor="#e2e8f0" boxShadow="xs">
        <HStack spacing={2.5} mb={4} pb={2.5} borderBottom="1.5px solid" borderColor="emerald.100">
          <Paperclip className="w-5 h-5 text-emerald-700 stroke-[2.5]" />
          <Text fontSize="sm" fontWeight="950" color="emerald.900" textTransform="uppercase" letterSpacing="wide">
            3. Parámetros SUNAT, Observaciones y Anexos
          </Text>
        </HStack>

        <VStack align="stretch" spacing={4}>
          <FormControl>
            <FormLabel fontSize="xs" fontWeight="800" color="gray.700">Tipo de Operación SUNAT (`U_VS_TIPOPER` / `TIPO_FACT`)</FormLabel>
            <ChakraSelect
              size="sm"
              bg="white"
              borderRadius="md"
              value={sunatOpType}
              onChange={(e) => setSunatOpType(e.target.value)}
              fontWeight="600"
            >
              <option value="0101">0101 - Venta Interna (General / Operación Onerosa)</option>
              <option value="0102">0102 - Exportación de Bienes</option>
              <option value="0103">0103 - Venta Inafecta / Exonerada</option>
            </ChakraSelect>
          </FormControl>

          <Box>
            <FormLabel fontSize="xs" fontWeight="800" color="gray.700">Comentarios u Observaciones del Documento (`Comments`)</FormLabel>
            <Textarea
              size="sm"
              borderRadius="md"
              rows={3}
              placeholder="Ingrese especificaciones comerciales, vigencia de cotización o acuerdos especiales..."
              value={comment || ""}
              onChange={(e) => setComment && setComment(e.target.value)}
            />
          </Box>

          <Box p={4} bg="gray.50" borderRadius="xl" border="1.5px dashed" borderColor="gray.300">
            <HStack spacing={2} mb={2}>
              <Upload className="w-4 h-4 text-emerald-700" />
              <FormLabel fontSize="xs" fontWeight="800" color="gray.800" m={0}>
                Anexos y Documentos de Resguardo (PDF / Órdenes de Compra)
              </FormLabel>
            </HStack>
            <Input
              type="file"
              multiple
              size="sm"
              bg="white"
              onChange={handleAttachmentUpload}
            />

            {attachments.length > 0 && (
              <VStack align="stretch" spacing={1.5} mt={3}>
                {attachments.map((att, idx) => (
                  <HStack key={idx} justify="space-between" bg="white" p={2} borderRadius="md" border="1px solid" borderColor="gray.200">
                    <HStack spacing={2}>
                      <FileCheck className="w-4 h-4 text-emerald-600" />
                      <Text fontSize="xs" fontWeight="600" color="gray.700">{att.name}</Text>
                      <Badge fontSize="10px" colorScheme="gray">{att.size}</Badge>
                    </HStack>
                    <Button
                      size="xs"
                      colorScheme="red"
                      variant="ghost"
                      onClick={() => setAttachments(prev => prev.filter((_, i) => i !== idx))}
                    >
                      Quitar
                    </Button>
                  </HStack>
                ))}
              </VStack>
            )}
          </Box>
        </VStack>
      </Box>
    </VStack>
  );
}