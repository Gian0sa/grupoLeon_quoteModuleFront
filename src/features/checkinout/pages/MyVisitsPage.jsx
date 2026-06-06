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
  Divider,
  SimpleGrid,
  Stat,
  StatLabel,
  StatNumber,
  StatHelpText,
  useColorModeValue,
  Flex,
  Select,
  Button,
  Input,
  ButtonGroup,
} from "@chakra-ui/react";
import { useMemo, useState, useEffect } from "react";
import { useMyVisitLogs } from "../hooks/queries/visitLogQueries";
import { BackButton } from "../../../components/BackButton";
import { getQueue } from "../services/visitLogQueue";
import { useAuthStore } from "../../auth/stores/useAuthStore";

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
  const [queueItems, setQueueItems] = useState([]);
  const [filterType, setFilterType] = useState("today");
  const [customStartDate, setCustomStartDate] = useState("");
  const [customEndDate, setCustomEndDate] = useState("");

  useEffect(() => {
    getQueue().then(items => {
      setQueueItems(items || []);
    });
  }, [data]);

  const localVisits = useMemo(() => {
    return queueItems
      .filter((item) => item.vendorName === username)
      .map((item) => ({
        id: `local-${item.id}`,
        type: item.type,
        storeName: item.storeName,
        createdAt: new Date(item._queuedAt).toISOString(),
        isLocal: true,
        status: item.status,
      }));
  }, [queueItems, username]);

  const visits = useMemo(() => {
    const serverVisits = data?.visits || [];
    return [...localVisits, ...serverVisits];
  }, [data, localVisits]);

  const cardBg = useColorModeValue("white", "gray.700");
  const borderColor = useColorModeValue("gray.200", "gray.600");
  const statBg = useColorModeValue("green.50", "green.900");

  const filteredVisits = useMemo(() => {
    if (filterType === "all") return visits;

    return visits.filter((visit) => {
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

  const stats = useMemo(() => {
    const total = grouped.length;
    const completed = grouped.filter((g) => g.in && g.out).length;
    const pending = grouped.filter((g) => g.in && !g.out).length;

    return { total, completed, pending };
  }, [grouped]);

  if (isLoading) {
    return (
      <Box textAlign="center" py={10}>
        <Spinner size="xl" color="green.500" />
        <Text mt={4}>Cargando tus visitas...</Text>
      </Box>
    );
  }

  if (error) {
    return (
      <Box textAlign="center" py={10}>
        <Text color="red.500">Error cargando visitas</Text>
      </Box>
    );
  }

  return (
    <Box p={{ base: 3, md: 6 }}>
      <VStack spacing={6} align="stretch">
        <Flex
          bg="green.600"
          color="white"
          align="center"
          justify="center"
          h="50px"
          borderRadius="lg"
          position="relative"
        >
          <Box position="absolute" left={3}>
            <BackButton color="white" />
          </Box>
          <Heading size="md">Mis Visitas</Heading>
        </Flex>

        {/* Filtros */}
        <Card bg={cardBg} borderColor={borderColor}>
          <CardBody>
            <VStack spacing={3} align="stretch">
              <Text fontWeight="bold">Filtrar por fecha</Text>
              <ButtonGroup isAttached variant="outline" size="sm">
                <Button
                  onClick={() => {
                    setFilterType("today");
                    setCustomStartDate("");
                    setCustomEndDate("");
                  }}
                  colorScheme={filterType === "today" ? "green" : "gray"}
                  variant={filterType === "today" ? "solid" : "outline"}
                >
                  Hoy
                </Button>
                <Button
                  onClick={() => {
                    setFilterType("yesterday");
                    setCustomStartDate("");
                    setCustomEndDate("");
                  }}
                  colorScheme={filterType === "yesterday" ? "green" : "gray"}
                  variant={filterType === "yesterday" ? "solid" : "outline"}
                >
                  Ayer
                </Button>
                <Button
                  onClick={() => {
                    setFilterType("all");
                    setCustomStartDate("");
                    setCustomEndDate("");
                  }}
                  colorScheme={filterType === "all" ? "green" : "gray"}
                  variant={filterType === "all" ? "solid" : "outline"}
                >
                  Todas
                </Button>
                <Button
                  onClick={() => {
                    setFilterType("week");
                    setCustomStartDate("");
                    setCustomEndDate("");
                  }}
                  colorScheme={filterType === "week" ? "green" : "gray"}
                  variant={filterType === "week" ? "solid" : "outline"}
                >
                  Semana
                </Button>

                <Button
                  onClick={() => {
                    setFilterType("month");
                    setCustomStartDate("");
                    setCustomEndDate("");
                  }}
                  colorScheme={filterType === "month" ? "green" : "gray"}
                  variant={filterType === "month" ? "solid" : "outline"}
                >
                  Mes
                </Button>

                <Button
                  onClick={() => setFilterType("custom")}
                  colorScheme={filterType === "custom" ? "green" : "gray"}
                  variant={filterType === "custom" ? "solid" : "outline"}
                >
                  Personalizado
                </Button>
              </ButtonGroup>

              {filterType === "custom" && (
                <HStack spacing={2} mt={3}>
                  <Box flex={1}>
                    <Text fontSize="sm" mb={1}>Desde:</Text>
                    <Input
                      type="date"
                      value={customStartDate}
                      onChange={(e) => setCustomStartDate(e.target.value)}
                    />
                  </Box>
                  <Box flex={1}>
                    <Text fontSize="sm" mb={1}>Hasta:</Text>
                    <Input
                      type="date"
                      value={customEndDate}
                      onChange={(e) => setCustomEndDate(e.target.value)}
                    />
                  </Box>
                </HStack>
              )}

            </VStack>
          </CardBody>
        </Card>

        {/* Estadísticas */}
        <SimpleGrid columns={{ base: 1, md: 3 }} spacing={4}>
          <Card bg={statBg}>
            <CardBody>
              <Stat>
                <StatLabel>Total</StatLabel>
                <StatNumber>{stats.total}</StatNumber>
                <StatHelpText>Visitas registradas</StatHelpText>
              </Stat>
            </CardBody>
          </Card>

          <Card bg={statBg}>
            <CardBody>
              <Stat>
                <StatLabel>Completadas</StatLabel>
                <StatNumber>{stats.completed}</StatNumber>
                <StatHelpText>Con Check-In/Out</StatHelpText>
              </Stat>
            </CardBody>
          </Card>

          <Card bg={statBg}>
            <CardBody>
              <Stat>
                <StatLabel>Pendientes</StatLabel>
                <StatNumber>{stats.pending}</StatNumber>
                <StatHelpText>Sin Check-Out</StatHelpText>
              </Stat>
            </CardBody>
          </Card>
        </SimpleGrid>

        {/* Lista */}
        <VStack spacing={4} align="stretch">
          {grouped.length === 0 ? (
            <Card>
              <CardBody textAlign="center">
                <Text>
                  {filterType === "all"
                    ? "No tienes visitas registradas."
                    : "No hay visitas para el período seleccionado."}
                </Text>
              </CardBody>
            </Card>
          ) : (
            grouped.map((group) => {
              const isLocalGroup = group.in?.isLocal || group.out?.isLocal;
              return (
                <Card key={group.id} bg={cardBg} borderColor={isLocalGroup ? "orange.200" : borderColor} border={isLocalGroup ? "1px solid" : undefined}>
                  <CardBody>
                    <VStack align="stretch" spacing={3}>
                      <Flex justify="space-between" align="center">
                        <Heading size="sm">{group.storeName}</Heading>
                        {isLocalGroup && (
                          <Badge colorScheme="orange" variant="solid" fontSize="2xs">
                            Pendiente de sincronizar
                          </Badge>
                        )}
                      </Flex>

                      <Box>
                        <Badge colorScheme={group.in?.isLocal ? "yellow" : "green"}>
                          {group.in?.isLocal ? "CHECK IN (Local)" : "CHECK IN"}
                        </Badge>
                        <Text fontSize="sm">
                          {formatDateTime(group.in?.createdAt)}
                        </Text>
                      </Box>

                      {group.out ? (
                        <Box>
                          <Badge colorScheme={group.out.isLocal ? "yellow" : "red"}>
                            {group.out.isLocal ? "CHECK OUT (Local)" : "CHECK OUT"}
                          </Badge>
                          <Text fontSize="sm">
                            {formatDateTime(group.out.createdAt)}
                          </Text>

                          <Divider my={2} />

                          <Badge colorScheme="green">
                            Duración:{" "}
                            {calculateDuration(
                              group.in?.createdAt,
                              group.out.createdAt
                            )}
                          </Badge>
                        </Box>
                      ) : (
                        <Badge colorScheme={group.in?.isLocal ? "yellow" : "orange"}>
                          {group.in?.isLocal ? "Pendiente de Check-In Servidor" : "Pendiente de Check-Out"}
                        </Badge>
                      )}
                    </VStack>
                  </CardBody>
                </Card>
              );
            })
          )}
        </VStack>
      </VStack>
    </Box>
  );
}