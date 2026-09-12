import React, { useState } from "react";
import {
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalCloseButton,
  Box,
  Flex,
  Text,
  Button,
  Grid,
  Input,
  Badge,
  VStack,
  HStack,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  TableContainer,
  IconButton,
  useToast,
  Spinner,
  Tabs,
  TabList,
  Tab,
  TabPanels,
  TabPanel,
  Tooltip,
} from "@chakra-ui/react";
import {
  Tag,
  Trash2,
  Plus,
  Calendar,
  Clock,
  RotateCw,
  CheckCircle2,
  Sparkles,
} from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { useGetPromotions } from "../hooks/queries/quotesQueries";
import { savePromotion, deletePromotion } from "../services/promotionService";
import ItemAutocomplete from "./ItemAutocomplete";

// ── UTILIDADES DE FECHAS ──────────────────────────────────────────
const getTodayIso = () => {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const getEndOfMonthIso = () => {
  const d = new Date();
  const year = d.getFullYear();
  const month = d.getMonth();
  const lastDay = new Date(year, month + 1, 0).getDate();
  const mm = String(month + 1).padStart(2, "0");
  const dd = String(lastDay).padStart(2, "0");
  return `${year}-${mm}-${dd}`;
};

const getDaysInFutureIso = (days) => {
  const d = new Date();
  d.setDate(d.getDate() + days);
  const year = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${year}-${mm}-${dd}`;
};

const getMonthNameShort = (date) => {
  const months = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Set", "Oct", "Nov", "Dic"];
  return months[date.getMonth()];
};

const evaluateValidity = (validUntil) => {
  if (!validUntil) {
    return {
      type: "PERMANENT",
      label: "Sin límite",
      badgeText: "♾️ Permanente",
      colorScheme: "blue",
      isExpired: false,
      isUrgent: false,
      daysLeft: null,
      dateFormatted: "Permanente",
    };
  }

  const now = new Date();
  const end = new Date(validUntil);
  if (isNaN(end.getTime())) {
    return {
      type: "PERMANENT",
      label: "Sin límite",
      badgeText: "♾️ Permanente",
      colorScheme: "blue",
      isExpired: false,
      isUrgent: false,
      daysLeft: null,
      dateFormatted: "Permanente",
    };
  }

  const endOfDay = new Date(end.getFullYear(), end.getMonth(), end.getDate(), 23, 59, 59);
  const diffMs = endOfDay.getTime() - now.getTime();
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

  const dayStr = String(end.getDate()).padStart(2, "0");
  const monthStr = getMonthNameShort(end);
  const dateFormatted = `${dayStr} ${monthStr}`;

  if (diffMs < 0) {
    return {
      type: "EXPIRED",
      label: "Expirada",
      badgeText: `🛑 Venció ${dateFormatted}`,
      colorScheme: "red",
      isExpired: true,
      isUrgent: false,
      daysLeft: diffDays,
      dateFormatted,
    };
  }

  if (diffDays <= 0 || end.toDateString() === now.toDateString()) {
    return {
      type: "TODAY",
      label: "Vence hoy",
      badgeText: "🔥 ¡Vence hoy!",
      colorScheme: "red",
      isExpired: false,
      isUrgent: true,
      daysLeft: 0,
      dateFormatted,
    };
  }

  if (diffDays <= 3) {
    return {
      type: "URGENT",
      label: `Vence en ${diffDays}d`,
      badgeText: `⚠️ Vence en ${diffDays}d (${dateFormatted})`,
      colorScheme: "orange",
      isExpired: false,
      isUrgent: true,
      daysLeft: diffDays,
      dateFormatted,
    };
  }

  return {
    type: "ACTIVE",
    label: `${diffDays}d restantes`,
    badgeText: `⏳ Quedan ${diffDays}d (${dateFormatted})`,
    colorScheme: "green",
    isExpired: false,
    isUrgent: false,
    daysLeft: diffDays,
    dateFormatted,
  };
};

export function ProductPromotionsModal({ isOpen, onClose }) {
  const toast = useToast();
  const queryClient = useQueryClient();
  const { promotions = [], isLoading, refetch } = useGetPromotions();

  const [selectedItem, setSelectedItem] = useState(null);
  const [discountPct, setDiscountPct] = useState("3");
  const [campaignName, setCampaignName] = useState("Oferta del Mes");
  const [validUntil, setValidUntil] = useState(getEndOfMonthIso());
  const [validityPreset, setValidityPreset] = useState("MONTH_END");
  const [isSaving, setIsSaving] = useState(false);
  const [deletingCode, setDeletingCode] = useState(null);
  const [renewingCode, setRenewingCode] = useState(null);

  const handleSelectItem = (item) => {
    setSelectedItem(item);
  };

  const handleSave = async () => {
    if (!selectedItem) {
      toast({
        title: "Seleccione un producto",
        description: "Busque y seleccione un producto de la lista para aplicarle la oferta.",
        status: "warning",
        duration: 3000,
        isClosable: true,
      });
      return;
    }

    const pctNum = parseFloat(discountPct);
    if (isNaN(pctNum) || pctNum <= 0 || pctNum > 50) {
      toast({
        title: "Porcentaje no válido",
        description: "El porcentaje de descuento promocional debe estar entre 0.1% y 50%.",
        status: "error",
        duration: 3000,
        isClosable: true,
      });
      return;
    }

    setIsSaving(true);
    try {
      const code = selectedItem.id || selectedItem.productCode || selectedItem.code || selectedItem.itemCode;
      const name = selectedItem.name || selectedItem.productName || selectedItem.description;
      const finalValidUntil = validityPreset === "PERMANENT" ? null : validUntil;

      await savePromotion({
        productCode: code,
        productName: name,
        discountPct: pctNum,
        campaignName: campaignName.trim() || "Oferta del Mes",
        validUntil: finalValidUntil,
      });

      queryClient.invalidateQueries({ queryKey: ["productPromotions"] });
      await refetch();

      const validityInfo = evaluateValidity(finalValidUntil);

      toast({
        title: "🏷️ ¡Oferta Registrada!",
        description: `${name || code} con ${pctNum}% de descuento (${validityInfo.badgeText}).`,
        status: "success",
        duration: 3500,
        isClosable: true,
      });

      setSelectedItem(null);
      setDiscountPct("3");
      setValidUntil(getEndOfMonthIso());
      setValidityPreset("MONTH_END");
    } catch (error) {
      toast({
        title: "Error al guardar",
        description: error.message || "No se pudo registrar la oferta.",
        status: "error",
        duration: 4000,
        isClosable: true,
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleRenewPromotion = async (promo) => {
    const code = promo.productCode;
    setRenewingCode(code);
    try {
      const newValidUntil = getEndOfMonthIso();
      await savePromotion({
        productCode: code,
        productName: promo.productName,
        discountPct: promo.discountPct,
        campaignName: promo.campaignName || "Oferta del Mes",
        validUntil: newValidUntil,
      });

      queryClient.invalidateQueries({ queryKey: ["productPromotions"] });
      await refetch();

      toast({
        title: "🔄 ¡Oferta Renovada!",
        description: `${promo.productName || code} reactivado hasta fin de mes.`,
        status: "success",
        duration: 3500,
        isClosable: true,
      });
    } catch (error) {
      toast({
        title: "Error al renovar",
        description: error.message || "No se pudo renovar la oferta.",
        status: "error",
        duration: 3500,
        isClosable: true,
      });
    } finally {
      setRenewingCode(null);
    }
  };

  const handleDelete = async (code) => {
    setDeletingCode(code);
    try {
      await deletePromotion(code);
      queryClient.invalidateQueries({ queryKey: ["productPromotions"] });
      await refetch();
      toast({
        title: "Oferta retirada",
        description: `Se retiró el descuento promocional del artículo ${code}.`,
        status: "info",
        duration: 3000,
        isClosable: true,
      });
    } catch (error) {
      toast({
        title: "Error al retirar",
        description: error.message || "No se pudo eliminar la promoción.",
        status: "error",
        duration: 3000,
        isClosable: true,
      });
    } finally {
      setDeletingCode(null);
    }
  };

  // Separar promociones
  const activePromotions = [];
  const expiredPromotions = [];

  (promotions || []).forEach((p) => {
    const v = evaluateValidity(p.validUntil);
    const enriched = { ...p, validity: v };
    if (v.isExpired) {
      expiredPromotions.push(enriched);
    } else {
      activePromotions.push(enriched);
    }
  });

  const urgentCount = activePromotions.filter((p) => p.validity.isUrgent).length;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      isCentered
      size={{ base: "full", md: "4xl" }}
      motionPreset="slideInBottom"
      scrollBehavior="inside"
    >
      <ModalOverlay bg="blackAlpha.700" backdropFilter="blur(6px)" />
      <ModalContent
        borderRadius={{ base: "xl", sm: "2xl" }}
        overflow="hidden"
        border="1px solid"
        borderColor="#cbd5e1"
        maxW={{ base: "96vw", sm: "92vw", md: "860px", lg: "900px" }}
        mx="auto"
        my="auto"
        boxShadow="0 25px 50px -12px rgba(0, 0, 0, 0.35)"
      >
        {/* ── ENCABEZADO PRINCIPAL ELEGANTE ── */}
        <ModalCloseButton
          color="white"
          zIndex={3}
          top={{ base: 3, md: 4 }}
          right={{ base: 3, md: 4 }}
          _hover={{ bg: "whiteAlpha.300" }}
          borderRadius="full"
          size="md"
        />
        <ModalHeader bg="#0e572b" color="white" py={{ base: 3.5, md: 4 }} px={{ base: 4, md: 6 }}>
          <HStack spacing={{ base: 3, md: 4 }} pr={8}>
            <Flex
              w={{ base: "42px", md: "46px" }}
              h={{ base: "42px", md: "46px" }}
              minW={{ base: "42px", md: "46px" }}
              borderRadius="xl"
              bg="rgba(255, 255, 255, 0.16)"
              align="center"
              justify="center"
              color="#fde047"
            >
              <Tag className="w-5 h-5 md:w-6 md:h-6" />
            </Flex>
            <Box minW={0}>
              <HStack spacing={2} align="center" wrap="wrap">
                <Text fontSize={{ base: "md", md: "lg" }} fontWeight="900" lineHeight="1.2">
                  Gestor de Ofertas del Mes y Promociones
                </Text>
                {urgentCount > 0 && (
                  <Badge bg="#ef4444" color="white" fontSize="xs" px={2.5} py={0.5} borderRadius="full" fontWeight="900">
                    ⚠️ {urgentCount} por vencer
                  </Badge>
                )}
              </HStack>
              <Text fontSize={{ base: "xs", md: "sm" }} color="#a7f3d0" fontWeight="600" mt={0.5}>
                Asigna descuentos temporales que se desactivan automáticamente al vencer
              </Text>
            </Box>
          </HStack>
        </ModalHeader>

        {/* ── CUERPO DEL MODAL CENTRADO Y CÓMODO ── */}
        <ModalBody p={{ base: 3.5, sm: 4, md: 5 }} bg="#f8fafc" maxH="82vh" overflowY="auto">
          <VStack align="stretch" spacing={4}>
            {/* ── CARD 1: FORMULARIO DE ASIGNACIÓN ── */}
            <Box
              bg="white"
              p={{ base: 3.5, sm: 4, md: 5 }}
              borderRadius="xl"
              border="1.5px solid"
              borderColor="#e2e8f0"
              boxShadow="0 1px 3px rgba(0,0,0,0.04)"
            >
              <Flex justify="space-between" align="center" mb={3}>
                <HStack spacing={2}>
                  <Sparkles className="w-5 h-5 text-amber-500" />
                  <Text fontSize="sm" fontWeight="900" color="#0f172a" textTransform="uppercase" letterSpacing="wider">
                    Nueva Oferta Promocional
                  </Text>
                </HStack>
                {selectedItem && (
                  <Badge bg="#dcfce7" color="#15803d" border="1px solid #86efac" fontSize="xs" px={3} py={1} borderRadius="md" fontWeight="800">
                    Artículo seleccionado ✓
                  </Badge>
                )}
              </Flex>

              <VStack align="stretch" spacing={3.5}>
                {/* 1. Selección de Producto SAP */}
                <Box>
                  <Text fontSize="sm" fontWeight="800" color="#334155" mb={1.5}>
                    1. Buscar Artículo en Catálogo SAP:
                  </Text>
                  <ItemAutocomplete onSelect={handleSelectItem} placeholder="Escribe código o nombre del artículo..." />
                  {selectedItem && (
                    <Box mt={2.5} p={3} bg="#f0fdf4" border="1.5px solid" borderColor="#86efac" borderRadius="xl">
                      <Flex justify="space-between" align="center" gap={3}>
                        <Box minW={0}>
                          <Text fontSize="sm" fontWeight="900" color="#14532d" noOfLines={1}>
                            {selectedItem.name}
                          </Text>
                          <Text fontSize="xs" color="#166534" fontWeight="700" fontFamily="mono" mt={0.5}>
                            SKU: {selectedItem.id || selectedItem.productCode} • P. Lista: ${Number(selectedItem.price || 0).toFixed(2)} USD
                          </Text>
                        </Box>
                        <Button
                          size="xs"
                          variant="solid"
                          bg="#fee2e2"
                          color="#b91c1c"
                          _hover={{ bg: "#fca5a5" }}
                          h="32px"
                          px={3}
                          fontSize="xs"
                          fontWeight="800"
                          borderRadius="lg"
                          onClick={() => setSelectedItem(null)}
                        >
                          ✕ Cambiar
                        </Button>
                      </Flex>
                    </Box>
                  )}
                </Box>

                {/* 2 y 3. PARÁMETROS EN GRID DE 2 COLUMNAS */}
                <Grid templateColumns={{ base: "1fr", md: "260px 1fr" }} gap={4} align="start">
                  {/* % Descuento Promocional */}
                  <Box>
                    <Text fontSize="sm" fontWeight="800" color="#334155" mb={1.5}>
                      2. % Descuento Extra:
                    </Text>
                    <Flex gap={2} align="center">
                      <Input
                        borderRadius="xl"
                        fontWeight="900"
                        fontSize="lg"
                        textAlign="center"
                        value={discountPct}
                        onChange={(e) => setDiscountPct(e.target.value.replace(/[^0-9.]/g, ""))}
                        placeholder="3"
                        w="64px"
                        h="42px"
                        borderColor="#f59e0b"
                        bg="#fffbeb"
                        color="#92400e"
                        focusBorderColor="#d97706"
                      />
                      <HStack spacing={1.5} flex="1">
                        {["3", "5", "8", "10"].map((pct) => {
                          const isActive = discountPct === pct;
                          return (
                            <Button
                              key={pct}
                              flex="1"
                              h="42px"
                              bg={isActive ? "#f59e0b" : "#f8fafc"}
                              color={isActive ? "white" : "#334155"}
                              border="1px solid"
                              borderColor={isActive ? "#d97706" : "#cbd5e1"}
                              _hover={{ bg: isActive ? "#d97706" : "#e2e8f0" }}
                              onClick={() => setDiscountPct(pct)}
                              borderRadius="xl"
                              fontWeight="900"
                              fontSize="sm"
                              px={1}
                              boxShadow={isActive ? "0 2px 4px rgba(245, 158, 11, 0.4)" : "none"}
                            >
                              {pct}%
                            </Button>
                          );
                        })}
                      </HStack>
                    </Flex>
                  </Box>

                  {/* Nombre de Campaña */}
                  <Box>
                    <Flex justify="space-between" align="center" mb={1.5}>
                      <Text fontSize="sm" fontWeight="800" color="#334155">
                        3. Campaña:
                      </Text>
                      {campaignName && (
                        <Text fontSize="xs" color="#6d28d9" fontWeight="900" noOfLines={1} maxW="150px">
                          🏷️ {campaignName.toUpperCase()}
                        </Text>
                      )}
                    </Flex>
                    <Input
                      borderRadius="xl"
                      fontWeight="700"
                      value={campaignName}
                      onChange={(e) => setCampaignName(e.target.value)}
                      placeholder="Oferta del Mes"
                      borderColor="#cbd5e1"
                      bg="white"
                      h="42px"
                      mb={2}
                      fontSize="sm"
                    />
                    <HStack spacing={1.5} wrap="wrap">
                      {["Oferta del Mes", "Liquidación", "Cyber León", "Especial"].map((name) => {
                        const isSelected = campaignName.trim().toLowerCase() === name.toLowerCase();
                        return (
                          <Button
                            key={name}
                            size="xs"
                            h="28px"
                            px={3}
                            borderRadius="full"
                            fontSize="xs"
                            fontWeight="800"
                            bg={isSelected ? "#7c3aed" : "#f5f3ff"}
                            color={isSelected ? "white" : "#6d28d9"}
                            border="1px solid"
                            borderColor={isSelected ? "#6d28d9" : "#ddd6fe"}
                            _hover={{ bg: isSelected ? "#6d28d9" : "#ede9fe" }}
                            onClick={() => setCampaignName(name)}
                          >
                            {name}
                          </Button>
                        );
                      })}
                    </HStack>
                  </Box>
                </Grid>

                {/* 4. Vigencia y Fecha Límite */}
                <Box>
                  <Flex justify="space-between" align="center" mb={1.5}>
                    <Text fontSize="sm" fontWeight="800" color="#334155">
                      4. Vigencia y Fecha Límite:
                    </Text>
                    {validityPreset !== "PERMANENT" && validUntil && (
                      <Badge bg="#dcfce7" color="#166534" border="1px solid #86efac" fontSize="xs" px={2.5} py={0.5} borderRadius="md" fontWeight="800">
                        {evaluateValidity(validUntil).badgeText}
                      </Badge>
                    )}
                  </Flex>

                  {/* Botones de preajuste de vigencia */}
                  <HStack spacing={2} mb={2}>
                    <Button
                      flex="1"
                      h="38px"
                      bg={validityPreset === "MONTH_END" ? "#126c36" : "#f8fafc"}
                      color={validityPreset === "MONTH_END" ? "white" : "#334155"}
                      border="1px solid"
                      borderColor={validityPreset === "MONTH_END" ? "#0e572b" : "#cbd5e1"}
                      _hover={{ bg: validityPreset === "MONTH_END" ? "#0e572b" : "#e2e8f0" }}
                      onClick={() => {
                        setValidityPreset("MONTH_END");
                        setValidUntil(getEndOfMonthIso());
                      }}
                      borderRadius="xl"
                      fontWeight="800"
                      fontSize="sm"
                    >
                      Fin de Mes
                    </Button>
                    <Button
                      flex="1"
                      h="38px"
                      bg={validityPreset === "7_DAYS" ? "#126c36" : "#f8fafc"}
                      color={validityPreset === "7_DAYS" ? "white" : "#334155"}
                      border="1px solid"
                      borderColor={validityPreset === "7_DAYS" ? "#0e572b" : "#cbd5e1"}
                      _hover={{ bg: validityPreset === "7_DAYS" ? "#0e572b" : "#e2e8f0" }}
                      onClick={() => {
                        setValidityPreset("7_DAYS");
                        setValidUntil(getDaysInFutureIso(7));
                      }}
                      borderRadius="xl"
                      fontWeight="800"
                      fontSize="sm"
                    >
                      7 días
                    </Button>
                    <Button
                      flex="1"
                      h="38px"
                      bg={validityPreset === "15_DAYS" ? "#126c36" : "#f8fafc"}
                      color={validityPreset === "15_DAYS" ? "white" : "#334155"}
                      border="1px solid"
                      borderColor={validityPreset === "15_DAYS" ? "#0e572b" : "#cbd5e1"}
                      _hover={{ bg: validityPreset === "15_DAYS" ? "#0e572b" : "#e2e8f0" }}
                      onClick={() => {
                        setValidityPreset("15_DAYS");
                        setValidUntil(getDaysInFutureIso(15));
                      }}
                      borderRadius="xl"
                      fontWeight="800"
                      fontSize="sm"
                    >
                      15 días
                    </Button>
                    <Button
                      w="48px"
                      h="38px"
                      bg={validityPreset === "PERMANENT" ? "#334155" : "#f8fafc"}
                      color={validityPreset === "PERMANENT" ? "white" : "#334155"}
                      border="1px solid"
                      borderColor={validityPreset === "PERMANENT" ? "#1e293b" : "#cbd5e1"}
                      _hover={{ bg: validityPreset === "PERMANENT" ? "#1e293b" : "#e2e8f0" }}
                      onClick={() => {
                        setValidityPreset("PERMANENT");
                        setValidUntil("");
                      }}
                      borderRadius="xl"
                      fontWeight="900"
                      fontSize="md"
                      title="Sin límite (permanente)"
                    >
                      ∞
                    </Button>
                  </HStack>

                  {/* Selector de fecha o aviso permanente */}
                  {validityPreset !== "PERMANENT" ? (
                    <Flex
                      align="center"
                      justify="space-between"
                      bg="#f0fdf4"
                      border="1px solid"
                      borderColor="#86efac"
                      borderRadius="xl"
                      px={3.5}
                      py={2}
                      gap={2}
                    >
                      <HStack spacing={2}>
                        <Calendar className="w-5 h-5 text-emerald-700" />
                        <Text fontSize="sm" fontWeight="800" color="#166534">
                          Válido hasta:
                        </Text>
                      </HStack>
                      <Input
                        type="date"
                        min={getTodayIso()}
                        value={validUntil}
                        onChange={(e) => {
                          setValidUntil(e.target.value);
                          setValidityPreset("CUSTOM");
                        }}
                        borderRadius="lg"
                        fontWeight="800"
                        borderColor="#86efac"
                        bg="white"
                        h="34px"
                        fontSize="sm"
                        w="160px"
                      />
                    </Flex>
                  ) : (
                    <Box bg="#eff6ff" border="1px solid" borderColor="#bfdbfe" borderRadius="xl" px={3.5} py={2.5}>
                      <Text fontSize="sm" fontWeight="800" color="#1d4ed8" textAlign="center">
                        ♾️ Sin fecha límite (Descuento permanente hasta retirarlo)
                      </Text>
                    </Box>
                  )}
                </Box>

                {/* Botón Guardar Oferta */}
                <Button
                  size="lg"
                  h="46px"
                  bg="#126c36"
                  color="white"
                  _hover={{ bg: "#0e572b" }}
                  _active={{ bg: "#0a3f1f" }}
                  onClick={handleSave}
                  isLoading={isSaving}
                  leftIcon={<Plus className="w-5 h-5 stroke-[3]" />}
                  fontWeight="900"
                  fontSize="md"
                  borderRadius="xl"
                  boxShadow="0 2px 6px rgba(18, 108, 54, 0.3)"
                  w="full"
                  mt={1}
                >
                  Guardar Oferta Promocional
                </Button>
              </VStack>
            </Box>

            {/* ── CARD 2: LISTADO DE OFERTAS (VIGENTES Y VENCIDAS) ── */}
            <Box
              bg="white"
              p={{ base: 3.5, md: 4.5 }}
              borderRadius="xl"
              border="1.5px solid"
              borderColor="#e2e8f0"
              boxShadow="0 1px 3px rgba(0,0,0,0.03)"
            >
              <Tabs variant="unstyled" size="sm">
                <Flex justify="space-between" align="center" mb={3} wrap="wrap" gap={2}>
                  <TabList bg="#f1f5f9" p={1} borderRadius="xl">
                    <Tab
                      fontWeight="800"
                      fontSize="sm"
                      borderRadius="lg"
                      py={2}
                      px={4}
                      color="#475569"
                      _selected={{ bg: "#126c36", color: "white", boxShadow: "sm" }}
                    >
                      🟢 Vigentes ({activePromotions.length})
                    </Tab>
                    <Tab
                      fontWeight="800"
                      fontSize="sm"
                      borderRadius="lg"
                      py={2}
                      px={4}
                      color="#475569"
                      _selected={{ bg: "#dc2626", color: "white", boxShadow: "sm" }}
                    >
                      🛑 Vencidas ({expiredPromotions.length})
                    </Tab>
                  </TabList>
                  {isLoading && <Spinner size="sm" color="emerald.600" />}
                </Flex>

                <TabPanels>
                  {/* PANEL 1: OFERTAS VIGENTES */}
                  <TabPanel p={0}>
                    {activePromotions.length === 0 ? (
                      <Box p={8} textAlign="center" color="gray.500">
                        <Tag className="w-8 h-8 opacity-30 text-gray-400 mx-auto mb-2" />
                        <Text fontSize="sm" fontWeight="700" color="#64748b">
                          No hay productos con oferta activa registrada.
                        </Text>
                      </Box>
                    ) : (
                      <>
                        {/* ── VISTA MÓVIL (< md): Cards limpias y legibles ── */}
                        <VStack spacing={3} align="stretch" display={{ base: "flex", md: "none" }} maxH="350px" overflowY="auto" pr={1}>
                          {activePromotions.map((promo) => (
                            <Box
                              key={promo.id || promo.productCode}
                              p={3.5}
                              bg={promo.validity.isUrgent ? "#fffbeb" : "white"}
                              borderRadius="xl"
                              border="1.5px solid"
                              borderColor={promo.validity.isUrgent ? "#fcd34d" : "#e2e8f0"}
                              boxShadow="0 1px 3px rgba(0,0,0,0.04)"
                            >
                              <Flex justify="space-between" align="flex-start" gap={2}>
                                <Box flex="1" minW={0}>
                                  <Text fontSize="sm" fontWeight="900" color="#0f172a" lineHeight="1.35" noOfLines={2}>
                                    {promo.productName || promo.productCode}
                                  </Text>
                                  <Text fontSize="xs" color="#64748b" fontFamily="mono" fontWeight="700" mt={1}>
                                    SKU: {promo.productCode}
                                  </Text>
                                </Box>
                                <IconButton
                                  size="md"
                                  bg="#fee2e2"
                                  color="#dc2626"
                                  _hover={{ bg: "#fca5a5" }}
                                  icon={<Trash2 className="w-4 h-4" />}
                                  aria-label="Eliminar oferta"
                                  isLoading={deletingCode === promo.productCode}
                                  onClick={() => handleDelete(promo.productCode)}
                                  borderRadius="xl"
                                  h="36px"
                                  w="36px"
                                />
                              </Flex>

                              <Flex justify="space-between" align="center" mt={3} pt={2.5} borderTop="1px dashed" borderColor="#e2e8f0">
                                <HStack spacing={2} wrap="wrap">
                                  <Badge bg="#f5f3ff" color="#6d28d9" border="1px solid #ddd6fe" fontSize="xs" px={2.5} py={1} borderRadius="md" fontWeight="800">
                                    🏷️ {promo.campaignName || "Oferta del Mes"}
                                  </Badge>
                                  <Badge
                                    bg={
                                      promo.validity.type === "PERMANENT"
                                        ? "#eff6ff"
                                        : promo.validity.isUrgent
                                        ? "#fffbeb"
                                        : "#f0fdf4"
                                    }
                                    color={
                                      promo.validity.type === "PERMANENT"
                                        ? "#1d4ed8"
                                        : promo.validity.isUrgent
                                        ? "#b45309"
                                        : "#15803d"
                                    }
                                    border="1px solid"
                                    borderColor={
                                      promo.validity.type === "PERMANENT"
                                        ? "#bfdbfe"
                                        : promo.validity.isUrgent
                                        ? "#fde68a"
                                        : "#86efac"
                                    }
                                    fontSize="xs"
                                    px={2.5}
                                    py={1}
                                    borderRadius="md"
                                    fontWeight="800"
                                  >
                                    {promo.validity.badgeText}
                                  </Badge>
                                </HStack>
                                <Badge
                                  bg="#f59e0b"
                                  color="white"
                                  fontSize="sm"
                                  fontWeight="900"
                                  px={3}
                                  py={1}
                                  borderRadius="md"
                                  boxShadow="xs"
                                >
                                  -{promo.discountPct}%
                                </Badge>
                              </Flex>
                            </Box>
                          ))}
                        </VStack>

                        {/* ── VISTA ESCRITORIO (>= md): Tabla fija espaciosa y sin wrapping ── */}
                        <Box display={{ base: "none", md: "block" }} maxH="260px" overflowY="auto" borderRadius="xl" border="1px solid" borderColor="#e2e8f0">
                          <Table size="md" variant="simple" style={{ tableLayout: "fixed", width: "100%" }}>
                            <Thead bg="#f8fafc">
                              <Tr>
                                <Th width="38%" fontSize="xs" fontWeight="800" color="#475569" py={3} px={4} whiteSpace="nowrap">Artículo / Código</Th>
                                <Th width="20%" fontSize="xs" fontWeight="800" color="#475569" py={3} px={3} whiteSpace="nowrap">Campaña</Th>
                                <Th width="22%" fontSize="xs" fontWeight="800" color="#475569" py={3} px={3} whiteSpace="nowrap">Vigencia</Th>
                                <Th width="12%" fontSize="xs" fontWeight="800" color="#475569" py={3} textAlign="center" whiteSpace="nowrap">% Oferta</Th>
                                <Th width="8%" fontSize="xs" fontWeight="800" color="#475569" py={3} textAlign="center" whiteSpace="nowrap">Acción</Th>
                              </Tr>
                            </Thead>
                            <Tbody>
                              {activePromotions.map((promo) => (
                                <Tr key={promo.id || promo.productCode} _hover={{ bg: "#f0fdf4" }} borderBottom="1px solid" borderColor="#f1f5f9">
                                  <Td py={3} px={4}>
                                    <VStack align="start" spacing={0.5} maxW="100%">
                                      <Text fontSize="sm" fontWeight="800" color="#0f172a" noOfLines={1} title={promo.productName}>
                                        {promo.productName || promo.productCode}
                                      </Text>
                                      <Text fontSize="xs" color="#64748b" fontWeight="700" fontFamily="mono">
                                        {promo.productCode}
                                      </Text>
                                    </VStack>
                                  </Td>
                                  <Td py={3} px={3}>
                                    <Badge bg="#f5f3ff" color="#6d28d9" border="1px solid #ddd6fe" fontSize="xs" px={3} py={1} borderRadius="lg" fontWeight="800" whiteSpace="nowrap">
                                      🏷️ {promo.campaignName || "Oferta del Mes"}
                                    </Badge>
                                  </Td>
                                  <Td py={3} px={3}>
                                    <Badge
                                      bg={
                                        promo.validity.type === "PERMANENT"
                                          ? "#eff6ff"
                                          : promo.validity.isUrgent
                                          ? "#fffbeb"
                                          : "#f0fdf4"
                                      }
                                      color={
                                        promo.validity.type === "PERMANENT"
                                          ? "#1d4ed8"
                                          : promo.validity.isUrgent
                                          ? "#b45309"
                                          : "#15803d"
                                      }
                                      border="1px solid"
                                      borderColor={
                                        promo.validity.type === "PERMANENT"
                                          ? "#bfdbfe"
                                          : promo.validity.isUrgent
                                          ? "#fde68a"
                                          : "#86efac"
                                      }
                                      fontSize="xs"
                                      px={3}
                                      py={1}
                                      borderRadius="lg"
                                      fontWeight="800"
                                      whiteSpace="nowrap"
                                    >
                                      {promo.validity.badgeText}
                                    </Badge>
                                  </Td>
                                  <Td py={3} textAlign="center">
                                    <Badge bg="#f59e0b" color="white" fontSize="sm" px={3} py={1} borderRadius="lg" fontWeight="950" whiteSpace="nowrap">
                                      -{promo.discountPct}%
                                    </Badge>
                                  </Td>
                                  <Td py={3} textAlign="center">
                                    <IconButton
                                      size="sm"
                                      bg="#fee2e2"
                                      color="#dc2626"
                                      _hover={{ bg: "#fca5a5" }}
                                      icon={<Trash2 className="w-4 h-4" />}
                                      aria-label="Eliminar"
                                      isLoading={deletingCode === promo.productCode}
                                      onClick={() => handleDelete(promo.productCode)}
                                      borderRadius="lg"
                                      h="32px"
                                      w="32px"
                                    />
                                  </Td>
                                </Tr>
                              ))}
                            </Tbody>
                          </Table>
                        </Box>
                      </>
                    )}
                  </TabPanel>

                  {/* PANEL 2: OFERTAS VENCIDAS */}
                  <TabPanel p={0}>
                    {expiredPromotions.length === 0 ? (
                      <Box p={8} textAlign="center" color="gray.500">
                        <CheckCircle2 className="w-8 h-8 opacity-40 text-emerald-500 mx-auto mb-2" />
                        <Text fontSize="sm" fontWeight="700" color="#64748b">No hay ofertas vencidas.</Text>
                        <Text fontSize="xs" color="#94a3b8">Todas tus ofertas registradas se encuentran vigentes.</Text>
                      </Box>
                    ) : (
                      <>
                        {/* VISTA MÓVIL */}
                        <VStack spacing={3} align="stretch" display={{ base: "flex", md: "none" }} maxH="350px" overflowY="auto" pr={1}>
                          {expiredPromotions.map((promo) => (
                            <Box key={promo.id || promo.productCode} p={3.5} bg="#fef2f2" borderRadius="xl" border="1.5px solid" borderColor="#fecaca">
                              <Flex justify="space-between" align="flex-start" gap={2}>
                                <Box flex="1" minW={0}>
                                  <Text fontSize="sm" fontWeight="800" color="#64748b" textDecoration="line-through" lineHeight="1.35" noOfLines={2}>
                                    {promo.productName || promo.productCode}
                                  </Text>
                                  <Text fontSize="xs" color="#94a3b8" fontFamily="mono" mt={1}>
                                    SKU: {promo.productCode}
                                  </Text>
                                </Box>
                                <IconButton
                                  size="md"
                                  bg="#fee2e2"
                                  color="#dc2626"
                                  _hover={{ bg: "#fca5a5" }}
                                  icon={<Trash2 className="w-4 h-4" />}
                                  aria-label="Eliminar"
                                  isLoading={deletingCode === promo.productCode}
                                  onClick={() => handleDelete(promo.productCode)}
                                  borderRadius="xl"
                                  h="36px"
                                  w="36px"
                                />
                              </Flex>
                              <Flex justify="space-between" align="center" mt={3} pt={2.5} borderTop="1px dashed" borderColor="#fecaca" wrap="wrap" gap={2}>
                                <Badge bg="#fee2e2" color="#b91c1c" border="1px solid #fca5a5" fontSize="xs" px={2.5} py={1} borderRadius="md" fontWeight="800">
                                  {promo.validity.badgeText}
                                </Badge>
                                <Button
                                  size="sm"
                                  h="32px"
                                  bg="#126c36"
                                  color="white"
                                  _hover={{ bg: "#0e572b" }}
                                  leftIcon={<RotateCw className="w-4 h-4" />}
                                  isLoading={renewingCode === promo.productCode}
                                  onClick={() => handleRenewPromotion(promo)}
                                  borderRadius="lg"
                                  fontSize="xs"
                                  fontWeight="800"
                                  px={3}
                                >
                                  Renovar a fin de mes
                                </Button>
                              </Flex>
                            </Box>
                          ))}
                        </VStack>

                        {/* VISTA ESCRITORIO */}
                        <Box display={{ base: "none", md: "block" }} maxH="260px" overflowY="auto" borderRadius="xl" border="1px solid" borderColor="#fecaca">
                          <Table size="md" variant="simple" style={{ tableLayout: "fixed", width: "100%" }}>
                            <Thead bg="#fff1f2">
                              <Tr>
                                <Th width="38%" fontSize="xs" fontWeight="800" color="#b91c1c" py={3} px={4} whiteSpace="nowrap">Artículo / Código</Th>
                                <Th width="20%" fontSize="xs" fontWeight="800" color="#b91c1c" py={3} px={3} whiteSpace="nowrap">Campaña</Th>
                                <Th width="22%" fontSize="xs" fontWeight="800" color="#b91c1c" py={3} px={3} whiteSpace="nowrap">Estado</Th>
                                <Th width="12%" fontSize="xs" fontWeight="800" color="#b91c1c" py={3} textAlign="center" whiteSpace="nowrap">% Oferta</Th>
                                <Th width="8%" fontSize="xs" fontWeight="800" color="#b91c1c" py={3} textAlign="center" whiteSpace="nowrap">Acción</Th>
                              </Tr>
                            </Thead>
                            <Tbody>
                              {expiredPromotions.map((promo) => (
                                <Tr key={promo.id || promo.productCode} bg="#fef2f2" _hover={{ bg: "#fee2e2" }} borderBottom="1px solid" borderColor="#fee2e2">
                                  <Td py={3} px={4}>
                                    <VStack align="start" spacing={0.5} maxW="100%">
                                      <Text fontSize="sm" fontWeight="700" color="#64748b" textDecoration="line-through" noOfLines={1}>
                                        {promo.productName || promo.productCode}
                                      </Text>
                                      <Text fontSize="xs" color="#94a3b8" fontFamily="mono">
                                        {promo.productCode}
                                      </Text>
                                    </VStack>
                                  </Td>
                                  <Td py={3} px={3}>
                                    <Badge bg="#f5f3ff" color="#6d28d9" border="1px solid #ddd6fe" fontSize="xs" px={3} py={1} borderRadius="lg" fontWeight="800" whiteSpace="nowrap">
                                      {promo.campaignName || "Oferta del Mes"}
                                    </Badge>
                                  </Td>
                                  <Td py={3} px={3}>
                                    <Badge bg="#fee2e2" color="#b91c1c" border="1px solid #fca5a5" fontSize="xs" px={3} py={1} borderRadius="lg" fontWeight="800" whiteSpace="nowrap">
                                      {promo.validity.badgeText}
                                    </Badge>
                                  </Td>
                                  <Td py={3} textAlign="center">
                                    <Badge bg="#cbd5e1" color="#475569" fontSize="sm" px={3} py={1} borderRadius="lg" fontWeight="900" whiteSpace="nowrap">
                                      -{promo.discountPct}%
                                    </Badge>
                                  </Td>
                                  <Td py={3} textAlign="center">
                                    <HStack spacing={1.5} justify="center">
                                      <Tooltip label="Renovar hasta fin de mes" fontSize="xs">
                                        <IconButton
                                          size="sm"
                                          bg="#126c36"
                                          color="white"
                                          _hover={{ bg: "#0e572b" }}
                                          icon={<RotateCw className="w-4 h-4" />}
                                          aria-label="Renovar"
                                          isLoading={renewingCode === promo.productCode}
                                          onClick={() => handleRenewPromotion(promo)}
                                          borderRadius="lg"
                                          h="32px"
                                          w="32px"
                                        />
                                      </Tooltip>
                                      <IconButton
                                        size="sm"
                                        bg="#fee2e2"
                                        color="#dc2626"
                                        _hover={{ bg: "#fca5a5" }}
                                        icon={<Trash2 className="w-4 h-4" />}
                                        aria-label="Eliminar"
                                        isLoading={deletingCode === promo.productCode}
                                        onClick={() => handleDelete(promo.productCode)}
                                        borderRadius="lg"
                                        h="32px"
                                        w="32px"
                                      />
                                    </HStack>
                                  </Td>
                                </Tr>
                              ))}
                            </Tbody>
                          </Table>
                        </Box>
                      </>
                    )}
                  </TabPanel>
                </TabPanels>
              </Tabs>
            </Box>
          </VStack>
        </ModalBody>

        {/* FOOTER */}
        <Flex justify="flex-end" py={3.5} px={5} bg="white" borderTop="1px solid" borderColor="#e2e8f0">
          <Button size="md" h="40px" onClick={onClose} fontWeight="800" px={6} borderRadius="xl" variant="outline" borderColor="#cbd5e1" _hover={{ bg: "#f8fafc" }}>
            Cerrar
          </Button>
        </Flex>
      </ModalContent>
    </Modal>
  );
}

export default ProductPromotionsModal;
