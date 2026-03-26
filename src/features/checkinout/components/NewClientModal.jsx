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
} from "@chakra-ui/react";
import { useState } from "react";

export function NewClientModal({ isOpen, onClose, onCreate }) {
  const [form, setForm] = useState({
    fullName: "",
    personType: "NATURAL",
    documentType: "DNI",
    documentNumber: "",
    phone: "",
    email: "",
  });

  const [errors, setErrors] = useState({});

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
        if (!value.trim()) error = "Campo obligatorio";
        else if (!/^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$/.test(value))
          error = "Solo letras";
        break;

      case "documentNumber":
        if (!value) error = "Campo obligatorio";
        else if (!/^\d+$/.test(value))
          error = "Solo números";
        else if (form.documentType === "DNI" && value.length !== 8)
          error = "DNI: 8 dígitos";
        else if (form.documentType === "RUC" && value.length !== 11)
          error = "RUC: 11 dígitos";
        break;

      case "phone":
        if (!value) error = "Campo obligatorio";
        else if (!/^9\d{8}$/.test(value))
          error = "Debe empezar en 9 y tener 9 dígitos";
        break;

      case "email":
        if (!value.trim()) error = "Campo obligatorio";
        else if (!/^[^\s@]+@[^\s@]+\.[a-zA-Z]{2,}$/.test(value))
          error = "Correo inválido";
        break;

      default:
        break;
    }

    setErrors((prev) => ({ ...prev, [field]: error }));
  };

  const validateAll = () => {
    const newErrors = {};

    Object.keys(form).forEach((field) => {
      validateField(field, form[field]);
    });

    return Object.values(errors).every((e) => !e);
  };

  const handleSubmit = () => {
    const isValid = validateAll();

    if (!isValid) return;

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
    <Modal isOpen={isOpen} onClose={onClose}>
      <ModalOverlay />
      <ModalContent>
        <ModalHeader>Nuevo Cliente</ModalHeader>

        <ModalBody>
          <VStack spacing={4}>
            <FormControl>
              <FormLabel>Tipo de persona</FormLabel>
              <Select
                value={form.personType}
                onChange={(e) => handlePersonTypeChange(e.target.value)}
              >
                <option value="NATURAL">Persona Natural</option>
                <option value="JURIDICO">Persona Jurídica</option>
              </Select>
            </FormControl>

            <FormControl>
              <FormLabel>Tipo de documento</FormLabel>
              <Select
                value={form.documentType}
                onChange={(e) => handleChange("documentType", e.target.value)}
              >
                {documentOptions[form.personType].map((doc) => (
                  <option key={doc} value={doc}>
                    {doc}
                  </option>
                ))}
              </Select>
            </FormControl>

            <FormControl isInvalid={errors.fullName}>
              <FormLabel>Nombre completo</FormLabel>
              <Input
                value={form.fullName}
                onChange={(e) =>
                  handleChange(
                    "fullName",
                    e.target.value.replace(/[^a-zA-ZáéíóúÁÉÍÓÚñÑ\s]/g, "")
                  )
                }
              />
              <FormErrorMessage>{errors.fullName}</FormErrorMessage>
            </FormControl>

            <FormControl isInvalid={errors.documentNumber}>
              <FormLabel>Número de documento</FormLabel>
              <Input
                value={form.documentNumber}
                onChange={(e) =>
                  handleChange(
                    "documentNumber",
                    e.target.value.replace(/\D/g, "")
                  )
                }
                maxLength={form.documentType === "RUC" ? 11 : 8}
              />
              <FormErrorMessage>{errors.documentNumber}</FormErrorMessage>
            </FormControl>

            <FormControl isInvalid={errors.phone}>
              <FormLabel>Teléfono</FormLabel>
              <Input
                value={form.phone}
                onChange={(e) =>
                  handleChange("phone", e.target.value.replace(/\D/g, ""))
                }
                maxLength={9}
              />
              <FormErrorMessage>{errors.phone}</FormErrorMessage>
            </FormControl>

            <FormControl isInvalid={errors.email}>
              <FormLabel>Email</FormLabel>
              <Input
                type="email"
                value={form.email}
                onChange={(e) => handleChange("email", e.target.value)}
              />
              <FormErrorMessage>{errors.email}</FormErrorMessage>
            </FormControl>
          </VStack>
        </ModalBody>

        <ModalFooter>
          <Button variant="ghost" mr={3} onClick={onClose}>
            Cancelar
          </Button>
          <Button colorScheme="green" onClick={handleSubmit}>
            Guardar
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}