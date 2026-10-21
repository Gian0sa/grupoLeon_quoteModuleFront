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
  Input,
  Badge,
  VStack,
  HStack,
} from "@chakra-ui/react";
import { Plus, Minus, Tag, Flame } from "lucide-react";
import { formatThousands } from "../../../shared/utils/quoteCalculator";

export const APPROVAL_DISCOUNT_THRESHOLD = 50.0; // Umbral de activación de aprobación comercial (50.0%)
export const STANDARD_DISCOUNT_CEILING = 55.0;   // Tope comercial estándar ordinario (55.0%)
export const MAX_DISCOUNT_CEILING = 65.0;        // Tope máximo absoluto por volumen / mayoreo (65.0%)
export const VOLUME_MIN_QUANTITY = 100;          // Cantidad mínima estricta para mayoreo (>100 uds)

export function DiscountPopoverModal({ isOpen, onClose, item, onApplyDiscount }) {
  const [currentDisc, setCurrentDisc] = useState(0);
  const [priceInputStr, setPriceInputStr] = useState("0.00");

  const basePrice = Number(item?.price || item?.unitPrice || 0);
  const sapDisc = Number(item?.discount || item?.sapDiscount || 0);
  const promoDisc = Number(item?.promoDiscount || 0);
  const baseFixedDisc = Number((sapDisc + promoDisc).toFixed(1));
  const qty = Number(item?.quantity || item?.Quantity || 1);

  // REGLA ESTRICTA DE NEGOCIO:
  // El modo mayoreo (>55% hasta 65%) SOLO está disponible si la cantidad de productos es MAYOR a 100 (>100 uds)
  const isEligibleForVolume = qty > VOLUME_MIN_QUANTITY;
  const applicableCeiling = isEligibleForVolume ? MAX_DISCOUNT_CEILING : STANDARD_DISCOUNT_CEILING;

  // Precio estándar con descuento base (SAP + Promo)
  const priceWithBase = Number((basePrice * (1 - baseFixedDisc / 100)).toFixed(2));

  // Precios límite oficiales
  const priceCeiling = basePrice;
  const priceAtStandard55 = Number((basePrice * (1 - STANDARD_DISCOUNT_CEILING / 100)).toFixed(2));
  const priceAtVolume65 = Number((basePrice * (1 - MAX_DISCOUNT_CEILING / 100)).toFixed(2));
  const priceFloor = isEligibleForVolume ? priceAtVolume65 : priceAtStandard55;

  // Límites de ajuste de descuento:
  const maxAllowedAddDisc = Math.max(0, Number((applicableCeiling - baseFixedDisc).toFixed(2)));
  const minAllowedAddDisc = Number((-baseFixedDisc).toFixed(2));

  useEffect(() => {
    if (item && isOpen) {
      const existingAddDisc = Math.min(maxAllowedAddDisc, Math.max(minAllowedAddDisc, Number(item.lineDiscount || 0)));
      setCurrentDisc(existingAddDisc);
      const effectivePrice = basePrice * (1 - (baseFixedDisc + existingAddDisc) / 100);
      setPriceInputStr(effectivePrice.toFixed(2));
    }
  }, [item, isOpen, basePrice, baseFixedDisc, maxAllowedAddDisc, minAllowedAddDisc]);

  if (!item) return null;

  // Cálculos en tiempo real
  const rawTotalDisc = baseFixedDisc + currentDisc;
  const effectiveTotalDiscPct = Number(Math.max(0, Math.min(applicableCeiling, rawTotalDisc)).toFixed(1));
  const finalUnitPrice = Number((basePrice * (1 - effectiveTotalDiscPct / 100)).toFixed(2));
  const finalLineTotal = Number((finalUnitPrice * qty).toFixed(2));

  const isExceedingCeiling = rawTotalDisc > applicableCeiling + 0.01;
  const isVolumeDiscount = isEligibleForVolume && effectiveTotalDiscPct > STANDARD_DISCOUNT_CEILING + 0.01;
  const isDiscountAboveThreshold = effectiveTotalDiscPct > APPROVAL_DISCOUNT_THRESHOLD + 0.009;
  const isPriceDiscounted = finalUnitPrice < priceWithBase - 0.009;
  const isPriceHigher = finalUnitPrice > priceWithBase + 0.009;
  const requiresApproval = isDiscountAboveThreshold || isVolumeDiscount;

  // Al escribir en el input de precio
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

  // Al salir del input, redondear y aplicar límites
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

    if (valNum < priceFloor) {
      valNum = priceFloor;
      setCurrentDisc(maxAllowedAddDisc);
      setPriceInputStr(priceFloor.toFixed(2));
      return;
    }

    if (valNum > priceCeiling) {
      valNum = priceCeiling;
      setCurrentDisc(minAllowedAddDisc);
      setPriceInputStr(priceCeiling.toFixed(2));
      return;
    }

    setPriceInputStr(valNum.toFixed(2));
    if (basePrice > 0) {
      const calculatedTotalDisc = ((basePrice - valNum) / basePrice) * 100;
      const rawAddDisc = calculatedTotalDisc - baseFixedDisc;
      const clampedAddDisc = Math.max(minAllowedAddDisc, Math.min(maxAllowedAddDisc, Number(rawAddDisc.toFixed(2))));
      setCurrentDisc(clampedAddDisc);
    }
  };

  // Ajuste interactivo con botones [-] y [+] ($0.05 por clic)
  const handleStepDown = () => {
    const currentVal = parseFloat(priceInputStr) || priceWithBase;
    const nextVal = Math.max(priceFloor, Number((currentVal - 0.05).toFixed(2)));
    setPriceInputStr(nextVal.toFixed(2));
    if (basePrice > 0) {
      const calculatedTotalDisc = ((basePrice - nextVal) / basePrice) * 100;
      const rawAddDisc = calculatedTotalDisc - baseFixedDisc;
      const clampedAddDisc = Math.max(minAllowedAddDisc, Math.min(maxAllowedAddDisc, Number(rawAddDisc.toFixed(2))));
      setCurrentDisc(clampedAddDisc);
    }
  };

  const handleStepUp = () => {
    const currentVal = parseFloat(priceInputStr) || priceWithBase;
    const nextVal = Math.min(priceCeiling, Number((currentVal + 0.05).toFixed(2)));
    setPriceInputStr(nextVal.toFixed(2));
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
      <ModalOverlay bg="blackAlpha.600" backdropFilter="blur(3px)" />
      <ModalContent
        borderRadius="2xl"
        mx={{ base: 3, sm: "auto" }}
        maxW={{ base: "calc(100vw - 24px)", sm: "420px" }}
        overflow="hidden"
        boxShadow="0 20px 40px -15px rgba(0,0,0,0.3)"
        border="1px solid"
        borderColor="gray.200"
        bg="white"
      >
        {/* CABECERA MODERNA Y LIMPIA */}
        <Box bg="linear-gradient(135deg, #064e3b 0%, #0f5132 100%)" color="white" py={3.5} px={4}>
          <Flex align="center" justify="space-between">
            <HStack spacing={2.5}>
              <Flex
                w="32px"
                h="32px"
                borderRadius="lg"
                bg="whiteAlpha.200"
                align="center"
                justify="center"
                color="#a7f3d0"
              >
                <Tag size={18} />
              </Flex>
              <Box minW="0">
                <Text fontSize="sm" fontWeight="800" color="white">
                  Ajustar Precio Unitario {isVolumeDiscount ? "• Mayoreo" : ""}
                </Text>
                <Text fontSize="11px" color="#a7f3d0" fontWeight="600" isTruncated maxW="260px">
                  {item.code || item.productCode || item.itemCode} • {item.name || item.description}
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
        </Box>

        <ModalBody p={4} bg="#f8fafc">
          <VStack align="stretch" spacing={3}>
            {/* 1. TARJETA DE REFERENCIA: PRECIO ACTUAL */}
            <Box bg="white" p={3} borderRadius="xl" border="1px solid" borderColor="gray.200" boxShadow="xs">
              <Flex justify="space-between" align="center">
                <Box>
                  <Text fontSize="10.5px" fontWeight="700" color="gray.500" textTransform="uppercase" letterSpacing="wider">
                    Precio Sugerido Actual
                  </Text>
                  <HStack spacing={1.5} align="baseline" mt={0.5}>
                    <Text fontSize="xl" fontWeight="900" color="#064e3b" fontFamily="mono">
                      ${formatThousands(priceWithBase)}
                    </Text>
                    <Text fontSize="xs" fontWeight="700" color="gray.400">USD</Text>
                    <Badge colorScheme="green" bg="#ecfdf5" color="#047857" fontSize="10px" fontWeight="800" px={1.5} py={0.2} borderRadius="md">
                      {baseFixedDisc}% desc.
                    </Badge>
                  </HStack>
                </Box>

                <Box textAlign="right" borderLeft="1px solid" borderColor="gray.100" pl={3}>
                  <Text fontSize="10.5px" fontWeight="700" color="gray.400" textTransform="uppercase">
                    Precio Lista
                  </Text>
                  <Text fontSize="sm" fontWeight="700" color="gray.400" fontFamily="mono" textDecoration="line-through">
                    ${formatThousands(basePrice)} USD
                  </Text>
                </Box>
              </Flex>
            </Box>

            {/* 2. CONTROL PRINCIPAL DE PRECIO: STEPPER [-] [$ X.XX] [+] */}
            <Box bg="white" p={3.5} borderRadius="xl" border="1.5px solid" borderColor="emerald.200" boxShadow="xs">
              <Flex justify="space-between" align="center" mb={2}>
                <Text fontSize="11px" fontWeight="800" color="gray.700" textTransform="uppercase" letterSpacing="wide">
                  ¿A cuánto deseas vender?
                </Text>
                <Text fontSize="11px" color="gray.500" fontWeight="600">
                  Mínimo: <Text as="span" fontWeight="800" color="gray.800">${formatThousands(priceFloor)} USD</Text>
                </Text>
              </Flex>

              {/* Stepper interactivo siempre visible con colores y efectos hover vivos */}
              <Flex align="center" justify="space-between" bg="gray.50" p={1.5} borderRadius="xl" border="1px solid" borderColor="gray.200">
                <IconButton
                  icon={<Minus size={18} strokeWidth={2.5} />}
                  aria-label="Disminuir precio"
                  onClick={handleStepDown}
                  isDisabled={finalUnitPrice <= priceFloor}
                  w="42px"
                  h="42px"
                  borderRadius="lg"
                  bg="white"
                  color="#be123c"
                  boxShadow="xs"
                  border="1.5px solid"
                  borderColor="#fecdd3"
                  _hover={{
                    bg: "#fff1f2",
                    borderColor: "#f43f5e",
                    color: "#9f1239",
                    transform: "scale(1.06)",
                    boxShadow: "0 2px 8px rgba(225, 29, 72, 0.2)"
                  }}
                  _active={{ transform: "scale(0.95)" }}
                  _disabled={{ opacity: 0.35, cursor: "not-allowed", borderColor: "gray.200", color: "gray.400" }}
                  transition="all 0.15s ease"
                />

                <HStack spacing={1} justify="center" flex={1}>
                  <Text fontSize="xl" fontWeight="700" color="gray.400" userSelect="none">$</Text>
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
                    fontWeight="900"
                    fontSize="2xl"
                    bg="transparent"
                    _focus={{ boxShadow: "none" }}
                    color="#0f172a"
                    fontFamily="mono"
                  />
                  <Text fontSize="xs" fontWeight="700" color="gray.400" userSelect="none">USD</Text>
                </HStack>

                <IconButton
                  icon={<Plus size={18} strokeWidth={2.5} />}
                  aria-label="Aumentar precio"
                  onClick={handleStepUp}
                  isDisabled={finalUnitPrice >= priceCeiling}
                  w="42px"
                  h="42px"
                  borderRadius="lg"
                  bg="white"
                  color="#047857"
                  boxShadow="xs"
                  border="1.5px solid"
                  borderColor="#a7f3d0"
                  _hover={{
                    bg: "#ecfdf5",
                    borderColor: "#10b981",
                    color: "#064e3b",
                    transform: "scale(1.06)",
                    boxShadow: "0 2px 8px rgba(5, 150, 105, 0.2)"
                  }}
                  _active={{ transform: "scale(0.95)" }}
                  _disabled={{ opacity: 0.35, cursor: "not-allowed", borderColor: "gray.200", color: "gray.400" }}
                  transition="all 0.15s ease"
                />
              </Flex>
            </Box>

            {/* 3. RESUMEN CLARO Y ESTADO DE APROBACIÓN */}
            <Box
              p={3}
              borderRadius="xl"
              bg={
                isExceedingCeiling
                  ? "#fff1f2"
                  : requiresApproval
                  ? "#fffbeb"
                  : "#f0fdf4"
              }
              border="1px solid"
              borderColor={
                isExceedingCeiling
                  ? "#fecdd3"
                  : requiresApproval
                  ? "#fde68a"
                  : "#bbf7d0"
              }
            >
              <Flex justify="space-between" align="center">
                <HStack spacing={2}>
                  <Text fontSize="16px">
                    {isExceedingCeiling ? "⛔" : requiresApproval ? "⚠️" : "✅"}
                  </Text>
                  <Box>
                    <Text
                      fontSize="11.5px"
                      fontWeight="800"
                      color={
                        isExceedingCeiling
                          ? "#9f1239"
                          : requiresApproval
                          ? "#92400e"
                          : "#065f46"
                      }
                    >
                      {isExceedingCeiling
                        ? `Supera el límite (mínimo $${formatThousands(priceFloor)})`
                        : requiresApproval
                        ? `Descuento ${effectiveTotalDiscPct}% (Requiere aprobación)`
                        : isPriceDiscounted
                        ? `Rebaja a $${formatThousands(finalUnitPrice)} (Aprobación directa)`
                        : isPriceHigher
                        ? `Aumento a $${formatThousands(finalUnitPrice)} (Mayor margen)`
                        : "Precio estándar sin modificaciones"}
                    </Text>
                    <Text
                      fontSize="10.5px"
                      color={
                        isExceedingCeiling
                          ? "#be123c"
                          : requiresApproval
                          ? "#b45309"
                          : "#047857"
                      }
                      fontWeight="600"
                    >
                      {isExceedingCeiling
                        ? `El descuento máximo permitido es ${applicableCeiling}%.`
                        : requiresApproval
                        ? "Al superar el 50% de descuento se enviará a validación comercial."
                        : "Pase directo a SAP sin necesidad de aprobación previa."}
                    </Text>
                  </Box>
                </HStack>

                <Box textAlign="right" flexShrink={0}>
                  <Text fontSize="10px" color="gray.500" fontWeight="700" textTransform="uppercase">
                    Por unidad
                  </Text>
                  <Text fontSize="md" fontWeight="900" color="gray.900" fontFamily="mono">
                    ${formatThousands(finalUnitPrice)}
                  </Text>
                </Box>
              </Flex>

              {qty > 1 && (
                <Flex justify="space-between" align="center" mt={2} pt={2} borderTop="1px dashed" borderColor="rgba(0,0,0,0.1)" fontSize="11px">
                  <Text color="gray.600" fontWeight="600">
                    Total en la cotización ({qty} unidades):
                  </Text>
                  <Text fontWeight="800" color="gray.800" fontFamily="mono">
                    ${formatThousands(finalLineTotal)} USD
                  </Text>
                </Flex>
              )}
            </Box>
          </VStack>
        </ModalBody>

        {/* FOOTER */}
        <Flex justify="space-between" align="center" p={3.5} bg="white" borderTop="1px solid" borderColor="gray.100">
          <Button variant="ghost" size="sm" onClick={onClose} fontWeight="700" color="gray.600" _hover={{ bg: "gray.100" }}>
            Cancelar
          </Button>
          <Button
            size="sm"
            h="38px"
            bg="#0f766e"
            _hover={{ bg: "#115e59" }}
            color="white"
            onClick={handleConfirm}
            isDisabled={isExceedingCeiling}
            fontWeight="800"
            px={4}
            borderRadius="lg"
            boxShadow="xs"
          >
            Confirmar Precio (${formatThousands(finalUnitPrice)})
          </Button>
        </Flex>
      </ModalContent>
    </Modal>
  );
}

export default DiscountPopoverModal;
