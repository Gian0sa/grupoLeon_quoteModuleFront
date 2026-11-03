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
  Tabs,
  TabList,
  TabPanels,
  Tab,
  TabPanel,
  Switch,
  Textarea,
  Code,
  Divider,
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
  FiDollarSign,
  FiCode,
  FiFileText,
  FiSliders,
} from "react-icons/fi";
import { createClient, checkClientExists } from "../services/clientService";
import { getPaymentType } from "../../quotes/services/quoteService";
import { useDebounce } from "../../../shared/hooks/useDebounce";

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
  const [cardName, setCardName] = useState("");
  const [commercialName, setCommercialName] = useState("");
  const [cardForeignName, setCardForeignName] = useState("");
  const [currency, setCurrency] = useState("##");
  const [validStatus, setValidStatus] = useState("tYES");

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
  const [department, setDepartment] = useState("LIMA");
  const [province, setProvince] = useState("LIMA");
  const [district, setDistrict] = useState("");
  const [zipCode, setZipCode] = useState("150140");
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

  // 4. Condiciones Comerciales
  const [payTermsGrpCode, setPayTermsGrpCode] = useState("-1");
  const [priceListNum, setPriceListNum] = useState("1");
  const [creditLimit, setCreditLimit] = useState("0");
  const [assignedSellerCode, setAssignedSellerCode] = useState(salesPersonCode || -1);

  // Catálogos SAP
  const [paymentTermsList, setPaymentTermsList] = useState([]);
  const [sellersList, setSellersList] = useState([]);

  // Estados de control
  const [isCheckingExists, setIsCheckingExists] = useState(false);
  const [existingClient, setExistingClient] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [activeTabIndex, setActiveTabIndex] = useState(0);

  const debouncedDoc = useDebounce(documentNumber, 600);

  // Cargar condiciones de pago y vendedores desde SAP
  useEffect(() => {
    if (isOpen) {
      getPaymentType().then((terms) => {
        if (Array.isArray(terms) && terms.length > 0) {
          setPaymentTermsList(terms);
        }
      });

      try {
        const cachedSellers = localStorage.getItem("cached_sap_sellers");
        if (cachedSellers) {
          setSellersList(JSON.parse(cachedSellers));
        }
      } catch {}

      if (defaultDocument) {
        setDocumentNumber(defaultDocument);
        if (defaultDocument.length === 8) {
          setPersonType("NATURAL");
          setDocumentType("1");
        } else if (defaultDocument.length === 11) {
          setPersonType("JURIDICO");
          setDocumentType("6");
        }
      }
      setErrorMessage("");
    }
  }, [isOpen, defaultDocument]);

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
      setActiveTabIndex(0);
      return;
    }

    const isDocRuc = documentType === "6" || documentType === "RUC";
    const isDocDni = documentType === "1" || documentType === "DNI";

    if (isDocRuc) {
      if (cleanDoc.length !== 11) {
        setErrorMessage("El RUC debe tener exactamente 11 dígitos numéricos.");
        setActiveTabIndex(0);
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
        setActiveTabIndex(0);
        return;
      }
    }

    if (isDocDni && cleanDoc.length !== 8) {
      setErrorMessage("El DNI debe tener exactamente 8 dígitos numéricos.");
      setActiveTabIndex(0);
      return;
    }

    if (!effectiveCardName || !effectiveCardName.trim()) {
      setErrorMessage(personType === "JURIDICO" ? "La Razón Social es obligatoria." : "Los Nombres y Apellidos son obligatorios.");
      setActiveTabIndex(0);
      return;
    }

    if (!address.trim()) {
      setErrorMessage("La Dirección Fiscal es obligatoria.");
      setActiveTabIndex(2);
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
        cardForeignName: cardForeignName.trim().toUpperCase(),
        commercialName: commercialName.trim().toUpperCase() || effectiveCardName.trim().toUpperCase(),
        currency,
        valid: validStatus,
        debitorAccount: debitorAccount.trim() || "1212101",
        downPaymentClearAct: downPaymentClearAct.trim() || "1221101",
        vatLiable: vatLiable || "vLiable",
        isCarrier: isCarrier === "Sí" || isCarrier === "Y" ? "Y" : "N",
        isc: isc === "Sí" || isc === "Y" ? "Y" : "N",
        hasBusiness: hasBusiness === "Sí" || hasBusiness === "Y" ? "Y" : "N",
        excludeCode: excludeCode === "Sí" || excludeCode === "Y" ? "Y" : "N",
        agentType: agentType === "Ninguno" ? "C" : agentType,
        isEmployee: isEmployee === "Sí" || isEmployee === "Y" ? "Y" : "N",
        supplierWithDni: supplierWithDni === "Sí" || supplierWithDni === "Y" ? "Y" : "N",
        validateIdc: validateIdc === "Sí" || validateIdc === "Y" ? "Y" : "N",
        contribState,
        contribCondition,
        isRetentionAgent: isRetentionAgent === "Sí" || isRetentionAgent === "Y" ? "Y" : "N",
        isPerceptionAgent: isPerceptionAgent === "Sí" || isPerceptionAgent === "Y" ? "Y" : "N",
        isGoodTaxpayer: isGoodTaxpayer === "Sí" || isGoodTaxpayer === "Y" ? "Y" : "N",
        paternalSurname: paternalSurname.trim().toUpperCase(),
        maternalSurname: maternalSurname.trim().toUpperCase(),
        firstName: firstName.trim().toUpperCase(),
        secondName: secondName.trim().toUpperCase(),
        address: address.trim().toUpperCase(),
        deliveryAddress: (sameDeliveryAddress ? address : deliveryAddress || address).trim().toUpperCase(),
        deliveryAddressName: deliveryAddressName || "ALMACEN",
        department: department.trim().toUpperCase() || "LIMA",
        province: province.trim().toUpperCase() || "LIMA",
        district: district.trim().toUpperCase() || "LIMA",
        zipCode: zipCode.trim() || "150140",
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
        salesPersonCode: assignedSellerCode && !isNaN(Number(assignedSellerCode)) ? Number(assignedSellerCode) : -1,
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
    setAddress("");
    setDeliveryAddress("");
    setDistrict("");
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
    setExistingClient(null);
    setErrorMessage("");
    setActiveTabIndex(0);
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} size={{ base: "full", md: "5xl" }} isCentered scrollBehavior="inside">
      <ModalOverlay bg="blackAlpha.700" backdropFilter="blur(4px)" />
      <ModalContent borderRadius={{ base: "none", md: "2xl" }} border="1px solid" borderColor="gray.200" boxShadow="2xl" maxH={{ base: "100vh", md: "92vh" }}>
        <ModalHeader borderBottom="1px solid" borderColor="gray.100" pb={3} bg="gray.50" borderTopRadius={{ base: "none", md: "2xl" }}>
          <Flex justify="space-between" align="center" wrap="wrap" gap={2} pr={{ base: 6, md: 8 }}>
            <Flex align="center" gap={2.5}>
              <Flex w="36px" h="36px" borderRadius="xl" bg="#166534" align="center" justify="center" color="white" boxShadow="xs" flexShrink={0}>
                <FiUserPlus size={20} />
              </Flex>
              <Box>
                <Text fontSize={{ base: "sm", sm: "md" }} fontWeight="900" color="#166534" letterSpacing="tight">
                  Datos Maestros del Socio de Negocio (Cliente)
                </Text>
                <Text fontSize="xs" color="gray.500" fontWeight="500">
                  Registro oficial en SAP Business One vía Service Layer OData
                </Text>
              </Box>
            </Flex>

            {documentNumber && (
              <HStack spacing={1.5} mt={{ base: 1, sm: 0 }}>
                <Badge bg="#dcfce7" color="#166534" fontSize="11px" fontWeight="900" px={2.5} py={1} borderRadius="md" border="1px solid #86efac">
                  Cód. SAP: CL{documentNumber.replace(/\D/g, "")}
                </Badge>
                <Badge colorScheme="blue" fontSize="10px" px={2} py={1} borderRadius="md">
                  Grupo 100 - Clientes
                </Badge>
              </HStack>
            )}
          </Flex>
        </ModalHeader>
        <ModalCloseButton top={3} right={3} />

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

            {/* PESTAÑAS IDÉNTICAS AL MAESTRO DE SAP BUSINESS ONE */}
            <Tabs index={activeTabIndex} onChange={(i) => setActiveTabIndex(i)} colorScheme="emerald" variant="enclosed">
              <TabList
                borderBottom="2px solid"
                borderColor="gray.200"
                w="full"
                display="flex"
                overflowX={{ base: "auto", md: "visible" }}
                gap={{ base: 1, md: 1.5 }}
                pb={1}
                sx={{
                  scrollbarWidth: "thin",
                  "&::-webkit-scrollbar": { height: "4px" },
                  "&::-webkit-scrollbar-thumb": { background: "#cbd5e1", borderRadius: "4px" },
                }}
              >
                <Tab
                  fontWeight="800"
                  fontSize="xs"
                  px={{ base: 2.5, md: 2 }}
                  py={2}
                  flex={{ base: "0 0 auto", md: 1 }}
                  justifyContent="center"
                  borderRadius="lg"
                  _selected={{ color: "#166534", bg: "#f0fdf4", borderColor: "#86efac", borderBottomColor: "transparent" }}
                >
                  <HStack spacing={1.5} justify="center">
                    <FiFileText size={15} />
                    <Text whiteSpace="nowrap">1. General</Text>
                  </HStack>
                </Tab>
                <Tab
                  fontWeight="800"
                  fontSize="xs"
                  px={{ base: 2.5, md: 2 }}
                  py={2}
                  flex={{ base: "0 0 auto", md: 1 }}
                  justifyContent="center"
                  borderRadius="lg"
                  _selected={{ color: "#166534", bg: "#f0fdf4", borderColor: "#86efac", borderBottomColor: "transparent" }}
                >
                  <HStack spacing={1.5} justify="center">
                    <FiSliders size={15} />
                    <Text whiteSpace="nowrap">2. Panel SAP</Text>
                  </HStack>
                </Tab>
                <Tab
                  fontWeight="800"
                  fontSize="xs"
                  px={{ base: 2.5, md: 2 }}
                  py={2}
                  flex={{ base: "0 0 auto", md: 1 }}
                  justifyContent="center"
                  borderRadius="lg"
                  _selected={{ color: "#166534", bg: "#f0fdf4", borderColor: "#86efac", borderBottomColor: "transparent" }}
                >
                  <HStack spacing={1.5} justify="center">
                    <FiMapPin size={15} />
                    <Text whiteSpace="nowrap">3. Direcciones</Text>
                  </HStack>
                </Tab>
                <Tab
                  fontWeight="800"
                  fontSize="xs"
                  px={{ base: 2.5, md: 2 }}
                  py={2}
                  flex={{ base: "0 0 auto", md: 1 }}
                  justifyContent="center"
                  borderRadius="lg"
                  _selected={{ color: "#166534", bg: "#f0fdf4", borderColor: "#86efac", borderBottomColor: "transparent" }}
                >
                  <HStack spacing={1.5} justify="center">
                    <FiPhone size={15} />
                    <Text whiteSpace="nowrap">4. Contacto</Text>
                  </HStack>
                </Tab>
                <Tab
                  fontWeight="800"
                  fontSize="xs"
                  px={{ base: 2.5, md: 2 }}
                  py={2}
                  flex={{ base: "0 0 auto", md: 1 }}
                  justifyContent="center"
                  borderRadius="lg"
                  _selected={{ color: "#166534", bg: "#f0fdf4", borderColor: "#86efac", borderBottomColor: "transparent" }}
                >
                  <HStack spacing={1.5} justify="center">
                    <FiDollarSign size={15} />
                    <Text whiteSpace="nowrap">5. Finanzas</Text>
                  </HStack>
                </Tab>
              </TabList>

              <TabPanels pt={4}>
                {/* ── PESTAÑA 1: GENERAL & BÁSICO ── */}
                <TabPanel p={0}>
                  <VStack spacing={4} align="stretch">
                    <Box bg="gray.50" p={4} borderRadius="xl" border="1px solid" borderColor="gray.200">
                      <Text fontSize="11px" fontWeight="900" color="#166534" textTransform="uppercase" letterSpacing="wider" mb={3}>
                        Tipo de Persona & Identificación Fiscal (SUNAT)
                      </Text>

                      <Grid templateColumns={{ base: "1fr", sm: "160px 180px 1fr" }} gap={3}>
                        <FormControl isRequired>
                          <FormLabel fontSize="xs" fontWeight="700" color="gray.700">Tipo Persona</FormLabel>
                          <Select
                            size="sm"
                            borderRadius="md"
                            value={personType}
                            onChange={(e) => handlePersonTypeChange(e.target.value)}
                            bg="white"
                            fontWeight="700"
                          >
                            <option value="JURIDICO">Jurídica (Empresa)</option>
                            <option value="NATURAL">Natural (Persona)</option>
                          </Select>
                        </FormControl>

                        <FormControl isRequired>
                          <FormLabel fontSize="xs" fontWeight="700" color="gray.700">Tipo Documento</FormLabel>
                          <Select
                            size="sm"
                            borderRadius="md"
                            value={documentType}
                            onChange={(e) => setDocumentType(e.target.value)}
                            bg="white"
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
                          </Flex>
                          <Input
                            size="sm"
                            borderRadius="md"
                            placeholder={documentType === "6" || documentType === "RUC" ? "20100144922" : (documentType === "1" || documentType === "DNI" ? "72435405" : "Nº Documento")}
                            value={documentNumber}
                            maxLength={documentType === "6" || documentType === "RUC" ? 11 : (documentType === "1" || documentType === "DNI" ? 8 : 15)}
                            onChange={(e) => setDocumentNumber(e.target.value.replace(/\D/g, ""))}
                            bg="white"
                            fontWeight="800"
                            borderColor={existingClient ? "red.400" : "gray.300"}
                          />
                        </FormControl>
                      </Grid>

                      {/* CAMPOS DEPENDIENDO DE SI ES PERSONA JURÍDICA O NATURAL */}
                      {personType === "JURIDICO" ? (
                        <Grid templateColumns={{ base: "1fr", md: "1.4fr 1fr 1fr" }} gap={3} mt={3}>
                          <FormControl isRequired>
                            <FormLabel fontSize="xs" fontWeight="700" color="gray.700">Razón Social</FormLabel>
                            <Input
                              size="sm"
                              borderRadius="md"
                              placeholder="Ej. GRUPO PANA S.A."
                              value={cardName}
                              onChange={(e) => setCardName(e.target.value.toUpperCase())}
                              bg="white"
                              fontWeight="700"
                            />
                          </FormControl>

                          <FormControl>
                            <FormLabel fontSize="xs" fontWeight="700" color="gray.700">
                              Nombre Comercial <Text as="span" color="gray.400" fontWeight="normal">(U_VS_NOMCOM)</Text>
                            </FormLabel>
                            <Input
                              size="sm"
                              borderRadius="md"
                              placeholder="Ej. GRUPO PANA"
                              value={commercialName}
                              onChange={(e) => setCommercialName(e.target.value.toUpperCase())}
                              bg="white"
                            />
                          </FormControl>

                          <FormControl>
                            <FormLabel fontSize="xs" fontWeight="700" color="gray.700">
                              Nombre Extranjero <Text as="span" color="gray.400" fontWeight="normal">(ForeignName)</Text>
                            </FormLabel>
                            <Input
                              size="sm"
                              borderRadius="md"
                              placeholder="Ej. PANA GROUP CORP"
                              value={cardForeignName}
                              onChange={(e) => setCardForeignName(e.target.value.toUpperCase())}
                              bg="white"
                            />
                          </FormControl>
                        </Grid>
                      ) : (
                        <Box mt={3}>
                          <Grid templateColumns={{ base: "1fr", sm: "repeat(4, 1fr)" }} gap={2}>
                            <FormControl isRequired>
                              <FormLabel fontSize="xs" fontWeight="700" color="gray.700">Ap. Paterno</FormLabel>
                              <Input
                                size="sm"
                                borderRadius="md"
                                placeholder="Pérez"
                                value={paternalSurname}
                                onChange={(e) => setPaternalSurname(e.target.value.toUpperCase())}
                                bg="white"
                                fontWeight="600"
                              />
                            </FormControl>
                            <FormControl isRequired>
                              <FormLabel fontSize="xs" fontWeight="700" color="gray.700">Ap. Materno</FormLabel>
                              <Input
                                size="sm"
                                borderRadius="md"
                                placeholder="Gómez"
                                value={maternalSurname}
                                onChange={(e) => setMaternalSurname(e.target.value.toUpperCase())}
                                bg="white"
                                fontWeight="600"
                              />
                            </FormControl>
                            <FormControl isRequired>
                              <FormLabel fontSize="xs" fontWeight="700" color="gray.700">Primer Nombre</FormLabel>
                              <Input
                                size="sm"
                                borderRadius="md"
                                placeholder="Juan"
                                value={firstName}
                                onChange={(e) => setFirstName(e.target.value.toUpperCase())}
                                bg="white"
                                fontWeight="600"
                              />
                            </FormControl>
                            <FormControl>
                              <FormLabel fontSize="xs" fontWeight="700" color="gray.700">Segundo Nombre</FormLabel>
                              <Input
                                size="sm"
                                borderRadius="md"
                                placeholder="Carlos"
                                value={secondName}
                                onChange={(e) => setSecondName(e.target.value.toUpperCase())}
                                bg="white"
                              />
                            </FormControl>
                          </Grid>
                          {computedNaturalName && (
                            <Box mt={2} p={2} bg="emerald.50" borderRadius="md" border="1px dashed" borderColor="emerald.300">
                              <Text fontSize="11px" color="emerald.900" fontWeight="700">
                                👁️ Nombre registrado en SAP: <strong>{computedNaturalName}</strong>
                              </Text>
                            </Box>
                          )}
                        </Box>
                      )}

                      <Grid templateColumns={{ base: "repeat(2, 1fr)", sm: "repeat(4, 1fr)" }} gap={3} mt={3}>
                        <FormControl display="flex" flexDirection="column" justifyContent="space-between">
                          <FormLabel fontSize="xs" fontWeight="700" color="gray.700" minH={{ base: "auto", sm: "24px" }} display="flex" alignItems="flex-end" mb={1.5}>
                            Moneda SN
                          </FormLabel>
                          <Select
                            size="sm"
                            borderRadius="md"
                            value={currency}
                            onChange={(e) => setCurrency(e.target.value)}
                            bg="white"
                            fontWeight="600"
                          >
                            <option value="##">## - Monedas (Todas)</option>
                            <option value="SOL">SOL - Soles Peruanos</option>
                            <option value="USD">USD - Dólares Americanos</option>
                          </Select>
                        </FormControl>
                        <FormControl display="flex" flexDirection="column" justifyContent="space-between">
                          <FormLabel fontSize="xs" fontWeight="700" color="gray.700" minH={{ base: "auto", sm: "24px" }} display="flex" alignItems="flex-end" mb={1.5}>
                            Estado SN
                          </FormLabel>
                          <Select
                            size="sm"
                            borderRadius="md"
                            value={validStatus}
                            onChange={(e) => setValidStatus(e.target.value)}
                            bg="white"
                            fontWeight="600"
                          >
                            <option value="tYES">Activo</option>
                            <option value="tNO">Inactivo / Bloqueado</option>
                          </Select>
                        </FormControl>
                        <FormControl display="flex" flexDirection="column" justifyContent="space-between">
                          <FormLabel fontSize="xs" fontWeight="700" color="gray.700" minH={{ base: "auto", sm: "24px" }} display="flex" alignItems="flex-end" mb={1.5}>
                            Canal de Origen
                          </FormLabel>
                          <Input size="sm" borderRadius="md" value="C - Cliente" isReadOnly bg="gray.100" />
                        </FormControl>
                        <FormControl display="flex" flexDirection="column" justifyContent="space-between">
                          <FormLabel fontSize="xs" fontWeight="700" color="gray.700" minH={{ base: "auto", sm: "24px" }} display="flex" alignItems="flex-end" mb={1.5}>
                            Tipo SN
                          </FormLabel>
                          <Input size="sm" borderRadius="md" value="01 - Comercial" isReadOnly bg="gray.100" />
                        </FormControl>
                      </Grid>
                    </Box>
                  </VStack>
                </TabPanel>

                {/* ── PESTAÑA 2: PANEL LATERAL SAP (CAMPOS SUNAT UDFs) ── */}
                <TabPanel p={0}>
                  <VStack spacing={4} align="stretch">
                    {/* 1. SECCIÓN AVAL */}
                    <Box bg="gray.50" p={{ base: 3, sm: 4 }} borderRadius="xl" border="1px solid" borderColor="gray.200">
                      <Text fontSize="11px" fontWeight="900" color="#166534" textTransform="uppercase" letterSpacing="wider" mb={3}>
                        1. Garantías & Datos de Aval
                      </Text>
                      <Grid templateColumns={{ base: "1fr", sm: "repeat(3, 1fr)" }} gap={3}>
                        <FormControl display="flex" flexDirection="column" justifyContent="space-between">
                          <FormLabel fontSize="xs" fontWeight="700" color="gray.700" minH={{ base: "auto", sm: "24px" }} display="flex" alignItems="flex-end" mb={1.5}>
                            Doc. Identidad Aval
                          </FormLabel>
                          <Input size="sm" borderRadius="md" placeholder="DNI o RUC del Aval" value={avalDoc} onChange={(e) => setAvalDoc(e.target.value)} bg="white" />
                        </FormControl>
                        <FormControl display="flex" flexDirection="column" justifyContent="space-between">
                          <FormLabel fontSize="xs" fontWeight="700" color="gray.700" minH={{ base: "auto", sm: "24px" }} display="flex" alignItems="flex-end" mb={1.5}>
                            Teléfono de Aval
                          </FormLabel>
                          <Input size="sm" borderRadius="md" placeholder="Teléfono o Celular" value={avalPhone} onChange={(e) => setAvalPhone(e.target.value)} bg="white" />
                        </FormControl>
                        <FormControl display="flex" flexDirection="column" justifyContent="space-between">
                          <FormLabel fontSize="xs" fontWeight="700" color="gray.700" minH={{ base: "auto", sm: "24px" }} display="flex" alignItems="flex-end" mb={1.5}>
                            Localidad de Aval
                          </FormLabel>
                          <Input size="sm" borderRadius="md" placeholder="Ciudad o Distrito" value={avalLoc} onChange={(e) => setAvalLoc(e.target.value.toUpperCase())} bg="white" />
                        </FormControl>
                      </Grid>
                    </Box>

                    {/* 2. PARÁMETROS TRIBUTARIOS Y ROLES SUNAT */}
                    <Box bg="gray.50" p={{ base: 3, sm: 4 }} borderRadius="xl" border="1px solid" borderColor="gray.200">
                      <Text fontSize="11px" fontWeight="900" color="#166534" textTransform="uppercase" letterSpacing="wider" mb={3}>
                        2. Parámetros Tributarios & Roles (Panel Lateral SAP B1)
                      </Text>
                      <Grid templateColumns={{ base: "repeat(2, 1fr)", md: "repeat(4, 1fr)" }} gap={3}>
                        <FormControl display="flex" flexDirection="column" justifyContent="space-between">
                          <FormLabel fontSize="xs" fontWeight="700" color="gray.700" minH={{ base: "auto", sm: "32px" }} display="flex" alignItems="flex-end" mb={1.5}>
                            Acreedor Transportista
                          </FormLabel>
                          <Select size="sm" borderRadius="md" value={isCarrier} onChange={(e) => setIsCarrier(e.target.value)} bg="white" fontWeight="600">
                            <option value="No">No</option>
                            <option value="Sí">Sí</option>
                          </Select>
                        </FormControl>

                        <FormControl display="flex" flexDirection="column" justifyContent="space-between">
                          <FormLabel fontSize="xs" fontWeight="700" color="gray.700" minH={{ base: "auto", sm: "32px" }} display="flex" alignItems="flex-end" mb={1.5}>
                            Impuesto ISC (Consumo)
                          </FormLabel>
                          <Select size="sm" borderRadius="md" value={isc} onChange={(e) => setIsc(e.target.value)} bg="white" fontWeight="600">
                            <option value="No">No</option>
                            <option value="Sí">Sí</option>
                          </Select>
                        </FormControl>

                        <FormControl display="flex" flexDirection="column" justifyContent="space-between">
                          <FormLabel fontSize="xs" fontWeight="700" color="gray.700" minH={{ base: "auto", sm: "32px" }} display="flex" alignItems="flex-end" mb={1.5}>
                            ¿Tiene Negocio?
                          </FormLabel>
                          <Select size="sm" borderRadius="md" value={hasBusiness} onChange={(e) => setHasBusiness(e.target.value)} bg="white" fontWeight="600">
                            <option value="No">No</option>
                            <option value="Sí">Sí</option>
                          </Select>
                        </FormControl>

                        <FormControl display="flex" flexDirection="column" justifyContent="space-between">
                          <FormLabel fontSize="xs" fontWeight="700" color="gray.700" minH={{ base: "auto", sm: "32px" }} display="flex" alignItems="flex-end" mb={1.5}>
                            ¿Excluir Código?
                          </FormLabel>
                          <Select size="sm" borderRadius="md" value={excludeCode} onChange={(e) => setExcludeCode(e.target.value)} bg="white" fontWeight="600">
                            <option value="No">No</option>
                            <option value="Sí">Sí</option>
                          </Select>
                        </FormControl>

                        <FormControl display="flex" flexDirection="column" justifyContent="space-between">
                          <FormLabel fontSize="xs" fontWeight="700" color="gray.700" minH={{ base: "auto", sm: "32px" }} display="flex" alignItems="flex-end" mb={1.5}>
                            Tipo de Agente
                          </FormLabel>
                          <Select size="sm" borderRadius="md" value={agentType} onChange={(e) => setAgentType(e.target.value)} bg="white" fontWeight="600">
                            <option value="Ninguno">Ninguno</option>
                            <option value="R">Agente de Retención</option>
                            <option value="P">Agente de Percepción</option>
                            <option value="B">Buen Contribuyente</option>
                          </Select>
                        </FormControl>

                        <FormControl display="flex" flexDirection="column" justifyContent="space-between">
                          <FormLabel fontSize="xs" fontWeight="700" color="gray.700" minH={{ base: "auto", sm: "32px" }} display="flex" alignItems="flex-end" mb={1.5}>
                            ¿SN Empleado?
                          </FormLabel>
                          <Select size="sm" borderRadius="md" value={isEmployee} onChange={(e) => setIsEmployee(e.target.value)} bg="white" fontWeight="600">
                            <option value="No">No</option>
                            <option value="Sí">Sí</option>
                          </Select>
                        </FormControl>

                        <FormControl display="flex" flexDirection="column" justifyContent="space-between">
                          <FormLabel fontSize="xs" fontWeight="700" color="gray.700" minH={{ base: "auto", sm: "32px" }} display="flex" alignItems="flex-end" mb={1.5}>
                            Proveedor con DNI
                          </FormLabel>
                          <Select size="sm" borderRadius="md" value={supplierWithDni} onChange={(e) => setSupplierWithDni(e.target.value)} bg="white" fontWeight="600">
                            <option value="No">No</option>
                            <option value="Sí">Sí</option>
                          </Select>
                        </FormControl>

                        <FormControl display="flex" flexDirection="column" justifyContent="space-between">
                          <FormLabel fontSize="xs" fontWeight="700" color="gray.700" minH={{ base: "auto", sm: "32px" }} display="flex" alignItems="flex-end" mb={1.5}>
                            Validar IDC
                          </FormLabel>
                          <Select size="sm" borderRadius="md" value={validateIdc} onChange={(e) => setValidateIdc(e.target.value)} bg="white" fontWeight="600">
                            <option value="No">No</option>
                            <option value="Sí">Sí</option>
                          </Select>
                        </FormControl>
                      </Grid>
                    </Box>

                    {/* 3. CONDICIÓN SUNAT & CONTRIBUYENTE */}
                    <Box bg="gray.50" p={{ base: 3, sm: 4 }} borderRadius="xl" border="1px solid" borderColor="gray.200">
                      <Text fontSize="11px" fontWeight="900" color="#166534" textTransform="uppercase" letterSpacing="wider" mb={3}>
                        3. Estado & Condición Contribuyente SUNAT
                      </Text>
                      <Grid templateColumns={{ base: "repeat(2, 1fr)", sm: "repeat(3, 1fr)", lg: "repeat(5, 1fr)" }} gap={3}>
                        <FormControl display="flex" flexDirection="column" justifyContent="space-between">
                          <FormLabel fontSize="xs" fontWeight="700" color="gray.700" minH={{ base: "auto", sm: "32px" }} display="flex" alignItems="flex-end" mb={1.5}>
                            Estado Contribuyente
                          </FormLabel>
                          <Select size="sm" borderRadius="md" value={contribState} onChange={(e) => setContribState(e.target.value)} bg="white" fontWeight="600">
                            <option value="ACTIVO">ACTIVO</option>
                            <option value="BAJA PROVISIONAL">BAJA PROVISIONAL</option>
                            <option value="BAJA DEFINITIVA">BAJA DEFINITIVA</option>
                            <option value="SUSPENSION TEMPORAL">SUSPENSIÓN TEMPORAL</option>
                          </Select>
                        </FormControl>

                        <FormControl display="flex" flexDirection="column" justifyContent="space-between">
                          <FormLabel fontSize="xs" fontWeight="700" color="gray.700" minH={{ base: "auto", sm: "32px" }} display="flex" alignItems="flex-end" mb={1.5}>
                            Condición Contribuyente
                          </FormLabel>
                          <Select size="sm" borderRadius="md" value={contribCondition} onChange={(e) => setContribCondition(e.target.value)} bg="white" fontWeight="600">
                            <option value="HABIDO">HABIDO</option>
                            <option value="NO HABIDO">NO HABIDO</option>
                            <option value="NO HALLADO">NO HALLADO</option>
                          </Select>
                        </FormControl>

                        <FormControl display="flex" flexDirection="column" justifyContent="space-between">
                          <FormLabel fontSize="xs" fontWeight="700" color="gray.700" minH={{ base: "auto", sm: "32px" }} display="flex" alignItems="flex-end" mb={1.5}>
                            Agente Retención
                          </FormLabel>
                          <Select size="sm" borderRadius="md" value={isRetentionAgent} onChange={(e) => setIsRetentionAgent(e.target.value)} bg="white" fontWeight="600">
                            <option value="No">No</option>
                            <option value="Sí">Sí</option>
                          </Select>
                        </FormControl>

                        <FormControl display="flex" flexDirection="column" justifyContent="space-between">
                          <FormLabel fontSize="xs" fontWeight="700" color="gray.700" minH={{ base: "auto", sm: "32px" }} display="flex" alignItems="flex-end" mb={1.5}>
                            Agente Percepción
                          </FormLabel>
                          <Select size="sm" borderRadius="md" value={isPerceptionAgent} onChange={(e) => setIsPerceptionAgent(e.target.value)} bg="white" fontWeight="600">
                            <option value="No">No</option>
                            <option value="Sí">Sí</option>
                          </Select>
                        </FormControl>

                        <FormControl display="flex" flexDirection="column" justifyContent="space-between" gridColumn={{ base: "span 2", sm: "span 1" }}>
                          <FormLabel fontSize="xs" fontWeight="700" color="gray.700" minH={{ base: "auto", sm: "32px" }} display="flex" alignItems="flex-end" mb={1.5}>
                            Buen Contribuyente
                          </FormLabel>
                          <Select size="sm" borderRadius="md" value={isGoodTaxpayer} onChange={(e) => setIsGoodTaxpayer(e.target.value)} bg="white" fontWeight="600">
                            <option value="No">No</option>
                            <option value="Sí">Sí</option>
                          </Select>
                        </FormControl>
                      </Grid>
                    </Box>
                  </VStack>
                </TabPanel>

                {/* ── PESTAÑA 3: DIRECCIONES (FISCAL Y DESPACHO) ── */}
                <TabPanel p={0}>
                  <VStack spacing={4} align="stretch">
                    {/* DIRECCIÓN FISCAL */}
                    <Box bg="gray.50" p={4} borderRadius="xl" border="1px solid" borderColor="gray.200">
                      <Flex justify="space-between" align="center" mb={2}>
                        <Text fontSize="11px" fontWeight="900" color="#166534" textTransform="uppercase" letterSpacing="wider">
                          Dirección Fiscal Oficial (bo_BillTo - FISCAL)
                        </Text>
                        <Badge colorScheme="purple" fontSize="9px">Facturación</Badge>
                      </Flex>

                      <FormControl isRequired>
                        <FormLabel fontSize="xs" fontWeight="700" color="gray.700">Dirección (Calle / Av. / Jr. / Nro / Urb.)</FormLabel>
                        <Input
                          size="sm"
                          borderRadius="md"
                          placeholder="Ej. AV. AVIACION 4928 HIGUERETA"
                          value={address}
                          onChange={(e) => setAddress(e.target.value.toUpperCase())}
                          bg="white"
                          fontWeight="600"
                        />
                      </FormControl>

                      <Grid templateColumns={{ base: "repeat(2, 1fr)", sm: "repeat(4, 1fr)" }} gap={2} mt={3}>
                        <FormControl display="flex" flexDirection="column" justifyContent="space-between">
                          <FormLabel fontSize="xs" fontWeight="700" color="gray.700" minH={{ base: "auto", sm: "24px" }} display="flex" alignItems="flex-end" mb={1}>
                            Departamento
                          </FormLabel>
                          <Input size="sm" borderRadius="md" value={department} onChange={(e) => setDepartment(e.target.value.toUpperCase())} bg="white" />
                        </FormControl>
                        <FormControl display="flex" flexDirection="column" justifyContent="space-between">
                          <FormLabel fontSize="xs" fontWeight="700" color="gray.700" minH={{ base: "auto", sm: "24px" }} display="flex" alignItems="flex-end" mb={1}>
                            Provincia
                          </FormLabel>
                          <Input size="sm" borderRadius="md" value={province} onChange={(e) => setProvince(e.target.value.toUpperCase())} bg="white" />
                        </FormControl>
                        <FormControl display="flex" flexDirection="column" justifyContent="space-between">
                          <FormLabel fontSize="xs" fontWeight="700" color="gray.700" minH={{ base: "auto", sm: "24px" }} display="flex" alignItems="flex-end" mb={1}>
                            Distrito
                          </FormLabel>
                          <Input size="sm" borderRadius="md" placeholder="SANTIAGO DE SURCO" value={district} onChange={(e) => setDistrict(e.target.value.toUpperCase())} bg="white" />
                        </FormControl>
                        <FormControl display="flex" flexDirection="column" justifyContent="space-between">
                          <FormLabel fontSize="xs" fontWeight="700" color="gray.700" minH={{ base: "auto", sm: "24px" }} display="flex" alignItems="flex-end" mb={1}>
                            Ubigeo / GLN
                          </FormLabel>
                          <Input size="sm" borderRadius="md" placeholder="150140" value={zipCode} onChange={(e) => setZipCode(e.target.value)} bg="white" />
                        </FormControl>
                      </Grid>
                    </Box>

                    {/* DIRECCIÓN DE DESPACHO */}
                    <Box bg="gray.50" p={4} borderRadius="xl" border="1px solid" borderColor="gray.200">
                      <Flex justify="space-between" align="center" wrap="wrap" gap={2} mb={2}>
                        <Text fontSize="11px" fontWeight="900" color="#166534" textTransform="uppercase" letterSpacing="wider">
                          Punto de Entrega / Despacho (bo_ShipTo - ALMACEN)
                        </Text>
                        <HStack spacing={2}>
                          <Text fontSize="xs" color="gray.600" fontWeight="600">Misma que dirección fiscal</Text>
                          <Switch
                            colorScheme="emerald"
                            isChecked={sameDeliveryAddress}
                            onChange={(e) => setSameDeliveryAddress(e.target.checked)}
                          />
                        </HStack>
                      </Flex>

                      {!sameDeliveryAddress && (
                        <Grid templateColumns={{ base: "1fr", sm: "180px 1fr" }} gap={3} mt={3}>
                          <FormControl>
                            <FormLabel fontSize="xs" fontWeight="700" color="gray.700">Nombre Sede / Almacén</FormLabel>
                            <Input
                              size="sm"
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
                              size="sm"
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
                  </VStack>
                </TabPanel>

                {/* ── PESTAÑA 4: CONTACTO & COMUNICACIÓN ── */}
                <TabPanel p={0}>
                  <VStack spacing={4} align="stretch">
                    <Box bg="gray.50" p={4} borderRadius="xl" border="1px solid" borderColor="gray.200">
                      <Text fontSize="11px" fontWeight="900" color="#166534" textTransform="uppercase" letterSpacing="wider" mb={3}>
                        Canales de Contacto Directo
                      </Text>

                      <Grid templateColumns={{ base: "repeat(2, 1fr)", sm: "repeat(4, 1fr)" }} gap={3}>
                        <FormControl display="flex" flexDirection="column" justifyContent="space-between">
                          <FormLabel fontSize="xs" fontWeight="700" color="gray.700" minH={{ base: "auto", sm: "24px" }} display="flex" alignItems="flex-end" mb={1}>
                            Teléfono Móvil
                          </FormLabel>
                          <Input size="sm" borderRadius="md" placeholder="905468311" value={cellular} onChange={(e) => setCellular(e.target.value)} bg="white" />
                        </FormControl>
                        <FormControl display="flex" flexDirection="column" justifyContent="space-between">
                          <FormLabel fontSize="xs" fontWeight="700" color="gray.700" minH={{ base: "auto", sm: "24px" }} display="flex" alignItems="flex-end" mb={1}>
                            Teléfono Fijo
                          </FormLabel>
                          <Input size="sm" borderRadius="md" placeholder="014928000" value={phone} onChange={(e) => setPhone(e.target.value)} bg="white" />
                        </FormControl>
                        <FormControl display="flex" flexDirection="column" justifyContent="space-between">
                          <FormLabel fontSize="xs" fontWeight="700" color="gray.700" minH={{ base: "auto", sm: "24px" }} display="flex" alignItems="flex-end" mb={1}>
                            Anexo / Teléf. 2
                          </FormLabel>
                          <Input size="sm" borderRadius="md" placeholder="Anexo 104" value={phone2} onChange={(e) => setPhone2(e.target.value)} bg="white" />
                        </FormControl>
                        <FormControl display="flex" flexDirection="column" justifyContent="space-between">
                          <FormLabel fontSize="xs" fontWeight="700" color="gray.700" minH={{ base: "auto", sm: "24px" }} display="flex" alignItems="flex-end" mb={1}>
                            Sitio Web
                          </FormLabel>
                          <Input size="sm" borderRadius="md" placeholder="www.grupopana.com.pe" value={website} onChange={(e) => setWebsite(e.target.value)} bg="white" />
                        </FormControl>
                      </Grid>

                      <Grid templateColumns={{ base: "1fr", sm: "1.2fr 1.2fr 1fr" }} gap={3} mt={3}>
                        <FormControl display="flex" flexDirection="column" justifyContent="space-between">
                          <FormLabel fontSize="xs" fontWeight="700" color="gray.700" minH={{ base: "auto", sm: "24px" }} display="flex" alignItems="flex-end" mb={1}>
                            Correo Principal
                          </FormLabel>
                          <Input size="sm" borderRadius="md" type="email" placeholder="contacto@empresa.com" value={email} onChange={(e) => setEmail(e.target.value)} bg="white" />
                        </FormControl>
                        <FormControl display="flex" flexDirection="column" justifyContent="space-between">
                          <FormLabel fontSize="xs" fontWeight="700" color="gray.700" minH={{ base: "auto", sm: "24px" }} display="flex" alignItems="flex-end" mb={1}>
                            Correo Secundario
                          </FormLabel>
                          <Input size="sm" borderRadius="md" type="email" placeholder="facturacion@empresa.com" value={secondaryEmail} onChange={(e) => setSecondaryEmail(e.target.value)} bg="white" />
                        </FormControl>
                        <FormControl display="flex" flexDirection="column" justifyContent="space-between">
                          <FormLabel fontSize="xs" fontWeight="700" color="gray.700" minH={{ base: "auto", sm: "24px" }} display="flex" alignItems="flex-end" mb={1}>
                            ID Número 2
                          </FormLabel>
                          <Input size="sm" borderRadius="md" placeholder="Ej. ID-9941" value={additionalId} onChange={(e) => setAdditionalId(e.target.value)} bg="white" />
                        </FormControl>
                      </Grid>
                    </Box>

                    {/* PERSONA DE CONTACTO PRINCIPAL */}
                    <Box bg="gray.50" p={{ base: 3, sm: 4 }} borderRadius="xl" border="1px solid" borderColor="gray.200">
                      <Text fontSize="11px" fontWeight="900" color="#166534" textTransform="uppercase" letterSpacing="wider" mb={3}>
                        Persona de Contacto en la Empresa (ContactEmployees)
                      </Text>

                      <Grid templateColumns={{ base: "1fr", sm: "repeat(2, 1fr)", md: "1.5fr 1fr 1fr 1fr" }} gap={3}>
                        <FormControl display="flex" flexDirection="column" justifyContent="space-between">
                          <FormLabel fontSize="xs" fontWeight="700" color="gray.700" minH={{ base: "auto", sm: "24px" }} display="flex" alignItems="flex-end" mb={1}>
                            Nombres y Apellidos
                          </FormLabel>
                          <Input size="sm" borderRadius="md" placeholder="KEVIN MORI" value={contactPerson} onChange={(e) => setContactPerson(e.target.value.toUpperCase())} bg="white" />
                        </FormControl>
                        <FormControl display="flex" flexDirection="column" justifyContent="space-between">
                          <FormLabel fontSize="xs" fontWeight="700" color="gray.700" minH={{ base: "auto", sm: "24px" }} display="flex" alignItems="flex-end" mb={1}>
                            Cargo / Posición
                          </FormLabel>
                          <Input size="sm" borderRadius="md" placeholder="JEFE DE COMPRAS" value={contactPosition} onChange={(e) => setContactPosition(e.target.value.toUpperCase())} bg="white" />
                        </FormControl>
                        <FormControl display="flex" flexDirection="column" justifyContent="space-between">
                          <FormLabel fontSize="xs" fontWeight="700" color="gray.700" minH={{ base: "auto", sm: "24px" }} display="flex" alignItems="flex-end" mb={1}>
                            Celular de Contacto
                          </FormLabel>
                          <Input size="sm" borderRadius="md" placeholder="905468311" value={contactPhone} onChange={(e) => setContactPhone(e.target.value)} bg="white" />
                        </FormControl>
                        <FormControl display="flex" flexDirection="column" justifyContent="space-between">
                          <FormLabel fontSize="xs" fontWeight="700" color="gray.700" minH={{ base: "auto", sm: "24px" }} display="flex" alignItems="flex-end" mb={1}>
                            Email de Contacto
                          </FormLabel>
                          <Input size="sm" borderRadius="md" type="email" placeholder="kmori@empresa.com" value={contactEmail} onChange={(e) => setContactEmail(e.target.value)} bg="white" />
                        </FormControl>
                      </Grid>

                      <FormControl mt={3}>
                        <FormLabel fontSize="xs" fontWeight="700" color="gray.700">Comentarios u Observaciones Comerciales</FormLabel>
                        <Textarea
                          size="sm"
                          borderRadius="md"
                          rows={2}
                          placeholder="Observaciones de despacho, horarios de atención, restricciones..."
                          value={notes}
                          onChange={(e) => setNotes(e.target.value)}
                          bg="white"
                        />
                      </FormControl>
                    </Box>
                  </VStack>
                </TabPanel>

                {/* ── PESTAÑA 5: CONDICIONES COMERCIALES & FINANZAS ── */}
                <TabPanel p={0}>
                  <VStack spacing={4} align="stretch">
                    <Box bg="gray.50" p={4} borderRadius="xl" border="1px solid" borderColor="gray.200">
                      <Text fontSize="11px" fontWeight="900" color="#166534" textTransform="uppercase" letterSpacing="wider" mb={3}>
                        Condiciones de Pago & Precios
                      </Text>

                      <Grid templateColumns={{ base: "1fr", sm: "repeat(3, 1fr)" }} gap={3}>
                        <FormControl display="flex" flexDirection="column" justifyContent="space-between">
                          <FormLabel fontSize="xs" fontWeight="700" color="gray.700" minH={{ base: "auto", sm: "24px" }} display="flex" alignItems="flex-end" mb={1}>
                            Condición de Pago
                          </FormLabel>
                          <Select
                            size="sm"
                            borderRadius="md"
                            value={payTermsGrpCode}
                            onChange={(e) => setPayTermsGrpCode(e.target.value)}
                            bg="white"
                            fontWeight="600"
                          >
                            <option value="-1">-1 - Contado</option>
                            {paymentTermsList.map((pt) => (
                              <option key={pt.GroupNumber ?? pt.GroupNum} value={pt.GroupNumber ?? pt.GroupNum}>
                                {pt.PaymentTermsGroupName || pt.PymntGroup || `Condición ${pt.GroupNum}`}
                              </option>
                            ))}
                          </Select>
                        </FormControl>

                        <FormControl display="flex" flexDirection="column" justifyContent="space-between">
                          <FormLabel fontSize="xs" fontWeight="700" color="gray.700" minH={{ base: "auto", sm: "24px" }} display="flex" alignItems="flex-end" mb={1}>
                            Lista de Precios
                          </FormLabel>
                          <Select
                            size="sm"
                            borderRadius="md"
                            value={priceListNum}
                            onChange={(e) => setPriceListNum(e.target.value)}
                            bg="white"
                            fontWeight="600"
                          >
                            <option value="1">1 - Base Mayorista</option>
                            <option value="2">2 - Distribuidor</option>
                            <option value="3">3 - Especial</option>
                          </Select>
                        </FormControl>

                        <FormControl display="flex" flexDirection="column" justifyContent="space-between">
                          <FormLabel fontSize="xs" fontWeight="700" color="gray.700" minH={{ base: "auto", sm: "24px" }} display="flex" alignItems="flex-end" mb={1}>
                            Límite de Crédito USD
                          </FormLabel>
                          <Input
                            size="sm"
                            borderRadius="md"
                            type="number"
                            placeholder="0"
                            value={creditLimit}
                            onChange={(e) => setCreditLimit(e.target.value)}
                            bg="white"
                            fontWeight="700"
                          />
                        </FormControl>
                      </Grid>

                      <Grid templateColumns={{ base: "1fr", sm: "1fr 1fr" }} gap={3} mt={3}>
                        <FormControl display="flex" flexDirection="column" justifyContent="space-between">
                          <FormLabel fontSize="xs" fontWeight="700" color="gray.700" minH={{ base: "auto", sm: "24px" }} display="flex" alignItems="flex-end" mb={1}>
                            Vendedor Asignado (SAP)
                          </FormLabel>
                          <Select
                            size="sm"
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

                        <FormControl display="flex" flexDirection="column" justifyContent="space-between">
                          <FormLabel fontSize="xs" fontWeight="700" color="gray.700" minH={{ base: "auto", sm: "24px" }} display="flex" alignItems="flex-end" mb={1}>
                            Moneda del Socio
                          </FormLabel>
                          <Input size="sm" borderRadius="md" value="## - Multimoneda (Soles / USD / EUR)" isReadOnly bg="gray.100" fontWeight="700" />
                        </FormControl>
                      </Grid>

                      <Divider my={3} />

                      <Flex justify="space-between" align="center" wrap="wrap" gap={2} mb={2}>
                        <Box>
                          <Text fontSize="11px" fontWeight="900" color="#166534" textTransform="uppercase" letterSpacing="wider">
                            Cuentas Contables y Retenciones (SAP B1)
                          </Text>
                          <Text fontSize="10px" color="gray.500">
                            Valores oficiales predeterminados del plan contable de SAP Perú. Se generan automáticamente y son editables si contabilidad lo requiere.
                          </Text>
                        </Box>
                        <Badge bg="#dcfce7" color="#166534" fontSize="10px" fontWeight="800" px={2} py={0.5} borderRadius="md" border="1px solid #86efac">
                          ⚡ Se genera en automático
                        </Badge>
                      </Flex>

                      <Grid templateColumns={{ base: "1fr", sm: "repeat(3, 1fr)" }} gap={3}>
                        <FormControl display="flex" flexDirection="column" justifyContent="space-between">
                          <FormLabel fontSize="xs" fontWeight="700" color="gray.700" minH={{ base: "auto", sm: "24px" }} display="flex" alignItems="flex-end" mb={1}>
                            Cuenta Deudora (DebitorAccount)
                          </FormLabel>
                          <Input
                            size="sm"
                            borderRadius="md"
                            value={debitorAccount}
                            onChange={(e) => setDebitorAccount(e.target.value)}
                            placeholder="1212101"
                            bg="white"
                            fontWeight="700"
                          />
                          <Text fontSize="10px" color="gray.500" mt={1}>
                            1212101 - Facturas por cobrar comerciales
                          </Text>
                        </FormControl>

                        <FormControl display="flex" flexDirection="column" justifyContent="space-between">
                          <FormLabel fontSize="xs" fontWeight="700" color="gray.700" minH={{ base: "auto", sm: "24px" }} display="flex" alignItems="flex-end" mb={1}>
                            Cuenta Anticipos (DownPaymentClearAct)
                          </FormLabel>
                          <Input
                            size="sm"
                            borderRadius="md"
                            value={downPaymentClearAct}
                            onChange={(e) => setDownPaymentClearAct(e.target.value)}
                            placeholder="1221101"
                            bg="white"
                            fontWeight="700"
                          />
                          <Text fontSize="10px" color="gray.500" mt={1}>
                            1221101 - Anticipos recibidos de clientes
                          </Text>
                        </FormControl>

                        <FormControl display="flex" flexDirection="column" justifyContent="space-between">
                          <FormLabel fontSize="xs" fontWeight="700" color="gray.700" minH={{ base: "auto", sm: "24px" }} display="flex" alignItems="flex-end" mb={1}>
                            Sujeto a Impuesto (VatLiable)
                          </FormLabel>
                          <Select
                            size="sm"
                            borderRadius="md"
                            value={vatLiable}
                            onChange={(e) => setVatLiable(e.target.value)}
                            bg="white"
                            fontWeight="700"
                          >
                            <option value="vLiable">vLiable - Sujeto a IGV (18%)</option>
                            <option value="vExempt">vExempt - Exonerado / Inafecto</option>
                          </Select>
                          <Text fontSize="10px" color="gray.500" mt={1}>
                            Afectación al régimen de IGV
                          </Text>
                        </FormControl>
                      </Grid>
                    </Box>
                  </VStack>
                </TabPanel>
              </TabPanels>
            </Tabs>
          </VStack>
        </ModalBody>

        <ModalFooter borderTop="1px solid" borderColor="gray.100" pt={3} pb={{ base: 4, md: 3 }} bg="gray.50" borderBottomRadius={{ base: "none", md: "2xl" }}>
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
              <Button size="sm" variant="ghost" onClick={handleClose} isDisabled={isSubmitting} flex={{ base: 1, sm: "initial" }}>
                Cancelar
              </Button>
              <Button
                size="sm"
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
                px={4}
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
