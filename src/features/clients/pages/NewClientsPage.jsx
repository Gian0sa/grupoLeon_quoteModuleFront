import { useState, useMemo } from "react";
import {
  Container,
  VStack,
  HStack,
  Flex,
  Box,
  Heading,
  Input,
  Button,
  Text,
  Spinner,
  Badge,
  Card,
  CardBody,
  IconButton,
  SimpleGrid,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  FormControl,
  FormLabel,
  Select,
  FormErrorMessage,
  useToast,
  Tooltip,
  InputGroup,
  InputLeftElement,
  Alert,
  AlertIcon,
} from "@chakra-ui/react";
import { FiSearch, FiEdit, FiUser, FiMail, FiPhone, FiFileText } from "react-icons/fi";
import { BackButton } from "../../../components/BackButton";
import { useNewClientsQuery, useUpdateNewClientMutation } from "../hooks/queries/clientQueries";
import { useAuthStore } from "../../auth/stores/useAuthStore";

export function NewClientsPage() {
  const toast = useToast();
  const { salesEmployeeCode, username } = useAuthStore();
  const { dataNewClients, isLoadingNewClients, errorNewClients, refetchNewClients } = useNewClientsQuery(salesEmployeeCode, username);
  const updateMutation = useUpdateNewClientMutation();

  const [searchTerm, setSearchTerm] = useState("");
  const [selectedClient, setSelectedClient] = useState(null);
  const [isEditOpen, setIsEditOpen] = useState(false);

  // Form states for editing
  const [form, setForm] = useState({
    fullName: "",
    personType: "NATURAL",
    documentType: "DNI",
    documentNumber: "",
    phone: "",
    email: "",
  });
  const [formErrors, setFormErrors] = useState({});

  const documentOptions = {
    NATURAL: ["DNI", "CE", "PASAPORTE"],
    JURIDICO: ["RUC"],
  };

  // Filter clients based on search term
  const filteredClients = useMemo(() => {
    if (!dataNewClients) return [];
    return dataNewClients.filter((client) => {
      const term = searchTerm.toLowerCase().trim();
      if (!term) return true;
      return (
        client.fullName?.toLowerCase().includes(term) ||
        client.documentNumber?.toLowerCase().includes(term) ||
        client.sapCode?.toLowerCase().includes(term)
      );
    });
  }, [dataNewClients, searchTerm]);

  // Open edit modal
  const handleEditClick = (client) => {
    setSelectedClient(client);
    setForm({
      fullName: client.fullName || "",
      personType: client.personType || "NATURAL",
      documentType: client.documentType || "DNI",
      documentNumber: client.documentNumber || "",
      phone: client.phone || "",
      email: client.email || "",
    });
    setFormErrors({});
    setIsEditOpen(true);
  };

  const handleChange = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    validateField(field, value);
  };

  const handlePersonTypeChange = (value) => {
    setForm((prev) => {
      const nextDocType = value === "JURIDICO" ? "RUC" : "DNI";
      return {
        ...prev,
        personType: value,
        documentType: nextDocType,
        documentNumber: "",
      };
    });
  };

  const validateField = (field, value) => {
    let error = "";

    switch (field) {
      case "fullName":
        if (!value.trim()) error = "Campo obligatorio";
        else if (!/^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$/.test(value))
          error = "Solo letras";
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

    setFormErrors((prev) => ({ ...prev, [field]: error }));
    return error;
  };

  const validateAll = () => {
    const errors = {};
    let isValid = true;

    Object.keys(form).forEach((field) => {
      const error = validateField(field, form[field]);
      if (error) {
        isValid = false;
        errors[field] = error;
      } else {
        errors[field] = "";
      }
    });

    setFormErrors(errors);
    return isValid;
  };

  const handleSave = () => {
    if (!validateAll()) return;

    updateMutation.mutate(
      {
        id: selectedClient.id,
        fullName: form.fullName.trim(),
        personType: form.personType,
        documentType: form.documentType,
        documentNumber: form.documentNumber.trim() === "" ? null : form.documentNumber.trim(),
        phone: form.phone.trim() === "" ? null : form.phone.trim(),
        email: form.email.trim() === "" ? null : form.email.trim(),
      },
      {
        onSuccess: () => {
          toast({
            title: "Cliente actualizado",
            description: "Los datos del cliente se actualizaron correctamente.",
            status: "success",
            duration: 4000,
            isClosable: true,
            position: "top",
          });
          setIsEditOpen(false);
          refetchNewClients();
        },
        onError: (err) => {
          toast({
            title: "Error al actualizar",
            description: err.response?.data?.message || err.message || "No se pudo actualizar el cliente.",
            status: "error",
            duration: 4000,
            isClosable: true,
            position: "top",
          });
        },
      }
    );
  };

  const isClientIncomplete = (client) => {
    return !client.documentNumber || !client.phone || !client.email;
  };

  return (
    <Container maxW="container.xl" py={{ base: 3, md: 8 }} px={{ base: 2, sm: 3, md: 6 }}>
      <VStack spacing={6} align="stretch">
        {/* HEADER */}
        <Flex
          bg="green.600"
          color="white"
          align="center"
          justify="center"
          w="100%"
          minH={{ base: "44px", md: "56px" }}
          px={{ base: 2, md: 4 }}
          borderRadius="lg"
          position="relative"
          boxShadow="md"
        >
          <Box position="absolute" left={2}>
            <BackButton color="white" />
          </Box>
          <Heading textAlign="center" fontSize={{ base: "md", sm: "lg", md: "xl" }} fontWeight="600">
            Clientes Nuevos Registrados
          </Heading>
        </Flex>

        {/* SEARCH BAR */}
        <Card border="1px solid" borderColor="gray.100" boxShadow="sm">
          <CardBody p={4}>
            <InputGroup size="md">
              <InputLeftElement pointerEvents="none">
                <FiSearch color="gray.400" />
              </InputLeftElement>
              <Input
                placeholder="Buscar por nombre, código SAP o documento..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                borderRadius="md"
                bg="white"
              />
            </InputGroup>
          </CardBody>
        </Card>

        {/* LOADING & ERROR */}
        {isLoadingNewClients && (
          <Flex justify="center" py={10}>
            <Spinner size="lg" color="green.600" />
          </Flex>
        )}

        {errorNewClients && (
          <Alert status="error" borderRadius="md">
            <AlertIcon />
            Error al cargar clientes nuevos: {errorNewClients.message}
          </Alert>
        )}

        {/* LIST OF CLIENTS */}
        {!isLoadingNewClients && !errorNewClients && (
          <>
            {filteredClients.length === 0 ? (
              <Card>
                <CardBody textAlign="center" py={8}>
                  <Text color="gray.500">
                    {searchTerm ? "No se encontraron clientes para la búsqueda." : "No hay nuevos clientes registrados."}
                  </Text>
                </CardBody>
              </Card>
            ) : (
              <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4}>
                {filteredClients.map((client) => {
                  const incomplete = isClientIncomplete(client);
                  return (
                    <Card
                      key={client.id}
                      border="1px solid"
                      borderColor={incomplete ? "orange.100" : "gray.200"}
                      bg={incomplete ? "orange.50/10" : "white"}
                      boxShadow="xs"
                      borderRadius="lg"
                      _hover={{ boxShadow: "sm" }}
                    >
                      <CardBody p={4}>
                        <VStack align="stretch" spacing={3}>
                          <Flex justify="space-between" align="start">
                            <VStack align="start" spacing={1}>
                              <Heading size="xs" color="gray.800">
                                {client.fullName}
                              </Heading>
                              <Text fontSize="2xs" color="gray.500">
                                Creado por: {client.createdBy} |{" "}
                                {new Date(client.createdAt).toLocaleDateString()}
                              </Text>
                            </VStack>
                            <HStack spacing={2}>
                              <Badge colorScheme={incomplete ? "orange" : "green"} px={2} py={0.5} borderRadius="sm">
                                {incomplete ? "Incompleto" : "Completo"}
                              </Badge>
                              <Tooltip label="Editar datos">
                                <IconButton
                                  size="sm"
                                  icon={<FiEdit />}
                                  colorScheme="blue"
                                  variant="ghost"
                                  onClick={() => handleEditClick(client)}
                                  aria-label="Editar cliente"
                                />
                              </Tooltip>
                            </HStack>
                          </Flex>

                          <SimpleGrid columns={2} spacing={2} fontSize="xs">
                            <HStack color="gray.600">
                              <FiFileText />
                              <Text fontWeight="500">Documento:</Text>
                            </HStack>
                            <Text color="gray.700" textAlign="right">
                              {client.documentNumber
                                ? `${client.documentType || "Doc"}: ${client.documentNumber}`
                                : "No asignado"}
                            </Text>

                            <HStack color="gray.600">
                              <FiPhone />
                              <Text fontWeight="500">Teléfono:</Text>
                            </HStack>
                            <Text color="gray.700" textAlign="right">
                              {client.phone || "No asignado"}
                            </Text>

                            <HStack color="gray.600">
                              <FiMail />
                              <Text fontWeight="500">Email:</Text>
                            </HStack>
                            <Text color="gray.700" isTruncated textAlign="right">
                              {client.email || "No asignado"}
                            </Text>

                            <HStack color="gray.600">
                              <FiUser />
                              <Text fontWeight="500">Cód. SAP:</Text>
                            </HStack>
                            <Text color="gray.700" fontWeight="600" textAlign="right">
                              {client.sapCode || "N/A"}
                            </Text>
                          </SimpleGrid>
                        </VStack>
                      </CardBody>
                    </Card>
                  );
                })}
              </SimpleGrid>
            )}
          </>
        )}
      </VStack>

      {/* EDIT MODAL */}
      <Modal isOpen={isEditOpen} onClose={() => setIsEditOpen(false)}>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Actualizar Cliente</ModalHeader>
          <ModalBody>
            <VStack spacing={4}>
              <FormControl>
                <FormLabel fontSize="sm">Tipo de Persona</FormLabel>
                <Select value={form.personType} onChange={(e) => handlePersonTypeChange(e.target.value)}>
                  <option value="NATURAL">Persona Natural</option>
                  <option value="JURIDICO">Persona Jurídica</option>
                </Select>
              </FormControl>

              <FormControl>
                <FormLabel fontSize="sm">Tipo de Documento</FormLabel>
                <Select value={form.documentType} onChange={(e) => handleChange("documentType", e.target.value)}>
                  {documentOptions[form.personType].map((doc) => (
                    <option key={doc} value={doc}>
                      {doc}
                    </option>
                  ))}
                </Select>
              </FormControl>

              <FormControl isInvalid={formErrors.fullName}>
                <FormLabel fontSize="sm">Nombre Completo</FormLabel>
                <Input
                  value={form.fullName}
                  onChange={(e) => handleChange("fullName", e.target.value.replace(/[^a-zA-ZáéíóúÁÉÍÓÚñÑ\s]/g, ""))}
                />
                <FormErrorMessage>{formErrors.fullName}</FormErrorMessage>
              </FormControl>

              <FormControl isInvalid={formErrors.documentNumber}>
                <FormLabel fontSize="sm">Número de Documento</FormLabel>
                <Input
                  value={form.documentNumber}
                  onChange={(e) => handleChange("documentNumber", e.target.value.replace(/\D/g, ""))}
                  maxLength={form.documentType === "RUC" ? 11 : 8}
                />
                <FormErrorMessage>{formErrors.documentNumber}</FormErrorMessage>
              </FormControl>

              <FormControl isInvalid={formErrors.phone}>
                <FormLabel fontSize="sm">Teléfono</FormLabel>
                <Input
                  value={form.phone}
                  onChange={(e) => handleChange("phone", e.target.value.replace(/\D/g, ""))}
                  maxLength={9}
                />
                <FormErrorMessage>{formErrors.phone}</FormErrorMessage>
              </FormControl>

              <FormControl isInvalid={formErrors.email}>
                <FormLabel fontSize="sm">Email</FormLabel>
                <Input type="email" value={form.email} onChange={(e) => handleChange("email", e.target.value)} />
                <FormErrorMessage>{formErrors.email}</FormErrorMessage>
              </FormControl>
            </VStack>
          </ModalBody>
          <ModalFooter>
            <Button variant="ghost" mr={3} onClick={() => setIsEditOpen(false)}>
              Cancelar
            </Button>
            <Button colorScheme="green" onClick={handleSave} isLoading={updateMutation.isPending}>
              Guardar Cambios
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </Container>
  );
}
