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
  VStack,
  Badge,
  Button,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  ModalCloseButton,
  Alert,
  AlertIcon,
  AlertDescription,
} from "@chakra-ui/react";
import {
  User,
  Mail,
  Hash,
  Lock,
  Unlock,
  Eye,
  EyeOff,
  ShieldAlert,
  ShieldCheck,
  Shield,
  AlertTriangle,
  Briefcase,
  Receipt,
  Award,
  PackageCheck,
  Sparkles,
  Check
} from "lucide-react";

import RoleSelectorMenu, { AVAILABLE_ROLES } from "./RoleSelectorMenu";
export { AVAILABLE_ROLES };

export default function UserBasicFields({
  formData,
  errors,
  onChange,
  selectedUser,
  onUnlock,
  isUnlocking,
  onToggleMasterAdmin,
  onApplyRolePreset,
}) {
  const [showPassword, setShowPassword] = useState(false);
  const [isConfirmAdminOpen, setIsConfirmAdminOpen] = useState(false);

  const isBlocked = Boolean(
    selectedUser?.blockedUntil && new Date(selectedUser.blockedUntil) > new Date()
  );

  const isMasterAdmin = (formData?.permittedServices || []).some((id) => Number(id) === 22) || formData?.role === "ADMINISTRADOR";
  const isSeller = Boolean(formData?.salesEmployeeCode && Number(formData?.salesEmployeeCode) > 0);

  const currentRoleKey = formData?.role || (isMasterAdmin ? "ADMINISTRADOR" : (isSeller ? "ASESOR_VENTAS" : "ASESOR_VENTAS"));
  const activeRoleConfig = AVAILABLE_ROLES.find((r) => r.key === currentRoleKey) || AVAILABLE_ROLES[0];

  const handleSelectRole = (newRoleKey) => {
    if (newRoleKey === "ADMINISTRADOR") {
      setIsConfirmAdminOpen(true);
    } else {
      onChange({ target: { name: "role", value: newRoleKey } });
      if (isMasterAdmin && onToggleMasterAdmin) {
        onToggleMasterAdmin(false);
      }
    }
  };

  const handleConfirmEnableAdmin = () => {
    setIsConfirmAdminOpen(false);
    onChange({ target: { name: "role", value: "ADMINISTRADOR" } });
    if (onToggleMasterAdmin) {
      onToggleMasterAdmin(true);
    }
  };

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

      {/* ─── 2. CARGO / ROL OFICIAL EN LA EMPRESA (COMPACTO TIPO HAMBURGUESA) ─── */}
      <RoleSelectorMenu
        role={currentRoleKey}
        onSelectRole={handleSelectRole}
        onApplyRolePreset={onApplyRolePreset}
        stepNumber="2."
        title="Cargo / Perfil Oficial del Colaborador"
        subtitle="Define el puesto en la empresa. Este cargo se mostrará en su perfil y menú lateral de forma independiente a los permisos técnicos que le actives."
        mb={4}
      />

      {/* ─── ESTADO DE CUENTA (USUARIO ACTIVO / INACTIVO) ─── */}
      <Flex
        align="center"
        justify="space-between"
        bg="white"
        p={3.5}
        borderRadius="xl"
        border="1px solid"
        borderColor={formData.active ? "gray.200" : "red.200"}
        mb={4}
      >
        <Box>
          <Text fontSize="xs" fontWeight="800" color="gray.800">
            Estado de Cuenta
          </Text>
          <Text fontSize="11px" color={formData.active ? "green.700" : "red.600"} fontWeight="600" mt={0.5}>
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

      {/* ─── MODAL DE CONFIRMACIÓN DE SEGURIDAD PARA ROL MAESTRO ─── */}
      <Modal isOpen={isConfirmAdminOpen} onClose={() => setIsConfirmAdminOpen(false)} isCentered size="md">
        <ModalOverlay bg="blackAlpha.600" backdropFilter="blur(3px)" />
        <ModalContent borderRadius="2xl" overflow="hidden" boxShadow="2xl">
          <ModalHeader bg="#fef2f2" borderBottom="1px solid #fecaca" py={4} px={5}>
            <HStack spacing={2.5}>
              <Flex w="32px" h="32px" borderRadius="lg" bg="#fee2e2" align="center" justify="center" color="#dc2626">
                <ShieldAlert className="w-5 h-5 text-red-600" />
              </Flex>
              <Box>
                <Text fontSize="sm" fontWeight="900" color="red.800">
                  Confirmar Asignación de Rol Maestro
                </Text>
                <Text fontSize="11px" color="red.600" fontWeight="500">
                  Privilegio Crítico del Sistema
                </Text>
              </Box>
            </HStack>
          </ModalHeader>
          <ModalCloseButton />

          <ModalBody py={5} px={6}>
            <VStack spacing={3.5} align="stretch">
              <Text fontSize="xs" color="gray.700" lineHeight="tall">
                Estás a punto de otorgar el <strong>Rol de Administrador Maestro</strong> al usuario{" "}
                <strong style={{ color: "#111827" }}>{formData.username || "seleccionado"}</strong>.
              </Text>

              <Box bg="#f8fafc" p={3.5} borderRadius="xl" border="1px solid" borderColor="gray.200">
                <Text fontSize="11px" fontWeight="800" color="gray.700" mb={1.5} textTransform="uppercase" letterSpacing="wider">
                  Este permiso (PUT /profile/admin/:userId) concede:
                </Text>
                <VStack align="stretch" spacing={1} fontSize="11px" color="gray.600">
                  <Text>• Crear, registrar y desbloquear cuentas de usuario.</Text>
                  <Text>• Cambiar contraseñas de cualquier usuario del sistema.</Text>
                  <Text>• Activar, reconfigurar o revocar permisos a otros usuarios.</Text>
                  <Text>• Acceso irrestricto a los módulos administrativos y auditoría.</Text>
                </VStack>
              </Box>

              {isSeller && (
                <Alert status="warning" borderRadius="xl" py={2.5} px={3} fontSize="11.5px">
                  <AlertIcon boxSize="16px" />
                  <AlertDescription fontWeight="600" color="amber.900">
                    Atención: Este usuario es un Vendedor Comercial en SAP (#{formData.salesEmployeeCode}). Otorgarle este rol le permitirá modificar permisos de todo el equipo de ventas.
                  </AlertDescription>
                </Alert>
              )}

              <Text fontSize="xs" fontWeight="700" color="gray.700">
                ¿Confirmas que deseas elevar a este usuario al Rol de Administrador Maestro?
              </Text>
            </VStack>
          </ModalBody>

          <ModalFooter bg="#f8fafc" borderTop="1px solid" borderColor="gray.200" py={3} px={6}>
            <HStack spacing={2.5} w="full" justify="flex-end">
              <Button variant="outline" size="sm" borderRadius="xl" fontWeight="700" onClick={() => setIsConfirmAdminOpen(false)}>
                Cancelar
              </Button>
              <Button
                colorScheme="red"
                bg="#dc2626"
                _hover={{ bg: "#b91c1c" }}
                size="sm"
                borderRadius="xl"
                fontWeight="800"
                onClick={handleConfirmEnableAdmin}
                leftIcon={<ShieldAlert className="w-4 h-4" />}
                boxShadow="0 2px 8px rgba(220, 38, 38, 0.3)"
              >
                Sí, Otorgar Rol Maestro
              </Button>
            </HStack>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </Box>
  );
}