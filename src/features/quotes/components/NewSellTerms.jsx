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
  Spinner,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalFooter,
  ModalBody,
  ModalCloseButton,
  useDisclosure,
} from "@chakra-ui/react";
import Select from "react-select";
import CreatableSelect from "react-select/creatable";
import { adaptBusinessPartner } from "../adapters/quotesAdapter";
import { useQuoteMutations } from "../hooks/mutations/quotesMutations";
import { Truck, CreditCard, Shield, MapPin, Plus } from "lucide-react";
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
      code === "1" ||
      combined.includes("recojo tienda") ||
      combined.includes("recojo en tienda") ||
      combined.includes("recojo almacen") ||
      combined.includes("recojo almacén") ||
      combined.includes("recoge en tienda") ||
      (combined.includes("recojo") && !combined.includes("interprovincial") && !combined.includes("transporte") && !combined.includes("carga"))
    );
  }
  const str = String(parsed).toLowerCase();
  return (
    str === "1" ||
    str.includes("recojo tienda") ||
    str.includes("recojo en tienda") ||
    str.includes("recojo almacen") ||
    str.includes("recojo almacén") ||
    str.includes("recoge en tienda") ||
    (str.includes("recojo") && !str.includes("interprovincial") && !str.includes("transporte") && !str.includes("carga"))
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
    // En SAP B1: Código 2 es "05. Reparto Propio - Programación", Código 3 es "06. Envio Motorizado Propio"
    // NUNCA debe incluir Código 5 ("02. Transporte Interprovincial"), Código 6 ("03. Servicio de Ag. de Transporte") ni Código 7 ("01. Transporte Carga Terrestre")
    const isAgency = combined.includes("interprovincial") || combined.includes("ag. de transporte") || combined.includes("agencia") || combined.includes("carga terrestre") || code === "5" || code === "6" || code === "7" || code === "9";
    if (isAgency) return false;
    return (
      code === "2" ||
      code === "3" ||
      combined.includes("reparto propio") ||
      combined.includes("motorizado propio") ||
      (combined.includes("propio") && !combined.includes("interprovincial"))
    );
  }
  const str = String(parsed).toLowerCase();
  const isAgencyStr = str.includes("interprovincial") || str.includes("ag. de transporte") || str.includes("agencia") || str.includes("carga terrestre") || str === "5" || str === "6" || str === "7" || str === "9";
  if (isAgencyStr) return false;
  return (
    str === "2" ||
    str === "3" ||
    str.includes("reparto propio") ||
    str.includes("motorizado propio") ||
    (str.includes("propio") && !str.includes("interprovincial"))
  );
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

export const PERU_DEPARTMENTS = [
  { code: "15", name: "LIMA" },
  { code: "07", name: "CALLAO" },
  { code: "04", name: "AREQUIPA" },
  { code: "13", name: "LA LIBERTAD" },
  { code: "20", name: "PIURA" },
  { code: "14", name: "LAMBAYEQUE" },
  { code: "11", name: "ICA" },
  { code: "12", name: "JUNÍN" },
  { code: "08", name: "CUSCO" },
  { code: "02", name: "ÁNCASH" },
  { code: "06", name: "CAJAMARCA" },
  { code: "22", name: "SAN MARTÍN" },
  { code: "16", name: "LORETO" },
  { code: "23", name: "TACNA" },
  { code: "21", name: "PUNO" },
  { code: "10", name: "HUÁNUCO" },
  { code: "05", name: "AYACUCHO" },
  { code: "24", name: "TUMBES" },
  { code: "18", name: "MOQUEGUA" },
  { code: "19", name: "PASCO" },
  { code: "09", name: "HUANCAVELICA" },
  { code: "03", name: "APURÍMAC" },
  { code: "01", name: "AMAZONAS" },
  { code: "17", name: "MADRE DE DIOS" },
  { code: "25", name: "UCAYALI" },
];

export function NewSellTerms({
  client,
  transports = [],
  deliveryPoints = [],
  isLoadingDeliveryPoints = false,
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
  const {
    isOpen: isAddressModalOpen,
    onOpen: onOpenAddressModal,
    onClose: onCloseAddressModal,
  } = useDisclosure();

  const [customAddrForm, setCustomAddrForm] = useState({
    addressName: "",
    street: "",
    department: "15",
    city: "LIMA",
    county: "",
    reference: "",
    saveToClient: false,
  });

  const [addressError, setAddressError] = useState("");

  const handleOpenNewAddressModal = () => {
    if (selectedPoint && typeof selectedPoint === "object" && selectedPoint.isCustomAddress) {
      setCustomAddrForm({
        addressName: selectedPoint.AddressName || "",
        street: selectedPoint.Street || selectedPoint.address || "",
        department: selectedPoint.State || "15",
        city: selectedPoint.City || "LIMA",
        county: selectedPoint.County || "",
        reference: selectedPoint.BuildingFloorRoom || "",
        saveToClient: Boolean(selectedPoint.saveToClient),
      });
    } else {
      setCustomAddrForm({
        addressName: "",
        street: "",
        department: "15",
        city: "LIMA",
        county: "",
        reference: "",
        saveToClient: false,
      });
    }
    setAddressError("");
    onOpenAddressModal();
  };

  const handleSaveCustomAddress = () => {
    const cleanStreet = String(customAddrForm.street || "").trim();
    if (!cleanStreet) {
      setAddressError("La dirección (calle, avenida, jirón o número) es obligatoria.");
      return;
    }

    const deptObj = PERU_DEPARTMENTS.find(d => d.code === customAddrForm.department) || { code: "15", name: "LIMA" };
    const cleanCity = String(customAddrForm.city || "LIMA").trim().toUpperCase();
    const cleanCounty = String(customAddrForm.county || "").trim().toUpperCase();
    const cleanName = String(
      customAddrForm.addressName || (cleanCounty ? `DESTINO ${cleanCounty}` : "DESTINO NUEVO")
    ).trim().toUpperCase().slice(0, 50);

    const newPoint = {
      AddressName: cleanName,
      Street: cleanStreet,
      City: cleanCity || "LIMA",
      County: cleanCounty || cleanCity || "LIMA",
      State: deptObj.code,
      Country: "PE",
      BuildingFloorRoom: String(customAddrForm.reference || "").trim(),
      isCustomAddress: true,
      saveToClient: Boolean(customAddrForm.saveToClient),
      label: `📍 [NUEVA] ${cleanName} - ${cleanStreet} (${cleanCounty || cleanCity}, ${deptObj.name})`,
      value: cleanName,
    };

    setSelectedPoint(newPoint);
    onCloseAddressModal();
  };

  const handleRemoveCustomAddress = () => {
    setSelectedPoint(null);
  };

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
    value: String(form.TrnspCode || form.Code || form.value || form.TrnspName),
    label: form.TrnspName || form.Name || form.label || String(form.TrnspCode),
    raw: form,
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
      const code = val.TrnspCode ?? val.Code ?? val.value ?? val.code ?? "";
      const name = val.TrnspName ?? val.Name ?? val.label ?? val.name ?? (code ? String(code) : "");
      if (!name || name === "undefined" || name === "null") return null;
      if (/cotizaci[oó]n|oferta|pedido|boleta|factura/i.test(String(name).trim()) || /cotizaci[oó]n|oferta|pedido|boleta|factura/i.test(String(code).trim())) {
        return null;
      }
      const foundInList = allDeliveryForms.find(
        (f) => String(f.TrnspCode || f.Code) === String(code) || f.TrnspName === name || f.Name === name
      );
      if (foundInList) {
        return {
          value: String(foundInList.TrnspCode || foundInList.Code),
          label: foundInList.TrnspName || foundInList.Name,
          raw: foundInList,
        };
      }
      return {
        value: String(code || name),
        label: name,
        raw: val,
      };
    }
    const strVal = String(val).trim();
    if (!strVal || strVal === "undefined" || strVal === "null") return null;
    if (/cotizaci[oó]n|oferta|pedido|boleta|factura/i.test(strVal)) {
      return null;
    }
    const found = allDeliveryForms.find(
      (f) => String(f.TrnspCode || f.Code) === strVal || f.TrnspName === strVal || f.Name === strVal
    );
    if (found) {
      return {
        value: String(found.TrnspCode || found.Code),
        label: found.TrnspName || found.Name,
        raw: found,
      };
    }
    const numericCode = Number(strVal);
    if (!isNaN(numericCode) && numericCode > 0) {
      return { value: strVal, label: `Transporte Cód. ${strVal}` };
    }
    return null;
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
      if (val.isCustomAddress) {
        return {
          value: val.AddressName || val.Street || "NUEVA",
          label: val.label || `📍 [NUEVA] ${val.AddressName || 'Destino'} - ${val.Street}`,
        };
      }
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

  // Sincronización automática de transporte propio / recojo para evitar vacíos o "No aplica"
  useEffect(() => {
    if (isOwnPickupInStore) {
      const currentName = String(selectedTransport?.Name || selectedTransport?.name || selectedTransport || "").toLowerCase();
      if (!selectedTransport || currentName.includes("no aplica") || currentName === "null" || currentName === "undefined") {
        setSelectedTransport({
          Code: "00053",
          code: "00053",
          Name: "AUTOPARTES S.A.",
          name: "AUTOPARTES S.A.",
          label: "AUTOPARTES S.A.",
          value: "00053",
          U_TQC_DIREC: "",
          address: "",
        });
      }
    } else if (isPickupInStore) {
      const currentName = String(selectedTransport?.Name || selectedTransport?.name || selectedTransport || "").toLowerCase();
      if (!selectedTransport || currentName.includes("no aplica") || currentName === "null" || currentName === "undefined") {
        setSelectedTransport({
          Code: "CLIENTE",
          code: "CLIENTE",
          Name: "CLIENTE (Recojo en Tienda)",
          name: "CLIENTE (Recojo en Tienda)",
          label: "CLIENTE (Recojo en Tienda)",
          value: "CLIENTE",
          U_TQC_DIREC: "",
          address: "",
        });
      }
    }
  }, [selectedDeliveryForm]);

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

    if (isOwnPickupInStoreForm(selectedObj)) {
      setSelectedTransport({
        Code: "00053",
        code: "00053",
        Name: "AUTOPARTES S.A.",
        name: "AUTOPARTES S.A.",
        label: "AUTOPARTES S.A.",
        value: "00053",
        U_TQC_DIREC: "",
        address: "",
      });
    } else if (isPickupInStoreForm(selectedObj)) {
      setSelectedPoint(null);
      setSelectedTransport({
        Code: "CLIENTE",
        code: "CLIENTE",
        Name: "CLIENTE (Recojo en Tienda)",
        name: "CLIENTE (Recojo en Tienda)",
        label: "CLIENTE (Recojo en Tienda)",
        value: "CLIENTE",
        U_TQC_DIREC: "",
        address: "",
      });
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

  // Auto-seleccionar la condición de pago del cliente (GroupNum / PayTermsGrpCode de SAP B1)
  const prevClientCodeRef = useRef(null);
  useEffect(() => {
    const currentCode = client?.CardCode || client?.cardCode || client?.id;
    if (client && currentCode && currentCode !== prevClientCodeRef.current) {
      prevClientCodeRef.current = currentCode;
      const clientGroupNum = client.PayTermsGrpCode ?? client.GroupNum ?? client.raw?.PayTermsGrpCode ?? client.raw?.GroupNum;
      if (clientGroupNum !== undefined && clientGroupNum !== null && clientGroupNum !== "" && allPaymentTypes.length > 0) {
        const found = allPaymentTypes.find(
          (pt) => String(pt.GroupNum ?? pt.GroupNumber ?? pt.value) === String(clientGroupNum)
        );
        if (found) {
          handlePaymentTypeChange({ value: found.GroupNum ?? found.value, label: found.PymntGroup || found.label });
        }
      }
    } else if (!selectedPaymentType && client && allPaymentTypes.length > 0) {
      const clientGroupNum = client.PayTermsGrpCode ?? client.GroupNum ?? client.raw?.PayTermsGrpCode ?? client.raw?.GroupNum;
      if (clientGroupNum !== undefined && clientGroupNum !== null && clientGroupNum !== "") {
        const found = allPaymentTypes.find(
          (pt) => String(pt.GroupNum ?? pt.GroupNumber ?? pt.value) === String(clientGroupNum)
        );
        if (found) {
          handlePaymentTypeChange({ value: found.GroupNum ?? found.value, label: found.PymntGroup || found.label });
        }
      }
    }
  }, [client, allPaymentTypes, selectedPaymentType]);

  // Auto-deducir internamente si es BOLETA o FACTURA según documento del cliente (DNI 8 dígitos -> BOLETA, RUC/Empresa -> FACTURA)
  useEffect(() => {
    if (setDocumentType) {
      const clientDocDigits = String(
        client?.FederalTaxID || 
        client?.clientDocument || 
        client?.documentNumber || 
        client?.LicTradNum || 
        client?.CardCode || 
        ""
      ).replace(/\D/g, "");
      const autoDocType = clientDocDigits.length === 8 ? "BOLETA" : "FACTURA";
      if (documentType !== autoDocType) {
        setDocumentType(autoDocType);
      }
    }
  }, [client, documentType, setDocumentType]);

  return (
    <VStack align="stretch" spacing={5} py={2}>
      {clientAdapted ? (
        <Box p={{ base: 2.5, sm: 3.5 }} bg="emerald.50" borderRadius="xl" border="1.5px solid" borderColor="emerald.200">
          <Flex justify="space-between" align="center" mb={1} wrap="wrap" gap={1}>
            <Text fontSize="xs" fontWeight="800" color="emerald.900" textTransform="uppercase">CLIENTE SELECCIONADO</Text>
            <Badge colorScheme="emerald" fontSize="xs">VÁLIDO</Badge>
          </Flex>
          <Text fontSize="xs" color="gray.700" wordBreak="break-word"><strong>Código:</strong> {clientAdapted.cardCode}</Text>
          <Text fontSize="xs" color="gray.700" wordBreak="break-word"><strong>Nombre:</strong> {clientAdapted.cardName}</Text>
          <Text fontSize="xs" color="gray.700" wordBreak="break-word"><strong>Dirección Fiscal:</strong> {clientAdapted.address}</Text>
        </Box>
      ) : (
        <Box p={{ base: 2.5, sm: 3.5 }} bg="gray.50" borderRadius="xl" border="1.5px dashed" borderColor="gray.300">
          <Text fontSize="xs" color="gray.600" fontWeight="600" fontStyle="italic">
            💡 Completa los parámetros de logística, medios de pago y anexos requeridos para la facturación.
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
            <Select
              isDisabled={isDeliveryLocked}
              isClearable={!isDeliveryLocked}
              options={deliveryFormsOptions}
              value={normalizeDeliveryFormValue(selectedDeliveryForm)}
              onChange={handleDeliveryFormChange}
              placeholder="Selecciona una forma de entrega..."
              noOptionsMessage={({ inputValue }) =>
                inputValue ? `No se encontró: "${inputValue}"` : "Sin formas de entrega registradas"
              }
              styles={getCustomSelectStyles(isDeliveryLocked)}
              menuPortalTarget={typeof document !== "undefined" ? document.body : null}
              menuPosition="fixed"
            />
            {deliveryFormsOptions.length > 0 && (
              <Text fontSize="11px" color="gray.500" mt={1}>
                📦 <b>{deliveryFormsOptions.length}</b> modalidades de despacho activas en el sistema.
              </Text>
            )}
          </Box>

          {selectedDeliveryForm && !isPickupInStore && (
            <Box>
              <Flex
                justify="space-between"
                align={{ base: "stretch", sm: "center" }}
                direction={{ base: "column", sm: "row" }}
                mb={2}
                gap={2}
              >
                <FormLabel fontSize="xs" fontWeight="800" color="gray.700" mb={0}>
                  Punto de Llegada (Destino de Entrega) {isDeliveryLocked && "🔒"}
                </FormLabel>
                {!isDeliveryLocked && (
                  <Button
                    size="xs"
                    h={{ base: "32px", sm: "28px" }}
                    px={3}
                    fontSize={{ base: "12px", sm: "11px" }}
                    fontWeight="800"
                    borderRadius="lg"
                    leftIcon={<Plus className="w-3.5 h-3.5" />}
                    onClick={handleOpenNewAddressModal}
                    {...(selectedPoint?.isCustomAddress
                      ? {
                          bg: "#0d6334",
                          color: "white",
                          _hover: { bg: "#064e3b" },
                          _active: { bg: "#043327" },
                        }
                      : {
                          variant: "outline",
                          borderColor: "#0d6334",
                          color: "#0d6334",
                          _hover: { bg: "#f0fdf4" },
                        })}
                  >
                    {selectedPoint?.isCustomAddress ? "✏️ Editar Dirección Nueva" : "➕ Registrar Nueva Dirección"}
                  </Button>
                )}
              </Flex>

              {/* Si es una dirección personalizada nueva, mostrar tarjeta clara con detalles */}
              {selectedPoint && typeof selectedPoint === "object" && selectedPoint.isCustomAddress ? (
                <Box
                  p={{ base: 3, sm: 3.5 }}
                  bg="#f0fdf4"
                  border="1.5px solid #86efac"
                  borderRadius="xl"
                  boxShadow="0 1px 3px rgba(0,0,0,0.04)"
                >
                  <Flex
                    direction={{ base: "column", sm: "row" }}
                    justify="space-between"
                    align={{ base: "stretch", sm: "flex-start" }}
                    gap={2.5}
                  >
                    <VStack align="start" spacing={1.5} flex="1">
                      <HStack spacing={2} wrap="wrap">
                        <Badge bg="#0d6334" color="white" fontSize="11px" px={2.5} py={0.5} borderRadius="md" fontWeight="800">
                          📍 DIRECCIÓN DE ENTREGA NUEVA
                        </Badge>
                        {selectedPoint.saveToClient ? (
                          <Badge bg="#6b21a8" color="white" fontSize="10px" px={2} py={0.5} borderRadius="md" fontWeight="700">
                            💾 Guardar en ficha del cliente
                          </Badge>
                        ) : (
                          <Badge bg="gray.100" color="gray.700" border="1px solid #cbd5e1" fontSize="10px" px={2} py={0.5} borderRadius="md">
                            📦 Despacho específico
                          </Badge>
                        )}
                      </HStack>
                      <Text fontSize={{ base: "13px", sm: "xs" }} fontWeight="800" color="gray.900">
                        Destino: {selectedPoint.AddressName}
                      </Text>
                      <Text fontSize={{ base: "13px", sm: "xs" }} color="gray.800">
                        <b>Calle / Av.:</b> {selectedPoint.Street}
                      </Text>
                      <Text fontSize={{ base: "12px", sm: "11px" }} color="gray.600">
                        <b>Ubicación:</b> {selectedPoint.County}, {selectedPoint.City} (Dpto. {selectedPoint.State})
                      </Text>
                      {selectedPoint.BuildingFloorRoom && (
                        <Text fontSize={{ base: "12px", sm: "11px" }} color="gray.600">
                          <b>Referencia:</b> {selectedPoint.BuildingFloorRoom}
                        </Text>
                      )}
                    </VStack>
                    {!isDeliveryLocked && (
                      <HStack spacing={2} justify={{ base: "flex-end", sm: "flex-end" }} mt={{ base: 1, sm: 0 }}>
                        <Button
                          size="xs"
                          h="28px"
                          px={3}
                          color="#0d6334"
                          bg="#dcfce7"
                          _hover={{ bg: "#bbf7d0" }}
                          fontWeight="700"
                          borderRadius="md"
                          onClick={handleOpenNewAddressModal}
                        >
                          Editar
                        </Button>
                        <Button
                          size="xs"
                          h="28px"
                          px={3}
                          color="#b91c1c"
                          bg="#fee2e2"
                          _hover={{ bg: "#fecaca" }}
                          fontWeight="700"
                          borderRadius="md"
                          onClick={handleRemoveCustomAddress}
                        >
                          Quitar
                        </Button>
                      </HStack>
                    )}
                  </Flex>
                </Box>
              ) : (
                <>
                  <CreatableSelect
                    isDisabled={isDeliveryLocked}
                    isLoading={isLoadingDeliveryPoints}
                    isClearable={!isDeliveryLocked}
                    options={deliveryOptions}
                    value={normalizeDeliveryPointValue(selectedPoint)}
                    onChange={handleDeliveryPointChange}
                    placeholder={
                      isLoadingDeliveryPoints
                        ? "Cargando direcciones registradas..."
                        : client
                        ? "Selecciona o escribe un destino de entrega..."
                        : "Selecciona un cliente o escribe un destino libre..."
                    }
                    noOptionsMessage={({ inputValue }) =>
                      inputValue
                        ? `Presiona Enter para usar: "${inputValue}" como destino`
                        : isLoadingDeliveryPoints
                        ? "Cargando direcciones registradas..."
                        : client
                        ? "Escribe la dirección o ciudad de destino..."
                        : "Selecciona primero un cliente en la pestaña Cotización o escribe un destino libre..."
                    }
                    formatCreateLabel={(inputValue) => `Escribir destino libre: "${inputValue}"`}
                    styles={getCustomSelectStyles(isDeliveryLocked)}
                    menuPortalTarget={typeof document !== "undefined" ? document.body : null}
                    menuPosition="fixed"
                  />
                  {!client ? (
                    <Text fontSize="11px" color="amber.800" bg="amber.50" px={2.5} py={1.5} borderRadius="md" border="1px dashed" borderColor="amber.300" mt={1.5}>
                      💡 <b>Aviso:</b> Selecciona un cliente para ver sus almacenes y sucursales registradas, o pulsa <b>+ Registrar Nueva Dirección</b> para ingresar una nueva ubicación de despacho.
                    </Text>
                  ) : isLoadingDeliveryPoints ? (
                    <HStack spacing={1.5} mt={1.5} bg="blue.50" px={2.5} py={1} borderRadius="md">
                      <Spinner size="xs" color="blue.600" />
                      <Text fontSize="11px" color="blue.700" fontWeight="600">
                        Consultando almacenes y sucursales registradas...
                      </Text>
                    </HStack>
                  ) : deliveryOptions.length > 0 ? (
                    <Text fontSize="11px" color="emerald.700" fontWeight="600" mt={1}>
                      🏢 <b>{deliveryOptions.length}</b> {deliveryOptions.length === 1 ? "dirección registrada" : "direcciones registradas"} para este cliente.
                    </Text>
                  ) : (
                    <Text fontSize="11px" color="gray.600" mt={1}>
                      ℹ️ El cliente no tiene sucursales adicionales registradas. Puedes pulsar <b>+ Registrar Nueva Dirección</b> o escribir un destino libre.
                    </Text>
                  )}
                </>
              )}
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
                placeholder="Selecciona o escribe una agencia de transporte..."
                noOptionsMessage={({ inputValue }) =>
                  inputValue ? `Presiona Enter para usar: "${inputValue}" como agencia` : "Escribe el nombre de la agencia..."
                }
                formatCreateLabel={(inputValue) => `Escribir agencia libre: "${inputValue}"`}
                styles={getCustomSelectStyles(isDeliveryLocked)}
                menuPortalTarget={typeof document !== "undefined" ? document.body : null}
                menuPosition="fixed"
              />
              <Text fontSize="11px" color="gray.500" mt={1}>
                🚚 <b>{transportOptions.length}</b> agencias registradas en el sistema o escribe una agencia personalizada.
              </Text>
            </Box>
          )}

          {selectedDeliveryForm && isOwnPickupInStore && (
            <Box bg="emerald.50" border="1.5px solid" borderColor="emerald.200" p={3.5} borderRadius="xl">
              <HStack spacing={2.5} align="flex-start">
                <Text fontSize="16px" mt={0.5}>🚚</Text>
                <Box>
                  <Text fontSize="xs" fontWeight="800" color="emerald.900">
                    Transporte Asignado: AUTOPARTES S.A. (Flota / Reparto Propio)
                  </Text>
                  <Text fontSize="11px" color="emerald.700" mt={0.5}>
                    Código: <b>00053</b> | Despacho directo con flota propia a la dirección / almacén del cliente
                  </Text>
                </Box>
              </HStack>
            </Box>
          )}

          {selectedDeliveryForm && isPickupInStore && (
            <Box bg="blue.50" border="1.5px solid" borderColor="blue.200" p={3.5} borderRadius="xl">
              <HStack spacing={2.5} align="flex-start">
                <Text fontSize="16px" mt={0.5}>🏬</Text>
                <Box>
                  <Text fontSize="xs" fontWeight="800" color="blue.900">
                    Modalidad: Recojo en Tienda / Almacén por el Cliente
                  </Text>
                  <Text fontSize="11px" color="blue.700" mt={0.5}>
                    Punto de Entrega: <b>Almacén Central / Tienda Autopartes S.A.</b>
                  </Text>
                </Box>
              </HStack>
            </Box>
          )}

          <Box>
            <DatePickerField
              label={
                <HStack spacing={1}>
                  <Text as="span" fontSize="xs" fontWeight="800" color="gray.700">
                    Fecha estimada de entrega
                  </Text>
                  <Text as="span" color="red.500" fontWeight="900" fontSize="sm">
                    *
                  </Text>
                  {isDeliveryLocked && <Text as="span">🔒</Text>}
                </HStack>
              }
              selectedDate={deliveryDate}
              setSelectedDate={setDeliveryDate}
              isDisabled={isDeliveryLocked}
              placeholder="Seleccionar fecha obligatoria..."
            />
          </Box>
        </VStack>
      </Box>

      {/* TARJETA 2: 💳 CONDICIÓN DE PAGO Y FACTURACIÓN (SAP B1) */}
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
              2. Condición de Pago y Facturación
            </Text>
          </HStack>
          <HStack spacing={2}>
            {isFinanceLocked ? (
              <Badge colorScheme="green" fontSize="10px" px={2} py={0.5} borderRadius="md">
                🔒 Concluido (Aprobado)
              </Badge>
            ) : (
              <Badge colorScheme="purple" fontSize="10px" px={2} py={0.5} borderRadius="md">
                ✏️ Condición Comercial y Facturación
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
            const isLikelyDni = clientDocDigits.length === 8;
            const effectiveDocType = isLikelyDni ? "BOLETA" : "FACTURA";

            return (
              <VStack align="stretch" spacing={4}>
                <Box>
                  <FormControl>
                    <Flex justify="space-between" align="center" mb={1.5}>
                      <FormLabel fontSize="xs" fontWeight="800" color="gray.700" mb={0}>
                        Tipo de Pago / Condición Comercial {isFinanceLocked && "🔒"}
                      </FormLabel>
                      <HStack spacing={2}>
                        <Badge colorScheme={effectiveDocType === "FACTURA" ? "blue" : "teal"} fontSize="10px" px={2} py={0.5} borderRadius="md" fontWeight="800">
                          {effectiveDocType === "FACTURA" ? "📄 FACTURA (RUC)" : "🧾 BOLETA (DNI)"}
                        </Badge>
                        <Badge colorScheme={isCreditCondition ? "purple" : "green"} fontSize="10px" px={2} py={0.5} borderRadius="md" fontWeight="800">
                          {isCreditCondition ? "CRÉDITO" : "CONTADO"}
                        </Badge>
                      </HStack>
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
                    {paymentTypesOptions.length > 0 && (
                      <Text fontSize="11px" color="gray.500" mt={1}>
                        💰 <b>{paymentTypesOptions.length}</b> condiciones de pago disponibles en el sistema.
                      </Text>
                    )}
                  </FormControl>
                </Box>

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
                          ℹ️ La venta se registrará con condición "{selectedPaymentType?.PymntGroup || selectedPaymentType?.label || 'Crédito'}", comprobante <b>{effectiveDocType}</b> {isLetra ? "y Letra de Cambio mercantil." : "sin letra."}
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
                          ℹ️ La venta se registrará con condición "{selectedPaymentType?.PymntGroup || selectedPaymentType?.label || 'Contado / Entrega'}" y comprobante <b>{effectiveDocType}</b> (sin días de financiamiento).
                        </Text>
                      </VStack>
                    </HStack>
                  </Box>
                )}
              </VStack>
            );
          })()}
      {/* Modal para Registrar o Editar Nueva Dirección de Entrega */}
      <Modal
        isOpen={isAddressModalOpen}
        onClose={onCloseAddressModal}
        size={{ base: "full", sm: "md" }}
        isCentered
        scrollBehavior="inside"
      >
        <ModalOverlay bg="blackAlpha.700" backdropFilter="blur(2px)" />
        <ModalContent
          borderRadius={{ base: "none", sm: "2xl" }}
          overflow="hidden"
          boxShadow="0 25px 50px -12px rgba(0, 0, 0, 0.35)"
          m={{ base: 0, sm: 3 }}
          maxW={{ base: "100vw", sm: "480px" }}
          maxH={{ base: "100vh", sm: "88vh" }}
        >
          <ModalHeader
            bg="linear-gradient(135deg, #0e572b 0%, #064e3b 100%)"
            color="white"
            py={{ base: 4, sm: 3.5 }}
            px={{ base: 4, sm: 5 }}
          >
            <HStack spacing={2.5} pr={8}>
              <Flex
                w={{ base: "36px", sm: "32px" }}
                h={{ base: "36px", sm: "32px" }}
                borderRadius="lg"
                bg="whiteAlpha.200"
                align="center"
                justify="center"
                flexShrink={0}
              >
                <MapPin className="w-5 h-5 text-white" />
              </Flex>
              <Box minW={0}>
                <Text fontSize={{ base: "md", sm: "sm" }} fontWeight="900" lineHeight="1.2">
                  Nueva Dirección de Entrega
                </Text>
                <Text fontSize="11px" color="#a7f3d0" fontWeight="600" mt={0.5}>
                  Destino para la Guía de Remisión (Despacho)
                </Text>
              </Box>
            </HStack>
          </ModalHeader>
          <ModalCloseButton
            color="white"
            top={{ base: 3, sm: 2.5 }}
            right={{ base: 3, sm: 3 }}
            size="md"
            _hover={{ bg: "whiteAlpha.200" }}
          />

          <ModalBody p={{ base: 4, sm: 5 }} bg="#f8fafc" overflowY="auto">
            <VStack spacing={{ base: 3.5, sm: 4 }} align="stretch">
              <Box bg="#f0fdf4" p={3} borderRadius="lg" border="1px solid #bbf7d0">
                <Text fontSize={{ base: "12px", sm: "xs" }} color="#166534" fontWeight="600" lineHeight="1.4">
                  📦 Esta dirección se registrará en la <b>Logística del documento</b> y saldrá impresa en la <b>Guía de Remisión (Guía de Salida)</b>.
                </Text>
              </Box>

              {addressError && (
                <Box p={3} bg="#fef2f2" border="1px solid #fecaca" borderRadius="lg">
                  <Text fontSize="xs" color="#991b1b" fontWeight="700">
                    ⚠️ {addressError}
                  </Text>
                </Box>
              )}

              <FormControl isRequired>
                <FormLabel fontSize={{ base: "13px", sm: "xs" }} fontWeight="800" color="gray.700" mb={1}>
                  Dirección exacta (Calle, Jr, Av, Nro, Mz, Lote)
                </FormLabel>
                <Input
                  bg="white"
                  borderColor="#cbd5e1"
                  _focus={{ borderColor: "#0d6334", boxShadow: "0 0 0 1px #0d6334" }}
                  h={{ base: "44px", sm: "38px" }}
                  fontSize={{ base: "15px", sm: "sm" }}
                  borderRadius="lg"
                  placeholder="Ej: Av. Alfredo Mendiola 4520, Mz B Lote 5"
                  value={customAddrForm.street}
                  onChange={(e) => {
                    setCustomAddrForm({ ...customAddrForm, street: e.target.value });
                    if (addressError) setAddressError("");
                  }}
                />
              </FormControl>

              <Grid templateColumns={{ base: "1fr", sm: "repeat(2, 1fr)" }} gap={3}>
                <FormControl>
                  <FormLabel fontSize={{ base: "13px", sm: "xs" }} fontWeight="800" color="gray.700" mb={1}>
                    Departamento
                  </FormLabel>
                  <ChakraSelect
                    bg="white"
                    borderColor="#cbd5e1"
                    _focus={{ borderColor: "#0d6334", boxShadow: "0 0 0 1px #0d6334" }}
                    h={{ base: "44px", sm: "38px" }}
                    fontSize={{ base: "14px", sm: "sm" }}
                    borderRadius="lg"
                    value={customAddrForm.department}
                    onChange={(e) => setCustomAddrForm({ ...customAddrForm, department: e.target.value })}
                  >
                    {PERU_DEPARTMENTS.map((d) => (
                      <option key={d.code} value={d.code}>
                        {d.name}
                      </option>
                    ))}
                  </ChakraSelect>
                </FormControl>

                <FormControl>
                  <FormLabel fontSize={{ base: "13px", sm: "xs" }} fontWeight="800" color="gray.700" mb={1}>
                    Provincia
                  </FormLabel>
                  <Input
                    bg="white"
                    borderColor="#cbd5e1"
                    _focus={{ borderColor: "#0d6334", boxShadow: "0 0 0 1px #0d6334" }}
                    h={{ base: "44px", sm: "38px" }}
                    fontSize={{ base: "14px", sm: "sm" }}
                    borderRadius="lg"
                    placeholder="Ej: LIMA"
                    value={customAddrForm.city}
                    onChange={(e) => setCustomAddrForm({ ...customAddrForm, city: e.target.value.toUpperCase() })}
                  />
                </FormControl>
              </Grid>

              <Grid templateColumns={{ base: "1fr", sm: "repeat(2, 1fr)" }} gap={3}>
                <FormControl>
                  <FormLabel fontSize={{ base: "13px", sm: "xs" }} fontWeight="800" color="gray.700" mb={1}>
                    Distrito
                  </FormLabel>
                  <Input
                    bg="white"
                    borderColor="#cbd5e1"
                    _focus={{ borderColor: "#0d6334", boxShadow: "0 0 0 1px #0d6334" }}
                    h={{ base: "44px", sm: "38px" }}
                    fontSize={{ base: "14px", sm: "sm" }}
                    borderRadius="lg"
                    placeholder="Ej: LOS OLIVOS"
                    value={customAddrForm.county}
                    onChange={(e) => setCustomAddrForm({ ...customAddrForm, county: e.target.value.toUpperCase() })}
                  />
                </FormControl>

                <FormControl>
                  <FormLabel fontSize={{ base: "13px", sm: "xs" }} fontWeight="800" color="gray.700" mb={1}>
                    Alias / Nombre Destino
                  </FormLabel>
                  <Input
                    bg="white"
                    borderColor="#cbd5e1"
                    _focus={{ borderColor: "#0d6334", boxShadow: "0 0 0 1px #0d6334" }}
                    h={{ base: "44px", sm: "38px" }}
                    fontSize={{ base: "14px", sm: "sm" }}
                    borderRadius="lg"
                    placeholder="Ej: TALLER NORTE"
                    value={customAddrForm.addressName}
                    onChange={(e) => setCustomAddrForm({ ...customAddrForm, addressName: e.target.value.toUpperCase() })}
                  />
                </FormControl>
              </Grid>

              <FormControl>
                <FormLabel fontSize={{ base: "13px", sm: "xs" }} fontWeight="800" color="gray.700" mb={1}>
                  Referencia de entrega (opcional)
                </FormLabel>
                <Input
                  bg="white"
                  borderColor="#cbd5e1"
                  _focus={{ borderColor: "#0d6334", boxShadow: "0 0 0 1px #0d6334" }}
                  h={{ base: "44px", sm: "38px" }}
                  fontSize={{ base: "14px", sm: "sm" }}
                  borderRadius="lg"
                  placeholder="Ej: Frente al grifo Repsol, portón blanco"
                  value={customAddrForm.reference}
                  onChange={(e) => setCustomAddrForm({ ...customAddrForm, reference: e.target.value })}
                />
              </FormControl>

              <Box p={3} bg="white" borderRadius="lg" border="1px dashed #cbd5e1">
                <Checkbox
                  size="md"
                  colorScheme="green"
                  isChecked={customAddrForm.saveToClient}
                  onChange={(e) => setCustomAddrForm({ ...customAddrForm, saveToClient: e.target.checked })}
                >
                  <Text fontSize={{ base: "13px", sm: "xs" }} fontWeight="700" color="gray.800">
                    Guardar permanentemente en la ficha del cliente
                  </Text>
                </Checkbox>
                <Text fontSize="11px" color="gray.500" mt={1} ml={{ base: 6, sm: 6 }}>
                  Si lo marcas, esta sucursal quedará disponible para futuras cotizaciones de este cliente.
                </Text>
              </Box>
            </VStack>
          </ModalBody>

          <ModalFooter bg="white" borderTop="1px solid #e2e8f0" p={{ base: 3.5, sm: 4 }}>
            <Flex w="full" direction={{ base: "column-reverse", sm: "row" }} justify="flex-end" gap={2}>
              <Button
                w={{ base: "full", sm: "auto" }}
                h={{ base: "44px", sm: "38px" }}
                fontSize={{ base: "sm", sm: "xs" }}
                fontWeight="700"
                variant="ghost"
                onClick={onCloseAddressModal}
              >
                Cancelar
              </Button>
              <Button
                w={{ base: "full", sm: "auto" }}
                h={{ base: "44px", sm: "38px" }}
                fontSize={{ base: "sm", sm: "xs" }}
                fontWeight="800"
                bg="#0d6334"
                _hover={{ bg: "#064e3b" }}
                _active={{ bg: "#043327" }}
                color="white"
                boxShadow="0 2px 4px rgba(13, 99, 52, 0.25)"
                onClick={handleSaveCustomAddress}
              >
                Usar esta dirección
              </Button>
            </Flex>
          </ModalFooter>
        </ModalContent>
      </Modal>

      </Box>
    </VStack>
  );
}