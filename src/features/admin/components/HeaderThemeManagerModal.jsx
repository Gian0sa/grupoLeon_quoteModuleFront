import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  ModalCloseButton,
  Box,
  Flex,
  VStack,
  HStack,
  Text,
  Badge,
  Button,
  SimpleGrid,
  Input,
  InputGroup,
  InputLeftElement,
  InputRightElement,
  IconButton,
  Skeleton,
  Alert,
  AlertIcon,
  Divider,
  useToast,
} from "@chakra-ui/react";
import {
  Palette,
  Search,
  X,
  Check,
  Sparkles,
  Users,
  Bell,
  Menu,
  ArrowLeft,
} from "lucide-react";
import { useHeaderTheme } from "../../../hooks/useHeaderTheme";
import {
  HEADER_THEMES,
  getHeaderThemeConfig,
} from "../../../shared/utils/headerThemes";
import { useGetAllUsersAdmin } from "../hooks/queries/authAdminQueries";
import { HeaderBrandWatermark } from "../../../components/HeaderBrandWatermark";
import { UserThemeAccessCard } from "./UserThemeAccessCard";

function HeaderLivePreview({ previewTheme }) {
  const pillBg = previewTheme.useDarkText
    ? "rgba(255, 255, 255, 0.52)"
    : previewTheme.glassBg;

  return (
    <Box
      w="full"
      borderRadius="2xl"
      bg={previewTheme.baseBg}
      bgImage={previewTheme.mainBg}
      boxShadow={previewTheme.boxShadow}
      color={previewTheme.textColor}
      p={{ base: 3.5, sm: 4 }}
      position="relative"
      overflow="hidden"
      transition="all 0.25s ease"
    >
      <HeaderBrandWatermark
        theme={previewTheme}
        variant="preview"
        opacity={0.4}
        showOverlay={true}
        showCircles={true}
      />

      <VStack align="stretch" spacing={3} position="relative" zIndex={2}>
        {/* Barra superior simulada */}
        <Flex justify="space-between" align="center" gap={2}>
          <HStack spacing={2}>
            <Flex
              w="28px"
              h="28px"
              borderRadius="full"
              bg={previewTheme.glassBg}
              border="1px solid"
              borderColor={previewTheme.glassBorder}
              align="center"
              justify="center"
            >
              <ArrowLeft size={14} color={previewTheme.textColor} />
            </Flex>
            <HStack
              bg={previewTheme.glassBg}
              border="1px solid"
              borderColor={previewTheme.glassBorder}
              borderRadius="full"
              px={2.5}
              py={1}
              spacing={1.5}
            >
              <Box
                w="6px"
                h="6px"
                borderRadius="full"
                bg={previewTheme.dotColor}
                boxShadow={previewTheme.dotShadow}
              />
              <Text
                fontSize="11px"
                fontWeight="800"
                color={previewTheme.textColor}
              >
                USD: 3.49
              </Text>
            </HStack>
          </HStack>

          <HStack
            bg={previewTheme.glassBg}
            border="1px solid"
            borderColor={previewTheme.glassBorder}
            borderRadius="full"
            px={2.5}
            py={1}
            spacing={2}
          >
            <Bell size={13} color={previewTheme.textColor} />
            <Menu size={14} color={previewTheme.textColor} />
          </HStack>
        </Flex>

        {/* Título y subtítulo */}
        <Box>
          <Text
            fontSize="md"
            fontWeight="800"
            color={previewTheme.textColor}
            lineHeight="1.2"
          >
            Vista Previa • {previewTheme.label}
          </Text>
          <Text
            fontSize="xs"
            color={previewTheme.subtextColor}
            fontWeight="500"
            mt={0.5}
          >
            Así lucirá tu cabecera (cada usuario abajo conserva su propio color asignado)
          </Text>
        </Box>

        {/* Mini pills tipo QuickActions */}
        <HStack spacing={2} flexWrap="wrap">
          {["Cotizaciones", "Lista Precios", "Mis Pedidos"].map((label) => (
            <Box
              key={label}
              bg={pillBg}
              border="1px solid"
              borderColor={previewTheme.glassBorder}
              borderRadius="full"
              px={3}
              py={1}
            >
              <Text
                fontSize="10.5px"
                fontWeight="800"
                color={previewTheme.textColor}
              >
                {label}
              </Text>
            </Box>
          ))}
        </HStack>
      </VStack>
    </Box>
  );
}

export function HeaderThemeManagerModal({ isOpen, onClose }) {
  const toast = useToast();
  const {
    canManageTheme,
    configuredThemeKey,
    allowedUserIds,
    userThemes,
    updateTheme,
    isLoading: isThemeLoading,
    isError: isThemeError,
    refetch: refetchTheme,
  } = useHeaderTheme();

  const {
    data: usersData,
    isLoading: isLoadingUsers,
    error: usersError,
    refetch: refetchUsers,
  } = useGetAllUsersAdmin();

  const [selectedThemeKey, setSelectedThemeKey] = useState(configuredThemeKey);
  const [searchTerm, setSearchTerm] = useState("");
  const [togglingUserIds, setTogglingUserIds] = useState(() => new Set());
  const [isSavingTheme, setIsSavingTheme] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setSelectedThemeKey(configuredThemeKey);
    }
  }, [isOpen, configuredThemeKey]);

  const usersList = useMemo(() => {
    if (Array.isArray(usersData)) return usersData;
    if (Array.isArray(usersData?.data)) return usersData.data;
    if (Array.isArray(usersData?.users)) return usersData.users;
    return [];
  }, [usersData]);

  const trimmedSearch = searchTerm.trim();

  const filteredUsers = useMemo(() => {
    const q = trimmedSearch.toLowerCase();
    const list = q
      ? usersList.filter((u) =>
          `${u.username || ""} ${u.email || ""} ${u.salesEmployeeCode || ""}`
            .toLowerCase()
            .includes(q)
        )
      : usersList;

    return [...list].sort((a, b) =>
      String(a.username || "").localeCompare(String(b.username || ""))
    );
  }, [usersList, trimmedSearch]);

  const handleToggleStart = useCallback((targetId) => {
    setTogglingUserIds((prev) => {
      const next = new Set(prev);
      next.add(targetId);
      return next;
    });
  }, []);

  const handleToggleEnd = useCallback((targetId) => {
    setTogglingUserIds((prev) => {
      const next = new Set(prev);
      next.delete(targetId);
      return next;
    });
  }, []);

  if (!canManageTheme) {
    return null;
  }

  const previewTheme = getHeaderThemeConfig(selectedThemeKey);
  const hasPendingThemeChange = selectedThemeKey !== configuredThemeKey;
  const themeOptions = Object.values(HEADER_THEMES);
  const customizedUsersCount = new Set([
    ...Object.keys(userThemes || {}),
    ...(allowedUserIds || []).map(String),
  ]).size;

  const handleSaveTheme = async () => {
    if (isThemeError || isThemeLoading) return;
    setIsSavingTheme(true);
    try {
      await updateTheme({
        themeKey: selectedThemeKey,
      });
      toast({
        title: "Tu tema aplicado en tiempo real",
        description: `Se activó "${previewTheme.label}" para tu sesión sin modificar el color de otros usuarios.`,
        status: "success",
        duration: 3000,
        isClosable: true,
        position: "top-right",
      });
    } catch (error) {
      toast({
        title: "No se pudo aplicar el tema",
        description:
          error?.response?.data?.message ||
          error?.message ||
          "Ocurrió un error al guardar el tema de cabeceras.",
        status: "error",
        duration: 4000,
        isClosable: true,
        position: "top-right",
      });
    } finally {
      setIsSavingTheme(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size={{ base: "full", md: "4xl" }}
      scrollBehavior="inside"
      isCentered
    >
      <ModalOverlay bg="blackAlpha.600" backdropFilter="blur(4px)" />
      <ModalContent
        borderRadius={{ base: 0, md: "2xl" }}
        boxShadow="2xl"
        maxH={{ base: "100vh", md: "90vh" }}
        overflow="hidden"
      >
        <ModalHeader
          bg="white"
          borderBottom="1px solid"
          borderColor="gray.100"
          py={4}
          px={{ base: 4, md: 6 }}
        >
          <Flex justify="space-between" align="center" gap={3}>
            <HStack spacing={3}>
              <Flex
                w="40px"
                h="40px"
                borderRadius="xl"
                bg="gray.100"
                color="gray.700"
                align="center"
                justify="center"
                border="1px solid"
                borderColor="gray.200"
                flexShrink={0}
              >
                <Palette size={20} />
              </Flex>
              <Box>
                <HStack spacing={2} flexWrap="wrap">
                  <Text fontSize="md" fontWeight="900" color="gray.900">
                    Tema de Cabeceras
                  </Text>
                  <Badge
                    colorScheme="green"
                    borderRadius="full"
                    px={2.5}
                    py={0.5}
                    fontSize="10px"
                    fontWeight="800"
                  >
                    Exclusivo Misael Cumapa
                  </Badge>
                </HStack>
                <Text fontSize="xs" color="gray.600" mt={0.5}>
                  Elige tu paleta personal y asigna colores independientes a cada usuario
                </Text>
              </Box>
            </HStack>
            <ModalCloseButton position="static" />
          </Flex>
        </ModalHeader>

        <ModalBody py={5} px={{ base: 4, md: 6 }}>
          <VStack spacing={5} align="stretch">
            {isThemeError && (
              <Alert status="error" borderRadius="xl" fontSize="xs">
                <AlertIcon />
                <Flex justify="space-between" align="center" w="full" gap={2}>
                  <Text fontWeight="600">
                    No se pudo cargar la configuración del tema desde el servidor.
                  </Text>
                  <Button
                    size="xs"
                    colorScheme="red"
                    variant="outline"
                    onClick={() => refetchTheme()}
                  >
                    Reintentar
                  </Button>
                </Flex>
              </Alert>
            )}

            {/* 1. Vista previa en vivo */}
            <Box>
              <Flex justify="space-between" align="center" mb={2}>
                <HStack spacing={1.5}>
                  <Sparkles size={14} color="#126C36" />
                  <Text
                    fontSize="xs"
                    fontWeight="900"
                    color="gray.700"
                    textTransform="uppercase"
                    letterSpacing="wider"
                  >
                    1. Vista Previa en Vivo
                  </Text>
                </HStack>
                <Badge
                  colorScheme={hasPendingThemeChange ? "orange" : "green"}
                  variant="subtle"
                  borderRadius="full"
                  px={2.5}
                  fontSize="10px"
                  fontWeight="800"
                >
                  {hasPendingThemeChange ? "Previsualizando cambio" : "Tema activo en vivo"}
                </Badge>
              </Flex>

              <HeaderLivePreview previewTheme={previewTheme} />
            </Box>

            {/* 2. Selector de 12 paletas compactas */}
            <Box>
              <Flex justify="space-between" align="center" mb={2}>
                <Text
                  fontSize="xs"
                  fontWeight="900"
                  color="gray.700"
                  textTransform="uppercase"
                  letterSpacing="wider"
                >
                  2. Tu Paleta de Color (Misael)
                </Text>
                <Text fontSize="11px" fontWeight="700" color="gray.500">
                  {themeOptions.length} temas disponibles
                </Text>
              </Flex>

              <SimpleGrid columns={{ base: 2, sm: 3, md: 4 }} spacing={2}>
                {themeOptions.map((item) => {
                  const isSelected = selectedThemeKey === item.key;
                  const isActiveLive = configuredThemeKey === item.key;
                  return (
                    <Box
                      key={item.key}
                      as="button"
                      type="button"
                      textAlign="left"
                      px={2.5}
                      py={2}
                      borderRadius="xl"
                      border="2px solid"
                      borderColor={isSelected ? "green.600" : "gray.200"}
                      bg={isSelected ? "green.50" : "white"}
                      boxShadow={
                        isSelected
                          ? "0 4px 12px rgba(18, 108, 54, 0.18)"
                          : "xs"
                      }
                      transition="all 0.15s ease"
                      _hover={{
                        borderColor: isSelected ? "green.600" : "gray.400",
                        transform: "translateY(-1px)",
                      }}
                      _active={{ transform: "scale(0.98)" }}
                      onClick={() => setSelectedThemeKey(item.key)}
                    >
                      <HStack spacing={2} align="center">
                        <Box
                          w="32px"
                          h="32px"
                          borderRadius="lg"
                          bg={item.baseBg}
                          bgImage={item.mainBg}
                          position="relative"
                          overflow="hidden"
                          flexShrink={0}
                          border="1px solid rgba(0,0,0,0.12)"
                        >
                          <Box
                            position="absolute"
                            top="-6px"
                            right="-6px"
                            w="16px"
                            h="16px"
                            borderRadius="full"
                            bg={item.circleBg}
                            opacity={0.85}
                          />
                          {isSelected && (
                            <Flex
                              position="absolute"
                              inset={0}
                              bg="blackAlpha.350"
                              align="center"
                              justify="center"
                            >
                              <Check size={14} color="#ffffff" strokeWidth={3.5} />
                            </Flex>
                          )}
                        </Box>

                        <Box flex="1" minW={0}>
                          <HStack spacing={1} align="center">
                            <Text
                              fontWeight="800"
                              fontSize="xs"
                              color="gray.900"
                              noOfLines={1}
                              lineHeight="1.2"
                            >
                              {item.label}
                            </Text>
                            {isActiveLive && (
                              <Box
                                w="5px"
                                h="5px"
                                borderRadius="full"
                                bg="green.500"
                                flexShrink={0}
                                title="Tema activo actualmente"
                              />
                            )}
                          </HStack>
                          <Text
                            fontSize="10px"
                            color="gray.500"
                            mt={0.5}
                            noOfLines={1}
                            lineHeight="1"
                          >
                            {item.subtitle}
                          </Text>
                        </Box>
                      </HStack>
                    </Box>
                  );
                })}
              </SimpleGrid>
            </Box>

            <Divider />

            {/* 3. Accesos por usuario en 1 clic */}
            <Box>
              <Flex
                justify="space-between"
                align={{ base: "start", sm: "center" }}
                direction={{ base: "column", sm: "row" }}
                gap={2}
                mb={3}
              >
                <HStack spacing={2}>
                  <Users size={15} color="#4b5563" />
                  <Text
                    fontSize="xs"
                    fontWeight="900"
                    color="gray.700"
                    textTransform="uppercase"
                    letterSpacing="wider"
                  >
                    3. Color Personalizado por Usuario (1 Clic)
                  </Text>
                </HStack>

                <Badge
                  bg="gray.100"
                  color="gray.700"
                  border="1px solid"
                  borderColor="gray.200"
                  borderRadius="full"
                  px={2.5}
                  py={0.5}
                  fontSize="10.5px"
                  fontWeight="800"
                >
                  {customizedUsersCount} personalizado{customizedUsersCount === 1 ? "" : "s"} + Misael
                </Badge>
              </Flex>

              <InputGroup size="sm" mb={3}>
                <InputLeftElement pointerEvents="none" h="38px">
                  <Search size={15} color="#9ca3af" />
                </InputLeftElement>
                <Input
                  h="38px"
                  borderRadius="xl"
                  bg="gray.50"
                  placeholder="Buscar usuario por nombre, correo o cód. SAP..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  _focus={{
                    bg: "white",
                    borderColor: "green.500",
                    boxShadow: "0 0 0 1px #16a34a",
                  }}
                />
                {searchTerm && (
                  <InputRightElement h="38px">
                    <IconButton
                      size="xs"
                      variant="ghost"
                      icon={<X size={14} />}
                      aria-label="Limpiar búsqueda"
                      onClick={() => setSearchTerm("")}
                    />
                  </InputRightElement>
                )}
              </InputGroup>

              {isLoadingUsers ? (
                <VStack spacing={2} align="stretch">
                  {[...Array(4)].map((_, idx) => (
                    <Skeleton key={idx} h="52px" borderRadius="xl" />
                  ))}
                </VStack>
              ) : usersError ? (
                <Alert status="error" borderRadius="xl" fontSize="xs">
                  <AlertIcon />
                  <Flex justify="space-between" align="center" w="full" gap={2}>
                    <Text>No se pudo cargar la lista de usuarios.</Text>
                    <Button size="xs" colorScheme="red" variant="outline" onClick={() => refetchUsers()}>
                      Reintentar
                    </Button>
                  </Flex>
                </Alert>
              ) : usersList.length === 0 ? (
                <Box
                  py={8}
                  textAlign="center"
                  bg="gray.50"
                  borderRadius="xl"
                  border="1px dashed"
                  borderColor="gray.200"
                >
                  <Text fontSize="sm" fontWeight="700" color="gray.600">
                    No hay usuarios registrados
                  </Text>
                  <Text fontSize="xs" color="gray.400" mt={0.5}>
                    Cuando existan usuarios en el sistema aparecerán aquí para asignar accesos.
                  </Text>
                </Box>
              ) : filteredUsers.length === 0 ? (
                <Box
                  py={8}
                  textAlign="center"
                  bg="gray.50"
                  borderRadius="xl"
                  border="1px dashed"
                  borderColor="gray.200"
                >
                  <Text fontSize="sm" fontWeight="700" color="gray.600">
                    Sin resultados para tu búsqueda
                  </Text>
                  <Text fontSize="xs" color="gray.400" mt={0.5}>
                    No se encontraron coincidencias para &ldquo;{trimmedSearch}&rdquo;.
                  </Text>
                </Box>
              ) : (
                <VStack
                  spacing={2}
                  align="stretch"
                  maxH="250px"
                  overflowY="auto"
                  pr={1}
                >
                  {filteredUsers.map((user) => (
                    <UserThemeAccessCard
                      key={user.id}
                      user={user}
                      variant="row"
                      isTogglingExternal={togglingUserIds.has(user.id)}
                      isDisabled={isSavingTheme}
                      onToggleStart={handleToggleStart}
                      onToggleEnd={handleToggleEnd}
                    />
                  ))}
                </VStack>
              )}
            </Box>
          </VStack>
        </ModalBody>

        <ModalFooter
          bg="#f8fafc"
          borderTop="1px solid"
          borderColor="gray.200"
          py={3.5}
          px={{ base: 4, md: 6 }}
        >
          <HStack spacing={3} w="full" justify="flex-end">
            <Button
              variant="outline"
              borderRadius="xl"
              fontWeight="700"
              onClick={onClose}
              isDisabled={isSavingTheme}
            >
              Cerrar
            </Button>
            <Button
              bg="#126C36"
              color="white"
              _hover={{ bg: "#0e572b" }}
              _active={{ bg: "#0a3f1f", transform: "scale(0.98)" }}
              borderRadius="xl"
              fontWeight="800"
              boxShadow="0 4px 14px rgba(18, 108, 54, 0.3)"
              onClick={handleSaveTheme}
              isLoading={isSavingTheme}
              isDisabled={isThemeError || isThemeLoading}
              loadingText="Aplicando en vivo..."
              leftIcon={<Palette size={16} />}
            >
              Aplicar y Guardar Tema
            </Button>
          </HStack>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}
