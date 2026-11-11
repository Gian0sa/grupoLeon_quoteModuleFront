import React, { useState, useEffect, useMemo } from "react";
import {
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalCloseButton,
  ModalBody,
  ModalFooter,
  Button,
  FormControl,
  FormLabel,
  Input,
  Select,
  VStack,
  HStack,
  Grid,
  Text,
  Badge,
  Alert,
  AlertIcon,
  AlertTitle,
  AlertDescription,
  Spinner,
  Box,
  Flex,
  useToast,
  Switch,
  Textarea,
  Code,
  Divider,
  IconButton,
  Tooltip,
} from "@chakra-ui/react";
import {
  FiUserPlus,
  FiCheckCircle,
  FiAlertTriangle,
  FiSave,
  FiX,
  FiArrowRight,
  FiMapPin,
  FiPhone,
  FiCode,
  FiFileText,
  FiSearch,
  FiRotateCcw,
} from "react-icons/fi";
import { createClient, checkClientExists, fetchSapStates, consultSunatRuc, consultSunatDni } from "../services/clientService";
import { getPaymentType } from "../../quotes/services/quoteService";
import { useDebounce } from "../../../shared/hooks/useDebounce";
import {
  SAP_PERU_DEPARTMENTS,
  PERU_DEPARTMENTS,
  getDepartmentByCode,
  getDepartmentByName,
  getProvincesByDepartment,
  UBIGEO_DISTRICTS,
  getUbigeoByDistrict,
  parseSunatPersonName,
} from "../../../shared/utils/ubigeoData";
import { useAuthStore } from "../../auth/stores/useAuthStore";
import { useSellersData } from "../../auth/hooks/queries/authQueries";
import { useIsAdmin } from "../../../shared/utils/permissions";

export default function CreateBusinessPartnerModal({
  isOpen,
  onClose,
  onSuccess,
  salesPersonCode = -1,
  defaultDocument = "",
}) {
  const toast = useToast();

  // 1. Identificación
  const [personType, setPersonType] = useState("JURIDICO"); // JURIDICO / NATURAL
  const [documentType, setDocumentType] = useState("6"); // 6 - RUC, 1 - DNI, 4 - CE, 7 - PAS, A - DIP, 0 - OTROS
  const [documentNumber, setDocumentNumber] = useState(defaultDocument || "");
  const [isAutoFilled, setIsAutoFilled] = useState(false);
  const [cardName, setCardName] = useState("");
  const [commercialName, setCommercialName] = useState("");
  const [cardForeignName, setCardForeignName] = useState("");
  const [currency, setCurrency] = useState("##");
  const [validStatus, setValidStatus] = useState("tYES");
  const [typeSN, setTypeSN] = useState(""); // 01 - B2C, 02 - IMPORTADOR, 03 - CONCESIONARIO, 04 - TALLER, 05 - LUBRICENTRO, 06 - TIENDA

  // Campos para persona natural
  const [paternalSurname, setPaternalSurname] = useState("");
  const [maternalSurname, setMaternalSurname] = useState("");
  const [firstName, setFirstName] = useState("");
  const [secondName, setSecondName] = useState("");

  // Panel Lateral SAP B1 (Campos UDFs SUNAT)
  const [avalDoc, setAvalDoc] = useState("");
  const [avalPhone, setAvalPhone] = useState("");
  const [avalLoc, setAvalLoc] = useState("");
  const [isCarrier, setIsCarrier] = useState("No");
  const [isc, setIsc] = useState("No");
  const [hasBusiness, setHasBusiness] = useState("No");
  const [excludeCode, setExcludeCode] = useState("No");
  const [agentType, setAgentType] = useState("Ninguno");
  const [isEmployee, setIsEmployee] = useState("No");
  const [supplierWithDni, setSupplierWithDni] = useState("No");
  const [validateIdc, setValidateIdc] = useState("No");
  const [contribState, setContribState] = useState("ACTIVO");
  const [contribCondition, setContribCondition] = useState("HABIDO");
  const [isRetentionAgent, setIsRetentionAgent] = useState("No");
  const [isPerceptionAgent, setIsPerceptionAgent] = useState("No");
  const [isGoodTaxpayer, setIsGoodTaxpayer] = useState("No");

  // Cuentas Contables Oficiales SAP B1 (Automáticas y Editables)
  const [debitorAccount, setDebitorAccount] = useState("1212101");
  const [downPaymentClearAct, setDownPaymentClearAct] = useState("1221101");
  const [vatLiable, setVatLiable] = useState("vLiable");

  // 2. Direcciones
  const [address, setAddress] = useState("");
  const [departmentCode, setDepartmentCode] = useState("");
  const [department, setDepartment] = useState("");
  const [province, setProvince] = useState("");

  const [district, setDistrict] = useState("");
  const [zipCode, setZipCode] = useState("");
  const [sameDeliveryAddress, setSameDeliveryAddress] = useState(true);
  const [deliveryAddressName, setDeliveryAddressName] = useState("ALMACEN");
  const [deliveryAddress, setDeliveryAddress] = useState("");

  // 3. Contacto & Comunicación
  const [phone, setPhone] = useState("");
  const [phone2, setPhone2] = useState("");
  const [cellular, setCellular] = useState("");
  const [email, setEmail] = useState("");
  const [secondaryEmail, setSecondaryEmail] = useState("");
  const [additionalId, setAdditionalId] = useState("");
  const [website, setWebsite] = useState("");
  const [contactPerson, setContactPerson] = useState("");
  const [contactPosition, setContactPosition] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [notes, setNotes] = useState("");

  // Sesión y Catálogos SAP
  const isAdmin = useIsAdmin();
  const { salesEmployeeCode: authSalesCode, username: authUsername } = useAuthStore();
  const { data: sellersResponse } = useSellersData();

  const sellersList = useMemo(() => {
    const list = Array.isArray(sellersResponse) ? sellersResponse : (sellersResponse?.sellers || []);
    const parsed = list
      .filter((s) => {
        const code = Number(s.SalesEmployeeCode ?? s.value ?? -1);
        const active = String(s.Active ?? "tYES").toUpperCase();
        return code > 0 && (active === "TYES" || active === "Y" || active === "TRUE");
      })
      .map((s) => ({
        value: Number(s.SalesEmployeeCode ?? s.value),
        label: s.SalesEmployeeName ?? s.label,
        email: s.Email ?? s.email,
      }));

    if (parsed.length > 0) {
      try {
        localStorage.setItem("cached_sap_sellers", JSON.stringify(parsed));
      } catch {}
      return parsed;
    }

    try {
      const saved = localStorage.getItem("cached_sap_sellers");
      if (saved) return JSON.parse(saved);
    } catch {}

    return [];
  }, [sellersResponse]);

  // Vendedor logueado que crea el registro
  const resolvedLoggedSellerCode = useMemo(() => {
    const propCode = Number(salesPersonCode);
    if (!isNaN(propCode) && propCode > 0) return propCode;

    const storeCode = Number(authSalesCode ?? localStorage.getItem("salesEmployeeCode"));
    if (!isNaN(storeCode) && storeCode > 0) return storeCode;

    const currentUsername = String(authUsername || localStorage.getItem("username") || "").trim().toLowerCase();
    if (currentUsername && sellersList.length > 0) {
      const found = sellersList.find((s) => {
        const sLabel = String(s.label || "").toLowerCase();
        const sEmail = String(s.email || "").toLowerCase();
        return (
          sLabel.includes(currentUsername) ||
          (currentUsername.length >= 3 && sLabel.includes(currentUsername.slice(0, 4))) ||
          (sEmail && sEmail.includes(currentUsername))
        );
      });
      if (found) return Number(found.value);
    }

    return -1;
  }, [salesPersonCode, authSalesCode, authUsername, sellersList]);

  // 4. Condiciones Comerciales
  const [payTermsGrpCode, setPayTermsGrpCode] = useState("-1");
  const [priceListNum, setPriceListNum] = useState("1");
  const [creditLimit, setCreditLimit] = useState("0");
  const [assignedSellerCode, setAssignedSellerCode] = useState(
    resolvedLoggedSellerCode > 0 ? resolvedLoggedSellerCode : (salesPersonCode || -1)
  );

  const [paymentTermsList, setPaymentTermsList] = useState([]);
  const [sapDepartments, setSapDepartments] = useState(SAP_PERU_DEPARTMENTS);

  // Estados de control
  const [isCheckingExists, setIsCheckingExists] = useState(false);
  const [existingClient, setExistingClient] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [isConsultingSunat, setIsConsultingSunat] = useState(false);

  const debouncedDoc = useDebounce(documentNumber, 600);

  // Cargar condiciones de pago, departamentos y sincronizar vendedor logueado
  useEffect(() => {
    if (isOpen) {
      if (resolvedLoggedSellerCode > 0) {
        setAssignedSellerCode(resolvedLoggedSellerCode);
      }

      getPaymentType().then((terms) => {
        if (Array.isArray(terms) && terms.length > 0) {
          setPaymentTermsList(terms);
        }
      });

      fetchSapStates().then((states) => {
        if (Array.isArray(states) && states.length > 0) {
          setSapDepartments(states);
        }
      });

      if (defaultDocument) {
        setDocumentNumber(defaultDocument);
        if (defaultDocument.length === 8) {
          setPersonType("NATURAL");
          setDocumentType("1");
        } else if (defaultDocument.length === 11) {
          setPersonType("JURIDICO");
          setDocumentType("6");
        }
      } else {
        setIsAutoFilled(false);
        setDocumentNumber("");
        setCardName("");
        setCommercialName("");
        setCardForeignName("");
        setFirstName("");
        setSecondName("");
        setPaternalSurname("");
        setMaternalSurname("");
        setAddress("");
        setDepartmentCode("");
        setDepartment("");
        setProvince("");
        setDistrict("");
        setZipCode("");
        setTypeSN("");
      }
      setErrorMessage("");
    }
  }, [isOpen, defaultDocument, resolvedLoggedSellerCode]);


  // Sincronizar nombre concatenado si es persona natural
  const computedNaturalName = useMemo(() => {
    return [paternalSurname, maternalSurname, firstName, secondName]
      .filter(Boolean)
      .map((s) => s.trim().toUpperCase())
      .join(" ");
  }, [paternalSurname, maternalSurname, firstName, secondName]);

  const effectiveCardName = personType === "NATURAL" ? computedNaturalName : cardName;

  // 🛡️ CANDADO ANTI-DUPLICIDAD
  useEffect(() => {
    const clean = String(debouncedDoc || "").trim().replace(/\D/g, "");
    const isDni = documentType === "1" || documentType === "DNI";
    const isRuc = documentType === "6" || documentType === "RUC";
    const minLength = isDni ? 8 : (isRuc ? 11 : 4);

    if (!clean || clean.length < minLength) {
      setExistingClient(null);
      setIsCheckingExists(false);
      return;
    }

    let isMounted = true;
    setIsCheckingExists(true);
    setErrorMessage("");

    checkClientExists(clean)
      .then((res) => {
        if (!isMounted) return;
        if (res?.exists && res.client) {
          setExistingClient(res.client);
        } else {
          setExistingClient(null);
        }
      })
      .catch((err) => {
        console.warn("Aviso en verificación de duplicidad:", err.message);
        if (isMounted) setExistingClient(null);
      })
      .finally(() => {
        if (isMounted) setIsCheckingExists(false);
      });

    return () => {
      isMounted = false;
    };
  }, [debouncedDoc, documentType]);

  const handlePersonTypeChange = (newPersonType) => {
    setPersonType(newPersonType);
    if (newPersonType === "NATURAL") {
      setDocumentType("1");
    } else {
      setDocumentType("6");
    }
    setExistingClient(null);
  };

  const handleClearForm = () => {
    setIsAutoFilled(false);
    setDocumentNumber("");
    setCardName("");
    setCommercialName("");
    setCardForeignName("");
    setFirstName("");
    setSecondName("");
    setPaternalSurname("");
    setMaternalSurname("");
    setAddress("");
    setDepartmentCode("");
    setDepartment("");
    setProvince("");
    setDistrict("");
    setZipCode("");
    setTypeSN("");
    setContribState("ACTIVO");
    setContribCondition("HABIDO");
    setPhone("");
    setPhone2("");
    setCellular("");
    setEmail("");
    setSecondaryEmail("");
    setContactPerson("");
    setContactPosition("");
    setContactPhone("");
    setContactEmail("");
    setNotes("");
    toast({
      title: "Campos limpios",
      description: "Se restableció el formulario para un nuevo ingreso.",
      status: "info",
      duration: 2000,
      isClosable: true,
    });
  };

  const handleConsultSunat = async () => {
    const cleanDoc = String(documentNumber || "").trim().replace(/\D/g, "");
    const isRuc = documentType === "6" || documentType === "RUC" || cleanDoc.length === 11;
    const isDni = documentType === "1" || documentType === "DNI" || cleanDoc.length === 8;

    if (!cleanDoc) {
      toast({
        title: "Número de documento vacío",
        description: "Ingresa un número de RUC (11 dígitos) o DNI (8 dígitos) para consultar.",
        status: "warning",
        duration: 3000,
        isClosable: true,
      });
      return;
    }

    if (isRuc && cleanDoc.length !== 11) {
      toast({
        title: "RUC incompleto",
        description: "El RUC debe tener exactamente 11 dígitos.",
        status: "warning",
        duration: 3000,
        isClosable: true,
      });
      return;
    }

    if (isDni && cleanDoc.length !== 8) {
      toast({
        title: "DNI incompleto",
        description: "El DNI debe tener exactamente 8 dígitos.",
        status: "warning",
        duration: 3000,
        isClosable: true,
      });
      return;
    }

    // Auto-limpieza de información anterior al iniciar una nueva búsqueda
    setIsAutoFilled(false);
    setCardName("");
    setCommercialName("");
    setFirstName("");
    setSecondName("");
    setPaternalSurname("");
    setMaternalSurname("");
    setAddress("");
    setDepartmentCode("");
    setDepartment("");
    setProvince("");
    setDistrict("");
    setZipCode("");
    setContribState("ACTIVO");
    setContribCondition("HABIDO");

    setIsConsultingSunat(true);

    try {
      if (isRuc) {
        const isRuc10 = cleanDoc.startsWith("10");
        if (cleanDoc.startsWith("20")) {
          setPersonType("JURIDICO");
        } else if (isRuc10) {
          setPersonType("NATURAL");
        }
        const data = await consultSunatRuc(cleanDoc);
        if (data?.success) {
          setIsAutoFilled(true);
          if (data.razonSocial) {
            const rzUpper = data.razonSocial.toUpperCase();
            setCardName(rzUpper);
            setCommercialName(rzUpper);
          }

          // 👤 Si es RUC 10 (Persona Natural con RUC), desglosar y rellenar nombres y apellidos en los campos individuales
          if (isRuc10 || cleanDoc.startsWith("10") || data.isPersonaNatural) {
            setPersonType("NATURAL");
            const fullName = data.nombreCompleto || data.razonSocial || "";
            let pPaterno = data.apellidoPaterno || "";
            let pMaterno = data.apellidoMaterno || "";
            let pNombres = data.nombres || "";

            if (!pPaterno && !pNombres && fullName) {
              const parsed = parseSunatPersonName(fullName);
              pPaterno = parsed.apellidoPaterno;
              pMaterno = parsed.apellidoMaterno;
              pNombres = parsed.nombres;
            }

            if (pPaterno) setPaternalSurname(pPaterno.toUpperCase());
            if (pMaterno) setMaternalSurname(pMaterno.toUpperCase());
            if (pNombres) {
              const nParts = pNombres.trim().split(/\s+/);
              setFirstName(nParts[0].toUpperCase());
              setSecondName(nParts.slice(1).join(" ").toUpperCase());
            }
          }

          if (data.direccion && data.direccion !== "-") setAddress(data.direccion.toUpperCase());
          if (data.estado) setContribState(data.estado.toUpperCase());
          if (data.condicion) setContribCondition(data.condicion.toUpperCase());

          if (data.departamento) {
            const depUpper = data.departamento.toUpperCase();
            const found = (sapDepartments || SAP_PERU_DEPARTMENTS).find(
              (d) => d.name.toUpperCase() === depUpper || depUpper.includes(d.name.toUpperCase())
            );
            if (found) {
              setDepartmentCode(found.code);
              setDepartment(found.name);
            }
          }
          if (data.provincia) setProvince(data.provincia.toUpperCase());
          if (data.distrito) {
            setDistrict(data.distrito.toUpperCase());
            const matchUbi = getUbigeoByDistrict(data.distrito.toUpperCase());
            if (matchUbi?.ubigeo) setZipCode(matchUbi.ubigeo);
          }
          if (data.ubigeo) setZipCode(data.ubigeo);

          toast({
            title: "Datos de SUNAT obtenidos",
            description: `${data.razonSocial} (${data.estado || "ACTIVO"} - ${data.condicion || "HABIDO"})`,
            status: "success",
            duration: 4000,
            isClosable: true,
          });
        } else {
          toast({
            title: "No se encontraron datos",
            description: data?.message || "No se pudo recuperar información automática de SUNAT.",
            status: "info",
            duration: 3500,
            isClosable: true,
          });
        }
      } else if (isDni) {
        setPersonType("NATURAL");
        const data = await consultSunatDni(cleanDoc);
        if (data?.success) {
          setIsAutoFilled(true);
          if (data.apellidoPaterno) setPaternalSurname(data.apellidoPaterno.toUpperCase());
          if (data.apellidoMaterno) setMaternalSurname(data.apellidoMaterno.toUpperCase());
          if (data.nombres) {
            const parts = data.nombres.trim().split(/\s+/);
            setFirstName(parts[0].toUpperCase());
            setSecondName(parts.slice(1).join(" ").toUpperCase());
          }
          if (data.nombreCompleto) {
            const fullUpper = data.nombreCompleto.toUpperCase();
            setCardName(fullUpper);
            setCommercialName(fullUpper);
          }

          if (data.direccion && data.direccion !== "-") setAddress(data.direccion.toUpperCase());
          if (data.departamento) {
            const depUpper = data.departamento.toUpperCase();
            const found = (sapDepartments || SAP_PERU_DEPARTMENTS).find(
              (d) => d.name.toUpperCase() === depUpper || depUpper.includes(d.name.toUpperCase())
            );
            if (found) {
              setDepartmentCode(found.code);
              setDepartment(found.name);
            }
          }
          if (data.provincia) setProvince(data.provincia.toUpperCase());
          if (data.distrito) {
            setDistrict(data.distrito.toUpperCase());
            const matchUbi = getUbigeoByDistrict(data.distrito.toUpperCase());
            if (matchUbi?.ubigeo) setZipCode(matchUbi.ubigeo);
          }
          if (data.ubigeo && data.ubigeo !== "-") setZipCode(data.ubigeo);

          toast({
            title: "Datos de RENIEC/SUNAT obtenidos",
            description: `${data.nombreCompleto}${data.distrito ? ` - ${data.distrito}` : ""}`,
            status: "success",
            duration: 4000,
            isClosable: true,
          });
        } else {
          toast({
            title: "Consulta RENIEC",
            description: data?.message || "No se pudo autocompletar desde RENIEC. Puedes ingresar los nombres y apellidos manualmente abajo.",
            status: "info",
            duration: 4500,
            isClosable: true,
          });
        }
      }
    } catch (err) {
      console.warn("Error consultando documento:", err.message);
      toast({
        title: "Consulta no disponible",
        description: "El servicio de consulta pública no respondió. Puedes ingresar los datos manualmente.",
        status: "info",
        duration: 3500,
        isClosable: true,
      });
    } finally {
      setIsConsultingSunat(false);
    }
  };

  const handleDistrictChange = (value) => {
    const upper = value.toUpperCase();
    setDistrict(upper);
    const match = getUbigeoByDistrict(upper);
    if (match) {
      setZipCode(match.ubigeo);
      if (match.departmentCode) setDepartmentCode(match.departmentCode);
      if (match.department) setDepartment(match.department);
      if (match.province) setProvince(match.province);
    }
  };

  const handleZipCodeChange = (value) => {
    setZipCode(value);
    const clean = String(value || "").trim();
    if (clean.length >= 2) {
      const prefix = clean.slice(0, 2);
      const dept = getDepartmentByCode(prefix);
      if (dept && dept.code !== departmentCode) {
        setDepartmentCode(dept.code);
        setDepartment(dept.name);
        const provs = getProvincesByDepartment(dept.code);
        if (provs && provs.length > 0 && (!province || !provs.includes(province))) {
          setProvince(provs[0]);
        }
      }
    }
  };

  const availableProvinces = useMemo(() => {
    return getProvincesByDepartment(departmentCode || department);
  }, [departmentCode, department]);

  const handleDepartmentChange = (selectedCode) => {
    if (!selectedCode) {
      setDepartmentCode("");
      setDepartment("");
      setProvince("");
      return;
    }
    const dept = (sapDepartments && sapDepartments.find((d) => d.code === selectedCode)) || SAP_PERU_DEPARTMENTS.find((d) => d.code === selectedCode) || getDepartmentByCode(selectedCode);
    const deptName = dept ? dept.name : "";
    const deptCode = dept ? dept.code : selectedCode;
    setDepartmentCode(deptCode);
    setDepartment(deptName);
    const provs = getProvincesByDepartment(deptCode);
    if (provs && provs.length > 0) {
      setProvince(provs[0]);
    } else {
      setProvince("");
    }
  };


  const handleSelectExisting = () => {
    if (!existingClient) return;
    toast({
      title: "Cliente ya registrado",
      description: `Seleccionando a ${existingClient.CardName} (${existingClient.CardCode})`,
      status: "info",
      duration: 3500,
      isClosable: true,
      position: "top-right",
    });
    if (onSuccess) {
      onSuccess(existingClient);
    }
    handleClose();
  };



  const handleSubmit = async (e) => {
    e?.preventDefault();
    setErrorMessage("");

    const cleanDoc = String(documentNumber || "").trim().replace(/\D/g, "");
    if (!cleanDoc) {
      setErrorMessage("Por favor ingresa el número de documento.");
      return;
    }

    const isDocRuc = documentType === "6" || documentType === "RUC";
    const isDocDni = documentType === "1" || documentType === "DNI";

    if (isDocRuc) {
      if (cleanDoc.length !== 11) {
        setErrorMessage("El RUC debe tener exactamente 11 dígitos numéricos.");
        return;
      }
      // Algoritmo oficial SUNAT Módulo 11 para dígito verificador
      const weights = [5, 4, 3, 2, 7, 6, 5, 4, 3, 2];
      let sum = 0;
      for (let i = 0; i < 10; i++) {
        sum += parseInt(cleanDoc[i], 10) * weights[i];
      }
      const mod = sum % 11;
      const diff = 11 - mod;
      const expectedDigit = diff === 10 ? 0 : diff === 11 ? 1 : diff;
      if (parseInt(cleanDoc[10], 10) !== expectedDigit) {
        setErrorMessage(`El RUC ${cleanDoc} es incorrecto según SUNAT (el dígito verificador debería ser ${expectedDigit}, ej: ${cleanDoc.slice(0, 10)}${expectedDigit}).`);
        return;
      }
    }

    if (isDocDni && cleanDoc.length !== 8) {
      setErrorMessage("El DNI debe tener exactamente 8 dígitos numéricos.");
      return;
    }

    if (!effectiveCardName || !effectiveCardName.trim()) {
      setErrorMessage(personType === "JURIDICO" ? "La Razón Social es obligatoria." : "Los Nombres y Apellidos son obligatorios.");
      return;
    }

    if (!address.trim()) {
      setErrorMessage("La Dirección Fiscal es obligatoria.");
      return;
    }

    if (!typeSN) {
      setErrorMessage("Por favor selecciona el Tipo SN (Segmento).");
      return;
    }

    if (!cellular.trim() && !phone.trim()) {
      setErrorMessage("SAP requiere registrar al menos un número de contacto (Teléfono Móvil o Fijo).");
      return;
    }

    if (!email.trim()) {
      setErrorMessage("SAP requiere registrar un Correo Electrónico para el socio de negocio.");
      return;
    }

    if (existingClient) {
      setErrorMessage(`El documento ${cleanDoc} ya existe en SAP como ${existingClient.CardCode}.`);
      return;
    }

    setIsSubmitting(true);

    try {
      const payload = {
        personType,
        documentType,
        documentNumber: cleanDoc,
        cardName: effectiveCardName.trim().toUpperCase(),
        commercialName: (commercialName || effectiveCardName).trim().toUpperCase().slice(0, 50),
        cardForeignName: "",
        currency: "##",
        valid: "tYES",
        channel: "C",
        typeSN: typeSN || "01",
        debitorAccount: debitorAccount.trim() || "1212101",
        downPaymentClearAct: downPaymentClearAct.trim() || "1221101",
        vatLiable: vatLiable || "vLiable",
        isCarrier: "N",
        isc: "N",
        hasBusiness: "Y",
        excludeCode: "N",
        agentType: "C",
        isEmployee: "N",
        supplierWithDni: "N",
        validateIdc: "N",
        contribState: "ACTIVO",
        contribCondition: "HABIDO",
        isRetentionAgent: "N",
        isPerceptionAgent: "N",
        isGoodTaxpayer: "N",
        paternalSurname: paternalSurname.trim().toUpperCase(),
        maternalSurname: maternalSurname.trim().toUpperCase(),
        firstName: firstName.trim().toUpperCase(),
        secondName: secondName.trim().toUpperCase(),
        address: address.trim().toUpperCase(),
        deliveryAddress: (sameDeliveryAddress ? address : deliveryAddress || address).trim().toUpperCase(),
        deliveryAddressName: deliveryAddressName || "ALMACEN",
        departmentCode: departmentCode || "15",
        department: department.trim().toUpperCase() || "LIMA",
        province: province.trim().toUpperCase() || "LIMA",
        district: district.trim().toUpperCase() || "LIMA",
        zipCode: zipCode.trim() || (district ? (getUbigeoByDistrict(district)?.ubigeo || "150140") : "150140"),
        phone: phone.trim(),
        phone2: phone2.trim(),
        cellular: cellular.trim() || phone.trim(),
        email: email.trim().toLowerCase(),
        secondaryEmail: secondaryEmail.trim().toLowerCase(),
        additionalId: additionalId.trim(),
        website: website.trim(),
        contactPerson: contactPerson.trim().toUpperCase(),
        contactPosition: contactPosition.trim().toUpperCase(),
        contactPhone: contactPhone.trim(),
        contactEmail: contactEmail.trim().toLowerCase(),
        notes: notes.trim(),
        payTermsGrpCode: Number(payTermsGrpCode || -1),
        priceListNum: Number(priceListNum || 1),
        creditLimit: Number(creditLimit || 0),
        salesPersonCode: assignedSellerCode && !isNaN(Number(assignedSellerCode)) && Number(assignedSellerCode) > 0
          ? Number(assignedSellerCode)
          : (resolvedLoggedSellerCode > 0 ? resolvedLoggedSellerCode : -1),
      };

      const result = await createClient(payload);

      toast({
        title: "¡Socio de Negocio Registrado!",
        description: `Creado exitosamente en SAP B1 con código ${result?.client?.CardCode || `CL${cleanDoc}`}`,
        status: "success",
        duration: 5000,
        isClosable: true,
        position: "top-right",
      });

      if (onSuccess) {
        onSuccess(result?.client || {
          CardCode: `CL${cleanDoc}`,
          CardName: effectiveCardName.trim().toUpperCase(),
          FederalTaxID: cleanDoc,
          Address: address.trim().toUpperCase(),
          Phone1: phone.trim(),
          EmailAddress: email.trim().toLowerCase(),
        });
      }

      handleClose();
    } catch (err) {
      const respData = err.response?.data;
      if (respData?.alreadyExists || err.response?.status === 409) {
        const exist = respData?.existingClient;
        if (exist) setExistingClient(exist);
        setErrorMessage(respData?.message || `El documento ${cleanDoc} ya existe en SAP Business One.`);
      } else {
        setErrorMessage(respData?.message || err.message || "Error al registrar el socio de negocio en SAP.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setDocumentNumber("");
    setCardName("");
    setCommercialName("");
    setCardForeignName("");
    setPhone2("");
    setAdditionalId("");
    setCurrency("##");
    setValidStatus("tYES");
    setPaternalSurname("");
    setMaternalSurname("");
    setFirstName("");
    setSecondName("");
    setIsAutoFilled(false);
    setAddress("");
    setDeliveryAddress("");
    setDepartmentCode("");
    setDepartment("");
    setProvince("");
    setDistrict("");
    setZipCode("");
    setContactPerson("");
    setContactPosition("");
    setPhone("");
    setCellular("");
    setEmail("");
    setSecondaryEmail("");
    setAvalDoc("");
    setAvalPhone("");
    setAvalLoc("");
    setIsCarrier("No");
    setIsc("No");
    setHasBusiness("No");
    setExcludeCode("No");
    setAgentType("Ninguno");
    setIsEmployee("No");
    setSupplierWithDni("No");
    setValidateIdc("No");
    setContribState("ACTIVO");
    setContribCondition("HABIDO");
    setIsRetentionAgent("No");
    setIsPerceptionAgent("No");
    setIsGoodTaxpayer("No");
    setDebitorAccount("1212101");
    setDownPaymentClearAct("1221101");
    setVatLiable("vLiable");
    setTypeSN("");
    setExistingClient(null);
    setErrorMessage("");
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} size={{ base: "full", md: "5xl" }} scrollBehavior="inside">
      <ModalOverlay bg="blackAlpha.700" backdropFilter="blur(4px)" />
      <ModalContent
        borderRadius={{ base: "none", md: "2xl" }}
        border="1px solid"
        borderColor="gray.200"
        boxShadow="2xl"
        my={{ base: 0, md: "auto" }}
        h={{ base: "100dvh", md: "auto" }}
        maxH={{ base: "100dvh", md: "92vh" }}
        overflow="hidden"
      >
        <ModalHeader
          borderBottom="1px solid"
          borderColor="gray.100"
          pt={{ base: "max(14px, env(safe-area-inset-top, 14px))", md: 3 }}
          pb={{ base: 2.5, md: 3 }}
          px={{ base: 3.5, md: 6 }}
          bg="gray.50"
          borderTopRadius={{ base: "none", md: "2xl" }}
          position="relative"
          zIndex={2}
        >
          <Flex justify="space-between" align="center" wrap="wrap" gap={2} pr={{ base: 10, md: 8 }}>
            <Flex align="center" gap={{ base: 2, md: 2.5 }} minW="0" flex="1">
              <Flex
                w={{ base: "30px", md: "36px" }}
                h={{ base: "30px", md: "36px" }}
                borderRadius={{ base: "lg", md: "xl" }}
                bg="#166534"
                align="center"
                justify="center"
                color="white"
                boxShadow="xs"
                flexShrink={0}
              >
                <FiUserPlus size={16} />
              </Flex>
              <Box minW="0" flex="1">
                <Text
                  fontSize={{ base: "13px", sm: "15px", md: "md" }}
                  fontWeight="900"
                  color="#166534"
                  letterSpacing="tight"
                  lineHeight="short"
                  isTruncated
                >
                  Datos Maestros del Socio de Negocio
                </Text>
                <Text fontSize={{ base: "10.5px", md: "xs" }} color="gray.500" fontWeight="500" noOfLines={1}>
                  Registro oficial en SAP Business One vía Service Layer
                </Text>
              </Box>
            </Flex>

            {documentNumber && (
              <HStack spacing={1.5} mt={{ base: 1, sm: 0 }} wrap="wrap">
                <Badge bg="#dcfce7" color="#166534" fontSize={{ base: "10px", md: "11px" }} fontWeight="800" px={2} py={0.5} borderRadius="md" border="1px solid #86efac">
                  Cód: CL{documentNumber.replace(/\D/g, "")}
                </Badge>
                <Badge colorScheme="blue" fontSize={{ base: "9.5px", md: "10px" }} px={1.5} py={0.5} borderRadius="md">
                  Grupo 100
                </Badge>
              </HStack>
            )}
          </Flex>
        </ModalHeader>
        <ModalCloseButton
          top={{ base: "max(12px, env(safe-area-inset-top, 12px))", md: 3 }}
          right={{ base: 3, md: 3 }}
          size="sm"
          zIndex={10}
          borderRadius="full"
        />

        <ModalBody py={{ base: 3, md: 4 }} px={{ base: 3, md: 6 }}>
          <VStack spacing={4} align="stretch">
            {/* ALERTA DE ERROR GENERAL */}
            {errorMessage && (
              <Alert status="error" borderRadius="xl" variant="left-accent">
                <AlertIcon />
                <Box flex="1">
                  <AlertTitle fontSize="xs" fontWeight="800">No se pudo registrar en SAP</AlertTitle>
                  <AlertDescription fontSize="xs">{errorMessage}</AlertDescription>
                </Box>
              </Alert>
            )}

            {/* 🛡️ ALERTA ANTI-DUPLICIDAD SI EL CLIENTE YA EXISTE */}
            {existingClient && (
              <Alert status="warning" borderRadius="xl" variant="solid" bg="#fffbeb" border="1.5px solid #fef08a" color="#78350f">
                <AlertIcon color="#d97706" />
                <Box flex="1">
                  <AlertTitle fontSize="xs" fontWeight="900" textTransform="uppercase">
                    ⚠️ Socio de Negocio Ya Existe en SAP
                  </AlertTitle>
                  <AlertDescription fontSize="xs" mt={0.5}>
                    El documento <strong>{existingClient.FederalTaxID || documentNumber}</strong> ya está registrado con código{" "}
                    <strong>{existingClient.CardCode}</strong>: <em>{existingClient.CardName}</em>.
                  </AlertDescription>
                  <Button
                    size="xs"
                    mt={2}
                    colorScheme="yellow"
                    bg="#d97706"
                    color="white"
                    _hover={{ bg: "#b45309" }}
                    onClick={handleSelectExisting}
                    leftIcon={<FiArrowRight />}
                    fontWeight="800"
                  >
                    Usar este cliente existente
                  </Button>
                </Box>
              </Alert>
            )}

            {/* ── SECCIÓN 1: IDENTIFICACIÓN Y DATOS FISCALES (SUNAT) ── */}
            <Box bg="gray.50" p={{ base: 3.5, md: 4 }} borderRadius="xl" border="1px solid" borderColor="gray.200">
              <Flex align="center" gap={2} mb={3}>
                <Flex w="24px" h="24px" borderRadius="md" bg="#dcfce7" color="#166534" align="center" justify="center" flexShrink={0}>
                  <FiFileText size={14} />
                </Flex>
                <Text fontSize="12px" fontWeight="900" color="#166534" textTransform="uppercase" letterSpacing="wider">
                  1. Identificación y Datos Fiscales (SUNAT)
                </Text>
              </Flex>

              <Grid templateColumns={{ base: "1fr", sm: "repeat(2, 1fr)", md: "140px 160px 1fr 180px" }} gap={3}>
                <FormControl isRequired>
                  <FormLabel fontSize="xs" fontWeight="700" color="gray.700">Tipo Persona</FormLabel>
                  <Select
                    size={{ base: "md", md: "sm" }}
                    borderRadius="md"
                    value={personType}
                    onChange={(e) => handlePersonTypeChange(e.target.value)}
                    bg={isAutoFilled ? "gray.100" : "white"}
                    isDisabled={isAutoFilled}
                    cursor={isAutoFilled ? "not-allowed" : "pointer"}
                    fontWeight="700"
                  >
                    <option value="JURIDICO">Jurídica (Empresa)</option>
                    <option value="NATURAL">Natural (Persona)</option>
                  </Select>
                </FormControl>

                <FormControl isRequired>
                  <FormLabel fontSize="xs" fontWeight="700" color="gray.700">Tipo Documento</FormLabel>
                  <Select
                    size={{ base: "md", md: "sm" }}
                    borderRadius="md"
                    value={documentType}
                    onChange={(e) => setDocumentType(e.target.value)}
                    bg={isAutoFilled ? "gray.100" : "white"}
                    isDisabled={isAutoFilled}
                    cursor={isAutoFilled ? "not-allowed" : "pointer"}
                    fontWeight="600"
                  >
                    <option value="6">6 - REGISTRO ÚNICO DE CONTRIBUYENTES (RUC)</option>
                    <option value="1">1 - DOCUMENTO NACIONAL DE IDENTIDAD (DNI)</option>
                    <option value="4">4 - CARNET DE EXTRANJERIA</option>
                    <option value="7">7 - PASAPORTE</option>
                    <option value="A">A - CÉDULA DIPLOMÁTICA</option>
                    <option value="0">0 - OTROS</option>
                  </Select>
                </FormControl>

                <FormControl isRequired>
                  <Flex justify="space-between" align="center" mb={1}>
                    <FormLabel fontSize="xs" fontWeight="700" color="gray.700" mb={0}>
                      Nº Documento {documentType === "6" || documentType === "RUC" ? "(11 dígitos)" : (documentType === "1" || documentType === "DNI" ? "(8 dígitos)" : "")}
                    </FormLabel>
                    <HStack spacing={1.5} align="center">
                      {(documentNumber || cardName || firstName || address) && (
                        <Button
                          size="xs"
                          variant="ghost"
                          colorScheme="red"
                          leftIcon={<FiRotateCcw size={10} />}
                          onClick={handleClearForm}
                          height="18px"
                          fontSize="10px"
                          px={1.5}
                          fontWeight="600"
                          title="Limpiar campos del formulario"
                        >
                          Limpiar
                        </Button>
                      )}
                      {isCheckingExists && (
                        <HStack spacing={1}>
                          <Spinner size="xs" color="#166534" />
                          <Text fontSize="10px" color="gray.500">Verificando en SAP...</Text>
                        </HStack>
                      )}
                      {!isCheckingExists && !existingClient && documentNumber.length >= (documentType === "6" || documentType === "RUC" ? 11 : (documentType === "1" || documentType === "DNI" ? 8 : 4)) && (
                        <Badge colorScheme="green" fontSize="9px" px={1.5} borderRadius="sm">
                          ✓ Disponible
                        </Badge>
                      )}
                    </HStack>
                  </Flex>
                  <Flex gap={1.5} align="center">
                    <Input
                      flex="1"
                      size={{ base: "md", md: "sm" }}
                      borderRadius="md"
                      placeholder={documentType === "6" || documentType === "RUC" ? "20100144922" : (documentType === "1" || documentType === "DNI" ? "72435405" : "Nº Documento")}
                      value={documentNumber}
                      maxLength={documentType === "6" || documentType === "RUC" ? 11 : (documentType === "1" || documentType === "DNI" ? 8 : 15)}
                      onChange={(e) => {
                        setDocumentNumber(e.target.value.replace(/\D/g, ""));
                        if (isAutoFilled) setIsAutoFilled(false);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          handleConsultSunat();
                        }
                      }}
                      bg="white"
                      fontWeight="800"
                      borderColor={existingClient ? "red.400" : "gray.300"}
                    />
                    <Tooltip label="Consultar datos en SUNAT / RENIEC" placement="top" hasArrow>
                      <IconButton
                        size={{ base: "md", md: "sm" }}
                        bg="#e6f7ed"
                        color="#166534"
                        border="1px solid"
                        borderColor="#38a169"
                        _hover={{ bg: "#d1fae5", borderColor: "#2f855a" }}
                        _active={{ bg: "#bbf7d0" }}
                        onClick={handleConsultSunat}
                        isLoading={isConsultingSunat}
                        icon={<FiSearch size={15} />}
                        aria-label="Buscar en SUNAT o RENIEC"
                        borderRadius="md"
                        px={3}
                        flexShrink={0}
                        boxShadow="xs"
                      />
                    </Tooltip>
                    {(documentNumber || cardName) && (
                      <Tooltip label="Limpiar todos los datos" placement="top" hasArrow>
                        <IconButton
                          size={{ base: "md", md: "sm" }}
                          variant="ghost"
                          color="gray.400"
                          _hover={{ bg: "red.50", color: "red.600" }}
                          _active={{ bg: "red.100" }}
                          onClick={handleClearForm}
                          icon={<FiRotateCcw size={14} />}
                          aria-label="Limpiar formulario"
                          borderRadius="md"
                          flexShrink={0}
                        />
                      </Tooltip>
                    )}
                  </Flex>
                </FormControl>

                <FormControl isRequired>
                  <FormLabel fontSize="xs" fontWeight="700" color="gray.700">Tipo SN (Segmento)</FormLabel>
                  <Select
                    size={{ base: "md", md: "sm" }}
                    borderRadius="md"
                    placeholder="-- Seleccionar --"
                    value={typeSN}
                    onChange={(e) => setTypeSN(e.target.value)}
                    bg="white"
                    fontWeight="700"
                  >
                    <option value="01">01 - B2C</option>
                    <option value="02">02 - IMPORTADOR</option>
                    <option value="03">03 - CONCESIONARIO</option>
                    <option value="04">04 - TALLER</option>
                    <option value="05">05 - LUBRICENTRO</option>
                    <option value="06">06 - TIENDA</option>
                  </Select>
                </FormControl>
              </Grid>

              {/* CAMPOS DEPENDIENDO DE SI ES PERSONA JURÍDICA O NATURAL */}
              {personType === "JURIDICO" ? (
                <Grid templateColumns={{ base: "1fr", md: "1.5fr 1fr" }} gap={3} mt={3}>
                  <FormControl isRequired>
                    <FormLabel fontSize="xs" fontWeight="700" color="gray.700">Razón Social</FormLabel>
                    <Input
                      size={{ base: "md", md: "sm" }}
                      borderRadius="md"
                      placeholder="Ej. GRUPO PANA S.A."
                      value={cardName}
                      onChange={(e) => {
                        const val = e.target.value.toUpperCase();
                        setCardName(val);
                        if (!commercialName || commercialName === cardName) {
                          setCommercialName(val);
                        }
                      }}
                      bg={isAutoFilled && cardName ? "gray.100" : "white"}
                      isReadOnly={isAutoFilled && !!cardName}
                      cursor={isAutoFilled && cardName ? "not-allowed" : "text"}
                      borderColor={isAutoFilled && cardName ? "gray.300" : "gray.200"}
                      _focus={isAutoFilled && cardName ? { borderColor: "gray.300", boxShadow: "none" } : undefined}
                      fontWeight="700"
                    />
                  </FormControl>

                  <FormControl>
                    <FormLabel fontSize="xs" fontWeight="700" color="gray.700">
                      Nombre Comercial <Text as="span" color="gray.400" fontWeight="normal">(U_VS_NOMCOM)</Text>
                    </FormLabel>
                    <Input
                      size={{ base: "md", md: "sm" }}
                      borderRadius="md"
                      placeholder="Ej. GRUPO PANA"
                      value={commercialName}
                      onChange={(e) => setCommercialName(e.target.value.toUpperCase())}
                      bg="white"
                      fontWeight="600"
                    />
                  </FormControl>
                </Grid>
              ) : (
                <Box mt={3}>
                  <Grid templateColumns={{ base: "1fr", sm: "repeat(2, 1fr)", md: "repeat(4, 1fr)" }} gap={2}>
                    <FormControl isRequired>
                      <FormLabel fontSize="xs" fontWeight="700" color="gray.700">Ap. Paterno</FormLabel>
                      <Input
                        size={{ base: "md", md: "sm" }}
                        borderRadius="md"
                        placeholder="Pérez"
                        value={paternalSurname}
                        onChange={(e) => setPaternalSurname(e.target.value.toUpperCase())}
                        bg={isAutoFilled && paternalSurname ? "gray.100" : "white"}
                        isReadOnly={isAutoFilled && !!paternalSurname}
                        cursor={isAutoFilled && paternalSurname ? "not-allowed" : "text"}
                        borderColor={isAutoFilled && paternalSurname ? "gray.300" : "gray.200"}
                        _focus={isAutoFilled && paternalSurname ? { borderColor: "gray.300", boxShadow: "none" } : undefined}
                        fontWeight="600"
                      />
                    </FormControl>
                    <FormControl isRequired>
                      <FormLabel fontSize="xs" fontWeight="700" color="gray.700">Ap. Materno</FormLabel>
                      <Input
                        size={{ base: "md", md: "sm" }}
                        borderRadius="md"
                        placeholder="Gómez"
                        value={maternalSurname}
                        onChange={(e) => setMaternalSurname(e.target.value.toUpperCase())}
                        bg={isAutoFilled && maternalSurname ? "gray.100" : "white"}
                        isReadOnly={isAutoFilled && !!maternalSurname}
                        cursor={isAutoFilled && maternalSurname ? "not-allowed" : "text"}
                        borderColor={isAutoFilled && maternalSurname ? "gray.300" : "gray.200"}
                        _focus={isAutoFilled && maternalSurname ? { borderColor: "gray.300", boxShadow: "none" } : undefined}
                        fontWeight="600"
                      />
                    </FormControl>
                    <FormControl isRequired>
                      <FormLabel fontSize="xs" fontWeight="700" color="gray.700">Primer Nombre</FormLabel>
                      <Input
                        size={{ base: "md", md: "sm" }}
                        borderRadius="md"
                        placeholder="Juan"
                        value={firstName}
                        onChange={(e) => setFirstName(e.target.value.toUpperCase())}
                        bg={isAutoFilled && firstName ? "gray.100" : "white"}
                        isReadOnly={isAutoFilled && !!firstName}
                        cursor={isAutoFilled && firstName ? "not-allowed" : "text"}
                        borderColor={isAutoFilled && firstName ? "gray.300" : "gray.200"}
                        _focus={isAutoFilled && firstName ? { borderColor: "gray.300", boxShadow: "none" } : undefined}
                        fontWeight="600"
                      />
                    </FormControl>
                    <FormControl>
                      <FormLabel fontSize="xs" fontWeight="700" color="gray.700">Segundo Nombre</FormLabel>
                      <Input
                        size={{ base: "md", md: "sm" }}
                        borderRadius="md"
                        placeholder="Carlos"
                        value={secondName}
                        onChange={(e) => setSecondName(e.target.value.toUpperCase())}
                        bg={isAutoFilled && secondName ? "gray.100" : "white"}
                        isReadOnly={isAutoFilled && !!secondName}
                        cursor={isAutoFilled && secondName ? "not-allowed" : "text"}
                        borderColor={isAutoFilled && secondName ? "gray.300" : "gray.200"}
                        _focus={isAutoFilled && secondName ? { borderColor: "gray.300", boxShadow: "none" } : undefined}
                      />
                    </FormControl>
                  </Grid>
                  {computedNaturalName && (
                    <Box mt={2} p={2} bg="blue.50" borderRadius="md" border="1px dashed" borderColor="blue.200">
                      <Text fontSize="11px" color="blue.900" fontWeight="600">
                        ℹ️ Vista previa (así se guardará al registrar en SAP): <strong>{computedNaturalName}</strong>
                      </Text>
                    </Box>
                  )}
                </Box>
              )}

              {/* ASIGNACIÓN DE VENDEDOR EN SAP (SOLO SE MUESTRA A ADMINS O USUARIOS SIN CÓDIGO ASIGNADO) */}
              {(isAdmin || resolvedLoggedSellerCode <= 0) && (
                <Box mt={3} pt={3} borderTop="1px dashed" borderColor="gray.300">
                  <FormControl>
                    <Flex justify="space-between" align="center" mb={1}>
                      <FormLabel fontSize="xs" fontWeight="700" color="gray.700" m={0}>
                        Vendedor Asignado (SAP)
                      </FormLabel>
                      <Badge colorScheme="purple" fontSize="9px" px={1.5} py={0.5} borderRadius="sm">
                        Asignación Comercial
                      </Badge>
                    </Flex>
                    <Select
                      size={{ base: "md", md: "sm" }}
                      borderRadius="md"
                      value={assignedSellerCode}
                      onChange={(e) => setAssignedSellerCode(e.target.value)}
                      bg="white"
                      fontWeight="600"
                    >
                      <option value="-1">-1 - Sin vendedor asignado</option>
                      {sellersList.map((s) => (
                        <option key={s.value} value={s.value}>
                          {s.value} - {s.label}
                        </option>
                      ))}
                    </Select>
                  </FormControl>
                </Box>
              )}
            </Box>

            {/* ── SECCIÓN 2: DIRECCIONES (FISCAL Y DESPACHO) ── */}
            <Box bg="gray.50" p={{ base: 3.5, md: 4 }} borderRadius="xl" border="1px solid" borderColor="gray.200">
              <Flex justify="space-between" align="center" mb={3} wrap="wrap" gap={1}>
                <Flex align="center" gap={2}>
                  <Flex w="24px" h="24px" borderRadius="md" bg="#dcfce7" color="#166534" align="center" justify="center" flexShrink={0}>
                    <FiMapPin size={14} />
                  </Flex>
                  <Text fontSize="12px" fontWeight="900" color="#166534" textTransform="uppercase" letterSpacing="wider">
                    2. Dirección Fiscal Oficial (bo_BillTo)
                  </Text>
                </Flex>
                <Badge colorScheme="purple" fontSize="9px">Facturación</Badge>
              </Flex>

              <FormControl isRequired>
                <FormLabel fontSize="xs" fontWeight="700" color="gray.700">Dirección (Calle / Av. / Jr. / Nro / Urb.)</FormLabel>
                <Input
                  size={{ base: "md", md: "sm" }}
                  borderRadius="md"
                  placeholder="Ej. AV. AVIACION 4928 HIGUERETA"
                  value={address}
                  onChange={(e) => setAddress(e.target.value.toUpperCase())}
                  bg="white"
                  fontWeight="600"
                />
              </FormControl>

              <Grid templateColumns={{ base: "1fr", sm: "repeat(2, 1fr)", md: "1.2fr 1fr 1fr 110px" }} gap={2.5} mt={3}>
                <FormControl isRequired display="flex" flexDirection="column" justifyContent="space-between">
                  <FormLabel fontSize="xs" fontWeight="700" color="gray.700" minH={{ base: "auto", sm: "20px" }} display="flex" alignItems="flex-end" mb={1}>
                    Departamento
                  </FormLabel>
                  <Select
                    size={{ base: "md", md: "sm" }}
                    borderRadius="md"
                    placeholder="-- Seleccionar --"
                    value={departmentCode}
                    onChange={(e) => handleDepartmentChange(e.target.value)}
                    bg="white"
                    fontWeight="600"
                  >
                    {(sapDepartments || SAP_PERU_DEPARTMENTS).map((dept) => (
                      <option key={dept.code} value={dept.code}>
                        {dept.code} - {dept.name}
                      </option>
                    ))}
                  </Select>
                </FormControl>

                <FormControl isRequired display="flex" flexDirection="column" justifyContent="space-between">
                  <FormLabel fontSize="xs" fontWeight="700" color="gray.700" minH={{ base: "auto", sm: "20px" }} display="flex" alignItems="flex-end" mb={1}>
                    Provincia
                  </FormLabel>
                  <Select
                    size={{ base: "md", md: "sm" }}
                    borderRadius="md"
                    placeholder="-- Seleccionar --"
                    value={province}
                    onChange={(e) => setProvince(e.target.value.toUpperCase())}
                    bg="white"
                    fontWeight="600"
                  >
                    {availableProvinces.map((prov) => (
                      <option key={prov} value={prov}>
                        {prov}
                      </option>
                    ))}
                  </Select>
                </FormControl>

                <FormControl display="flex" flexDirection="column" justifyContent="space-between">
                  <FormLabel fontSize="xs" fontWeight="700" color="gray.700" minH={{ base: "auto", sm: "20px" }} display="flex" alignItems="flex-end" mb={1}>
                    Distrito
                  </FormLabel>
                  <Input
                    size={{ base: "md", md: "sm" }}
                    borderRadius="md"
                    placeholder="Ej. LA VICTORIA, SURCO"
                    value={district}
                    onChange={(e) => handleDistrictChange(e.target.value)}
                    list="peru-districts-list"
                    bg="white"
                    fontWeight="600"
                  />
                  <datalist id="peru-districts-list">
                    {UBIGEO_DISTRICTS.map((item) => (
                      <option key={item.ubigeo} value={item.district}>
                        {item.district} ({item.province}) - {item.ubigeo}
                      </option>
                    ))}
                  </datalist>
                </FormControl>

                <FormControl display="flex" flexDirection="column" justifyContent="space-between">
                  <Flex justify="space-between" align="center" minH={{ base: "auto", sm: "20px" }} mb={1}>
                    <FormLabel fontSize="xs" fontWeight="700" color="gray.700" m={0}>
                      Ubigeo / GLN
                    </FormLabel>
                    {zipCode && (
                      <Badge colorScheme="green" fontSize="9px" px={1.5} py={0.5} borderRadius="sm" textTransform="uppercase">
                        AUTO
                      </Badge>
                    )}
                  </Flex>
                  <Input
                    size={{ base: "md", md: "sm" }}
                    borderRadius="md"
                    placeholder="150115"
                    value={zipCode}
                    onChange={(e) => handleZipCodeChange(e.target.value)}
                    bg="white"
                    fontWeight="600"
                  />
                </FormControl>
              </Grid>

              {/* PUNTO DE ENTREGA / DESPACHO */}
              <Box mt={3.5} pt={3} borderTop="1px dashed" borderColor="gray.300">
                <Flex justify="space-between" align="center" wrap="wrap" gap={2} mb={2}>
                  <Text fontSize="11px" fontWeight="800" color="#166534" textTransform="uppercase">
                    Punto de Entrega / Despacho (bo_ShipTo - ALMACEN)
                  </Text>
                  <HStack spacing={2}>
                    <Text fontSize="xs" color="gray.600" fontWeight="600">Misma que fiscal</Text>
                    <Switch
                      colorScheme="emerald"
                      isChecked={sameDeliveryAddress}
                      onChange={(e) => setSameDeliveryAddress(e.target.checked)}
                    />
                  </HStack>
                </Flex>

                {!sameDeliveryAddress && (
                  <Grid templateColumns={{ base: "1fr", sm: "180px 1fr" }} gap={3} mt={2}>
                    <FormControl>
                      <FormLabel fontSize="xs" fontWeight="700" color="gray.700">Nombre Sede / Almacén</FormLabel>
                      <Input
                        size={{ base: "md", md: "sm" }}
                        borderRadius="md"
                        placeholder="ALMACEN CENTRAL"
                        value={deliveryAddressName}
                        onChange={(e) => setDeliveryAddressName(e.target.value.toUpperCase())}
                        bg="white"
                      />
                    </FormControl>
                    <FormControl>
                      <FormLabel fontSize="xs" fontWeight="700" color="gray.700">Dirección de Despacho</FormLabel>
                      <Input
                        size={{ base: "md", md: "sm" }}
                        borderRadius="md"
                        placeholder="Dirección exacta de almacén o punto de entrega"
                        value={deliveryAddress}
                        onChange={(e) => setDeliveryAddress(e.target.value.toUpperCase())}
                        bg="white"
                      />
                    </FormControl>
                  </Grid>
                )}
              </Box>
            </Box>

            {/* ── SECCIÓN 3: CONTACTO Y OBSERVACIONES ── */}
            <Box bg="gray.50" p={{ base: 3.5, md: 4 }} borderRadius="xl" border="1px solid" borderColor="gray.200">
              <Flex align="center" gap={2} mb={3}>
                <Flex w="24px" h="24px" borderRadius="md" bg="#dcfce7" color="#166534" align="center" justify="center" flexShrink={0}>
                  <FiPhone size={14} />
                </Flex>
                <Text fontSize="12px" fontWeight="900" color="#166534" textTransform="uppercase" letterSpacing="wider">
                  3. Canales de Contacto Directo
                </Text>
              </Flex>

              <Grid templateColumns={{ base: "1fr", sm: "1fr 1fr", md: "1fr 1fr 1.4fr" }} gap={3}>
                <FormControl isRequired display="flex" flexDirection="column" justifyContent="space-between">
                  <FormLabel fontSize="xs" fontWeight="700" color="gray.700" minH={{ base: "auto", sm: "20px" }} display="flex" alignItems="flex-end" mb={1}>
                    Teléfono Móvil
                  </FormLabel>
                  <Input size={{ base: "md", md: "sm" }} borderRadius="md" placeholder="905468311" value={cellular} onChange={(e) => setCellular(e.target.value)} bg="white" />
                </FormControl>
                <FormControl display="flex" flexDirection="column" justifyContent="space-between">
                  <FormLabel fontSize="xs" fontWeight="700" color="gray.700" minH={{ base: "auto", sm: "20px" }} display="flex" alignItems="flex-end" mb={1}>
                    Teléfono Fijo
                  </FormLabel>
                  <Input size={{ base: "md", md: "sm" }} borderRadius="md" placeholder="014928000" value={phone} onChange={(e) => setPhone(e.target.value)} bg="white" />
                </FormControl>
                <FormControl isRequired display="flex" flexDirection="column" justifyContent="space-between">
                  <FormLabel fontSize="xs" fontWeight="700" color="gray.700" minH={{ base: "auto", sm: "20px" }} display="flex" alignItems="flex-end" mb={1}>
                    Correo Principal
                  </FormLabel>
                  <Input size={{ base: "md", md: "sm" }} borderRadius="md" type="email" placeholder="contacto@empresa.com" value={email} onChange={(e) => setEmail(e.target.value)} bg="white" />
                </FormControl>
              </Grid>

              {/* PERSONA DE CONTACTO PRINCIPAL */}
              <Box mt={3.5} pt={3} borderTop="1px dashed" borderColor="gray.300">
                <Text fontSize="11px" fontWeight="800" color="#166534" textTransform="uppercase" mb={3}>
                  Persona de Contacto en la Empresa (ContactEmployees)
                </Text>

                <Grid templateColumns={{ base: "1fr", sm: "repeat(2, 1fr)", md: "1.5fr 1fr 1fr 1fr" }} gap={3}>
                  <FormControl display="flex" flexDirection="column" justifyContent="space-between">
                    <FormLabel fontSize="xs" fontWeight="700" color="gray.700" minH={{ base: "auto", sm: "20px" }} display="flex" alignItems="flex-end" mb={1}>
                      Nombres y Apellidos
                    </FormLabel>
                    <Input size={{ base: "md", md: "sm" }} borderRadius="md" placeholder="KEVIN MORI" value={contactPerson} onChange={(e) => setContactPerson(e.target.value.toUpperCase())} bg="white" />
                  </FormControl>
                  <FormControl display="flex" flexDirection="column" justifyContent="space-between">
                    <FormLabel fontSize="xs" fontWeight="700" color="gray.700" minH={{ base: "auto", sm: "20px" }} display="flex" alignItems="flex-end" mb={1}>
                      Cargo / Posición
                    </FormLabel>
                    <Input size={{ base: "md", md: "sm" }} borderRadius="md" placeholder="JEFE DE COMPRAS" value={contactPosition} onChange={(e) => setContactPosition(e.target.value.toUpperCase())} bg="white" />
                  </FormControl>
                  <FormControl display="flex" flexDirection="column" justifyContent="space-between">
                    <FormLabel fontSize="xs" fontWeight="700" color="gray.700" minH={{ base: "auto", sm: "20px" }} display="flex" alignItems="flex-end" mb={1}>
                      Celular de Contacto
                    </FormLabel>
                    <Input size={{ base: "md", md: "sm" }} borderRadius="md" placeholder="905468311" value={contactPhone} onChange={(e) => setContactPhone(e.target.value)} bg="white" />
                  </FormControl>
                  <FormControl display="flex" flexDirection="column" justifyContent="space-between">
                    <FormLabel fontSize="xs" fontWeight="700" color="gray.700" minH={{ base: "auto", sm: "20px" }} display="flex" alignItems="flex-end" mb={1}>
                      Email de Contacto
                    </FormLabel>
                    <Input size={{ base: "md", md: "sm" }} borderRadius="md" type="email" placeholder="kmori@empresa.com" value={contactEmail} onChange={(e) => setContactEmail(e.target.value)} bg="white" />
                  </FormControl>
                </Grid>

                <FormControl mt={3}>
                  <FormLabel fontSize="xs" fontWeight="700" color="gray.700">Comentarios u Observaciones Comerciales</FormLabel>
                  <Textarea
                    size={{ base: "md", md: "sm" }}
                    borderRadius="md"
                    rows={2}
                    placeholder="Observaciones de despacho, horarios de atención, restricciones..."
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    bg="white"
                  />
                </FormControl>
              </Box>
            </Box>
          </VStack>
        </ModalBody>

        <ModalFooter
          borderTop="1px solid"
          borderColor="gray.100"
          pt={{ base: 3, md: 3 }}
          pb={{ base: "max(14px, env(safe-area-inset-bottom, 14px))", md: 3 }}
          px={{ base: 3.5, md: 6 }}
          bg="gray.50"
          borderBottomRadius={{ base: "none", md: "2xl" }}
        >
          <Flex justify="space-between" align="center" direction={{ base: "column-reverse", sm: "row" }} gap={3} w="full">
            <HStack spacing={2} justify={{ base: "center", sm: "flex-start" }} w={{ base: "full", sm: "auto" }}>
              <Badge colorScheme="gray" fontSize="10px">
                {personType === "JURIDICO" ? "🏢 Persona Jurídica" : "👤 Persona Natural"}
              </Badge>
              {documentNumber && (
                <Text fontSize="11px" color="gray.500" fontWeight="600">
                  {documentType}: {documentNumber}
                </Text>
              )}
            </HStack>

            <HStack spacing={2} justify={{ base: "stretch", sm: "flex-end" }} w={{ base: "full", sm: "auto" }}>
              <Button
                size={{ base: "md", md: "sm" }}
                variant="ghost"
                onClick={handleClose}
                isDisabled={isSubmitting}
                flex={{ base: 1, sm: "initial" }}
              >
                Cancelar
              </Button>
              <Button
                size={{ base: "md", md: "sm" }}
                bg="#166534"
                color="white"
                _hover={{ bg: "#0f5132" }}
                _active={{ bg: "#14532d" }}
                onClick={handleSubmit}
                isLoading={isSubmitting}
                loadingText="Registrando en SAP B1..."
                leftIcon={<FiSave />}
                isDisabled={Boolean(existingClient) || !documentNumber || !effectiveCardName || !address}
                fontWeight="900"
                boxShadow="sm"
                px={5}
                flex={{ base: 2, sm: "initial" }}
              >
                Registrar Socio en SAP
              </Button>
            </HStack>
          </Flex>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}
