import {
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Button,
  Input,
  FormControl,
  FormLabel,
  Select,
  FormErrorMessage,
  VStack,
  HStack,
  Box,
  Text,
  Badge,
  Spinner,
} from "@chakra-ui/react";
import { useEffect, useState } from "react";
import { saveClientPhone } from "../../receivable/utils/clientPhoneDirectory";
import {
  searchNewClients,
  fetchClientByCode,
  fetchClientByName,
} from "../../clients/services/clientService";

export function NewClientModal({ isOpen, onClose, onCreate, onSelectExisting, initialData }) {
  const [form, setForm] = useState({
    fullName: "",
    personType: "NATURAL",
    documentType: "DNI",
    documentNumber: "",
    phone: "",
    email: "",
  });

  const [errors, setErrors] = useState({});
  const [duplicateMatch, setDuplicateMatch] = useState(null);
  const [isCheckingDuplicate, setIsCheckingDuplicate] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setForm({
        fullName: initialData?.fullName || "",
        personType: initialData?.personType || "NATURAL",
        documentType: initialData?.documentType || (initialData?.personType === "JURIDICO" ? "RUC" : "DNI"),
        documentNumber: initialData?.documentNumber || "",
        phone: initialData?.phone || "",
        email: initialData?.email || "",
      });
      setErrors({});
      setDuplicateMatch(null);
    }
  }, [isOpen, initialData]);

  // Verificación en segundo plano de duplicados por Documento o Nombre
  useEffect(() => {
    let isMounted = true;
    const doc = form.documentNumber ? form.documentNumber.trim() : "";
    const name = form.fullName ? form.fullName.trim() : "";

    if (!doc && name.length < 3) {
      setDuplicateMatch(null);
      setIsCheckingDuplicate(false);
      return;
    }

    const timer = setTimeout(async () => {
      setIsCheckingDuplicate(true);
      try {
        // 1. Revisar si coincide con un cliente nuevo temporal existente por documento o nombre
        if (doc) {
          const tempMatches = await searchNewClients(doc);
          const exactDocMatch = tempMatches.find(
            (c) => c.documentNumber && c.documentNumber.trim() === doc
          );
          if (exactDocMatch && isMounted) {
            setDuplicateMatch({ type: "NEW_TEMP", client: exactDocMatch, reason: "documento" });
            setIsCheckingDuplicate(false);
            return;
          }
        }

        if (name && name.length >= 3) {
          const tempMatchesName = await searchNewClients(name);
          const exactNameMatch = tempMatchesName.find(
            (c) => c.fullName && c.fullName.trim().toUpperCase() === name.toUpperCase()
          );
          if (exactNameMatch && isMounted) {
            setDuplicateMatch({ type: "NEW_TEMP", client: exactNameMatch, reason: "nombre" });
            setIsCheckingDuplicate(false);
            return;
          }
        }

        // 2. Revisar si coincide con la cartera SAP
        if (doc && (doc.length === 8 || doc.length === 11)) {
          try {
            const sapClient = await fetchClientByCode(`CL${doc}`);
            if (sapClient && isMounted) {
              setDuplicateMatch({ type: "SAP", client: sapClient, reason: "documento en Cartera SAP" });
              setIsCheckingDuplicate(false);
              return;
            }
          } catch (_) {}
        }

        if (name && name.length >= 4) {
          try {
            const sapByName = await fetchClientByName(name);
            const sapList = sapByName?.value || [];
            const exactSapName = sapList.find(
              (c) => (c.CardName || "").trim().toUpperCase() === name.toUpperCase()
            );
            if (exactSapName && isMounted) {
              setDuplicateMatch({ type: "SAP", client: exactSapName, reason: "nombre en Cartera SAP" });
              setIsCheckingDuplicate(false);
              return;
            }
          } catch (_) {}
        }

        if (isMounted) {
          setDuplicateMatch(null);
        }
      } catch (err) {
        console.warn("Error comprobando duplicados:", err);
      } finally {
        if (isMounted) setIsCheckingDuplicate(false);
      }
    }, 450);

    return () => {
      isMounted = false;
      clearTimeout(timer);
    };
  }, [form.documentNumber, form.fullName]);

  const documentOptions = {
    NATURAL: ["DNI", "CE", "PASAPORTE"],
    JURIDICO: ["RUC"],
  };

  const handleChange = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    validateField(field, value);
  };

  const handlePersonTypeChange = (value) => {
    handleChange("personType", value);

    if (value === "JURIDICO") {
      handleChange("documentType", "RUC");
      handleChange("documentNumber", "");
    } else {
      handleChange("documentType", "DNI");
      handleChange("documentNumber", "");
    }
  };

  const validateField = (field, value) => {
    let error = "";

    switch (field) {
      case "fullName":
        if (!value.trim()) {
          error = "Campo obligatorio";
        } else if (value.trim().length < 3) {
          error = "Mínimo 3 caracteres";
        } else if (form.personType === "NATURAL" && !/^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s.-]+$/.test(value)) {
          error = "Solo letras y espacios";
        } else if (form.personType === "JURIDICO" && !/^[a-zA-Z0-9áéíóúÁÉÍÓÚñÑ\s.&/,-]+$/.test(value)) {
          error = "Caracteres no válidos para Razón Social";
        }
        break;

      case "documentNumber":
        if (value && value.toString().trim() !== "") {
          if (!/^\d+$/.test(value))
            error = "Solo números";
          else if (form.documentType === "DNI" && value.toString().length !== 8)
            error = "DNI: 8 dígitos";
          else if (form.documentType === "RUC" && value.toString().length !== 11)
            error = "RUC: 11 dígitos";
        }
        break;

      case "phone":
        if (value && value.toString().trim() !== "") {
          if (!/^9\d{8}$/.test(value))
            error = "Debe empezar en 9 y tener 9 dígitos";
        }
        break;

      case "email":
        if (value && value.trim() !== "") {
          if (!/^[^\s@]+@[^\s@]+\.[a-zA-Z]{2,}$/.test(value))
            error = "Correo inválido";
        }
        break;

      default:
        break;
    }

    setErrors((prev) => ({ ...prev, [field]: error }));
    return error;
  };

  const validateAll = () => {
    const newErrors = {};
    let isValid = true;

    Object.keys(form).forEach((field) => {
      const error = validateField(field, form[field]);
      if (error) {
        isValid = false;
        newErrors[field] = error;
      } else {
        newErrors[field] = "";
      }
    });

    setErrors(newErrors);
    return isValid;
  };

  const handleSubmit = () => {
    if (duplicateMatch) {
      setErrors((prev) => ({
        ...prev,
        fullName: "Ya existe un cliente con este nombre o documento. Selecciona el cliente existente arriba para evitar duplicados.",
      }));
      return;
    }

    const isValid = validateAll();
    if (!isValid) return;

    if (form.documentNumber && form.phone) {
      saveClientPhone(form.documentNumber, form.phone, form.fullName);
    }

    onCreate({
      type: "NEW",
      firstName: form.fullName.trim(),
      personType: form.personType,
      documentType: form.documentType,
      documentNumber: form.documentNumber,
      phone: form.phone,
      email: form.email.trim(),
    });

    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="lg">
      <ModalOverlay />
      <ModalContent borderRadius="2xl">
        <ModalHeader borderBottom="1px solid" borderColor="gray.100" pb={3}>
          <HStack justify="space-between" align="center">
            <Text fontSize="lg" fontWeight="800" color="gray.850">
              Registrar Cliente Nuevo
            </Text>
            {isCheckingDuplicate && (
              <HStack spacing={1.5} color="gray.500" fontSize="xs">
                <Spinner size="xs" color="amber.500" />
                <Text>Verificando duplicados...</Text>
              </HStack>
            )}
          </HStack>
        </ModalHeader>

        <ModalBody py={4}>
          <VStack spacing={4} align="stretch">
            {/* ALERTA DE CLIENTE DUPLICADO SI SE DETECTA COINCIDENCIA */}
            {duplicateMatch && (
              <Box
                p={3.5}
                bg="amber.50"
                borderRadius="xl"
                border="1.5px solid"
                borderColor="amber.400"
                boxShadow="0 4px 12px rgba(217, 119, 6, 0.12)"
              >
                <HStack justify="space-between" mb={1}>
                  <Text fontSize="xs" fontWeight="800" color="amber.900">
                    ⚠️ CLIENTE YA EXISTENTE ({duplicateMatch.type === "SAP" ? "CARTERA SAP" : "CLIENTE NUEVO EN CAMPO"})
                  </Text>
                  <Badge bg="amber.500" color="white" fontSize="9px" px={2} py={0.5} borderRadius="full">
                    POR {duplicateMatch.reason.toUpperCase()}
                  </Badge>
                </HStack>
                <Text fontSize="sm" color="amber.950" fontWeight="850" mb={0.5}>
                  {duplicateMatch.client.fullName || duplicateMatch.client.CardName || duplicateMatch.client.firstName}
                </Text>
                <Text fontSize="xs" color="amber.850" mb={2}>
                  Código: <strong>{duplicateMatch.client.sapCode || duplicateMatch.client.CardCode || duplicateMatch.client.id}</strong>
                  {duplicateMatch.client.createdBy ? ` • Registrado por: ${duplicateMatch.client.createdBy}` : ""}
                </Text>
                <Button
                  size="sm"
                  w="full"
                  bg="linear-gradient(135deg, #14532d 0%, #166534 50%, #15803d 100%)"
                  color="white"
                  fontWeight="700"
                  borderRadius="lg"
                  _hover={{ bg: "#0d4226" }}
                  onClick={() => {
                    onSelectExisting?.(duplicateMatch);
                  }}
                >
                  Seleccionar este Cliente Existente (Evitar Duplicado)
                </Button>
              </Box>
            )}

            <FormControl>
              <FormLabel fontSize="xs" fontWeight="700">Tipo de persona</FormLabel>
              <Select
                value={form.personType}
                onChange={(e) => handlePersonTypeChange(e.target.value)}
                borderRadius="xl"
              >
                <option value="NATURAL">Persona Natural</option>
                <option value="JURIDICO">Persona Jurídica</option>
              </Select>
            </FormControl>

            <FormControl>
              <FormLabel fontSize="xs" fontWeight="700">Tipo de documento</FormLabel>
              <Select
                value={form.documentType}
                onChange={(e) => handleChange("documentType", e.target.value)}
                borderRadius="xl"
              >
                {documentOptions[form.personType].map((doc) => (
                  <option key={doc} value={doc}>
                    {doc}
                  </option>
                ))}
              </Select>
            </FormControl>

            <FormControl isInvalid={errors.fullName}>
              <FormLabel fontSize="xs" fontWeight="700">Nombre completo o Razón Social</FormLabel>
              <Input
                value={form.fullName}
                onChange={(e) =>
                  handleChange("fullName", e.target.value.toUpperCase())
                }
                borderRadius="xl"
                placeholder="Ej. BATERIAS GARCIA / FREDDY AYALA"
              />
              <FormErrorMessage>{errors.fullName}</FormErrorMessage>
            </FormControl>

            <FormControl isInvalid={errors.documentNumber}>
              <FormLabel fontSize="xs" fontWeight="700">Número de documento (Opcional)</FormLabel>
              <Input
                value={form.documentNumber}
                onChange={(e) =>
                  handleChange(
                    "documentNumber",
                    e.target.value.replace(/\D/g, "")
                  )
                }
                borderRadius="xl"
                maxLength={form.documentType === "RUC" ? 11 : 8}
                placeholder={form.documentType === "RUC" ? "11 dígitos" : "8 dígitos"}
              />
              <FormErrorMessage>{errors.documentNumber}</FormErrorMessage>
            </FormControl>

            <FormControl isInvalid={errors.phone}>
              <FormLabel fontSize="xs" fontWeight="700">Teléfono</FormLabel>
              <Input
                value={form.phone}
                onChange={(e) =>
                  handleChange("phone", e.target.value.replace(/\D/g, ""))
                }
                borderRadius="xl"
                maxLength={9}
                placeholder="9 dígitos"
              />
              <FormErrorMessage>{errors.phone}</FormErrorMessage>
            </FormControl>

            <FormControl isInvalid={errors.email}>
              <FormLabel fontSize="xs" fontWeight="700">Email</FormLabel>
              <Input
                type="email"
                value={form.email}
                onChange={(e) => handleChange("email", e.target.value)}
                borderRadius="xl"
                placeholder="ejemplo@correo.com"
              />
              <FormErrorMessage>{errors.email}</FormErrorMessage>
            </FormControl>
          </VStack>
        </ModalBody>

        <ModalFooter borderTop="1px solid" borderColor="gray.100">
          <Button variant="ghost" mr={3} onClick={onClose} borderRadius="xl">
            Cancelar
          </Button>
          <Button
            bg="linear-gradient(135deg, #14532d 0%, #166534 50%, #15803d 100%)"
            color="white"
            onClick={handleSubmit}
            borderRadius="xl"
            isDisabled={!!duplicateMatch}
            _hover={{ bg: "#0d4226" }}
          >
            Guardar
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}