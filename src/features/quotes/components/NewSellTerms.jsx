import React, { useState, useEffect, useRef } from "react";
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
import { Truck, CreditCard, Shield } from "lucide-react";
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

export const getCustomSelectStyles = (isLocked) => ({
  container: (base) => ({
    ...base,
    maxWidth: "100%",
    width: "100%",
    color: "black",
    opacity: isLocked ? 0.8 : 1,
  }),
  control: (base, state) => ({
    ...base,
    minHeight: "40px",
    borderRadius: "10px",
    borderColor: state.isFocused ? "#10b981" : "#cbd5e1",
    boxShadow: state.isFocused ? "0 0 0 1.5px #10b981" : "none",
    fontSize: "13px",
    backgroundColor: isLocked ? "#f8fafc" : "white",
    cursor: isLocked ? "not-allowed" : "pointer",
    transition: "all 0.2s ease",
  }),
  valueContainer: (base) => ({
    ...base,
    padding: "3px 10px",
  }),
  singleValue: (base) => ({
    ...base,
    whiteSpace: "normal",
    fontSize: "13px",
    fontWeight: "700",
    color: "#0f172a",
    lineHeight: "1.3",
  }),
  placeholder: (base) => ({
    ...base,
    fontSize: "12px",
    color: "#94a3b8",
  }),
  option: (base, state) => ({
    ...base,
    whiteSpace: "normal",
    fontSize: "13px",
    padding: "9px 12px",
    backgroundColor: state.isSelected ? "#10b981" : state.isFocused ? "#ecfdf5" : "white",
    color: state.isSelected ? "white" : "#1e293b",
    cursor: "pointer",
  }),
  menuPortal: (base) => ({
    ...base,
    zIndex: 999999,
  }),
  menu: (base) => ({
    ...base,
    zIndex: 999999,
    borderRadius: "10px",
    overflow: "hidden",
    boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.18), 0 8px 10px -6px rgba(0, 0, 0, 0.12)",
  }),
});

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
  const [attachments, setAttachments] = useState([]);
  const isCommercialLocked = Boolean(isDeliveryLocked && isFinanceLocked);

  const clientAdapted = client ? adaptBusinessPartner(client) : null;

  // Datos en vivo desde la API de SAP B1 (100% dinámicos)
  const allPaymentTypes = paymentTypes || [];
  const allDeliveryForms = deliveryForms || [];
  const allDeliveryPoints = deliveryPoints || [];
  const allTransports = transports || [];

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

  const deliveryOptions = allDeliveryPoints.map((point) => {
    const name = point.AddressName || point.name || point.Code || 'Dirección';
    const street = point.Street || point.Address || point.address || '';
    const label = point.label || (street ? `${name} - ${street}` : name);
    return {
      value: name,
      label,
      raw: point,
    };
  });

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
      const label = val.label || (street ? `${name ? name + ' - ' : ''}${street}` : name);
      if (!name && !street && !label) return null;
      return {
        value: name || street || label,
        label: label || name || street,
      };
    }
    const strVal = String(val);
    if (!strVal || strVal === "undefined" || strVal === "null") return null;
    const found = allDeliveryPoints.find(
      (p) =>
        (p.AddressName || "").toLowerCase() === strVal.toLowerCase() ||
        (p.Street || p.Address || "").toLowerCase() === strVal.toLowerCase() ||
        (p.label || "").toLowerCase() === strVal.toLowerCase()
    );
    if (found) {
      const name = found.AddressName || 'Dirección';
      const street = found.Street || found.Address || '';
      return {
        value: name,
        label: found.label || (street ? `${name} - ${street}` : name),
      };
    }
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
    const found = allPaymentTypes.find(
      (pt) => String(pt.GroupNum ?? pt.GroupNumber ?? pt.value) === strVal ||
              (pt.PymntGroup || pt.PaymentTermsGroupName || pt.label || "").toLowerCase() === strVal.toLowerCase()
    );
    if (found) {
      return {
        value: String(found.GroupNum ?? found.GroupNumber ?? found.value ?? strVal),
        label: found.PymntGroup || found.PaymentTermsGroupName || found.label || strVal,
      };
    }
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

  const handlePaymentTypeChange = (selected) => {
    if (!selected) {
      setSelectedPaymentType(null);
      if (setSaleCondition) setSaleCondition("");
      if (setIsLetra) setIsLetra(false);
      if (setCreditTerm) setCreditTerm("");
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
    if (!isDeliveryLocked || !isFinanceLocked) {
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
    if (selected.raw) {
      setSelectedPoint(selected.raw);
      return;
    }
    const found = allDeliveryPoints.find(
      (p) =>
        (p.AddressName || "").toLowerCase() === String(selected.value || "").toLowerCase() ||
        (p.Street || p.Address || "").toLowerCase() === String(selected.value || "").toLowerCase()
    );
    setSelectedPoint(found || { AddressName: selected.value, Street: selected.label || selected.value, label: selected.label });
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
        <Box p={{ base: 2.5, sm: 3.5 }} bg="emerald.50" borderRadius="xl" border="1.5px solid" borderColor="emerald.200">
          <Flex justify="space-between" align="center" mb={1} wrap="wrap" gap={1}>
            <Text fontSize="xs" fontWeight="800" color="emerald.900" textTransform="uppercase">CLIENTE SELECCIONADO</Text>
            <Badge colorScheme="emerald" fontSize="xs">SAP OK</Badge>
          </Flex>
          <Text fontSize="xs" color="gray.700" wordBreak="break-word"><strong>Código:</strong> {clientAdapted.cardCode}</Text>
          <Text fontSize="xs" color="gray.700" wordBreak="break-word"><strong>Nombre:</strong> {clientAdapted.cardName}</Text>
          <Text fontSize="xs" color="gray.700" wordBreak="break-word"><strong>Dirección Fiscal:</strong> {clientAdapted.address}</Text>
        </Box>
      ) : (
        <Box p={{ base: 2.5, sm: 3.5 }} bg="gray.50" borderRadius="xl" border="1.5px dashed" borderColor="gray.300">
          <Text fontSize="xs" color="gray.600" fontWeight="600" fontStyle="italic">
            💡 Completa los parámetros de logística, medios de pago y anexos requeridos para una facturación completa en SAP B1.
          </Text>
        </Box>
      )}

      {/* TARJETA 1: 📦 LOGÍSTICA Y AGENCIA DE TRANSPORTE */}
      <Box bg="white" p={{ base: 3, sm: 4, md: 5 }} borderRadius="2xl" border="1.5px solid" borderColor="#e2e8f0" boxShadow="xs">
        <Flex
          direction={{ base: "column", sm: "row" }}
          align={{ base: "flex-start", sm: "center" }}
          justify="space-between"
          gap={2}
          mb={3.5}
          pb={2.5}
          borderBottom="1.5px solid"
          borderColor="emerald.100"
        >
          <HStack spacing={2.5}>
            <Truck className="w-5 h-5 text-emerald-700 stroke-[2.5] flex-shrink-0" />
            <Text fontSize={{ base: "xs", sm: "sm" }} fontWeight="950" color="emerald.900" textTransform="uppercase" letterSpacing="wide">
              1. Logística y Agencia de Transporte
            </Text>
          </HStack>
          {isDeliveryLocked && (
            <Badge colorScheme="gray" fontSize="10px" px={2} py={0.5} borderRadius="md">
              🔒 Bloqueado (Vendedor)
            </Badge>
          )}
        </Flex>

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
              noOptionsMessage={({ inputValue }) =>
                inputValue ? `Presiona Enter para seleccionar: "${inputValue}"` : "Sin formas de entrega registradas"
              }
              formatCreateLabel={(inputValue) => `Escribir: "${inputValue}"`}
              styles={getCustomSelectStyles(isDeliveryLocked)}
              menuPortalTarget={typeof document !== "undefined" ? document.body : null}
              menuPosition="fixed"
            />
          </Box>

          {selectedDeliveryForm && !isPickupInStore && (
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
                noOptionsMessage={({ inputValue }) =>
                  inputValue
                    ? `Presiona Enter para usar: "${inputValue}" como destino`
                    : (client ? "Escribe la dirección o ciudad de destino..." : "Selecciona un cliente o escribe un destino libre...")
                }
                formatCreateLabel={(inputValue) => `Escribir destino libre: "${inputValue}"`}
                styles={getCustomSelectStyles(isDeliveryLocked)}
                menuPortalTarget={typeof document !== "undefined" ? document.body : null}
                menuPosition="fixed"
              />
            </Box>
          )}

          {selectedDeliveryForm && !(isPickupInStore || isOwnPickupInStore) && (
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
                noOptionsMessage={({ inputValue }) =>
                  inputValue ? `Presiona Enter para usar: "${inputValue}" como agencia` : "Escribe el nombre de la agencia..."
                }
                formatCreateLabel={(inputValue) => `Escribir agencia libre: "${inputValue}"`}
                styles={getCustomSelectStyles(isDeliveryLocked)}
                menuPortalTarget={typeof document !== "undefined" ? document.body : null}
                menuPosition="fixed"
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

      {/* TARJETA 2: 💳 CONDICIÓN DE PAGO Y FACTURACIÓN (SAP B1) - EXCLUSIVO ADMINISTRADOR */}
      {isAdmin && (
        <Box bg="white" p={{ base: 3, sm: 4, md: 5 }} borderRadius="2xl" border="1.5px solid" borderColor="#e2e8f0" boxShadow="xs">
          <Flex
            direction={{ base: "column", sm: "row" }}
            align={{ base: "flex-start", sm: "center" }}
            justify="space-between"
            gap={2}
            mb={3.5}
            pb={2.5}
            borderBottom="1.5px solid"
            borderColor="emerald.100"
          >
            <HStack spacing={2.5}>
              <CreditCard className="w-5 h-5 text-emerald-700 stroke-[2.5] flex-shrink-0" />
              <Text fontSize={{ base: "xs", sm: "sm" }} fontWeight="950" color="emerald.900" textTransform="uppercase" letterSpacing="wide">
                2. Condición de Pago y Facturación (SAP B1)
              </Text>
            </HStack>
            <HStack spacing={2}>
              {isFinanceLocked ? (
                <Badge colorScheme="green" fontSize="10px" px={2} py={0.5} borderRadius="md">
                  🔒 Concluido (Aprobado)
                </Badge>
              ) : (
                <Badge colorScheme="purple" fontSize="10px" px={2} py={0.5} borderRadius="md">
                  ✏️ Editable por Administrador / Mostrador
                </Badge>
              )}
            </HStack>
          </Flex>

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

            const clientDocDigits = String(client?.FederalTaxID || client?.clientDocument || client?.documentNumber || client?.LicTradNum || client?.CardCode || "").replace(/\D/g, "");
            const isLikelyRuc = clientDocDigits.length === 11;
            const isLikelyDni = clientDocDigits.length === 8;
            const effectiveDocType = documentType || (isLikelyRuc ? "FACTURA" : "BOLETA");

            return (
              <VStack align="stretch" spacing={4}>
                <Grid templateColumns={{ base: "1fr", md: "1.4fr 1fr" }} gap={3.5}>
                  <FormControl>
                    <Flex justify="space-between" align="center" mb={1.5}>
                      <FormLabel fontSize="xs" fontWeight="800" color="gray.700" mb={0}>
                        Tipo de Pago / Condición Comercial (Tabla OCTG - SAP B1) {isFinanceLocked && "🔒"}
                      </FormLabel>
                      <Badge colorScheme={isCreditCondition ? "purple" : "green"} fontSize="9px" px={1.5} py={0.2} borderRadius="sm" fontWeight="800">
                        {isCreditCondition ? "CRÉDITO" : "CONTADO"}
                      </Badge>
                    </Flex>
                    <CreatableSelect
                      isDisabled={isFinanceLocked}
                      isClearable={!isFinanceLocked}
                      options={paymentTypesOptions}
                      value={normalizePaymentTypeValue(selectedPaymentType)}
                      onChange={handlePaymentTypeChange}
                      placeholder="Selecciona condición de pago..."
                      formatCreateLabel={(inputValue) => `Escribir: "${inputValue}"`}
                      styles={getCustomSelectStyles(isFinanceLocked)}
                      menuPortalTarget={typeof document !== "undefined" ? document.body : null}
                      menuPosition="fixed"
                    />
                  </FormControl>

                  {/* Selector de Comprobante Fiscal (FACTURA / BOLETA) */}
                  <FormControl>
                    <Flex justify="space-between" align="center" mb={1.5}>
                      <FormLabel fontSize="xs" fontWeight="800" color="gray.700" mb={0}>
                        Tipo de Comprobante Fiscal {isFinanceLocked && "🔒"}
                      </FormLabel>
                      <Badge colorScheme={effectiveDocType === "FACTURA" ? "blue" : "teal"} fontSize="9px" px={1.5} py={0.2} borderRadius="sm" fontWeight="800">
                        {isLikelyRuc ? "RUC DETECTADO" : isLikelyDni ? "DNI DETECTADO" : "AUTO"}
                      </Badge>
                    </Flex>
                    <HStack spacing={2}>
                      <Button
                        size="sm"
                        variant={effectiveDocType === "FACTURA" ? "solid" : "outline"}
                        colorScheme="blue"
                        onClick={() => {
                          if (!isFinanceLocked && setDocumentType) setDocumentType("FACTURA");
                        }}
                        isDisabled={isFinanceLocked}
                        fontSize="xs"
                        fontWeight="800"
                        borderRadius="lg"
                        h="40px"
                        flex="1"
                      >
                        📄 FACTURA {isLikelyRuc && "(RUC)"}
                      </Button>
                      <Button
                        size="sm"
                        variant={effectiveDocType === "BOLETA" ? "solid" : "outline"}
                        colorScheme="teal"
                        onClick={() => {
                          if (!isFinanceLocked && setDocumentType) setDocumentType("BOLETA");
                        }}
                        isDisabled={isFinanceLocked}
                        fontSize="xs"
                        fontWeight="800"
                        borderRadius="lg"
                        h="40px"
                        flex="1"
                      >
                        🧾 BOLETA {isLikelyDni && "(DNI)"}
                      </Button>
                    </HStack>
                  </FormControl>
                </Grid>

                {/* Si es CRÉDITO: Plazo Pactado y Letra de Cambio */}
                {isCreditCondition && (
                  <Grid templateColumns={{ base: "1fr", md: "1.4fr 1fr" }} gap={3.5} p={3.5} bg="purple.50" borderRadius="xl" border="1.5px solid" borderColor="purple.200">
                    <FormControl>
                      <FormLabel fontSize="xs" fontWeight="800" color="purple.900">
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
                    <FormControl display="flex" flexDirection="column" justifyContent="center">
                      <FormLabel fontSize="xs" fontWeight="800" color="purple.900" mb={1.5}>
                        Instrumento Financiero
                      </FormLabel>
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
                    </FormControl>
                  </Grid>
                )}

                {/* RESUMEN COMERCIAL INFORMATIVO SEGÚN MODALIDAD */}
                {isCreditCondition ? (
                  <Box p={3} bg="purple.50/60" borderRadius="xl" border="1px dashed" borderColor="purple.300">
                    <HStack spacing={3} align="center">
                      <Text fontSize="20px" lineHeight="1">💳</Text>
                      <VStack align="stretch" spacing={0.5} flex="1">
                        <Text fontSize="xs" fontWeight="900" color="purple.900">
                          VENTA A CRÉDITO COMERCIAL PACTADO ({creditTerm || "Plazo Oficial"})
                        </Text>
                        <Text fontSize="11px" color="purple.800" fontWeight="600">
                          ℹ️ La venta se registrará en SAP B1 con condición "{selectedPaymentType?.PymntGroup || selectedPaymentType?.label || 'Crédito'}", comprobante <b>{effectiveDocType}</b> {isLetra ? "y Letra de Cambio mercantil." : "sin letra."}
                        </Text>
                      </VStack>
                    </HStack>
                  </Box>
                ) : (
                  <Box p={3} bg="emerald.50/80" borderRadius="xl" border="1px dashed" borderColor="emerald.300">
                    <HStack spacing={3} align="center">
                      <Text fontSize="20px" lineHeight="1">💵</Text>
                      <VStack align="stretch" spacing={0.5} flex="1">
                        <Text fontSize="xs" fontWeight="900" color="emerald.900">
                          VENTA AL CONTADO / ENTREGA INMEDIATA
                        </Text>
                        <Text fontSize="11px" color="emerald.800" fontWeight="600">
                          ℹ️ La venta se registrará en SAP B1 con condición "{selectedPaymentType?.PymntGroup || selectedPaymentType?.label || 'Contado / Entrega'}" y comprobante <b>{effectiveDocType}</b> (sin días de financiamiento).
                        </Text>
                      </VStack>
                    </HStack>
                  </Box>
                )}
              </VStack>
            );
          })()}
        </Box>
      )}
    </VStack>
  );
}