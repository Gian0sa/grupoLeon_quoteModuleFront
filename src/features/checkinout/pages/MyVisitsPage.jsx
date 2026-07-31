import {
  Box,
  Heading,
  VStack,
  HStack,
  Text,
  Badge,
  Spinner,
  Card,
  CardBody,
  useColorModeValue,
  Flex,
  Button,
  Input,
  Icon,
} from "@chakra-ui/react";
import { useMemo, useState, useEffect } from "react";
import { useMyVisitLogs } from "../hooks/queries/visitLogQueries";
import { useSyncQueue } from "../hooks/useSyncQueue";
import { BackButton } from "../../../components/BackButton";
import { getQueue } from "../services/visitLogQueue";
import { useAuthStore } from "../../auth/stores/useAuthStore";
import { TopHeaderBanner } from "../../../components/TopHeaderBanner";
import Estadisticas from "../components/Estadisticas";
import { 
  Building2, 
  LogIn, 
  LogOut, 
  Clock, 
  AlertTriangle, 
  CheckCircle2, 
  RefreshCw, 
  Calendar, 
  WifiOff,
  AlertCircle
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const MotionBox = motion(Box);
const MotionCard = motion(Card);

const formatDateTime = (dateString) => {
  if (!dateString) return "N/A";
  const date = new Date(dateString);
  return date.toLocaleString("es-PE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const calculateDuration = (checkIn, checkOut) => {
  if (!checkIn || !checkOut) return "N/A";
  const diff = new Date(checkOut) - new Date(checkIn);
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  return `${hours}h ${minutes}m`;
};

const isToday = (date) => {
  const today = new Date();
  const checkDate = new Date(date);
  return (
    checkDate.getDate() === today.getDate() &&
    checkDate.getMonth() === today.getMonth() &&
    checkDate.getFullYear() === today.getFullYear()
  );
};

const isYesterday = (date) => {
  const today = new Date();
  const checkDate = new Date(date);
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  return (
    checkDate.getDate() === yesterday.getDate() &&
    checkDate.getMonth() === yesterday.getMonth() &&
    checkDate.getFullYear() === yesterday.getFullYear()
  );
};

const isThisWeek = (date) => {
  const today = new Date();
  const checkDate = new Date(date);
  const weekStart = new Date(today);
  weekStart.setDate(today.getDate() - today.getDay());
  weekStart.setHours(0, 0, 0, 0);
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 7);
  return checkDate >= weekStart && checkDate < weekEnd;
};

const isThisMonth = (date) => {
  const today = new Date();
  const checkDate = new Date(date);
  return (
    checkDate.getMonth() === today.getMonth() &&
    checkDate.getFullYear() === today.getFullYear()
  );
};

export default function MyVisitsPage() {
  const { username } = useAuthStore();
  const { data, isLoading, error } = useMyVisitLogs();
  const { retryGroup, syncPending, isSyncing } = useSyncQueue();
  const [queueItems, setQueueItems] = useState([]);
  const [filterType, setFilterType] = useState("today");
  const [statusFilter, setStatusFilter] = useState("all"); // 'all', 'pending', 'errors'
  const [customStartDate, setCustomStartDate] = useState("");
  const [customEndDate, setCustomEndDate] = useState("");

  useEffect(() => {
    getQueue().then(items => {
      setQueueItems(items || []);
    });
  }, [data, isSyncing]);

  const localVisits = useMemo(() => {
    return queueItems
      .filter((item) => item.vendorName === username && item.status !== "SYNCED")
      .map((item) => ({
        id: `local-${item.id}`,
        type: item.type,
        storeName: item.storeName,
        createdAt: new Date(item._queuedAt).toISOString(),
        isLocal: true,
        status: item.status,
        errorMessage: item.errorMessage,
        uuid: item.uuid,
      }));
  }, [queueItems, username]);

  const serverErrorVisits = useMemo(() => {
    if (!data?.errorVisits) return [];
    
    const localUuids = new Set(localVisits.map(v => v.uuid).filter(Boolean));
    
    return data.errorVisits
      .filter(errorVisit => !localUuids.has(errorVisit.uuid))
      .map((item) => ({
        id: `server-error-${item.id}`,
        type: item.type,
        storeName: item.storeName || "Sin nombre",
        createdAt: new Date(item.createdAt).toISOString(),
        isLocal: false,
        status: "FAILED",
        errorMessage: item.errorReason || "Error del servidor",
        uuid: item.uuid,
      }));
  }, [data?.errorVisits, localVisits]);

  const visits = useMemo(() => {
    const serverVisits = data?.visits || [];
    return [...localVisits, ...serverErrorVisits, ...serverVisits];
  }, [data?.visits, localVisits, serverErrorVisits]);

  const cardBg = useColorModeValue("white", "gray.700");
  const borderColor = useColorModeValue("gray.200", "gray.600");

  const filteredVisits = useMemo(() => {
    let result = visits;

    if (filterType !== "all") {
      result = result.filter((visit) => {
        const visitDate = new Date(visit.createdAt);

        switch (filterType) {
          case "today":
            return isToday(visit.createdAt);
          case "yesterday":
            return isYesterday(visit.createdAt);
          case "week":
            return isThisWeek(visit.createdAt);
          case "month":
            return isThisMonth(visit.createdAt);
          case "custom":
            if (!customStartDate) return true;
            const [startYear, startMonth, startDay] = customStartDate.split("-").map(Number);
            const start = new Date(startYear, startMonth - 1, startDay, 0, 0, 0, 0);

            let end;
            if (customEndDate) {
              const [endYear, endMonth, endDay] = customEndDate.split("-").map(Number);
              end = new Date(endYear, endMonth - 1, endDay, 23, 59, 59, 999);
            } else {
              end = new Date();
              end.setHours(23, 59, 59, 999);
            }
            return visitDate >= start && visitDate <= end;
          default:
            return true;
        }
      });
    }

    return result;
  }, [visits, filterType, customStartDate, customEndDate]);

  const grouped = useMemo(() => {
    const sorted = [...filteredVisits].sort(
      (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
    );

    const groups = [];
    const processed = new Set();

    sorted.forEach((visit) => {
      if (processed.has(visit.id)) return;

      if (visit.type === "IN") {
        const matchingOut = sorted.find(
          (v) =>
            !processed.has(v.id) &&
            v.type === "OUT" &&
            v.storeName === visit.storeName &&
            new Date(v.createdAt) > new Date(visit.createdAt)
        );

        groups.push({
          id: visit.id,
          storeName: visit.storeName,
          in: visit,
          out: matchingOut || null,
        });

        processed.add(visit.id);
        if (matchingOut) processed.add(matchingOut.id);
      }
    });

    return groups;
  }, [filteredVisits]);

  const finalDisplayedGroups = useMemo(() => {
    if (statusFilter === "pending") {
      return grouped.filter((g) => g.in && !g.out);
    }
    if (statusFilter === "errors") {
      return grouped.filter((g) => g.in?.status === "FAILED" || g.out?.status === "FAILED" || g.in?.isLocal || g.out?.isLocal);
    }
    return grouped;
  }, [grouped, statusFilter]);

  const stats = useMemo(() => {
    const total = grouped.length;
    const completed = grouped.filter((g) => g.in && g.out).length;
    const pending = grouped.filter((g) => g.in && !g.out).length;
    const errors = grouped.filter((g) => g.in?.status === "FAILED" || g.out?.status === "FAILED" || g.in?.isLocal || g.out?.isLocal).length;

    return { total, completed, pending, errors };
  }, [grouped]);

  if (isLoading) {
    return (
      <Box textAlign="center" py={12}>
        <Spinner size="xl" color="green.500" thickness="4px" />
        <Text mt={4} fontWeight="semibold" color="gray.600">Cargando tus visitas...</Text>
      </Box>
    );
  }

  return (
    <Box w="full" minH="100vh" bg="gray.50" pb="120px">
      <TopHeaderBanner
        title="Mis Visitas"
        subtitle="Historial de check-in, check-out y seguimiento de campo"
        showBack={true}
        mb={6}
      />

      <Box maxW="1200px" mx="auto" px={{ base: 3, md: 6 }}>
        <VStack spacing={5} align="stretch">
        <AnimatePresence>
          {(stats.pending > 0 || stats.errors > 0) && (
            <MotionBox
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              bg="linear-gradient(135deg, #fff7ed 0%, #ffedd5 100%)"
              border="2px solid"
              borderColor="#f59e0b"
              borderRadius="2xl"
              p={{ base: 3.5, md: 4 }}
              boxShadow="0 8px 25px rgba(245, 158, 11, 0.15)"
            >
              <Flex direction={{ base: "column", sm: "row" }} justify="space-between" align={{ base: "start", sm: "center" }} gap={3}>
                <HStack spacing={3} align="start">
                  <Box p={2.5} borderRadius="xl" bg="#d97706" color="white" flexShrink={0}>
                    <Icon as={AlertTriangle} boxSize={5} />
                  </Box>
                  <VStack align="start" spacing={0}>
                    <Text fontSize="sm" fontWeight="800" color="#78350f">
                      ¡Atención requerida en tus registros!
                    </Text>
                    <Text fontSize="xs" color="#92400e" fontWeight="600">
                      {stats.pending > 0 && `Tienes ${stats.pending} visita(s) sin registrar Check-Out. `}
                      {stats.errors > 0 && `${stats.errors} marca(s) no se han subido al servidor.`}
                    </Text>
                  </VStack>
                </HStack>

                <HStack spacing={2} w={{ base: "full", sm: "auto" }}>
                  {stats.errors > 0 && (
                    <Button
                      size="sm"
                      bg="linear-gradient(135deg, #14532d 0%, #166534 50%, #15803d 100%)"
                      color="white"
                      borderRadius="full"
                      px={4}
                      h="34px"
                      fontSize="xs"
                      fontWeight="700"
                      boxShadow="0 4px 12px rgba(22, 101, 52, 0.3)"
                      leftIcon={<Icon as={RefreshCw} boxSize={3.5} />}
                      isLoading={isSyncing}
                      onClick={() => syncPending()}
                      _hover={{ bg: "#0d4226" }}
                      flex={{ base: 1, sm: "auto" }}
                    >
                      Sincronizar Todo
                    </Button>
                  )}
                  {stats.pending > 0 && (
                    <Button
                      size="sm"
                      bg="#d97706"
                      color="white"
                      borderRadius="full"
                      px={4}
                      h="34px"
                      fontSize="xs"
                      fontWeight="700"
                      boxShadow="0 4px 12px rgba(217, 119, 6, 0.3)"
                      leftIcon={<Icon as={Clock} boxSize={3.5} />}
                      onClick={() => setStatusFilter(statusFilter === "pending" ? "all" : "pending")}
                      _hover={{ bg: "#b45309" }}
                      flex={{ base: 1, sm: "auto" }}
                    >
                      {statusFilter === "pending" ? "Ver Todas" : "Ver Pendientes"}
                    </Button>
                  )}
                </HStack>
              </Flex>
            </MotionBox>
          )}
        </AnimatePresence>

        {/* Filtros por Fecha */}
        <Card bg={cardBg} borderColor={borderColor} borderRadius="2xl" boxShadow="0 4px 15px rgba(0,0,0,0.03)">
          <CardBody p={{ base: 3.5, md: 4 }}>
            <VStack spacing={3} align="stretch">
              <Flex justify="space-between" align="center">
                <HStack spacing={2}>
                  <Icon as={Calendar} boxSize={4} color="green.700" />
                  <Text fontWeight="700" fontSize="sm" color="gray.800">
                    Filtrar por fecha
                  </Text>
                </HStack>
                {statusFilter !== "all" && (
                  <Badge 
                    colorScheme={statusFilter === "pending" ? "amber" : "red"}
                    cursor="pointer"
                    onClick={() => setStatusFilter("all")}
                    borderRadius="full"
                    px={2.5}
                    py={0.5}
                  >
                    Filtro Estado: {statusFilter.toUpperCase()} (x)
                  </Badge>
                )}
              </Flex>

              <Flex gap={2} wrap="wrap">
                {[
                  { id: "today", label: "Hoy" },
                  { id: "yesterday", label: "Ayer" },
                  { id: "all", label: "Todas" },
                  { id: "week", label: "Semana" },
                  { id: "month", label: "Mes" },
                  { id: "custom", label: "Personalizado" },
                ].map((f) => {
                  const isActive = filterType === f.id;
                  return (
                    <Button
                      key={f.id}
                      size="sm"
                      borderRadius="full"
                      px={4}
                      h="34px"
                      fontSize="xs"
                      fontWeight={isActive ? "700" : "600"}
                      onClick={() => {
                        setFilterType(f.id);
                        if (f.id !== "custom") {
                          setCustomStartDate("");
                          setCustomEndDate("");
                        }
                      }}
                      bg={
                        isActive
                          ? "linear-gradient(135deg, #14532d 0%, #166534 50%, #15803d 100%)"
                          : "green.50"
                      }
                      color={isActive ? "white" : "green.800"}
                      border={isActive ? "none" : "1px solid"}
                      borderColor={isActive ? "transparent" : "green.200"}
                      boxShadow={isActive ? "0 4px 12px rgba(22, 101, 52, 0.25)" : "none"}
                      _hover={{
                        bg: isActive
                          ? "linear-gradient(135deg, #14532d 0%, #166534 50%, #15803d 100%)"
                          : "green.100",
                        transform: "translateY(-1px)",
                      }}
                      transition="all 0.2s"
                    >
                      {f.label}
                    </Button>
                  );
                })}
              </Flex>

              {filterType === "custom" && (
                <HStack spacing={3} mt={2}>
                  <Box flex={1}>
                    <Text fontSize="xs" fontWeight="semibold" mb={1} color="gray.600">Desde:</Text>
                    <Input
                      type="date"
                      size="sm"
                      borderRadius="xl"
                      value={customStartDate}
                      onChange={(e) => setCustomStartDate(e.target.value)}
                    />
                  </Box>
                  <Box flex={1}>
                    <Text fontSize="xs" fontWeight="semibold" mb={1} color="gray.600">Hasta:</Text>
                    <Input
                      type="date"
                      size="sm"
                      borderRadius="xl"
                      value={customEndDate}
                      onChange={(e) => setCustomEndDate(e.target.value)}
                    />
                  </Box>
                </HStack>
              )}
            </VStack>
          </CardBody>
        </Card>

        {/* Tarjetas de Estadísticas */}
        <Estadisticas stats={stats} />

        {/* Lista de Visitas Rediseñada */}
        <VStack spacing={3.5} align="stretch" pt={1}>
          {finalDisplayedGroups.length === 0 ? (
            <Card borderRadius="2xl" p={6} textAlign="center" bg="gray.50">
              <CardBody>
                <Icon as={Building2} boxSize={8} color="gray.400" mb={2} />
                <Text fontWeight="semibold" color="gray.600">
                  {filterType === "all"
                    ? "No tienes visitas registradas en este estado."
                    : "No hay visitas registradas para el período seleccionado."}
                </Text>
              </CardBody>
            </Card>
          ) : (
            finalDisplayedGroups.map((group) => {
              const isPendingCheckout = group.in && !group.out;
              const hasError = group.in?.status === "FAILED" || group.out?.status === "FAILED";
              const isLocalGroup = group.in?.isLocal || group.out?.isLocal;

              let cardBorderColor = borderColor;
              let cardBgColor = cardBg;

              if (hasError || isLocalGroup) {
                cardBorderColor = "red.300";
                cardBgColor = "red.50";
              } else if (isPendingCheckout) {
                cardBorderColor = "amber.400";
                cardBgColor = "amber.50";
              }

              return (
                <MotionCard
                  key={group.id}
                  whileHover={{ y: -2 }}
                  transition={{ duration: 0.15 }}
                  bg={cardBgColor}
                  borderRadius="2xl"
                  border="2px solid"
                  borderColor={cardBorderColor}
                  boxShadow={
                    isPendingCheckout 
                      ? "0 4px 20px rgba(245, 158, 11, 0.12)"
                      : hasError || isLocalGroup
                      ? "0 4px 20px rgba(239, 68, 68, 0.12)"
                      : "0 4px 15px rgba(0,0,0,0.03)"
                  }
                  overflow="hidden"
                >
                  <CardBody p={{ base: 4, md: 5 }}>
                    <VStack align="stretch" spacing={3}>
                      
                      {/* Encabezado del Cliente / Tienda */}
                      <Flex justify="space-between" align="center" wrap="wrap" gap={2}>
                        <HStack spacing={2.5}>
                          <Box p={2} borderRadius="xl" bg={isPendingCheckout ? "amber.100" : hasError || isLocalGroup ? "red.100" : "emerald.50"} color={isPendingCheckout ? "amber.800" : hasError || isLocalGroup ? "red.800" : "emerald.700"}>
                            <Icon as={Building2} boxSize={5} />
                          </Box>
                          <Heading size="sm" fontWeight="800" color="gray.800">
                            {group.storeName}
                          </Heading>
                        </HStack>

                        {/* Badges y Botón de Reintento */}
                        <HStack spacing={2}>
                          {(hasError || isLocalGroup) && (
                            <Button
                              size="xs"
                              colorScheme="red"
                              bg="red.600"
                              color="white"
                              borderRadius="full"
                              px={3}
                              leftIcon={<Icon as={RefreshCw} />}
                              isLoading={isSyncing}
                              onClick={() => {
                                const inId = group.in?.id?.startsWith("local-") ? Number(group.in.id.replace("local-", "")) : null;
                                const outId = group.out?.id?.startsWith("local-") ? Number(group.out.id.replace("local-", "")) : null;
                                retryGroup(inId, outId);
                              }}
                              _hover={{ bg: "red.700" }}
                            >
                              Reintentar Sincronización
                            </Button>
                          )}

                          {isPendingCheckout && (
                            <Badge colorScheme="amber" variant="solid" borderRadius="full" px={3} py={1} fontSize="xs" fontWeight="800" display="flex" align="center" gap={1}>
                              <Icon as={Clock} boxSize={3.5} /> PENDIENTE CHECK-OUT
                            </Badge>
                          )}

                          {!isPendingCheckout && !hasError && !isLocalGroup && (
                            <Badge colorScheme="emerald" variant="subtle" borderRadius="full" px={3} py={1} fontSize="xs" fontWeight="700" display="flex" align="center" gap={1}>
                              <Icon as={CheckCircle2} boxSize={3.5} /> COMPLETADA
                            </Badge>
                          )}
                        </HStack>
                      </Flex>

                      {/* BANNER INTERACTIVO SI FALTA CHECK OUT */}
                      {isPendingCheckout && (
                        <Box bg="amber.100" border="1px solid" borderColor="amber.300" p={2.5} borderRadius="xl">
                          <HStack spacing={2}>
                            <Icon as={AlertTriangle} boxSize={4} color="amber.800" />
                            <Text fontSize="xs" color="amber.900" fontWeight="700">
                              ⚠️ Esta visita no tiene Check-Out registrado. Recuerda marcar tu salida al finalizar.
                            </Text>
                          </HStack>
                        </Box>
                      )}

                      {/* BANNER SI TIENE ERRORES O ALMACENAMIENTO LOCAL SIN SUBIR */}
                      {(hasError || isLocalGroup) && (
                        <Box bg="red.100" border="1px solid" borderColor="red.300" p={2.5} borderRadius="xl">
                          <HStack spacing={2}>
                            <Icon as={AlertCircle} boxSize={4} color="red.800" />
                            <Text fontSize="xs" color="red.900" fontWeight="700">
                              🔴 Marca almacenada localmente o rechazada por el servidor. Haz clic en "Reintentar Sincronización" o conéctate a internet.
                            </Text>
                          </HStack>
                        </Box>
                      )}

                      {/* Timestamps de Check-In y Check-Out */}
                      <Flex direction={{ base: "column", sm: "row" }} justify="space-between" align={{ base: "stretch", sm: "center" }} gap={3} pt={1}>
                        
                        {/* Bloque CHECK IN */}
                        <HStack spacing={3} bg="emerald.50" p={2.5} borderRadius="xl" border="1px solid" borderColor="emerald.200" flex={1}>
                          <Box p={1.5} borderRadius="lg" bg="emerald.600" color="white">
                            <Icon as={LogIn} boxSize={4} />
                          </Box>
                          <VStack align="start" spacing={0}>
                            <Text fontSize="10px" fontWeight="800" color="emerald.800" letterSpacing="wider">
                              CHECK IN {group.in?.isLocal ? "(LOCAL)" : ""}
                            </Text>
                            <Text fontSize="xs" fontWeight="700" color="gray.800">
                              {formatDateTime(group.in?.createdAt)}
                            </Text>
                          </VStack>
                        </HStack>

                        {/* Bloque CHECK OUT */}
                        <HStack 
                          spacing={3} 
                          bg={group.out ? "red.50" : "amber.50"} 
                          p={2.5} 
                          borderRadius="xl" 
                          border="1px solid" 
                          borderColor={group.out ? "red.200" : "amber.300"} 
                          flex={1}
                        >
                          <Box p={1.5} borderRadius="lg" bg={group.out ? "red.600" : "amber.500"} color="white">
                            <Icon as={LogOut} boxSize={4} />
                          </Box>
                          <VStack align="start" spacing={0}>
                            <Text fontSize="10px" fontWeight="800" color={group.out ? "red.800" : "amber.900"} letterSpacing="wider">
                              CHECK OUT {group.out?.isLocal ? "(LOCAL)" : ""}
                            </Text>
                            <Text fontSize="xs" fontWeight="700" color="gray.800">
                              {group.out ? formatDateTime(group.out.createdAt) : "Sin registrar salida"}
                            </Text>
                          </VStack>
                        </HStack>

                      </Flex>

                      {/* Duración */}
                      {group.out && (
                        <Flex justify="flex-end" align="center" pt={1}>
                          <HStack spacing={1.5} bg="gray.100" px={3} py={1} borderRadius="full">
                            <Icon as={Clock} boxSize={3.5} color="gray.600" />
                            <Text fontSize="xs" fontWeight="700" color="gray.700">
                              Duración: {calculateDuration(group.in?.createdAt, group.out.createdAt)}
                            </Text>
                          </HStack>
                        </Flex>
                      )}

                      {/* Mensajes de Error Detallados */}
                      {group.in?.errorMessage && (
                        <Box bg="red.100" p={2} borderRadius="xl" border="1px solid" borderColor="red.300">
                          <Text fontSize="xs" color="red.800" fontWeight="bold">
                            Detalle de Rechazo (IN): {group.in.errorMessage}
                          </Text>
                        </Box>
                      )}
                      
                      {group.out?.errorMessage && (
                        <Box bg="red.100" p={2} borderRadius="xl" border="1px solid" borderColor="red.300">
                          <Text fontSize="xs" color="red.800" fontWeight="bold">
                            Detalle de Rechazo (OUT): {group.out.errorMessage}
                          </Text>
                        </Box>
                      )}

                    </VStack>
                  </CardBody>
                </MotionCard>
              );
            })
          )}
        </VStack>
      </VStack>
      </Box>
    </Box>
  );
}