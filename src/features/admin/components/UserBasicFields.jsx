import React, { useState } from "react";
import {
  FormControl,
  FormLabel,
  FormErrorMessage,
  FormHelperText,
  Input,
  InputGroup,
  InputRightElement,
  IconButton,
  Switch,
  SimpleGrid,
  Box,
  Flex,
  Text,
  HStack,
  Badge,
  Button,
} from "@chakra-ui/react";
import { User, Mail, Hash, Lock, Unlock, Eye, EyeOff, ShieldAlert } from "lucide-react";

export default function UserBasicFields({
  formData,
  errors,
  onChange,
  selectedUser,
  onUnlock,
  isUnlocking,
}) {
  const [showPassword, setShowPassword] = useState(false);

  const isBlocked = Boolean(
    selectedUser?.blockedUntil && new Date(selectedUser.blockedUntil) > new Date()
  );

  return (
    <Box>
      {/* Alerta si el usuario está bloqueado por intentos fallidos */}
      {isBlocked && (
        <Flex
          direction={{ base: "column", sm: "row" }}
          align={{ base: "flex-start", sm: "center" }}
          justify="space-between"
          bg="red.50"
          border="1px solid"
          borderColor="red.200"
          p={3.5}
          borderRadius="xl"
          mb={4}
          gap={3}
        >
          <HStack spacing={2.5}>
            <Flex
              w="36px"
              h="36px"
              borderRadius="lg"
              bg="red.100"
              color="red.600"
              align="center"
              justify="center"
              flexShrink={0}
            >
              <ShieldAlert className="w-5 h-5" />
            </Flex>
            <Box>
              <HStack spacing={2}>
                <Text fontSize="xs" fontWeight="900" color="red.800">
                  Cuenta Bloqueada por Seguridad
                </Text>
                <Badge colorScheme="red" fontSize="9px" px={1.5} borderRadius="sm">
                  {selectedUser?.failedLoginAttempts || 10} INTENTOS FALLIDOS
                </Badge>
              </HStack>
              <Text fontSize="11px" color="red.700" mt={0.5}>
                El usuario excedió el límite de intentos permitidos. Bloqueado temporalmente.
              </Text>
            </Box>
          </HStack>

          {onUnlock && (
            <Button
              size="xs"
              colorScheme="red"
              bg="red.600"
              _hover={{ bg: "red.700" }}
              color="white"
              leftIcon={<Unlock className="w-3.5 h-3.5" />}
              onClick={() => onUnlock(selectedUser.id)}
              isLoading={isUnlocking}
              loadingText="Desbloqueando..."
              fontWeight="800"
              borderRadius="lg"
              px={3}
              py={2}
              alignSelf={{ base: "stretch", sm: "auto" }}
            >
              Desbloquear Cuenta
            </Button>
          )}
        </Flex>
      )}

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
            autoComplete="off"
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
            autoComplete="off"
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
        <FormControl isInvalid={!!errors?.newPassword}>
          <FormLabel fontSize="xs" fontWeight="800" color="gray.700" mb={1}>
            Nueva Contraseña
          </FormLabel>
          <InputGroup size="sm">
            <Input
              name="newPassword"
              type={showPassword ? "text" : "password"}
              value={formData.newPassword || ""}
              onChange={onChange}
              autoComplete="new-password"
              bg="white"
              borderRadius="lg"
              borderColor="gray.300"
              _focus={{ borderColor: "green.500", boxShadow: "0 0 0 1px #16a34a" }}
              fontSize="sm"
              placeholder="Dejar en blanco para mantener la actual"
            />
            <InputRightElement width="3rem">
              <IconButton
                h="1.75rem"
                size="xs"
                variant="ghost"
                onClick={() => setShowPassword(!showPassword)}
                icon={showPassword ? <EyeOff className="w-3.5 h-3.5 text-gray-500" /> : <Eye className="w-3.5 h-3.5 text-gray-500" />}
                aria-label={showPassword ? "Ocultar contraseña" : "Ver contraseña"}
              />
            </InputRightElement>
          </InputGroup>
          {errors?.newPassword ? (
            <FormErrorMessage fontSize="xs">{errors.newPassword}</FormErrorMessage>
          ) : (
            <FormHelperText fontSize="10px" color="gray.500">
              💡 Dejar en blanco para mantener la contraseña actual. Mínimo 4 caracteres si deseas cambiarla.
            </FormHelperText>
          )}
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