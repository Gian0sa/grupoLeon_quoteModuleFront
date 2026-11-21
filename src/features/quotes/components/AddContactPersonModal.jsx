import React, { useState, useEffect } from "react";
import {
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  ModalCloseButton,
  Box,
  Text,
  Input,
  FormControl,
  FormLabel,
  Grid,
  VStack,
  HStack,
  Button,
  Badge,
} from "@chakra-ui/react";
import { UserPlus } from "lucide-react";
import { addClientContact } from "../../clients/services/clientService";

/**
 * Modal compacto para registrar una nueva Persona de Contacto (ContactEmployees / OCPR)
 * directamente en la ficha del Socio de Negocio en SAP B1 vía Service Layer.
 */
export default function AddContactPersonModal({ isOpen, onClose, client, onSuccess }) {
  const [name, setName] = useState("");
  const [position, setPosition] = useState("");
  const [mobilePhone, setMobilePhone] = useState("");
  const [email, setEmail] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setName("");
      setPosition("");
      setMobilePhone("");
      setEmail("");
      setErrorMsg("");
      setIsSaving(false);
    }
  }, [isOpen]);

  const cardCode = client?.CardCode || client?.cardCode || client?.id || "";
  const cardName = client?.CardName || client?.cardName || client?.name || "Cliente seleccionado";
  const hasBpPhone = Boolean(
    client?.Phone1 ||
      client?.Cellular ||
      client?.phone ||
      client?.raw?.Phone1 ||
      client?.raw?.Cellular
  );
  const hasBpEmail = Boolean(
    client?.EmailAddress ||
      client?.E_Mail ||
      client?.email ||
      client?.raw?.EmailAddress ||
      client?.raw?.E_Mail
  );

  const handleSubmit = async (e) => {
    if (e && typeof e.preventDefault === "function") e.preventDefault();
    setErrorMsg("");

    const cleanName = name.trim().toUpperCase();
    const cleanPhone = mobilePhone.trim();
    const cleanEmail = email.trim();

    if (!cardCode) {
      setErrorMsg("Primero debes seleccionar un cliente válido.");
      return;
    }
    if (!cleanName) {
      setErrorMsg("Ingresa los nombres y apellidos de la persona de contacto.");
      return;
    }
    if (!cleanPhone) {
      setErrorMsg("El celular de contacto es obligatorio para registrarlo en SAP B1.");
      return;
    }
    if (!hasBpEmail && !cleanEmail) {
      setErrorMsg("Este cliente antiguo no tiene correo en su ficha SAP; ingresa el Email de Contacto para guardarlo.");
      return;
    }
    if (cleanEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      setErrorMsg("El correo electrónico ingresado no tiene un formato válido.");
      return;
    }

    setIsSaving(true);
    try {
      const result = await addClientContact(cardCode, {
        name: cleanName,
        position: position.trim().toUpperCase(),
        mobilePhone: cleanPhone,
        email: cleanEmail,
      });
      if (typeof onSuccess === "function") {
        onSuccess(result);
      }
      onClose();
    } catch (err) {
      const msg =
        err?.response?.data?.message ||
        err?.message ||
        "No se pudo registrar la persona de contacto en SAP B1.";
      setErrorMsg(msg);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      closeOnOverlayClick={false}
      closeOnEsc={false}
      size={{ base: "full", sm: "lg" }}
      isCentered
    >
      <ModalOverlay bg="blackAlpha.600" />
      <ModalContent borderRadius={{ base: "none", sm: "2xl" }} overflow="hidden" mx={{ base: 0, sm: 3 }}>
        <ModalHeader
          bg="linear-gradient(135deg, #064e3b 0%, #0d6334 100%)"
          color="white"
          py={3.5}
          px={5}
        >
          <HStack spacing={2.5}>
            <Box p={1.5} bg="whiteAlpha.200" borderRadius="lg">
              <UserPlus size={16} color="white" />
            </Box>
            <VStack align="start" spacing={0}>
              <Text fontSize="sm" fontWeight="800">
                Agregar Persona de Contacto
              </Text>
              <Text fontSize="11px" color="whiteAlpha.800" fontWeight="500">
                Se registrará en SAP B1 (ContactEmployees) vía Service Layer
              </Text>
            </VStack>
          </HStack>
        </ModalHeader>
        <ModalCloseButton color="white" top={3.5} right={3.5} />

        <ModalBody py={4} px={5} bg="#f8fafc">
          <VStack align="stretch" spacing={3.5}>
            <Box p={2.5} bg="white" borderRadius="lg" border="1px solid" borderColor="gray.200">
              <HStack justify="space-between" wrap="wrap" gap={1.5}>
                <Text fontSize="xs" fontWeight="800" color="gray.800" wordBreak="break-word">
                  {cardName}
                </Text>
                <Badge colorScheme="green" bg="#dcfce7" color="#166534" fontSize="10px">
                  {cardCode}
                </Badge>
              </HStack>
            </Box>

            {errorMsg && (
              <Box p={2.5} bg="#fef2f2" border="1px solid #fecaca" borderRadius="lg">
                <Text fontSize="xs" color="#991b1b" fontWeight="700">
                  ⚠️ {errorMsg}
                </Text>
              </Box>
            )}

            {(!hasBpPhone || !hasBpEmail) && (
              <Box p={2.5} bg="#fffbeb" border="1px solid #fde68a" borderRadius="lg">
                <Text fontSize="11px" color="#92400e" fontWeight="600">
                  💡 Este cliente antiguo tiene vacío el {!hasBpPhone ? "teléfono" : ""}{!hasBpPhone && !hasBpEmail ? " y " : ""}{!hasBpEmail ? "correo" : ""} principal en SAP; se completará automáticamente con estos datos para que SAP permita el registro.
                </Text>
              </Box>
            )}

            <Box p={3.5} bg="white" borderRadius="xl" border="1px solid" borderColor="gray.200">
              <Text fontSize="11px" fontWeight="800" color="#166534" textTransform="uppercase" mb={3}>
                Persona de Contacto en la Empresa (ContactEmployees)
              </Text>

              <Grid templateColumns={{ base: "1fr", sm: "repeat(2, 1fr)" }} gap={3}>
                <FormControl isRequired>
                  <FormLabel fontSize="xs" fontWeight="700" color="gray.700" mb={1}>
                    Nombres y Apellidos
                  </FormLabel>
                  <Input
                    size="sm"
                    borderRadius="md"
                    placeholder="KEVIN MORI"
                    maxLength={50}
                    value={name}
                    onChange={(e) => {
                      setName(e.target.value.toUpperCase());
                      if (errorMsg) setErrorMsg("");
                    }}
                    bg="white"
                  />
                </FormControl>

                <FormControl>
                  <FormLabel fontSize="xs" fontWeight="700" color="gray.700" mb={1}>
                    Cargo / Posición
                  </FormLabel>
                  <Input
                    size="sm"
                    borderRadius="md"
                    placeholder="JEFE DE COMPRAS"
                    maxLength={90}
                    value={position}
                    onChange={(e) => setPosition(e.target.value.toUpperCase())}
                    bg="white"
                  />
                </FormControl>

                <FormControl isRequired>
                  <FormLabel fontSize="xs" fontWeight="700" color="gray.700" mb={1}>
                    Celular de Contacto
                  </FormLabel>
                  <Input
                    size="sm"
                    borderRadius="md"
                    placeholder="905468311"
                    maxLength={20}
                    value={mobilePhone}
                    onChange={(e) => {
                      setMobilePhone(e.target.value);
                      if (errorMsg) setErrorMsg("");
                    }}
                    bg="white"
                  />
                </FormControl>

                <FormControl isRequired={!hasBpEmail}>
                  <FormLabel fontSize="xs" fontWeight="700" color="gray.700" mb={1}>
                    Email de Contacto
                  </FormLabel>
                  <Input
                    size="sm"
                    borderRadius="md"
                    type="email"
                    placeholder="kmori@empresa.com"
                    maxLength={100}
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      if (errorMsg) setErrorMsg("");
                    }}
                    bg="white"
                  />
                </FormControl>
              </Grid>
            </Box>
          </VStack>
        </ModalBody>

        <ModalFooter bg="gray.50" borderTop="1px solid" borderColor="gray.200" py={3} px={5}>
          <HStack spacing={2} w={{ base: "full", sm: "auto" }} justify="flex-end">
            <Button size="sm" variant="ghost" onClick={onClose} isDisabled={isSaving}>
              Cancelar
            </Button>
            <Button
              size="sm"
              bg="#166534"
              color="white"
              _hover={{ bg: "#14532d" }}
              leftIcon={<UserPlus size={15} />}
              onClick={handleSubmit}
              isLoading={isSaving}
              loadingText="Guardando en SAP..."
            >
              Guardar en SAP
            </Button>
          </HStack>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}
