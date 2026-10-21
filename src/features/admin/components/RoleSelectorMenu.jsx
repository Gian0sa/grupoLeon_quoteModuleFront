import React from "react";
import {
  Box,
  Flex,
  HStack,
  Text,
  Badge,
  Button,
  Menu,
  MenuButton,
  MenuList,
  MenuItem,
} from "@chakra-ui/react";
import {
  Menu as MenuIcon,
  ChevronDown,
  Check,
  Sparkles,
  Briefcase,
  Receipt,
  Award,
  ShieldCheck,
  PackageCheck,
} from "lucide-react";

export const AVAILABLE_ROLES = [
  {
    key: "ASESOR_VENTAS",
    label: "Asesor de Ventas",
    badgeLabel: "ASESOR DE VENTAS",
    tag: "COMERCIAL",
    badgeBg: "#dcfce7",
    badgeColor: "#15803d",
    badgeBorder: "#bbf7d0",
    description: "Gestión de cotizaciones, clientes, catálogo y visitas comerciales.",
    icon: Briefcase,
    presetKey: "vendedor",
  },
  {
    key: "FACTURACION",
    label: "Facturación y Créditos",
    badgeLabel: "FACTURACIÓN Y CRÉDITOS",
    tag: "FINANZAS",
    badgeBg: "#e0f2fe",
    badgeColor: "#0369a1",
    badgeBorder: "#bae6fd",
    description: "Aprobación de cotizaciones, conversión a SAP, cuentas por cobrar y facturas.",
    icon: Receipt,
    presetKey: "facturacion",
  },
  {
    key: "SUPERVISOR",
    label: "Supervisor Comercial",
    badgeLabel: "SUPERVISOR COMERCIAL",
    tag: "JEFATURA",
    badgeBg: "#f3e8ff",
    badgeColor: "#7e22ce",
    badgeBorder: "#e9d5ff",
    description: "Supervisión de vendedores, metas, aprobación con descuento y reportes globales.",
    icon: Award,
    presetKey: "supervisor",
  },
  {
    key: "ADMINISTRADOR",
    label: "Administrador del Sistema",
    badgeLabel: "ADMINISTRADOR",
    tag: "MAESTRO",
    badgeBg: "#fee2e2",
    badgeColor: "#b91c1c",
    badgeBorder: "#fca5a5",
    description: "Control total de usuarios, edición de permisos maestros y contraseñas.",
    icon: ShieldCheck,
    presetKey: null,
  },
  {
    key: "ALMACEN",
    label: "Logística / Despacho",
    badgeLabel: "LOGÍSTICA / DESPACHO",
    tag: "OPERACIONES",
    badgeBg: "#ffedd5",
    badgeColor: "#c2410c",
    badgeBorder: "#fed7aa",
    description: "Seguimiento de pedidos, guías de remisión y control de entregas.",
    icon: PackageCheck,
    presetKey: null,
  },
];

export function normalizeRoleKey(roleKey) {
  if (!roleKey) return "ASESOR_VENTAS";
  const upper = String(roleKey).toUpperCase().trim();
  if (upper === "SELLER" || upper === "VENDEDOR" || upper === "ASESOR") return "ASESOR_VENTAS";
  if (upper === "SUPERVISOR") return "SUPERVISOR";
  if (upper === "FACTURACION" || upper === "FACTURACIÓN" || upper === "BILLING") return "FACTURACION";
  if (upper === "ADMINISTRADOR" || upper === "ADMIN") return "ADMINISTRADOR";
  if (upper === "ALMACEN" || upper === "LOGISTICA" || upper === "DESPACHO") return "ALMACEN";
  return upper;
}

/**
 * Componente compacto tipo Hamburguesa / Menú Desplegable para seleccionar
 * el Cargo / Perfil Oficial del colaborador, ocupando una sola fila elegante.
 */
export default function RoleSelectorMenu({
  role,
  onSelectRole,
  onApplyRolePreset,
  title = "Cargo / Perfil Oficial del Colaborador",
  subtitle = "Define el puesto en la empresa. Este cargo se mostrará en su perfil y menú lateral de forma independiente a los permisos técnicos.",
  stepNumber = null,
  mb = 4,
}) {
  const normalizedKey = normalizeRoleKey(role);
  const activeRole = AVAILABLE_ROLES.find((r) => r.key === normalizedKey) || AVAILABLE_ROLES[0];
  const ActiveIcon = activeRole.icon;

  return (
    <Box
      bg="white"
      p={{ base: 3, md: 3.5 }}
      borderRadius="xl"
      border="1px solid"
      borderColor="gray.200"
      mb={mb}
      boxShadow="xs"
    >
      {/* ─── Encabezado de la Sección ─── */}
      <Flex
        direction={{ base: "column", sm: "row" }}
        justify="space-between"
        align={{ base: "flex-start", sm: "center" }}
        mb={2.5}
        gap={1.5}
      >
        <Box>
          <HStack spacing={2}>
            <Flex
              w="22px"
              h="22px"
              borderRadius="md"
              bg="green.50"
              color="green.700"
              align="center"
              justify="center"
              flexShrink={0}
            >
              <Briefcase className="w-3.5 h-3.5" />
            </Flex>
            <Text fontSize="xs" fontWeight="900" color="gray.800" textTransform="uppercase" letterSpacing="wider">
              {stepNumber ? `${stepNumber} ${title}` : title}
            </Text>
          </HStack>
          {subtitle && (
            <Text fontSize="11px" color="gray.500" mt={0.5} lineHeight="1.3">
              {subtitle}
            </Text>
          )}
        </Box>

        <Badge
          bg={activeRole.badgeBg}
          color={activeRole.badgeColor}
          border="1px solid"
          borderColor={activeRole.badgeBorder}
          fontSize="9.5px"
          fontWeight="900"
          px={2.5}
          py={0.8}
          borderRadius="full"
          letterSpacing="wider"
          flexShrink={0}
        >
          {activeRole.badgeLabel}
        </Badge>
      </Flex>

      {/* ─── Fila Única Compacta con Menú Hamburguesa / Desplegable ─── */}
      <Menu isLazy matchWidth={true} closeOnSelect={true}>
        {({ isOpen }) => (
          <>
            <MenuButton
              as={Box}
              cursor="pointer"
              w="full"
              role="button"
              tabIndex={0}
              aria-label="Seleccionar cargo oficial"
              bg={activeRole.badgeBg}
              border="1.5px solid"
              borderColor={activeRole.badgeBorder}
              borderRadius="xl"
              p={{ base: 2, md: 2.5 }}
              _hover={{ borderColor: activeRole.badgeColor, boxShadow: "xs" }}
              transition="all 0.15s ease"
            >
              <Flex justify="space-between" align="center" gap={3}>
                <HStack spacing={2.5} minW={0} flex={1}>
                  <Flex
                    w="34px"
                    h="34px"
                    borderRadius="lg"
                    bg="white"
                    color={activeRole.badgeColor}
                    align="center"
                    justify="center"
                    boxShadow="2xs"
                    border="1px solid"
                    borderColor={activeRole.badgeBorder}
                    flexShrink={0}
                  >
                    <ActiveIcon className="w-4 h-4" />
                  </Flex>

                  <Box minW={0} flex={1} textAlign="left">
                    <HStack spacing={2} align="center">
                      <Text fontSize="12.5px" fontWeight="900" color="gray.800" noOfLines={1}>
                        {activeRole.label}
                      </Text>
                      <Badge
                        bg="white"
                        color={activeRole.badgeColor}
                        border="1px solid"
                        borderColor={activeRole.badgeBorder}
                        fontSize="9px"
                        fontWeight="800"
                        px={1.5}
                        py={0.2}
                        borderRadius="md"
                        display={{ base: "none", sm: "inline-block" }}
                      >
                        {activeRole.tag}
                      </Badge>
                    </HStack>
                    <Text fontSize="10.5px" color="gray.600" noOfLines={1} mt={0.5}>
                      {activeRole.description}
                    </Text>
                  </Box>
                </HStack>

                {/* Botón visual hamburguesa / desplegable */}
                <HStack
                  spacing={1.5}
                  bg="white"
                  border="1px solid"
                  borderColor="gray.300"
                  px={2.5}
                  py={1.5}
                  borderRadius="lg"
                  color="gray.700"
                  boxShadow="2xs"
                  flexShrink={0}
                  _hover={{ bg: "gray.50", borderColor: "gray.400" }}
                  transition="all 0.15s ease"
                >
                  <MenuIcon className="w-3.5 h-3.5 text-gray-700" />
                  <Text fontSize="11px" fontWeight="800" color="gray.800" display={{ base: "none", sm: "inline" }}>
                    Cambiar
                  </Text>
                  <ChevronDown
                    className={`w-3.5 h-3.5 text-gray-500 transition-transform duration-200 ${
                      isOpen ? "rotate-180" : ""
                    }`}
                  />
                </HStack>
              </Flex>
            </MenuButton>

            <MenuList
              zIndex={1500}
              p={1.5}
              borderRadius="xl"
              boxShadow="xl"
              border="1px solid"
              borderColor="gray.200"
              maxW={{ base: "92vw", md: "580px" }}
              w="full"
              bg="white"
            >
              <Text
                px={3}
                pt={1.5}
                pb={2}
                fontSize="10px"
                fontWeight="900"
                color="gray.400"
                textTransform="uppercase"
                letterSpacing="wider"
              >
                Selecciona el Cargo Oficial
              </Text>

              {AVAILABLE_ROLES.map((roleOpt) => {
                const isSelected = normalizedKey === roleOpt.key;
                const IconComp = roleOpt.icon;

                return (
                  <MenuItem
                    key={roleOpt.key}
                    onClick={() => onSelectRole(roleOpt.key)}
                    borderRadius="lg"
                    p={2}
                    bg={isSelected ? roleOpt.badgeBg : "transparent"}
                    _hover={{ bg: isSelected ? roleOpt.badgeBg : "gray.50" }}
                    mb={1}
                  >
                    <Flex w="full" justify="space-between" align="center" gap={3}>
                      <HStack spacing={2.5} minW={0} flex={1}>
                        <Flex
                          w="28px"
                          h="28px"
                          borderRadius="md"
                          bg={isSelected ? "white" : "gray.100"}
                          color={roleOpt.badgeColor}
                          align="center"
                          justify="center"
                          border={isSelected ? "1px solid" : "none"}
                          borderColor={roleOpt.badgeBorder}
                          flexShrink={0}
                        >
                          <IconComp className="w-3.5 h-3.5" />
                        </Flex>

                        <Box minW={0} flex={1} textAlign="left">
                          <HStack spacing={1.5} align="center">
                            <Text
                              fontSize="11.5px"
                              fontWeight="800"
                              color={isSelected ? roleOpt.badgeColor : "gray.800"}
                            >
                              {roleOpt.label}
                            </Text>
                            <Badge
                              fontSize="8.5px"
                              fontWeight="800"
                              bg={roleOpt.badgeBg}
                              color={roleOpt.badgeColor}
                              border="1px solid"
                              borderColor={roleOpt.badgeBorder}
                              borderRadius="full"
                              px={1.5}
                            >
                              {roleOpt.badgeLabel}
                            </Badge>
                          </HStack>
                          <Text fontSize="10px" color="gray.500" noOfLines={1} mt={0.5}>
                            {roleOpt.description}
                          </Text>
                        </Box>
                      </HStack>

                      {isSelected && (
                        <Flex
                          w="18px"
                          h="18px"
                          borderRadius="full"
                          bg={roleOpt.badgeColor}
                          color="white"
                          align="center"
                          justify="center"
                          flexShrink={0}
                        >
                          <Check className="w-2.5 h-2.5 stroke-[3]" />
                        </Flex>
                      )}
                    </Flex>
                  </MenuItem>
                );
              })}
            </MenuList>
          </>
        )}
      </Menu>

      {/* ─── Botón Compacto de Cargar Permisos Sugeridos ─── */}
      {activeRole.presetKey && onApplyRolePreset && (
        <Flex
          justify="space-between"
          align="center"
          bg="gray.50"
          p={2}
          px={3}
          mt={2}
          borderRadius="lg"
          border="1px dashed"
          borderColor="gray.300"
          wrap="wrap"
          gap={2}
        >
          <HStack spacing={1.5} minW={0} flex={1}>
            <Sparkles className="w-3.5 h-3.5 text-amber-500 flex-shrink-0" />
            <Text fontSize="11px" color="gray.600" noOfLines={1}>
              ¿Deseas preseleccionar los permisos de <strong>{activeRole.label}</strong> en el árbol?
            </Text>
          </HStack>

          <Button
            size="xs"
            variant="outline"
            colorScheme="green"
            borderRadius="md"
            leftIcon={<Sparkles className="w-3 h-3" />}
            onClick={() => onApplyRolePreset(activeRole.presetKey)}
            fontWeight="700"
            fontSize="10.5px"
            h="24px"
            flexShrink={0}
          >
            Cargar Permisos Sugeridos
          </Button>
        </Flex>
      )}
    </Box>
  );
}
