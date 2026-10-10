import React, { useEffect, useState } from "react";
import {
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalCloseButton,
  Box,
  Flex,
  HStack,
  VStack,
  Text,
  Badge,
  Spinner,
  Center,
  Progress,
  IconButton,
  Tooltip,
} from "@chakra-ui/react";
import { Clock, Monitor, RefreshCw, X, ArrowDown } from "lucide-react";
import { getUserSessions } from "../services/presenceService";

/**
 * Modal de Detalle y Recorrido de Sesiones de Usuario
 * Reproduce exactamente el diseño del monitor corporativo:
 * - Cabecera con estado en vivo y corte por 30m de inactividad
 * - Métricas superiores: SESIONES, TIEMPO DE USO, EQUIPOS
 * - Sección LO QUE MÁS USA con barras de progreso verdes
 * - Timeline cronológico de navegación por sesiones
 */
export function UserSessionDetailModal({ isOpen, onClose, user }) {
  const [sessionData, setSessionData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchSessions = async () => {
    if (!user?.userId) return;
    try {
      setLoading(true);
      setError(null);
      const data = await getUserSessions(user.userId);
      setSessionData(data);
    } catch (err) {
      console.error("Error al obtener sesiones:", err);
      setError("No se pudo cargar el historial de sesiones.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && user?.userId) {
      fetchSessions();
    } else {
      setSessionData(null);
    }
  }, [isOpen, user?.userId]);

  const isUserOnline = (sessionData?.status || user?.status) === "ONLINE";

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="3xl" isCentered scrollBehavior="inside">
      <ModalOverlay bg="blackAlpha.500" backdropFilter="blur(3px)" />
      <ModalContent
        borderRadius="2xl"
        bg="white"
        boxShadow="0 20px 40px -15px rgba(0,0,0,0.2)"
        overflow="hidden"
        maxH="90vh"
        my={4}
      >
        {/* ─── CABECERA DEL MODAL ────────────────────────────────────────── */}
        <ModalHeader pt={6} pb={2} px={7} borderBottom="none">
          <Flex justify="space-between" align="flex-start">
            <Box>
              <HStack spacing={2} align="center">
                <Text fontSize="20px" fontWeight="800" color="gray.900" letterSpacing="-0.02em">
                  {user?.name || user?.username || sessionData?.name || "Usuario"}
                </Text>
                {/* Dot de estado en vivo */}
                {isUserOnline ? (
                  <Box
                    w="8px"
                    h="8px"
                    borderRadius="full"
                    bg="#10b981"
                    boxShadow="0 0 0 3px rgba(16, 185, 129, 0.2)"
                  />
                ) : (
                  <Box w="8px" h="8px" borderRadius="full" bg="gray.300" />
                )}
              </HStack>
              <Text fontSize="12.5px" color="gray.400" fontWeight="400" mt={0.5}>
                Recorrido por sesiones · una sesión se corta tras 30 min sin actividad
              </Text>
            </Box>

            <HStack spacing={2}>
              <Tooltip label="Actualizar sesiones" placement="top">
                <IconButton
                  size="sm"
                  variant="ghost"
                  color="gray.400"
                  _hover={{ color: "gray.700", bg: "gray.100" }}
                  icon={<RefreshCw size={15} />}
                  onClick={fetchSessions}
                  isLoading={loading}
                  aria-label="Refrescar"
                />
              </Tooltip>
              <IconButton
                size="sm"
                variant="ghost"
                color="gray.400"
                _hover={{ color: "gray.700", bg: "gray.100" }}
                icon={<X size={18} />}
                onClick={onClose}
                aria-label="Cerrar modal"
              />
            </HStack>
          </Flex>
        </ModalHeader>

        {/* ─── CUERPO DEL MODAL ──────────────────────────────────────────── */}
        <ModalBody px={7} pb={6} pt={2} overflowY="auto">
          {loading && !sessionData ? (
            <Center py={16}>
              <VStack spacing={3}>
                <Spinner size="lg" color="#10b981" thickness="3px" speed="0.65s" />
                <Text fontSize="13px" color="gray.400">
                  Cargando recorrido de sesiones...
                </Text>
              </VStack>
            </Center>
          ) : error ? (
            <Center py={12}>
              <Text color="red.500" fontSize="sm">
                {error}
              </Text>
            </Center>
          ) : (
            <VStack spacing={6} align="stretch">
              {/* ─── 3 TARJETAS DE MÉTRICAS SUPERIORES ───────────────────────── */}
              <Flex gap={4} wrap={{ base: "wrap", sm: "nowrap" }}>
                {/* 1. Sesiones */}
                <Box
                  flex={1}
                  bg="white"
                  p={4}
                  borderRadius="xl"
                  border="1px solid"
                  borderColor="gray.100"
                  boxShadow="0 1px 3px rgba(0,0,0,0.02)"
                >
                  <Text fontSize="11px" fontWeight="800" color="gray.400" letterSpacing="wider" textTransform="uppercase">
                    SESIONES
                  </Text>
                  <Text fontSize="26px" fontWeight="900" color="gray.900" lineHeight="1.2" mt={1}>
                    {sessionData?.summary?.totalSessions ?? 0}
                  </Text>
                  <Text fontSize="12px" color="gray.400" mt={1}>
                    en el período cargado
                  </Text>
                </Box>

                {/* 2. Tiempo de Uso */}
                <Box
                  flex={1}
                  bg="white"
                  p={4}
                  borderRadius="xl"
                  border="1px solid"
                  borderColor="gray.100"
                  boxShadow="0 1px 3px rgba(0,0,0,0.02)"
                >
                  <Text fontSize="11px" fontWeight="800" color="gray.400" letterSpacing="wider" textTransform="uppercase">
                    TIEMPO DE USO
                  </Text>
                  <Text fontSize="26px" fontWeight="900" color="gray.900" lineHeight="1.2" mt={1}>
                    {sessionData?.summary?.totalUsageTimeText ?? "0 min"}
                  </Text>
                  <Text fontSize="12px" color="gray.400" mt={1}>
                    sumando las sesiones
                  </Text>
                </Box>

                {/* 3. Equipos */}
                <Box
                  flex={1}
                  bg="white"
                  p={4}
                  borderRadius="xl"
                  border="1px solid"
                  borderColor="gray.100"
                  boxShadow="0 1px 3px rgba(0,0,0,0.02)"
                >
                  <Text fontSize="11px" fontWeight="800" color="gray.400" letterSpacing="wider" textTransform="uppercase">
                    EQUIPOS
                  </Text>
                  <Text fontSize="26px" fontWeight="900" color="gray.900" lineHeight="1.2" mt={1}>
                    {sessionData?.summary?.devicesCount ?? 0}
                  </Text>
                  <Text fontSize="12px" color="gray.400" mt={1} noOfLines={1}>
                    {sessionData?.summary?.devicesSummary && sessionData.summary.devicesSummary !== '—'
                      ? sessionData.summary.devicesSummary
                      : "Sin equipos registrados"}
                  </Text>
                </Box>
              </Flex>

              {/* ─── SECCIÓN: LO QUE MÁS USA ─────────────────────────────────── */}
              {sessionData?.topPages && sessionData.topPages.length > 0 && (
                <Box>
                  <Text fontSize="11px" fontWeight="800" color="gray.400" letterSpacing="wider" textTransform="uppercase" mb={3.5}>
                    LO QUE MÁS USA
                  </Text>

                  <VStack spacing={3} align="stretch">
                    {sessionData.topPages.map((page, idx) => (
                      <Flex key={idx} align="center" justify="space-between" gap={4}>
                        {/* Nombre de la página */}
                        <Text
                          fontSize="13px"
                          fontWeight="600"
                          color="gray.700"
                          w={{ base: "140px", sm: "220px" }}
                          flexShrink={0}
                          noOfLines={1}
                        >
                          {page.name}
                        </Text>

                        {/* Barra de progreso verde corporativa */}
                        <Box flex={1} bg="gray.100" h="7px" borderRadius="full" overflow="hidden">
                          <Box
                            h="full"
                            w={`${page.percentage}%`}
                            bg="#16a34a"
                            borderRadius="full"
                            transition="width 0.5s ease"
                          />
                        </Box>

                        {/* Texto de tiempo y repeticiones a la derecha */}
                        <Box textAlign="right" minW="110px" flexShrink={0}>
                          <Text fontSize="12px" color="gray.500" fontWeight="500" lineHeight="1.2">
                            {page.durationText} · {page.visitsText}
                          </Text>
                        </Box>
                      </Flex>
                    ))}
                  </VStack>
                </Box>
              )}

              {/* ─── SECCIÓN: SESIONES (RECORRIDO EN EL TIEMPO) ──────────────── */}
              <Box>
                {(!sessionData?.sessions || sessionData.sessions.length === 0) ? (
                  <Box
                    p={8}
                    bg="gray.50"
                    borderRadius="xl"
                    border="1px dashed"
                    borderColor="gray.200"
                    textAlign="center"
                  >
                    <Center mb={3}>
                      <Box p={3} bg="white" borderRadius="full" boxShadow="xs" color="gray.400">
                        <Clock size={24} />
                      </Box>
                    </Center>
                    <Text fontSize="14px" fontWeight="700" color="gray.700" mb={1}>
                      Sin sesiones registradas aún
                    </Text>
                    <Text fontSize="12.5px" color="gray.500" maxW="420px" mx="auto">
                      El recorrido cronológico, páginas visitadas y tiempo de uso se registrarán automáticamente cuando este usuario inicie sesión y navegue en el sistema local.
                    </Text>
                  </Box>
                ) : (
                  <VStack spacing={4} align="stretch">
                    {sessionData.sessions.map((session, sIdx) => (
                      <Box
                        key={session.id || sIdx}
                        bg="white"
                        borderRadius="xl"
                        border="1px solid"
                        borderColor="gray.200"
                        p={4}
                        boxShadow="0 1px 2px rgba(0,0,0,0.02)"
                      >
                        {/* Cabecera de la sesión */}
                        <Flex
                          justify="space-between"
                          align={{ base: "flex-start", sm: "center" }}
                          direction={{ base: "column", sm: "row" }}
                          gap={2}
                          mb={3.5}
                          pb={2.5}
                          borderBottom="1px solid"
                          borderColor="gray.100"
                        >
                          <HStack spacing={2.5} align="center" wrap="wrap">
                            <Text fontSize="13px" fontWeight="700" color="gray.900">
                              {session.timeRangeText}
                            </Text>
                            <Text fontSize="12.5px" fontWeight="600" color="gray.500">
                              {session.durationText}
                            </Text>
                            {session.isLive && (
                              <Badge
                                bg="#ecfdf5"
                                color="#059669"
                                border="1px solid"
                                borderColor="#a7f3d0"
                                fontSize="11px"
                                fontWeight="700"
                                px={2}
                                py={0.5}
                                borderRadius="full"
                                textTransform="lowercase"
                              >
                                en curso
                              </Badge>
                            )}
                          </HStack>

                          <HStack spacing={1.5} color="gray.500" fontSize="12px">
                            <Monitor size={14} color="#6b7280" />
                            <Text color="gray.500" noOfLines={1}>
                              {session.deviceText}
                            </Text>
                          </HStack>
                        </Flex>

                        {/* Lista cronológica de eventos de la sesión */}
                        <VStack spacing={2.5} align="stretch">
                          {(session.events || []).map((evt, eIdx) => {
                            const isEntry = evt.isEntry || (evt.title && evt.title.startsWith("Entra ·"));
                            const displayTitle = evt.title || "Navegación";

                            return (
                              <Flex
                                key={evt.id || eIdx}
                                align="center"
                                justify="space-between"
                                gap={3}
                                py={0.5}
                              >
                                {/* Hora y Bullet */}
                                <HStack spacing={3} align="flex-start" minW={0} flex={1}>
                                  <Text
                                    fontSize="12px"
                                    color="gray.400"
                                    fontWeight="500"
                                    w="42px"
                                    flexShrink={0}
                                    pt={0.5}
                                  >
                                    {evt.time}
                                  </Text>

                                  <Box
                                    w="6px"
                                    h="6px"
                                    borderRadius="full"
                                    bg="#10b981"
                                    mt="6px"
                                    flexShrink={0}
                                  />

                                  {/* Título de la acción y ruta */}
                                  <Box minW={0} flex={1}>
                                    <HStack spacing={1.5} wrap="wrap">
                                      {isEntry && !displayTitle.startsWith("Entra ·") ? (
                                        <Text as="span" fontSize="13px" fontWeight="700" color="#059669">
                                          Entra ·
                                        </Text>
                                      ) : null}
                                      <Text
                                        fontSize="13px"
                                        fontWeight={isEntry ? "700" : "600"}
                                        color="gray.800"
                                        noOfLines={1}
                                      >
                                        {displayTitle}
                                      </Text>
                                    </HStack>
                                    {evt.path && (
                                      <Text
                                        fontSize="11px"
                                        color="gray.400"
                                        fontFamily="monospace"
                                        noOfLines={1}
                                      >
                                        {evt.path}
                                      </Text>
                                    )}
                                  </Box>
                                </HStack>

                                {/* Duración de permanencia en esa página */}
                                <HStack spacing={1} color="gray.400" fontSize="12px" flexShrink={0}>
                                  <Clock size={12} color="#9ca3af" />
                                  <Text color="gray.500" fontSize="12px" fontWeight="500">
                                    {evt.durationText}
                                  </Text>
                                </HStack>
                              </Flex>
                            );
                          })}
                        </VStack>
                      </Box>
                    ))}
                  </VStack>
                )}
              </Box>
            </VStack>
          )}
        </ModalBody>
      </ModalContent>
    </Modal>
  );
}
