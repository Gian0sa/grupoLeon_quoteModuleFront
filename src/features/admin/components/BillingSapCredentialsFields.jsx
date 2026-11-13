import React, { useState } from "react";
import {
  Box,
  FormControl,
  FormLabel,
  Input,
  InputGroup,
  InputRightElement,
  IconButton,
  SimpleGrid,
  Text,
  Badge,
  HStack,
  Alert,
  AlertIcon,
  AlertDescription,
} from "@chakra-ui/react";
import { Eye, EyeOff, ShieldCheck, KeyRound } from "lucide-react";

/**
 * Componente modular para ingresar o editar credenciales personales de SAP B1
 * para el personal de Facturación.
 */
export default function BillingSapCredentialsFields({
  sapUser,
  sapPassword,
  onChangeSapUser,
  onChangeSapPassword,
  stepNumber = "2.",
  isEdit = false,
}) {
  const [showSapPassword, setShowSapPassword] = useState(false);

  return (
    <Box
      bg="#f0fdf4"
      p={{ base: 3.5, md: 5 }}
      borderRadius="xl"
      border="1px solid"
      borderColor="#bbf7d0"
      boxShadow="sm"
    >
      <HStack justify="space-between" align="center" mb={2}>
        <HStack spacing={2}>
          <KeyRound className="w-4 h-4 text-green-700" />
          <Text
            fontSize="xs"
            fontWeight="900"
            color="green.900"
            textTransform="uppercase"
            letterSpacing="wider"
          >
            {stepNumber} Credenciales Personales para SAP Business One
          </Text>
        </HStack>
        <Badge
          bg="#dcfce7"
          color="#166534"
          border="1px solid #86efac"
          fontSize="10px"
          fontWeight="900"
          px={2}
          py={0.5}
          borderRadius="md"
          letterSpacing="wide"
        >
          OPCIONAL • FACTURACIÓN
        </Badge>
      </HStack>

      <Text fontSize="xs" color="gray.600" mb={4}>
        Si este usuario cuenta con perfil propio en SAP B1, ingresa sus accesos.
        Las órdenes y ofertas aprobadas se registrarán a su nombre en SAP (<strong>UserSign</strong>).
        Si se deja vacío, se utilizarán las credenciales generales del sistema por defecto.
      </Text>

      <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4}>
        {/* Usuario SAP */}
        <FormControl>
          <FormLabel fontSize="xs" fontWeight="800" color="gray.700" mb={1}>
            Usuario SAP (UserCode)
          </FormLabel>
          <Input
            type="text"
            placeholder="Ej. ADM004"
            bg="white"
            borderRadius="lg"
            borderColor="green.300"
            _focus={{ borderColor: "green.600", boxShadow: "0 0 0 1px #16a34a" }}
            fontSize="sm"
            value={sapUser || ""}
            onChange={(e) => onChangeSapUser(e.target.value)}
          />
        </FormControl>

        {/* Contraseña SAP */}
        <FormControl>
          <FormLabel fontSize="xs" fontWeight="800" color="gray.700" mb={1}>
            Contraseña SAP
          </FormLabel>
          <InputGroup>
            <Input
              type={showSapPassword ? "text" : "password"}
              placeholder={isEdit ? "•••••••• (dejar en blanco para no cambiar)" : "Contraseña en SAP B1"}
              bg="white"
              borderRadius="lg"
              borderColor="green.300"
              _focus={{ borderColor: "green.600", boxShadow: "0 0 0 1px #16a34a" }}
              fontSize="sm"
              value={sapPassword || ""}
              onChange={(e) => onChangeSapPassword(e.target.value)}
            />
            <InputRightElement>
              <IconButton
                size="sm"
                variant="ghost"
                colorScheme="green"
                onClick={() => setShowSapPassword((prev) => !prev)}
                icon={showSapPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                aria-label={showSapPassword ? "Ocultar contraseña" : "Ver contraseña"}
              />
            </InputRightElement>
          </InputGroup>
        </FormControl>
      </SimpleGrid>

      {sapUser && (
        <Alert status="info" variant="left-accent" colorScheme="green" mt={3} py={2} px={3} borderRadius="md">
          <AlertIcon className="w-4 h-4" />
          <AlertDescription fontSize="xs" color="green.900" fontWeight="600">
            {isEdit
              ? `Este usuario emitirá en SAP con el perfil ${sapUser}.`
              : `Al registrarse, las emisiones en SAP se realizarán bajo el usuario ${sapUser}.`}
          </AlertDescription>
        </Alert>
      )}
    </Box>
  );
}

