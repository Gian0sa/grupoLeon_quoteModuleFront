import React, { useState, useEffect } from "react";
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
  IconButton,
  Grid,
  GridItem,
  Input,
  Badge,
  VStack,
  HStack,
} from "@chakra-ui/react";
import { Sparkles, ShieldAlert, AlertTriangle, Check, Flame, Plus, Minus } from "lucide-react";

export const APPROVAL_DISCOUNT_THRESHOLD = 50.0; // Umbral de activación de aprobación comercial (50.0%)
export const STANDARD_DISCOUNT_CEILING = 55.0;   // Tope comercial estándar ordinario (55.0%)
export const MAX_DISCOUNT_CEILING = 65.0;        // Tope máximo absoluto por volumen / mayoreo (65.0%)
export const VOLUME_MIN_QUANTITY = 100;          // Cantidad mínima estricta para mayoreo (>100 uds)

export function DiscountPopoverModal({ isOpen, onClose, item, onApplyDiscount }) {
  const [currentDisc, setCurrentDisc] = useState(0);
  const [priceInputStr, setPriceInputStr] = useState("0.00");
  const [selectedQuickOption, setSelectedQuickOption] = useState(null); // null | "normal" | "bajar" | "mayoreo"

  const basePrice = Number(item?.price || item?.unitPrice || 0);
  const sapDisc = Number(item?.discount || item?.sapDiscount || 0);
  const promoDisc = Number(item?.promoDiscount || 0);
  const baseFixedDisc = sapDisc + promoDisc;
  const qty = Number(item?.quantity || item?.Quantity || 1);

  // REGLA ESTRICTA DE NEGOCIO:
  // El modo mayoreo (>55% hasta 65%) SOLO está disponible si la cantidad de productos es MAYOR a 100 (>100 uds)
  const isEligibleForVolume = qty > VOLUME_MIN_QUANTITY;
  const applicableCeiling = isEligibleForVolume ? MAX_DISCOUNT_CEILING : STANDARD_DISCOUNT_CEILING;

  // Precio estándar con descuento base (SAP + Promo)
  const priceWithBase = Number((basePrice * (1 - baseFixedDisc / 100)).toFixed(2));

  // Precios límite oficiales
  // Tope Superior: Precio de Lista Oficial de SAP (0% descuento / Máximo margen de venta)
  const priceCeiling = basePrice;
  // Tope Inferior: 55% comercial ordinario o 65% mayoreo (>100 uds)
  const priceAtStandard55 = Number((basePrice * (1 - STANDARD_DISCOUNT_CEILING / 100)).toFixed(2));
  const priceAtVolume65 = Number((basePrice * (1 - MAX_DISCOUNT_CEILING / 100)).toFixed(2));
  const priceFloor = isEligibleForVolume ? priceAtVolume65 : priceAtStandard55;

  // Límites de ajuste de descuento:
  // Máximo descuento adicional hacia abajo (piso de precio)
  const maxAllowedAddDisc = Math.max(0, Number((applicableCeiling - baseFixedDisc).toFixed(2)));
  const minAllowedAddDisc = Number((-baseFixedDisc).toFixed(2));
  const standardAddDisc = Math.max(0, Number((STANDARD_DISCOUNT_CEILING - baseFixedDisc).toFixed(2)));
  const priceAtPlus5 = Number((basePrice * (1 - Math.min(applicableCeiling, baseFixedDisc + 5) / 100)).toFixed(2));

  useEffect(() => {
    if (item && isOpen) {
      const existingAddDisc = Math.min(maxAllowedAddDisc, Math.max(minAllowedAddDisc, Number(item.lineDiscount || 0)));
      setCurrentDisc(existingAddDisc);
      const effectivePrice = basePrice * (1 - (baseFixedDisc + existingAddDisc) / 100);
      setPriceInputStr(effectivePrice.toFixed(2));
      setSelectedQuickOption(null); // Al entrar, ninguno marcado por defecto
    }
  }, [item, isOpen, basePrice, baseFixedDisc, maxAllowedAddDisc, minAllowedAddDisc]);

  if (!item) return null;

  // Cálculos en tiempo real
  const rawTotalDisc = baseFixedDisc + currentDisc;
  const effectiveTotalDiscPct = Number(Math.max(0, Math.min(applicableCeiling, rawTotalDisc)).toFixed(2));
  const finalUnitPrice = basePrice * (1 - effectiveTotalDiscPct / 100);
  const finalLineTotal = finalUnitPrice * qty;

  const isExceedingCeiling = rawTotalDisc > applicableCeiling + 0.01;
  const isVolumeDiscount = isEligibleForVolume && effectiveTotalDiscPct > STANDARD_DISCOUNT_CEILING + 0.01;
  const isDiscountAboveThreshold = effectiveTotalDiscPct > APPROVAL_DISCOUNT_THRESHOLD + 0.009;
  const isPriceDiscounted = finalUnitPrice < priceWithBase - 0.009;
  const isPriceHigher = finalUnitPrice > priceWithBase + 0.009;
  const isHigherMargin = isPriceHigher;
  // Solo requiere aprobación si supera estrictamente el 50% de descuento o si es mayoreo (>55% a 65%)
  const requiresApproval = isDiscountAboveThreshold || isVolumeDiscount;

  // Visibilidad interactiva de botones según modo seleccionado:
  // 1. Al entrar (ninguno marcado): NO salen los botones para evitar confusión
  // 2. Si toca "Normal": sale el botón de SUBIR [+] a la derecha
  // 3. Si toca "Bajar": ya resta (-5%) y sale el botón de BAJAR [-] a la izquierda
  const showMinusButton =
    selectedQuickOption === null
      ? false
      : selectedQuickOption === "normal"
      ? finalUnitPrice > priceWithBase + 0.009
      : selectedQuickOption === "bajar"
      ? true
      : selectedQuickOption === "mayoreo"
      ? finalUnitPrice > priceFloor + 0.009
      : false;

  const showPlusButton =
    selectedQuickOption === null
      ? false
      : selectedQuickOption === "normal"
      ? true
      : selectedQuickOption === "bajar"
      ? finalUnitPrice < priceWithBase - 0.009
      : selectedQuickOption === "mayoreo"
      ? true
      : false;

  // Al escribir en el input de precio final deseado
  const handlePriceInputChange = (e) => {
    let valStr = e.target.value.replace(/,/g, ".");
    if (!/^[0-9]*\.?[0-9]*$/.test(valStr)) return;

    setPriceInputStr(valStr);

    if (valStr === "" || valStr === ".") {
      setCurrentDisc(0);
      return;
    }

    const valNum = parseFloat(valStr);
    if (isNaN(valNum)) return;

    // Si supera el precio de lista de SAP (tope superior de precio)
    if (valNum >= priceCeiling) {
      setCurrentDisc(minAllowedAddDisc);
      return;
    }

    if (basePrice > 0) {
      const calculatedTotalDisc = ((basePrice - valNum) / basePrice) * 100;
      const rawAddDisc = calculatedTotalDisc - baseFixedDisc;
      const clampedAddDisc = Math.max(minAllowedAddDisc, Math.min(maxAllowedAddDisc, Number(rawAddDisc.toFixed(2))));
      setCurrentDisc(clampedAddDisc);
    }
  };

  // Al salir del input, redondear y aplicar límites estrictos
  const handlePriceBlur = () => {
    if (priceInputStr === "" || priceInputStr === ".") {
      setPriceInputStr(priceWithBase.toFixed(2));
      setCurrentDisc(0);
      return;
    }

    let valNum = parseFloat(priceInputStr);
    if (isNaN(valNum) || valNum <= 0) {
      setPriceInputStr(priceWithBase.toFixed(2));
      setCurrentDisc(0);
      return;
    }

    // Si intenta bajar de precio por debajo del piso permitido para este producto y cantidad
    if (valNum < priceFloor) {
      valNum = priceFloor;
      setCurrentDisc(maxAllowedAddDisc);
      setPriceInputStr(priceFloor.toFixed(2));
      return;
    }

    // Si supera el precio de lista oficial de SAP (tope superior)
    if (valNum > priceCeiling) {
      valNum = priceCeiling;
      setCurrentDisc(minAllowedAddDisc);
      setPriceInputStr(priceCeiling.toFixed(2));
      return;
    }

    setPriceInputStr(valNum.toFixed(2));
    if (valNum > priceWithBase + 0.009) {
      setSelectedQuickOption("normal");
    } else if (valNum < priceWithBase - 0.009) {
      setSelectedQuickOption("bajar");
    }

    if (basePrice > 0) {
      const calculatedTotalDisc = ((basePrice - valNum) / basePrice) * 100;
      const rawAddDisc = calculatedTotalDisc - baseFixedDisc;
      const clampedAddDisc = Math.max(minAllowedAddDisc, Math.min(maxAllowedAddDisc, Number(rawAddDisc.toFixed(2))));
      setCurrentDisc(clampedAddDisc);
    }
  };

  // Botones de ajuste rápido
  const handleQuickSelect = (type) => {
    if (type === "normal") {
      setSelectedQuickOption("normal");
      setCurrentDisc(0);
      setPriceInputStr(priceWithBase.toFixed(2));
    } else if (type === "bajar") {
      setSelectedQuickOption("bajar");
      // No bajamos automáticamente al 5%, abrimos la casilla de bajar para que ellos mismos bajen con [-]
      if (parseFloat(priceInputStr) > priceWithBase) {
        setCurrentDisc(0);
        setPriceInputStr(priceWithBase.toFixed(2));
      }
    } else if (type === "mayoreo") {
      setSelectedQuickOption("mayoreo");
      setCurrentDisc(maxAllowedAddDisc);
      const targetPrice = basePrice * (1 - (baseFixedDisc + maxAllowedAddDisc) / 100);
      setPriceInputStr(targetPrice.toFixed(2));
    }
  };

  // Ajuste interactivo con botones [-] Bajar y [+] Subir ($0.05 por toque)
  const handleStepDown = () => {
    const currentVal = parseFloat(priceInputStr) || priceWithBase;
    const minFloor = selectedQuickOption === "normal" ? priceWithBase : priceFloor;
    const nextVal = Math.max(minFloor, Number((currentVal - 0.05).toFixed(2)));
    setPriceInputStr(nextVal.toFixed(2));
    if (selectedQuickOption === null) {
      setSelectedQuickOption("bajar");
    }
    if (basePrice > 0) {
      const calculatedTotalDisc = ((basePrice - nextVal) / basePrice) * 100;
      const rawAddDisc = calculatedTotalDisc - baseFixedDisc;
      const clampedAddDisc = Math.max(minAllowedAddDisc, Math.min(maxAllowedAddDisc, Number(rawAddDisc.toFixed(2))));
      setCurrentDisc(clampedAddDisc);
    }
  };

  const handleStepUp = () => {
    const currentVal = parseFloat(priceInputStr) || priceWithBase;
    const maxCeiling = selectedQuickOption === "bajar" ? priceWithBase : priceCeiling;
    const nextVal = Math.min(maxCeiling, Number((currentVal + 0.05).toFixed(2)));
    setPriceInputStr(nextVal.toFixed(2));
    if (selectedQuickOption === null) {
      setSelectedQuickOption("normal");
    }
    if (basePrice > 0) {
      const calculatedTotalDisc = ((basePrice - nextVal) / basePrice) * 100;
      const rawAddDisc = calculatedTotalDisc - baseFixedDisc;
      const clampedAddDisc = Math.max(minAllowedAddDisc, Math.min(maxAllowedAddDisc, Number(rawAddDisc.toFixed(2))));
      setCurrentDisc(clampedAddDisc);
    }
  };

  const handleConfirm = () => {
    const targetKey = item.id || item.productCode || item.code || item.itemCode;
    if (onApplyDiscount && targetKey) {
      onApplyDiscount(targetKey, currentDisc);
    }
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} isCentered motionPreset="slideInBottom">
      <ModalOverlay bg="blackAlpha.700" backdropFilter="blur(3px)" />
      <ModalContent
        borderRadius="2xl"
        mx={{ base: 3, sm: "auto" }}
        maxW={{ base: "calc(100vw - 24px)", sm: "440px" }}
        my="auto"
        overflow="hidden"
        border="1px solid"
        borderColor="slate.200"
        boxShadow="2xl"
        bg="white"
      >
        <ModalHeader bg="#126C36" color="white" py={3.5} px={4}>
          <Flex align="center" justify="space-between">
            <HStack spacing={2.5}>
              <Flex
                w="32px"
                h="32px"
                borderRadius="lg"
                bg="whiteAlpha.200"
                border="1px solid"
                borderColor="whiteAlpha.300"
                align="center"
                justify="center"
                color={isVolumeDiscount ? "orange.300" : "emerald.200"}
              >
                {isVolumeDiscount ? <Flame size={16} /> : <Sparkles size={16} />}
              </Flex>
              <Box>
                <Text fontSize="sm" fontWeight="800" lineHeight="1.2" color="white">
                  Ajuste de Precio {isVolumeDiscount ? "• Mayoreo" : ""}
                </Text>
                <Text fontSize="10.5px" color="emerald.100" fontWeight="500" noOfLines={1} opacity={0.9}>
                  {item.code || item.productCode || item.itemCode} {item.name || item.description}
                </Text>
              </Box>
            </HStack>
            <ModalCloseButton
              color="whiteAlpha.800"
              _hover={{ bg: "whiteAlpha.200", color: "white" }}
              position="static"
              borderRadius="lg"
            />
          </Flex>
        </ModalHeader>

        <ModalBody p={4} bg="#f8fafc">
          <VStack align="stretch" spacing={3}>
            {/* Tarjeta Ejecutiva Unificada de Precios */}
            <Box bg="white" p={3.5} borderRadius="xl" border="1px solid" borderColor="#e2e8f0" boxShadow="xs">
              <Flex justify="space-between" align="center">
                <VStack align="flex-start" spacing={0.5}>
                  <HStack spacing={1.5} wrap="wrap">
                    <Text fontSize="10px" fontWeight="700" color="slate.400" textTransform="uppercase" letterSpacing="wider">
                      Precio Normal Sugerido
                    </Text>
                    <Badge colorScheme="emerald" bg="#ecfdf5" color="#047857" border="1px solid" borderColor="#a7f3d0" fontSize="10px" fontWeight="700" px={1.5} py={0.2} borderRadius="md">
                      {baseFixedDisc}% Descuento
                    </Badge>
                  </HStack>
                  <HStack spacing={1.5} align="baseline">
                    <Text fontSize="2xl" fontWeight="900" color="#064e3b" fontFamily="mono" lineHeight="1.1">
                      ${priceWithBase.toFixed(2)}
                    </Text>
                    <Text fontSize="xs" fontWeight="700" color="slate.400">
                      USD
                    </Text>
                  </HStack>
                </VStack>

                <VStack align="flex-end" spacing={0.5} borderLeft="1px solid" borderColor="#f1f5f9" pl={3.5}>
                  <Text fontSize="10px" fontWeight="700" color="slate.400" textTransform="uppercase" letterSpacing="wider">
                    P. Catálogo
                  </Text>
                  <Text fontSize="sm" fontWeight="800" color="slate.600" fontFamily="mono">
                    ${basePrice.toFixed(2)} USD
                  </Text>
                </VStack>
              </Flex>
            </Box>

            {/* Precios Rápidos: Botones Elegantes */}
            <Box>
              <Flex justify="space-between" align="center" mb={1.5}>
                <Text fontSize="10.5px" fontWeight="700" color="slate.500" textTransform="uppercase" letterSpacing="wider">
                  Precios Rápidos
                </Text>
                <Text fontSize="10.5px" color="slate.400" fontWeight="600">
                  Tope: <strong>{applicableCeiling}%</strong>
                </Text>
              </Flex>

              <Grid templateColumns={isEligibleForVolume ? "repeat(3, 1fr)" : "repeat(2, 1fr)"} gap={2}>
                <Button
                  size="sm"
                  h="42px"
                  variant="unstyled"
                  display="flex"
                  alignItems="center"
                  justifyContent="space-between"
                  px={3}
                  borderRadius="xl"
                  border="1.5px solid"
                  borderColor={selectedQuickOption === "normal" ? "#059669" : "#e2e8f0"}
                  bg={selectedQuickOption === "normal" ? "#ecfdf5" : "white"}
                  color={selectedQuickOption === "normal" ? "#064e3b" : "slate.700"}
                  _hover={{
                    borderColor: selectedQuickOption === "normal" ? "#059669" : "#cbd5e1",
                    bg: selectedQuickOption === "normal" ? "#d1fae5" : "#f8fafc",
                  }}
                  _active={{ transform: "scale(0.98)" }}
                  onClick={() => handleQuickSelect("normal")}
                  transition="all 0.15s ease"
                >
                  <Text fontSize="xs" fontWeight="700">
                    Normal
                  </Text>
                  <Badge
                    fontSize="11px"
                    fontWeight="800"
                    px={1.5}
                    py={0.5}
                    borderRadius="md"
                    bg={selectedQuickOption === "normal" ? "#d1fae5" : "#f1f5f9"}
                    color={selectedQuickOption === "normal" ? "#047857" : "slate.600"}
                  >
                    ${priceWithBase.toFixed(2)}
                  </Badge>
                </Button>

                <Button
                  size="sm"
                  h="42px"
                  variant="unstyled"
                  display="flex"
                  alignItems="center"
                  justifyContent="space-between"
                  px={3}
                  borderRadius="xl"
                  border="1.5px solid"
                  borderColor={selectedQuickOption === "bajar" ? "#f43f5e" : "#e2e8f0"}
                  bg={selectedQuickOption === "bajar" ? "#fff1f2" : "white"}
                  color={selectedQuickOption === "bajar" ? "#9f1239" : "slate.700"}
                  _hover={{
                    borderColor: selectedQuickOption === "bajar" ? "#f43f5e" : "#fca5a5",
                    bg: selectedQuickOption === "bajar" ? "#ffe4e6" : "#fff1f2",
                  }}
                  _active={{ transform: "scale(0.98)" }}
                  onClick={() => handleQuickSelect("bajar")}
                  transition="all 0.15s ease"
                >
                  <Text fontSize="xs" fontWeight="700">
                    Bajar
                  </Text>
                  <Badge
                    fontSize="11px"
                    fontWeight="800"
                    px={1.5}
                    py={0.5}
                    borderRadius="md"
                    bg={selectedQuickOption === "bajar" ? "#ffe4e6" : "#f1f5f9"}
                    color={selectedQuickOption === "bajar" ? "#be123c" : "slate.600"}
                  >
                    {isPriceDiscounted ? `$${finalUnitPrice.toFixed(2)}` : `Mín. $${priceFloor.toFixed(2)}`}
                  </Badge>
                </Button>

                {isEligibleForVolume && (
                  <Button
                    size="sm"
                    h="42px"
                    variant="unstyled"
                    display="flex"
                    alignItems="center"
                    justifyContent="space-between"
                    px={3}
                    borderRadius="xl"
                    border="1.5px solid"
                    borderColor={selectedQuickOption === "mayoreo" ? "#d97706" : "#e2e8f0"}
                    bg={selectedQuickOption === "mayoreo" ? "#fffbeb" : "white"}
                    color={selectedQuickOption === "mayoreo" ? "#92400e" : "slate.700"}
                    _hover={{ borderColor: "#d97706", bg: "#fef3c7" }}
                    _active={{ transform: "scale(0.98)" }}
                    onClick={() => handleQuickSelect("mayoreo")}
                    transition="all 0.15s ease"
                  >
                    <Text fontSize="xs" fontWeight="700">
                      Mayoreo
                    </Text>
                    <Badge
                      fontSize="11px"
                      fontWeight="800"
                      px={1.5}
                      py={0.5}
                      borderRadius="md"
                      bg={selectedQuickOption === "mayoreo" ? "#fde68a" : "#f1f5f9"}
                      color={selectedQuickOption === "mayoreo" ? "#78350f" : "slate.600"}
                    >
                      ${priceAtVolume65.toFixed(2)}
                    </Badge>
                  </Button>
                )}
              </Grid>
            </Box>

            {/* Control Sofisticado de Subir y Bajar Precio (Sin desbordamientos) */}
            <Box bg="white" p={3.5} borderRadius="xl" border="1px solid" borderColor="#e2e8f0" boxShadow="xs">
              <VStack align="stretch" spacing={2.5}>
                <Flex justify="space-between" align="center">
                  <Text fontSize="11px" fontWeight="700" color="slate.500" textTransform="uppercase" letterSpacing="wider">
                    Ajustar Precio a Medida
                  </Text>
                  <Text fontSize="11px" color="slate.500" fontWeight="600">
                    Mínimo: <strong style={{ color: "#0f172a" }}>${priceFloor.toFixed(2)} USD</strong>
                  </Text>
                </Flex>

                {/* Barra de Control Integrada en Blanco Limpio */}
                <Flex
                  align="center"
                  justify="space-between"
                  h="52px"
                  bg="white"
                  borderRadius="xl"
                  p={1}
                  border="1.5px solid"
                  borderColor={isExceedingCeiling ? "#fca5a5" : "#e2e8f0"}
                >
                  {showMinusButton ? (
                    <IconButton
                      icon={<Minus size={18} strokeWidth={2.5} />}
                      aria-label="Bajar precio"
                      onClick={handleStepDown}
                      isDisabled={finalUnitPrice <= priceFloor || (selectedQuickOption === "normal" && finalUnitPrice <= priceWithBase + 0.009)}
                      w="44px"
                      h="44px"
                      minW="44px"
                      borderRadius="lg"
                      bg="#f8fafc"
                      color="slate.700"
                      boxShadow="xs"
                      border="1px solid"
                      borderColor="#e2e8f0"
                      _hover={{ bg: "#f1f5f9", borderColor: "#cbd5e1", color: "slate.900" }}
                      _active={{ transform: "scale(0.95)" }}
                      transition="all 0.15s ease"
                    />
                  ) : (
                    <Box w="44px" h="44px" />
                  )}

                  <HStack spacing={1} justify="center" flex={1} px={2}>
                    <Text fontSize="lg" fontWeight="700" color="slate.400" userSelect="none">
                      $
                    </Text>
                    <Input
                      maxW="110px"
                      h="40px"
                      border="none"
                      p={0}
                      type="text"
                      inputMode="decimal"
                      value={priceInputStr}
                      onChange={handlePriceInputChange}
                      onBlur={handlePriceBlur}
                      onFocus={(e) => e.target.select()}
                      textAlign="center"
                      fontWeight="800"
                      fontSize="2xl"
                      bg="transparent"
                      _focus={{ boxShadow: "none" }}
                      color="slate.900"
                      fontFamily="mono"
                    />
                    <Text fontSize="xs" fontWeight="700" color="slate.400" userSelect="none">
                      USD
                    </Text>
                  </HStack>

                  {showPlusButton ? (
                    <IconButton
                      icon={<Plus size={18} strokeWidth={2.5} />}
                      aria-label="Subir precio"
                      onClick={handleStepUp}
                      isDisabled={finalUnitPrice >= priceCeiling || (selectedQuickOption === "bajar" && finalUnitPrice >= priceWithBase - 0.009)}
                      w="44px"
                      h="44px"
                      minW="44px"
                      borderRadius="lg"
                      bg="#f8fafc"
                      color="slate.700"
                      boxShadow="xs"
                      border="1px solid"
                      borderColor="#e2e8f0"
                      _hover={{ bg: "#f1f5f9", borderColor: "#cbd5e1", color: "slate.900" }}
                      _active={{ transform: "scale(0.95)" }}
                      transition="all 0.15s ease"
                    />
                  ) : (
                    <Box w="44px" h="44px" />
                  )}
                </Flex>

                {/* Resumen de Estado Discreto */}
                <Flex justify="space-between" align="center" px={1} fontSize="11px">
                  <Text color="slate.400" fontWeight="600">
                    Normal: ${priceWithBase.toFixed(2)} USD
                  </Text>
                  {isVolumeDiscount ? (
                    <Badge bg="#fffbeb" color="#92400e" border="1px solid" borderColor="#fde68a" fontSize="10.5px" px={2} py={0.5} borderRadius="md" fontWeight="700">
                      Mayoreo {effectiveTotalDiscPct}% • Aprobación Gerencial
                    </Badge>
                  ) : isDiscountAboveThreshold ? (
                    <Badge bg="#fff1f2" color="#be123c" border="1px solid" borderColor="#fecdd3" fontSize="10.5px" px={2} py={0.5} borderRadius="md" fontWeight="700">
                      Desc. {effectiveTotalDiscPct}% (&gt;50%) • Con Aprobación
                    </Badge>
                  ) : isPriceDiscounted ? (
                    <Badge bg="#ecfdf5" color="#047857" border="1px solid" borderColor="#a7f3d0" fontSize="10.5px" px={2} py={0.5} borderRadius="md" fontWeight="700">
                      Rebaja (-${(priceWithBase - finalUnitPrice).toFixed(2)} USD) • Directo
                    </Badge>
                  ) : isPriceHigher ? (
                    <Badge bg="#ecfdf5" color="#047857" border="1px solid" borderColor="#a7f3d0" fontSize="10.5px" px={2} py={0.5} borderRadius="md" fontWeight="700">
                      Aumento (+${(finalUnitPrice - priceWithBase).toFixed(2)} USD) • Directo
                    </Badge>
                  ) : (
                    <Text color="slate.400" fontWeight="600">
                      Sin modificaciones
                    </Text>
                  )}
                </Flex>
              </VStack>
            </Box>

            {/* Resumen Compacto y Elegante */}
            <Flex
              justify="space-between"
              align="center"
              p={3}
              borderRadius="xl"
              bg="white"
              border="1px solid"
              borderColor="#e2e8f0"
              fontSize="xs"
            >
              <VStack align="flex-start" spacing={0}>
                <Text color="slate.600" fontSize="11px" fontWeight="600">
                  Total Línea ({qty} {qty === 1 ? "unidad" : "unidades"}):
                </Text>
                <Text fontSize="10px" color="#047857" fontWeight="600">
                  Descuento Total: {effectiveTotalDiscPct}%
                </Text>
              </VStack>
              <Text fontFamily="mono" fontWeight="800" fontSize="lg" color="slate.900">
                ${finalLineTotal.toFixed(2)} <Text as="span" fontSize="xs" fontWeight="700" color="slate.400">USD</Text>
              </Text>
            </Flex>

            {/* Avisos Comerciales Relevantes (Solo si aplica) */}
            {isExceedingCeiling ? (
              <Flex
                align="flex-start"
                gap={2.5}
                p={3}
                borderRadius="xl"
                bg="#fff1f2"
                border="1px solid"
                borderColor="#fecdd3"
              >
                <Flex
                  align="center"
                  justify="center"
                  w="26px"
                  h="26px"
                  borderRadius="md"
                  flexShrink={0}
                  bg="#ffe4e6"
                  color="#be123c"
                  mt={0.5}
                >
                  <ShieldAlert size={16} />
                </Flex>
                <Box fontSize="11px">
                  <Text fontWeight="800" color="#9f1239">
                    Supera el Límite Permitido ({applicableCeiling}%)
                  </Text>
                  <Text color="#be123c" fontWeight="500" mt={0.5}>
                    El precio mínimo permitido para esta línea es ${priceFloor.toFixed(2)} USD.
                    {!isEligibleForVolume && ` Para descuentos mayores al 55% se requieren más de 100 unidades (actual: ${qty} uds).`}
                  </Text>
                </Box>
              </Flex>
            ) : isVolumeDiscount ? (
              <Flex
                align="flex-start"
                gap={2.5}
                p={3}
                borderRadius="xl"
                bg="#fffbeb"
                border="1px solid"
                borderColor="#fde68a"
              >
                <Flex
                  align="center"
                  justify="center"
                  w="26px"
                  h="26px"
                  borderRadius="md"
                  flexShrink={0}
                  bg="#fef3c7"
                  color="#b45309"
                  mt={0.5}
                >
                  <Flame size={16} />
                </Flex>
                <Box fontSize="11px">
                  <Text fontWeight="800" color="#78350f">
                    Descuento por Volumen ({effectiveTotalDiscPct}%) Habilitado
                  </Text>
                  <Text color="#92400e" fontWeight="500" mt={0.5}>
                    Supera el tope comercial del {STANDARD_DISCOUNT_CEILING}% por volumen ({qty} uds). Requerirá aprobación gerencial.
                  </Text>
                </Box>
              </Flex>
            ) : isDiscountAboveThreshold ? (
              <Flex
                align="flex-start"
                gap={2.5}
                p={3}
                borderRadius="xl"
                bg="#fffbeb"
                border="1px solid"
                borderColor="#fde68a"
              >
                <Flex
                  align="center"
                  justify="center"
                  w="26px"
                  h="26px"
                  borderRadius="md"
                  flexShrink={0}
                  bg="#fef3c7"
                  color="#b45309"
                  mt={0.5}
                >
                  <AlertTriangle size={15} />
                </Flex>
                <Box fontSize="11px">
                  <Text fontWeight="800" color="#78350f">
                    Descuento del {effectiveTotalDiscPct}% (Supera el {APPROVAL_DISCOUNT_THRESHOLD}%)
                  </Text>
                  <Text color="#92400e" fontWeight="500" mt={0.5}>
                    Aplica descuento comercial superior al 50%. Esta cotización requerirá aprobación comercial antes de emitirse a SAP.
                  </Text>
                </Box>
              </Flex>
            ) : isPriceDiscounted ? (
              <Flex
                align="flex-start"
                gap={2.5}
                p={3}
                borderRadius="xl"
                bg="#ecfdf5"
                border="1px solid"
                borderColor="#a7f3d0"
              >
                <Flex
                  align="center"
                  justify="center"
                  w="26px"
                  h="26px"
                  borderRadius="md"
                  flexShrink={0}
                  bg="#d1fae5"
                  color="#047857"
                  mt={0.5}
                >
                  <Check size={15} />
                </Flex>
                <Box fontSize="11px">
                  <Text fontWeight="800" color="#064e3b">
                    Rebaja dentro del margen permitido (-${(priceWithBase - finalUnitPrice).toFixed(2)} USD)
                  </Text>
                  <Text color="#047857" fontWeight="500" mt={0.5}>
                    Descuento total {effectiveTotalDiscPct}% (hasta 50%). Aprobación inmediata / pase directo a SAP.
                  </Text>
                </Box>
              </Flex>
            ) : isHigherMargin ? (
              <Flex
                align="flex-start"
                gap={2.5}
                p={3}
                borderRadius="xl"
                bg="#ecfdf5"
                border="1px solid"
                borderColor="#a7f3d0"
              >
                <Flex
                  align="center"
                  justify="center"
                  w="26px"
                  h="26px"
                  borderRadius="md"
                  flexShrink={0}
                  bg="#d1fae5"
                  color="#047857"
                  mt={0.5}
                >
                  <Sparkles size={15} />
                </Flex>
                <Box fontSize="11px">
                  <Text fontWeight="800" color="#064e3b">
                    Mayor margen de ganancia (+${(finalUnitPrice - priceWithBase).toFixed(2)} USD)
                  </Text>
                  <Text color="#047857" fontWeight="500" mt={0.5}>
                    Aumenta el margen comercial. Aprobación inmediata.
                  </Text>
                </Box>
              </Flex>
            ) : null}
          </VStack>
        </ModalBody>

        <Flex justify="flex-end" gap={2} p={3.5} bg="white" borderTop="1px solid" borderColor="#e2e8f0">
          <Button variant="ghost" size="sm" onClick={onClose} fontWeight="700" color="slate.600" _hover={{ bg: "#f1f5f9" }}>
            Cancelar
          </Button>
          <Button
            size="sm"
            h="40px"
            bg={
              isExceedingCeiling
                ? "slate.400"
                : isVolumeDiscount
                ? "#d97706"
                : isDiscountAboveThreshold
                ? "#be123c"
                : "#126C36"
            }
            color="white"
            _hover={{
              bg:
                isExceedingCeiling
                  ? "slate.400"
                  : isVolumeDiscount
                  ? "#b45309"
                  : isDiscountAboveThreshold
                  ? "#9f1239"
                  : "#0e572b",
            }}
            _active={{ transform: "scale(0.98)" }}
            onClick={handleConfirm}
            isDisabled={isExceedingCeiling}
            fontWeight="700"
            px={4}
            borderRadius="xl"
            boxShadow="sm"
            transition="all 0.15s ease"
          >
            {isVolumeDiscount
              ? `Aplicar Mayoreo ($${finalUnitPrice.toFixed(2)})`
              : isDiscountAboveThreshold
              ? `Aplicar con Aprobación ($${finalUnitPrice.toFixed(2)})`
              : isPriceDiscounted
              ? `Aplicar Rebajado ($${finalUnitPrice.toFixed(2)})`
              : isPriceHigher
              ? `Aplicar Aumentado ($${finalUnitPrice.toFixed(2)})`
              : `Confirmar Precio ($${finalUnitPrice.toFixed(2)})`}
          </Button>
        </Flex>
      </ModalContent>
    </Modal>
  );
}

export default DiscountPopoverModal;
