import React from "react";
import {
  FormControl,
  FormLabel,
  FormErrorMessage,
  FormHelperText,
  Input,
  Switch,
  SimpleGrid,
  Box,
  Flex,
  Text,
  HStack,
  Badge,
} from "@chakra-ui/react";
import { User, Mail, Hash, Lock, ShieldCheck } from "lucide-react";

export default function UserBasicFields({ formData, errors, onChange }) {
  return (
    <Box>
      <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4} mb={4}>
        {/* Usuario */}
        <FormControl isInvalid={!!errors?.username} isRequired>
          <FormLabel fontSize="xs" fontWeight="800" color="gray.700" mb={1}>
            Nombre de Usuario
          </FormLabel>
          <Input
            name="username"
            value={formData.username || ""}
            onChange={onChange}
            bg="white"
            borderRadius="lg"
            borderColor="gray.300"
            _focus={{ borderColor: "green.500", boxShadow: "0 0 0 1px #16a34a" }}
            fontSize="sm"
            placeholder="Ej. Juan Perez"
          />
          {errors?.username && <FormErrorMessage fontSize="xs">{errors.username}</FormErrorMessage>}
        </FormControl>

        {/* Email */}
        <FormControl isInvalid={!!errors?.email} isRequired>
          <FormLabel fontSize="xs" fontWeight="800" color="gray.700" mb={1}>
            Correo Electrónico
          </FormLabel>
          <Input
            name="email"
            type="email"
            value={formData.email || ""}
            onChange={onChange}
            bg="white"
            borderRadius="lg"
            borderColor="gray.300"
            _focus={{ borderColor: "green.500", boxShadow: "0 0 0 1px #16a34a" }}
            fontSize="sm"
            placeholder="usuario@autopartes.pe"
          />
          {errors?.email && <FormErrorMessage fontSize="xs">{errors.email}</FormErrorMessage>}
        </FormControl>

        {/* Código de Vendedor SAP (Solo Lectura / Identificador Oficial SAP) */}
        <FormControl>
          <Flex justify="space-between" align="center" mb={1}>
            <FormLabel fontSize="xs" fontWeight="800" color="gray.700" mb={0}>
              Código Vendedor SAP
            </FormLabel>
            <Badge colorScheme="teal" fontSize="9px" px={1.5} py={0.2} borderRadius="md">
              🔒 Oficial SAP
            </Badge>
          </Flex>
          <Input
            name="salesEmployeeCode"
            value={formData.salesEmployeeCode ? `Vendedor SAP #${formData.salesEmployeeCode}` : "Sin código asignado"}
            isReadOnly
            bg="gray.100"
            color="gray.800"
            fontWeight="800"
            borderRadius="lg"
            borderColor="gray.300"
            fontSize="sm"
            cursor="not-allowed"
          />
          <FormHelperText fontSize="10px" color="gray.500">
            Identificador nativo de SAP Business One vinculado a la cuenta.
          </FormHelperText>
        </FormControl>

        {/* Nueva Contraseña */}
        <FormControl>
          <FormLabel fontSize="xs" fontWeight="800" color="gray.700" mb={1}>
            Nueva Contraseña
          </FormLabel>
          <Input
            name="newPassword"
            type="password"
            value={formData.newPassword || ""}
            onChange={onChange}
            bg="white"
            borderRadius="lg"
            borderColor="gray.300"
            _focus={{ borderColor: "green.500", boxShadow: "0 0 0 1px #16a34a" }}
            fontSize="sm"
            placeholder="Dejar en blanco para mantener la actual"
          />
        </FormControl>
      </SimpleGrid>

      {/* Switch de Usuario Activo */}
      <Flex
        align="center"
        justify="space-between"
        bg="white"
        p={3}
        borderRadius="xl"
        border="1px solid"
        borderColor="gray.200"
      >
        <Box>
          <Text fontSize="xs" fontWeight="800" color="gray.800">
            Estado de Cuenta
          </Text>
          <Text fontSize="11px" color={formData.active ? "green.700" : "red.600"} fontWeight="600">
            {formData.active
              ? "🟢 Usuario activo (puede iniciar sesión y operar)"
              : "🔴 Usuario inactivo (acceso bloqueado temporalmente)"}
          </Text>
        </Box>
        <Switch
          isChecked={formData.active}
          onChange={(e) => onChange({ target: { name: "active", value: e.target.checked } })}
          colorScheme="green"
          size="lg"
        />
      </Flex>
    </Box>
  );
}