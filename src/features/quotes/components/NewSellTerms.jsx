import React, { useState, useEffect } from "react";
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
  Checkbox,
  Flex,
} from "@chakra-ui/react";
import CreatableSelect from "react-select/creatable";
import { adaptBusinessPartner } from "../adapters/quotesAdapter";
import { useQuoteMutations } from "../hooks/mutations/quotesMutations";
import Tesseract from "tesseract.js";
import { Truck, CreditCard, Paperclip, FileCheck, Upload, Shield, Receipt } from "lucide-react";
import { SAP_TRANSPORTS_CATALOG } from "../constants/sapTransportsCatalog";
import { DatePickerField } from "../../../components/DatePickerField";

export const isPickupInStoreForm = (form) => {
  if (!form) return false;
  let parsed = form;
  if (typeof form === "string") {
    const trimmed = form.trim();
    if (trimmed.startsWith("{")) {
      try {
        parsed = JSON.parse(trimmed);
      } catch (e) {}
    }
  }
  if (typeof parsed === "object" && parsed !== null) {
    const code = String(parsed.TrnspCode ?? parsed.code ?? parsed.value ?? "");
    const name = String(parsed.TrnspName ?? parsed.name ?? parsed.label ?? "");
    const combined = `${code} ${name}`.toLowerCase();
    return (
      combined.includes("recojo") ||
      combined.includes("tienda") ||
      combined.includes("almacen") ||
      combined.includes("almacén") ||
      combined.includes("recoge") ||
      code === "1" ||
      code === "4" ||
      code === "04"
    );
  }
  const str = String(parsed).toLowerCase();
  return (
    str.includes("recojo") ||
    str.includes("tienda") ||
    str.includes("almacen") ||
    str.includes("almacén") ||
    str.includes("recoge") ||
    str === "1" ||
    str === "4" ||
    str === "04"
  );
};

export const isOwnPickupInStoreForm = (form) => {
  if (!form) return false;
  let parsed = form;
  if (typeof form === "string") {
    const trimmed = form.trim();
    if (trimmed.startsWith("{")) {
      try {
        parsed = JSON.parse(trimmed);
      } catch (e) {}
    }
  }
  if (typeof parsed === "object" && parsed !== null) {
    const code = String(parsed.TrnspCode ?? parsed.code ?? parsed.value ?? "");
    const name = String(parsed.TrnspName ?? parsed.name ?? parsed.label ?? "");
    const combined = `${code} ${name}`.toLowerCase();
    return combined.includes("reparto propio") || combined.includes("motorizado propio") || combined.includes("propio") || code === "2" || code === "02";
  }
  const str = String(parsed).toLowerCase();
  return str.includes("reparto propio") || str.includes("motorizado propio") || str.includes("propio") || str === "2" || str === "02";
};

export function NewSellTerms({
  client,
  transports = [],
  deliveryPoints = [],
  deliveryForms = [],
  paymentTypes = [],
  houseBankAccounts = [],
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
  setOpNum,
  saleCondition = "",
  setSaleCondition,
  documentType = "",
  setDocumentType,
  isLetra = false,
  setIsLetra,
  creditTerm = "",
  setCreditTerm,
  paymentMethod = "DEPOSITO_BANCARIO",
  setPaymentMethod,
  bankAccount = "",
  setBankAccount,
  sunatOpType = "0101",
  setSunatOpType,
  isAdmin = false,
  isDeliveryLocked = false,
  isFinanceLocked = false,
}) {
  const { uploadImageMutation, deleteImageMutation } = useQuoteMutations();
  const [ocrText, setOcrText] = useState("");
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

  // Datos en vivo desde la API de SAP B1 (100% dinámicos)
  const allPaymentTypes = paymentTypes || [];
  const allDeliveryForms = deliveryForms || [];
  const allDeliveryPoints = deliveryPoints || [];
  const allTransports = transports || [];

  // Cuentas bancarias de banco propio oficiales desde SAP B1
  const bankAccountOptions = (houseBankAccounts || []).map((acc) => {
    const bank = acc.BankCode || acc.bankCode || "";
    const name = acc.AccountName || acc.accountName || "";
    const num = acc.Account || acc.account || acc.AccountNo || "";
    const iban = acc.IBAN || acc.iban || "";
    const labelParts = [];
    if (bank) labelParts.push(bank);
    if (name && name !== bank) labelParts.push(name);
    if (num) labelParts.push(`Cta: ${num}`);
    if (iban) labelParts.push(`CCI: ${iban}`);
    const label = labelParts.join(" - ") || "Cuenta Bancaria SAP";
    const val = num || name || String(acc.AbsoluteEntry || bank || "");
    return {
      value: val,
      label: label,
      raw: acc,
    };
  });

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

  const transportOptions = allTransports.map((transport) => {
    const rawCode = transport.Code || transport.TrnspCode ? String(transport.Code || transport.TrnspCode).replace(/^0+/, "") : "";
    const codePrefix = rawCode ? `Cód. ${rawCode} - ` : "";
    const name = transport.Name || transport.TrnspName || transport.value || "";
    const isEttusa = String(transport.Code || transport.TrnspCode || "").includes("103") || name.toUpperCase().includes("TRANSPORTISTAS UNIDOS");
    const alias = isEttusa && !name.toUpperCase().includes("ETTUSA") ? " [ETTUSA]" : "";
    const dir = transport.U_TQC_DIREC ? ` (${transport.U_TQC_DIREC})` : "";
    const label = `${codePrefix}${name}${alias}${dir}`;

    return {
      value: name,
      label,
      raw: transport,
    };
  });

  const normalizeDeliveryFormValue = (val) => {
    if (!val) return null;
    if (typeof val === "string") {
      const trimmed = val.trim();
      if (!trimmed || trimmed === "undefined" || trimmed === "null") return null;
      if (trimmed.startsWith("{")) {
        try { val = JSON.parse(trimmed); } catch (e) {}
      }
    }
    if (typeof val === "object" && val !== null) {
      const code = val.TrnspCode ?? val.value ?? val.code ?? "";
      const name = val.TrnspName ?? val.label ?? val.name ?? (code ? String(code) : "");
      if (!name || name === "undefined" || name === "null") return null;
      return {
        value: String(code || name),
        label: name,
      };
    }
    const strVal = String(val);
    if (!strVal || strVal === "undefined" || strVal === "null") return null;
    const found = allDeliveryForms.find(
      (f) => String(f.TrnspCode) === strVal || f.TrnspName === strVal
    );
    if (found) {
      return {
        value: String(found.TrnspCode || found.TrnspName),
        label: found.TrnspName || String(found.TrnspCode),
      };
    }
    return { value: strVal, label: strVal };
  };

  const normalizeDeliveryPointValue = (val) => {
    if (!val) return null;
    if (typeof val === "string") {
      const trimmed = val.trim();
      if (!trimmed || trimmed === "undefined" || trimmed === "null") return null;
      if (trimmed.startsWith("{")) {
        try { val = JSON.parse(trimmed); } catch (e) {}
      }
    }
    if (typeof val === "object" && val !== null) {
      const name = val.AddressName ?? val.label ?? val.name ?? val.value ?? "";
      const street = val.Street ?? val.address ?? "";
      if (!name && !street) return null;
      return {
        value: name || street,
        label: street ? `${name ? name + ' - ' : ''}${street}` : name,
      };
    }
    const strVal = String(val);
    if (!strVal || strVal === "undefined" || strVal === "null") return null;
    return { value: strVal, label: strVal };
  };

  const normalizeTransportValue = (val) => {
    if (!val) return null;
    if (typeof val === "string") {
      const trimmed = val.trim();
      if (!trimmed || trimmed === "undefined" || trimmed === "null") return null;
      if (trimmed.startsWith("{")) {
        try { val = JSON.parse(trimmed); } catch (e) {}
      }
    }
    if (typeof val === "object" && val !== null) {
      const name = val.Name ?? val.name ?? val.value ?? val.label ?? "";
      const code = val.Code ?? val.code ?? val.TrnspCode ?? "";
      const rawCode = code ? String(code).replace(/^0+/, "") : "";
      const codePrefix = rawCode ? `Cód. ${rawCode} - ` : "";
      const dir = val.U_TQC_DIREC ? ` (${val.U_TQC_DIREC})` : "";
      if (!name || name === "undefined" || name === "null") return null;
      return {
        value: name,
        label: `${codePrefix}${name}${dir}`,
      };
    }
    const strVal = String(val);
    if (!strVal || strVal === "undefined" || strVal === "null") return null;
    return { value: strVal, label: strVal };
  };

  const normalizePaymentTypeValue = (val) => {
    if (!val) return null;
    if (typeof val === "string") {
      const trimmed = val.trim();
      if (!trimmed || trimmed === "undefined" || trimmed === "null") return null;
      if (trimmed.startsWith("{")) {
        try { val = JSON.parse(trimmed); } catch (e) {}
      }
    }
    if (typeof val === "object" && val !== null) {
      const code = String(val.GroupNum ?? val.GroupNumber ?? val.value ?? "");
      const name = val.PymntGroup ?? val.PaymentTermsGroupName ?? val.label ?? code;
      if (!name || name === "undefined" || name === "null") return null;
      return {
        value: code || name,
        label: name,
      };
    }
    const strVal = String(val);
    if (!strVal || strVal === "undefined" || strVal === "null") return null;
    return { value: strVal, label: strVal };
  };



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

  // Auto-detección de Tipo de Comprobante según DNI (Boleta) o RUC (Factura)
  useEffect(() => {
    if (isDeliveryLocked) return;
    const doc = String(client?.FederalTaxID || client?.clientDocument || client?.documentNumber || "").trim();
    if (doc.length === 11 && setDocumentType && !documentType) {
      setDocumentType("FACTURA");
    } else if (doc.length === 8 && setDocumentType && !documentType) {
      setDocumentType("BOLETA");
    }
  }, [client, setDocumentType, documentType, isDeliveryLocked]);

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

    // Auto-sincronización inteligente de casillas comerciales UDF al seleccionar la Condición de Pago SAP
    if (!isDeliveryLocked) {
      const lbl = String(selectedObj.PymntGroup || selectedObj.PaymentTermsGroupName || "").toLowerCase();
      if (lbl.includes("contado")) {
        if (setSaleCondition) setSaleCondition("CONTADO");
        if (setIsLetra) setIsLetra(false);
        if (setCreditTerm) setCreditTerm("ANTICIPADO");
      } else {
        if (setSaleCondition) setSaleCondition("CREDITO");
        if (lbl.includes("letra")) {
          if (setIsLetra) setIsLetra(true);
        } else {
          if (setIsLetra) setIsLetra(false);
        }
        const matchDays = lbl.match(/(\d+)\s*d/i);
        if (matchDays && setCreditTerm) {
          setCreditTerm(`${matchDays[1]} días`);
        } else if (lbl.includes("anticipad") && setCreditTerm) {
          setCreditTerm("Anticipado");
        } else if (lbl.includes("inmediat") && setCreditTerm) {
          setCreditTerm("Inmediato");
        }
      }
    }
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
    if (selected.raw) {
      setSelectedTransport(selected.raw);
      return;
    }
    const found = allTransports.find(
      (t) =>
        t.Name === selected.value ||
        t.Code === selected.value ||
        `${t.Code} - ${t.Name}` === selected.value ||
        (t.Code && `Cód. ${String(t.Code).replace(/^0+/, '')} - ${t.Name}` === selected.label)
    );
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
        <HStack spacing={2.5} mb={4} pb={2.5} borderBottom="1.5px solid" borderColor="emerald.100" justify="space-between">
          <HStack spacing={2.5}>
            <Truck className="w-5 h-5 text-emerald-700 stroke-[2.5]" />
            <Text fontSize="sm" fontWeight="950" color="emerald.900" textTransform="uppercase" letterSpacing="wide">
              1. Logística y Agencia de Transporte
            </Text>
          </HStack>
          {isDeliveryLocked && (
            <Badge colorScheme="gray" fontSize="10px" px={2} py={0.5} borderRadius="md">
              🔒 Bloqueado (Vendedor)
            </Badge>
          )}
        </HStack>

        <VStack align="stretch" spacing={4}>
          <Box>
            <FormLabel fontSize="xs" fontWeight="800" color="gray.700">
              Forma de Entrega {isDeliveryLocked && "🔒"}
            </FormLabel>
            <CreatableSelect
              isDisabled={isDeliveryLocked}
              isClearable={!isDeliveryLocked}
              options={deliveryFormsOptions}
              value={normalizeDeliveryFormValue(selectedDeliveryForm)}
              onChange={handleDeliveryFormChange}
              placeholder="Selecciona o escribe una forma de entrega..."
              formatCreateLabel={(inputValue) => `Escribir: "${inputValue}"`}
              styles={{
                container: (p) => ({ ...p, maxWidth: "100%", width: "100%", color: "black", opacity: isDeliveryLocked ? 0.75 : 1 }),
              }}
            />
          </Box>

          {!isPickupInStore && (
            <Box>
              <FormLabel fontSize="xs" fontWeight="800" color="gray.700">
                Punto de Llegada (Destino de Entrega) {isDeliveryLocked && "🔒"}
              </FormLabel>
              <CreatableSelect
                isDisabled={isDeliveryLocked}
                isClearable={!isDeliveryLocked}
                options={deliveryOptions}
                value={normalizeDeliveryPointValue(selectedPoint)}
                onChange={handleDeliveryPointChange}
                placeholder="Selecciona o escribe un destino (Ej: ENVÍO A PROVINCIA - SAN VICENTE)..."
                formatCreateLabel={(inputValue) => `Escribir destino libre: "${inputValue}"`}
                styles={{
                  container: (p) => ({ ...p, maxWidth: "100%", width: "100%", color: "black", opacity: isDeliveryLocked ? 0.75 : 1 }),
                }}
              />
            </Box>
          )}

          {!(isPickupInStore || isOwnPickupInStore) && (
            <Box>
              <FormLabel fontSize="xs" fontWeight="800" color="gray.700">
                Agencia de Transporte {isDeliveryLocked && "🔒"}
              </FormLabel>
              <CreatableSelect
                isDisabled={isDeliveryLocked}
                isClearable={!isDeliveryLocked}
                options={transportOptions}
                value={normalizeTransportValue(selectedTransport)}
                onChange={handleTransportChange}
                placeholder="Selecciona o escribe una agencia (Ej: Cód. 103 - ETTUSA, SHALOM)..."
                formatCreateLabel={(inputValue) => `Escribir agencia libre: "${inputValue}"`}
                styles={{
                  container: (p) => ({ ...p, maxWidth: "100%", width: "100%", color: "black", opacity: isDeliveryLocked ? 0.75 : 1 }),
                  singleValue: (p) => ({ ...p, whiteSpace: "normal" }),
                  option: (p) => ({ ...p, whiteSpace: "normal" }),
                }}
              />
            </Box>
          )}

          <Box>
            <DatePickerField
              label={`Fecha estimada de entrega ${isDeliveryLocked ? "🔒" : ""}`}
              selectedDate={deliveryDate}
              setSelectedDate={setDeliveryDate}
              isDisabled={isDeliveryLocked}
            />
          </Box>

          {/* ── SELECCIÓN OFICIAL DE CONDICIÓN DE PAGO SAP B1 (TABLA OCTG) ── */}
          <Box p={3.5} bg="emerald.50" borderRadius="xl" border="1.5px solid" borderColor="emerald.200">
            <FormLabel fontSize="xs" fontWeight="900" color="emerald.900" mb={1.5} textTransform="uppercase">
              💳 Condición de Pago Oficial SAP B1 (Tabla OCTG) {isDeliveryLocked && "🔒"}
            </FormLabel>
            <CreatableSelect
              isDisabled={isDeliveryLocked}
              isClearable={!isDeliveryLocked}
              options={paymentTypesOptions}
              value={
                selectedPaymentType
                  ? {
                      value: String(selectedPaymentType.GroupNum ?? selectedPaymentType.GroupNumber ?? selectedPaymentType.value ?? ""),
                      label: selectedPaymentType.PymntGroup || selectedPaymentType.PaymentTermsGroupName || selectedPaymentType.label || "Seleccionar...",
                    }
                  : null
              }
              onChange={handlePaymentTypeChange}
              placeholder="Selecciona la Condición de Pago oficial cargada en vivo desde SAP B1..."
              formatCreateLabel={(inputValue) => `Escribir condición libre: "${inputValue}"`}
              styles={{
                container: (p) => ({ ...p, maxWidth: "100%", width: "100%", color: "black", opacity: isDeliveryLocked ? 0.75 : 1 }),
              }}
            />
          </Box>

          {/* ── CUADRO DE CONDICIONES COMERCIALES (TALONARIO / SOLICITUD DE PEDIDO) ── */}
          <Box
            p={{ base: 3.5, md: 4 }}
            bg="#f8fafc"
            borderRadius="xl"
            border="1.5px solid"
            borderColor="#cbd5e1"
            boxShadow="xs"
          >
            <HStack justify="space-between" mb={3}>
              <HStack spacing={2}>
                <Receipt className="w-4 h-4 text-emerald-800" />
                <Text fontSize="xs" fontWeight="900" color="gray.800" textTransform="uppercase" letterSpacing="wider">
                  Condiciones Comerciales de la Solicitud {isDeliveryLocked && "🔒"}
                </Text>
              </HStack>
              <Badge colorScheme="teal" fontSize="9px" px={2} py={0.5} borderRadius="md" fontWeight="800">
                TALONARIO DE PEDIDO
              </Badge>
            </HStack>

            <Grid templateColumns={{ base: "1fr", md: "1fr 1fr 1.4fr" }} gap={3.5}>
              {/* Casilla 1: Modalidad (CONTADO / CRÉDITO) */}
              <Box p={3} bg="white" borderRadius="lg" border="1px solid" borderColor="gray.200">
                <Text fontSize="10px" fontWeight="900" color="gray.500" mb={2} textTransform="uppercase">
                  Condición de Venta
                </Text>
                <HStack spacing={4}>
                  <Checkbox
                    isChecked={saleCondition === "CONTADO"}
                    onChange={() => {
                      if (!isDeliveryLocked && setSaleCondition) {
                        const nextVal = saleCondition === "CONTADO" ? "" : "CONTADO";
                        setSaleCondition(nextVal);
                        if (setCreditTerm && nextVal === "CONTADO" && (!creditTerm || creditTerm.includes("DÍAS"))) {
                          setCreditTerm("ANTICIPADO");
                        }
                      }
                    }}
                    isDisabled={isDeliveryLocked}
                    colorScheme="green"
                    size="sm"
                    fontWeight="800"
                    fontSize="xs"
                  >
                    CONTADO
                  </Checkbox>
                  <Checkbox
                    isChecked={saleCondition === "CREDITO"}
                    onChange={() => {
                      if (!isDeliveryLocked && setSaleCondition) {
                        const nextVal = saleCondition === "CREDITO" ? "" : "CREDITO";
                        setSaleCondition(nextVal);
                        if (setCreditTerm && nextVal === "CREDITO" && (!creditTerm || creditTerm === "ANTICIPADO")) {
                          setCreditTerm("30 DÍAS");
                        }
                      }
                    }}
                    isDisabled={isDeliveryLocked}
                    colorScheme="green"
                    size="sm"
                    fontWeight="800"
                    fontSize="xs"
                  >
                    CRÉDITO
                  </Checkbox>
                </HStack>
              </Box>

              {/* Casilla 2: Tipo de Comprobante (BOLETA / FACTURA) */}
              <Box p={3} bg="white" borderRadius="lg" border="1px solid" borderColor="gray.200">
                <Text fontSize="10px" fontWeight="900" color="gray.500" mb={2} textTransform="uppercase">
                  Tipo de Comprobante
                </Text>
                <HStack spacing={4}>
                  <Checkbox
                    isChecked={documentType === "FACTURA"}
                    onChange={() => {
                      if (!isDeliveryLocked && setDocumentType) {
                        setDocumentType(documentType === "FACTURA" ? "" : "FACTURA");
                      }
                    }}
                    isDisabled={isDeliveryLocked}
                    colorScheme="green"
                    size="sm"
                    fontWeight="800"
                    fontSize="xs"
                  >
                    FACTURA
                  </Checkbox>
                  <Checkbox
                    isChecked={documentType === "BOLETA"}
                    onChange={() => {
                      if (!isDeliveryLocked && setDocumentType) {
                        setDocumentType(documentType === "BOLETA" ? "" : "BOLETA");
                      }
                    }}
                    isDisabled={isDeliveryLocked}
                    colorScheme="green"
                    size="sm"
                    fontWeight="800"
                    fontSize="xs"
                  >
                    BOLETA
                  </Checkbox>
                </HStack>
              </Box>

              {/* Casilla 3: Instrumento y Plazo (LETRA / SELECTOR DE PLAZO EXCLUSIVO POR ACCIÓN) */}
              <Box p={3} bg="white" borderRadius="lg" border="1px solid" borderColor="gray.200">
                <Flex justify="space-between" align="center" mb={2}>
                  <Checkbox
                    isChecked={Boolean(isLetra)}
                    onChange={(e) => !isDeliveryLocked && setIsLetra && setIsLetra(e.target.checked)}
                    isDisabled={isDeliveryLocked}
                    colorScheme="green"
                    size="sm"
                    fontWeight="800"
                    fontSize="xs"
                  >
                    LETRA
                  </Checkbox>
                  <Text fontSize="10px" fontWeight="900" color="gray.500">
                    PLAZO / TÉRMINO
                  </Text>
                </Flex>

                {/* Visualizador de Plazo Seleccionado (Solo Lectura / Sin teclado) */}
                <Box
                  py={2}
                  px={3}
                  borderRadius="lg"
                  bg={creditTerm ? (isDeliveryLocked ? "gray.100" : "emerald.50") : "gray.50"}
                  border="1.5px solid"
                  borderColor={creditTerm ? (isDeliveryLocked ? "gray.300" : "emerald.300") : "gray.200"}
                  textAlign="center"
                  mb={2.5}
                  boxShadow="xs"
                >
                  <Text fontWeight="900" fontSize="xs" color={creditTerm ? (isDeliveryLocked ? "gray.700" : "emerald.900") : "gray.400"} letterSpacing="wider">
                    {creditTerm || "(Seleccionar Plazo / Término)"}
                  </Text>
                </Box>

                {/* Botones de selección rápida exclusivos */}
                {!isDeliveryLocked && (
                  <Flex wrap="wrap" gap={1.5} justify="center">
                    {[
                      { label: "Anticipado", val: "ANTICIPADO", condition: "CONTADO" },
                      { label: "Inmediato", val: "CONTADO INMEDIATO", condition: "CONTADO" },
                      { label: "15 días", val: "15 DÍAS", condition: "CREDITO" },
                      { label: "30 días", val: "30 DÍAS", condition: "CREDITO" },
                      { label: "45 días", val: "45 DÍAS", condition: "CREDITO" },
                      { label: "60 días", val: "60 DÍAS", condition: "CREDITO" },
                    ].map((opt) => {
                      const isSelected = creditTerm === opt.val;
                      return (
                        <Button
                          key={opt.val}
                          size="xs"
                          h="22px"
                          fontSize="10px"
                          fontWeight={isSelected ? "900" : "700"}
                          px={2}
                          borderRadius="md"
                          variant={isSelected ? "solid" : "outline"}
                          colorScheme={isSelected ? "green" : "gray"}
                          bg={isSelected ? "#16a34a" : "white"}
                          color={isSelected ? "white" : "gray.700"}
                          _hover={{ bg: isSelected ? "#15803d" : "gray.100" }}
                          onClick={() => {
                            if (setCreditTerm) setCreditTerm(opt.val);
                            if (setSaleCondition) setSaleCondition(opt.condition);
                          }}
                        >
                          {opt.label}
                        </Button>
                      );
                    })}
                  </Flex>
                )}
              </Box>
            </Grid>
          </Box>

          <Box>
            <FormLabel fontSize="xs" fontWeight="800" color="gray.700">
              Comentarios u Observaciones del Pedido (`Comments`) {isDeliveryLocked && "🔒"}
            </FormLabel>
            <Textarea
              size="sm"
              borderRadius="md"
              rows={2}
              placeholder="Ingrese especificaciones comerciales, notas de entrega o acuerdos con el cliente..."
              value={comment || ""}
              onChange={(e) => setComment && setComment(e.target.value)}
              isReadOnly={isDeliveryLocked}
              bg={isDeliveryLocked ? "gray.100" : "white"}
              cursor={isDeliveryLocked ? "not-allowed" : "text"}
            />
          </Box>
        </VStack>
      </Box>

      {/* AVISO INFORMATIVO PARA ASESOR DE VENTAS */}
      {!isAdmin && (
        <Box p={4} bg="#f0fdf4" borderRadius="2xl" border="1.5px solid #86efac" boxShadow="xs">
          <HStack align="flex-start" spacing={3}>
            <Shield className="w-5 h-5 text-emerald-700 mt-0.5 flex-shrink-0" />
            <Box>
              <Text fontSize="xs" fontWeight="900" color="#166534" textTransform="uppercase" letterSpacing="wider">
                Validación Financiera y Cierre en Administración
              </Text>
              <Text fontSize="0.75rem" color="#15803d" mt={0.5} lineHeight="tall" fontWeight="500">
                Tu cotización pasará directamente a <b>Validación Comercial y Financiera</b>. La asignación de la condición de pago oficial, verificación del comprobante de abono (váucher) y parámetros de facturación SUNAT serán completados por el <b>Administrador</b> al momento de aprobar el pedido en SAP.
              </Text>
            </Box>
          </HStack>
        </Box>
      )}

      {/* TARJETA 2: 💳 CONDICIÓN DE PAGO Y COMPROBANTE (VOUCHER OCR) - EXCLUSIVO ADMINISTRADOR */}
      {isAdmin && (
        <Box bg="white" p={{ base: 4, md: 5 }} borderRadius="2xl" border="1.5px solid" borderColor="#e2e8f0" boxShadow="xs">
          <HStack spacing={2.5} mb={4} pb={2.5} borderBottom="1.5px solid" borderColor="emerald.100" justify="space-between">
            <HStack spacing={2.5}>
              <CreditCard className="w-5 h-5 text-emerald-700 stroke-[2.5]" />
              <Text fontSize="sm" fontWeight="950" color="emerald.900" textTransform="uppercase" letterSpacing="wide">
                2. Condición de Pago y Abono Bancario (Voucher)
              </Text>
            </HStack>
            {isFinanceLocked ? (
              <Badge colorScheme="green" fontSize="10px" px={2} py={0.5} borderRadius="md">
                🔒 Concluido (Aprobado)
              </Badge>
            ) : (
              <Badge colorScheme="purple" fontSize="10px" px={2} py={0.5} borderRadius="md">
                ✏️ Editable por Administrador
              </Badge>
            )}
          </HStack>

          {(() => {
            const currentPymntLabel = String(
              selectedPaymentType?.PymntGroup ||
              selectedPaymentType?.PaymentTermsGroupName ||
              selectedPaymentType?.label ||
              selectedPaymentType?.value ||
              saleCondition ||
              ""
            ).toLowerCase();

            const isCreditCondition = currentPymntLabel.includes("credit") || 
                                      currentPymntLabel.includes("crédito") || 
                                      currentPymntLabel.includes("dias") || 
                                      currentPymntLabel.includes("días") || 
                                      currentPymntLabel.includes("letra") || 
                                      saleCondition === "CREDITO";

            return (
              <VStack align="stretch" spacing={4}>
                <Grid templateColumns={{ base: "1fr", md: isCreditCondition ? "1fr 1fr" : "1fr 1fr" }} gap={3}>
                  <FormControl>
                    <FormLabel fontSize="xs" fontWeight="800" color="gray.700">
                      Tipo de Pago / Condición Comercial {isFinanceLocked && "🔒"}
                    </FormLabel>
                    <CreatableSelect
                      isDisabled={isFinanceLocked}
                      isClearable={!isFinanceLocked}
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
                      styles={{
                        container: (p) => ({ ...p, maxWidth: "100%", width: "100%", color: "black", opacity: isFinanceLocked ? 0.75 : 1 }),
                      }}
                    />
                  </FormControl>

                  {/* Si es CRÉDITO: Mostrar Plazo y Letra */}
                  {isCreditCondition ? (
                    <FormControl>
                      <FormLabel fontSize="xs" fontWeight="800" color="gray.700">
                        Plazo de Crédito Pactado {isFinanceLocked && "🔒"}
                      </FormLabel>
                      <Input
                        size="sm"
                        bg={isFinanceLocked ? "gray.100" : "white"}
                        isDisabled={isFinanceLocked}
                        borderRadius="md"
                        placeholder="Ej: 30 días, 45 días..."
                        value={creditTerm || ""}
                        onChange={(e) => setCreditTerm && setCreditTerm(e.target.value)}
                        fontWeight="700"
                      />
                    </FormControl>
                  ) : (
                    /* Si es CONTADO: Mostrar Medio de Pago */
                    <FormControl>
                      <FormLabel fontSize="xs" fontWeight="800" color="gray.700">
                        Medio de Pago (`PaymentMethod` / SUNAT) {isFinanceLocked && "🔒"}
                      </FormLabel>
                      <ChakraSelect
                        size="sm"
                        bg={isFinanceLocked ? "gray.100" : "white"}
                        isDisabled={isFinanceLocked}
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
                  )}
                </Grid>

                {/* BANNER Y DETALLES CONDICIONALES PARA CRÉDITO */}
                {isCreditCondition ? (
                  <Box p={4} bg="purple.50" borderRadius="xl" border="1.5px solid" borderColor="purple.200">
                    <HStack spacing={3} align="flex-start">
                      <Text fontSize="22px" lineHeight="1">💳</Text>
                      <VStack align="stretch" spacing={2} flex="1">
                        <HStack justify="space-between" flexWrap="wrap">
                          <Text fontSize="xs" fontWeight="900" color="purple.900" textTransform="uppercase">
                            Condición de Venta a Crédito / Plazos ({creditTerm || "Plazo Comercial"})
                          </Text>
                          <Checkbox
                            isChecked={isLetra}
                            onChange={(e) => setIsLetra && setIsLetra(e.target.checked)}
                            isDisabled={isFinanceLocked}
                            colorScheme="purple"
                            fontSize="xs"
                            fontWeight="800"
                          >
                            ¿Aplica Letra de Cambio? (`U_VS_LETRA`)
                          </Checkbox>
                        </HStack>
                        <Text fontSize="xs" color="purple.800" fontWeight="600">
                          ⚠️ <b>No requiere váucher bancario inmediato al cotizar</b>. Al ser venta a crédito, el pago se liquidará al vencimiento. Por favor asegúrese de adjuntar la <b>Orden de Compra (OC)</b> oficial o contrato en la <b>Sección 3 (Anexos de Resguardo)</b> para el respaldo de cobranzas.
                        </Text>
                      </VStack>
                    </HStack>
                  </Box>
                ) : (
                  /* CAMPOS CONDICIONALES PARA CONTADO (BANCO, VÁUCHER Y OCR) */
                  <>
                    <FormControl>
                      <Flex justify="space-between" align="center" mb={1}>
                        <FormLabel fontSize="xs" fontWeight="800" color="gray.700" m={0}>
                          Banco de Abono Oficial (SAP B1) {isFinanceLocked && "🔒"}
                        </FormLabel>
                        <Badge colorScheme="emerald" fontSize="9px" px={1.5} borderRadius="sm">
                          * Requerido para Contado
                        </Badge>
                      </Flex>
                      <ChakraSelect
                        size="sm"
                        bg={isFinanceLocked ? "gray.100" : "white"}
                        isDisabled={isFinanceLocked}
                        borderRadius="md"
                        value={bankAccount || ""}
                        onChange={(e) => setBankAccount && setBankAccount(e.target.value)}
                        placeholder="-- Seleccione Cuenta Bancaria Oficial SAP --"
                        fontWeight="600"
                      >
                        {bankAccount && !bankAccountOptions.some(opt => opt.value === bankAccount) && (
                          <option value={bankAccount}>
                            {bankAccount === "BCP_SOLES" ? "BCP (Soles) - Cta: 191-0104153-0-60 (CCI: 002-191-000104153060-52)"
                              : bankAccount === "BCP_USD" ? "BCP (Dólares) - Cta: 191-0104154-1-71 (CCI: 002-191-000104154171-55)"
                              : bankAccount === "BBVA_SOLES" ? "BBVA Continental (Soles) - Cta: 0011-0182-0100045231"
                              : bankAccount === "SCOTIA_USD" ? "Scotiabank (USD) - Cta: 000-1245211"
                              : `Cuenta Seleccionada: ${bankAccount}`}
                          </option>
                        )}
                        {bankAccountOptions.length > 0 ? (
                          bankAccountOptions.map((opt, idx) => (
                            <option key={idx} value={opt.value}>
                              {opt.label}
                            </option>
                          ))
                        ) : (
                          <>
                            <option value="BCP_SOLES">BCP (Soles) - Cta: 191-0104153-0-60 (CCI: 002-191-000104153060-52)</option>
                            <option value="BCP_USD">BCP (Dólares) - Cta: 191-0104154-1-71 (CCI: 002-191-000104154171-55)</option>
                            <option value="BBVA_SOLES">BBVA Continental (Soles) - Cta: 0011-0182-0100045231</option>
                            <option value="SCOTIA_USD">Scotiabank (USD) - Cta: 000-1245211</option>
                          </>
                        )}
                      </ChakraSelect>
                    </FormControl>

                    <Box p={4} bg="emerald.50/50" borderRadius="xl" border="1.5px solid" borderColor="emerald.200">
                      <FormLabel fontSize="xs" fontWeight="900" color="emerald.900" mb={1.5}>
                        💳 Número de Operación Bancaria / Váucher {isFinanceLocked && "🔒"}
                      </FormLabel>
                      <Input
                        type="text"
                        size="md"
                        bg={isFinanceLocked ? "gray.100" : "white"}
                        isReadOnly={isFinanceLocked}
                        borderRadius="md"
                        borderColor="emerald.300"
                        fontWeight="700"
                        placeholder="Ej: 0169944 / 61956167 (Número de operación de depósito o transferencia)"
                        value={opNum ?? ""}
                        onChange={(e) => setOpNum(e.target.value)}
                      />
                      <Text fontSize="11px" color="gray.500" mt={1.5} fontWeight="600">
                        * Ingrese el número de operación bancaria para conciliación contable en SAP B1.
                      </Text>
                    </Box>
                  </>
                )}
              </VStack>
            );
          })()}
        </Box>
      )}

      {/* TARJETA 3: 📋 PARÁMETROS SUNAT - EXCLUSIVO ADMINISTRADOR */}
      {isAdmin && (
        <Box bg="white" p={{ base: 4, md: 5 }} borderRadius="2xl" border="1.5px solid" borderColor="#e2e8f0" boxShadow="xs">
          <HStack spacing={2.5} mb={4} pb={2.5} borderBottom="1.5px solid" borderColor="emerald.100" justify="space-between">
            <HStack spacing={2.5}>
              <Paperclip className="w-5 h-5 text-emerald-700 stroke-[2.5]" />
              <Text fontSize="sm" fontWeight="950" color="emerald.900" textTransform="uppercase" letterSpacing="wide">
                3. Parámetros SUNAT
              </Text>
            </HStack>
            {isFinanceLocked ? (
              <Badge colorScheme="green" fontSize="10px" px={2} py={0.5} borderRadius="md">
                🔒 Concluido (Aprobado)
              </Badge>
            ) : (
              <Badge colorScheme="purple" fontSize="10px" px={2} py={0.5} borderRadius="md">
                ✏️ Editable por Administrador
              </Badge>
            )}
          </HStack>

          <VStack align="stretch" spacing={4}>
            <FormControl>
              <FormLabel fontSize="xs" fontWeight="800" color="gray.700">
                Tipo de Operación SUNAT (`U_VS_TIPOPER` / `TIPO_FACT`) {isFinanceLocked && "🔒"}
              </FormLabel>
              <ChakraSelect
                size="sm"
                bg={isFinanceLocked ? "gray.100" : "white"}
                isDisabled={isFinanceLocked}
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
          </VStack>
        </Box>
      )}
    </VStack>
  );
}