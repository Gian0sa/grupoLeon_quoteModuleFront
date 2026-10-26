import React, { useState, useEffect } from "react";
import {
  Modal,
  ModalOverlay,
  ModalContent,
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
import { Plus, Minus, Tag } from "lucide-react";
import { formatThousands } from "../../../shared/utils/quoteCalculator";

export const APPROVAL_DISCOUNT_THRESHOLD = 50.0; // Umbral de activación de aprobación comercial (50.0%)
export const STANDARD_DISCOUNT_CEILING = 80.0;   // Tope comercial estándar permitido con aprobación (80.0%)
export const MAX_DISCOUNT_CEILING = 80.0;        // Tope máximo comercial absoluto (80.0% para liquidaciones/promociones)
export const VOLUME_MIN_QUANTITY = 100;          // Cantidad referencial para mayoreo (>100 uds)
export const TAX_RATE = 0.18;                     // Tasa oficial de IGV (18%)

export function DiscountPopoverModal({ isOpen, onClose, item, onApplyDiscount }) {
  const [currentDisc, setCurrentDisc] = useState(0);
  const [priceInputStr, setPriceInputStr] = useState("0.00");

  const basePrice = Number(item?.price || item?.unitPrice || 0); // Precio Lista sin IGV de SAP
  const basePriceConIGV = Number((basePrice * (1 + TAX_RATE)).toFixed(2));
  const sapDisc = Number(item?.discount || item?.sapDiscount || 0);
  const promoDisc = Number(item?.promoDiscount || 0);
  const baseFixedDisc = Number((sapDisc + promoDisc).toFixed(1));
  const qty = Number(item?.quantity || item?.Quantity || 1);

  // REGLA DE NEGOCIO:
  // Se permiten descuentos comerciales de hasta 80.0% (los que superen 50% requieren aprobación de administración)
  const isEligibleForVolume = qty > VOLUME_MIN_QUANTITY;
  const applicableCeiling = MAX_DISCOUNT_CEILING;

  // Precios sugeridos con descuento base (SAP + Promo)
  const priceWithBaseSinIGV = Number((basePrice * (1 - baseFixedDisc / 100)).toFixed(2));
  const priceWithBaseConIGV = Number((priceWithBaseSinIGV * (1 + TAX_RATE)).toFixed(2));

  // Precios límite oficiales con IGV
  const priceCeilingConIGV = basePriceConIGV;
  const priceFloorSinIGV = Number((basePrice * (1 - applicableCeiling / 100)).toFixed(2));
  const priceFloorConIGV = Number((priceFloorSinIGV * (1 + TAX_RATE)).toFixed(2));

  // Límites de ajuste de descuento adicional:
  const maxAllowedAddDisc = Math.max(0, Number((applicableCeiling - baseFixedDisc).toFixed(2)));
  const minAllowedAddDisc = Number((-baseFixedDisc).toFixed(2));

  useEffect(() => {
    if (item && isOpen) {
      const existingAddDisc = Math.min(maxAllowedAddDisc, Math.max(minAllowedAddDisc, Number(Number(item.lineDiscount || 0).toFixed(2))));
      setCurrentDisc(existingAddDisc);
      if (item.customPriceConIGV && Number(item.customPriceConIGV) > 0) {
        setPriceInputStr(Number(item.customPriceConIGV).toFixed(2));
      } else {
        const effectiveNetPrice = Number((basePrice * (1 - (baseFixedDisc + existingAddDisc) / 100)).toFixed(4));
        setPriceInputStr((effectiveNetPrice * (1 + TAX_RATE)).toFixed(2));
      }
    }
  }, [item, isOpen, basePrice, baseFixedDisc, maxAllowedAddDisc, minAllowedAddDisc]);

  if (!item) return null;

  // Precio con IGV activo en el modal:
  const parsedInputPrice = parseFloat(priceInputStr);
  const hasValidInputPrice = !isNaN(parsedInputPrice) && parsedInputPrice > 0;

  // El precio final con IGV es EXACTAMENTE el valor ingresado por el usuario (ej: 10.00 exactos)
  const finalUnitPriceConIGV = hasValidInputPrice
    ? Number(parsedInputPrice.toFixed(2))
    : Number(((basePrice * (1 - (baseFixedDisc + currentDisc) / 100)) * (1 + TAX_RATE)).toFixed(2));

  // Desglose oficial de Neto e IGV con cuadre perfecto (Neto + IGV = Total exacto con IGV)
  const finalUnitPriceSinIGV = Number((finalUnitPriceConIGV / (1 + TAX_RATE)).toFixed(2));
  const calculatedTax = Number((finalUnitPriceConIGV - finalUnitPriceSinIGV).toFixed(2));
  const finalLineTotalConIGV = Number((finalUnitPriceConIGV * qty).toFixed(2));

  // Descuento total equivalente según el precio objetivo con IGV:
  const netTarget = finalUnitPriceConIGV / (1 + TAX_RATE);
  const rawTotalDisc = basePrice > 0 ? ((basePrice - netTarget) / basePrice) * 100 : 0;
  const effectiveTotalDiscPct = Number(Math.max(0, Math.min(applicableCeiling, rawTotalDisc)).toFixed(2));

  const isExceedingCeiling = rawTotalDisc > applicableCeiling + 0.01;
  const isVolumeDiscount = isEligibleForVolume && effectiveTotalDiscPct > APPROVAL_DISCOUNT_THRESHOLD + 0.01;
  const isDiscountAboveThreshold = effectiveTotalDiscPct > APPROVAL_DISCOUNT_THRESHOLD + 0.009;
  const isPriceDiscounted = finalUnitPriceConIGV < priceWithBaseConIGV - 0.009;
  const isPriceHigher = finalUnitPriceConIGV > priceWithBaseConIGV + 0.009;
  const requiresApproval = isDiscountAboveThreshold || isVolumeDiscount;

  // Manejo de escritura en el input de precio con IGV
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

    if (valNum >= priceCeilingConIGV) {
      setCurrentDisc(minAllowedAddDisc);
      return;
    }

    if (basePrice > 0) {
      const netTarget = valNum / (1 + TAX_RATE);
      const calculatedTotalDisc = ((basePrice - netTarget) / basePrice) * 100;
      const rawAddDisc = calculatedTotalDisc - baseFixedDisc;
      const clampedAddDisc = Math.max(minAllowedAddDisc, Math.min(maxAllowedAddDisc, Number(rawAddDisc.toFixed(2))));
      setCurrentDisc(clampedAddDisc);
    }
  };

  // Al salir del input, redondear a 2 decimales limpios y aplicar límites con IGV
  const handlePriceBlur = () => {
    if (priceInputStr === "" || priceInputStr === ".") {
      setPriceInputStr(priceWithBaseConIGV.toFixed(2));
      setCurrentDisc(0);
      return;
    }

    let valNum = parseFloat(priceInputStr);
    if (isNaN(valNum) || valNum <= 0) {
      setPriceInputStr(priceWithBaseConIGV.toFixed(2));
      setCurrentDisc(0);
      return;
    }

    if (valNum < priceFloorConIGV) {
      valNum = priceFloorConIGV;
    } else if (valNum > priceCeilingConIGV) {
      valNum = priceCeilingConIGV;
    }

    setPriceInputStr(valNum.toFixed(2));

    if (basePrice > 0) {
      const netTarget = valNum / (1 + TAX_RATE);
      const calculatedTotalDisc = ((basePrice - netTarget) / basePrice) * 100;
      const rawAddDisc = calculatedTotalDisc - baseFixedDisc;
      const clampedAddDisc = Math.max(minAllowedAddDisc, Math.min(maxAllowedAddDisc, Number(rawAddDisc.toFixed(2))));
      setCurrentDisc(clampedAddDisc);
    }
  };

  // Botones Stepper [-] y [+] ($0.05 por clic sobre precio con IGV)
  const handleStepDown = () => {
    const currentVal = parseFloat(priceInputStr) || priceWithBaseConIGV;
    // Si viene de centavos no alineados (ej: 9.99), ajustar al múltiplo de 0.05 más cercano hacia abajo
    const roundedStep = Math.round((currentVal - 0.05) * 20) / 20;
    const nextVal = Math.max(priceFloorConIGV, Number(roundedStep.toFixed(2)));
    setPriceInputStr(nextVal.toFixed(2));
    if (basePrice > 0) {
      const netTarget = nextVal / (1 + TAX_RATE);
      const calculatedTotalDisc = ((basePrice - netTarget) / basePrice) * 100;
      const rawAddDisc = calculatedTotalDisc - baseFixedDisc;
      const clampedAddDisc = Math.max(minAllowedAddDisc, Math.min(maxAllowedAddDisc, Number(rawAddDisc.toFixed(2))));
      setCurrentDisc(clampedAddDisc);
    }
  };

  const handleStepUp = () => {
    const currentVal = parseFloat(priceInputStr) || priceWithBaseConIGV;
    // Si viene de centavos no alineados (ej: 9.99), ajustar al múltiplo de 0.05 más cercano hacia arriba (ej: 10.00)
    const roundedStep = Math.round((currentVal + 0.05) * 20) / 20;
    const nextVal = Math.min(priceCeilingConIGV, Number(roundedStep.toFixed(2)));
    setPriceInputStr(nextVal.toFixed(2));
    if (basePrice > 0) {
      const netTarget = nextVal / (1 + TAX_RATE);
      const calculatedTotalDisc = ((basePrice - netTarget) / basePrice) * 100;
      const rawAddDisc = calculatedTotalDisc - baseFixedDisc;
      const clampedAddDisc = Math.max(minAllowedAddDisc, Math.min(maxAllowedAddDisc, Number(rawAddDisc.toFixed(2))));
      setCurrentDisc(clampedAddDisc);
    }
  };

  const handleConfirm = () => {
    const targetKey = item.id || item.productCode || item.code || item.itemCode;
    if (onApplyDiscount && targetKey) {
      const finalTargetPrice = parseFloat(priceInputStr);
      const confirmedPriceConIGV = !isNaN(finalTargetPrice) && finalTargetPrice > 0
        ? Number(finalTargetPrice.toFixed(2))
        : finalUnitPriceConIGV;
      const cleanDisc = Number(Number(currentDisc).toFixed(2));
      onApplyDiscount(targetKey, cleanDisc, confirmedPriceConIGV);
    }
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} isCentered motionPreset="slideInBottom">
      <ModalOverlay bg="blackAlpha.600" backdropFilter="blur(3px)" />
      <ModalContent
        borderRadius="2xl"
        mx={{ base: 3, sm: "auto" }}
        maxW={{ base: "calc(100vw - 24px)", sm: "440px" }}
        overflow="hidden"
        boxShadow="0 20px 40px -15px rgba(0,0,0,0.3)"
        border="1px solid"
        borderColor="gray.200"
        bg="white"
      >
        {/* CABECERA */}
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
                <Text fontSize="11px" color="#a7f3d0" fontWeight="600" isTruncated maxW="270px">
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
            {/* 1. TARJETA DE REFERENCIA: PRECIO SUGERIDO ACTUAL (CON IGV) */}
            <Box bg="white" p={3} borderRadius="xl" border="1px solid" borderColor="gray.200" boxShadow="xs">
              <Flex justify="space-between" align="center">
                <Box>
                  <Text fontSize="10.5px" fontWeight="700" color="gray.500" textTransform="uppercase" letterSpacing="wider">
                    Precio Sugerido (Con IGV)
                  </Text>
                  <HStack spacing={1.5} align="baseline" mt={0.5}>
                    <Text fontSize="xl" fontWeight="900" color="#064e3b" fontFamily="mono">
                      ${formatThousands(priceWithBaseConIGV)}
                    </Text>
                    <Text fontSize="xs" fontWeight="700" color="gray.400">USD</Text>
                    <Badge colorScheme="green" bg="#ecfdf5" color="#047857" fontSize="10px" fontWeight="800" px={1.5} py={0.2} borderRadius="md">
                      {baseFixedDisc}% desc.
                    </Badge>
                  </HStack>
                </Box>

                <Box textAlign="right" borderLeft="1px solid" borderColor="gray.100" pl={3}>
                  <Text fontSize="10.5px" fontWeight="700" color="gray.400" textTransform="uppercase">
                    Precio Lista (c/IGV)
                  </Text>
                  <Text fontSize="sm" fontWeight="700" color="gray.400" fontFamily="mono" textDecoration="line-through">
                    ${formatThousands(priceCeilingConIGV)} USD
                  </Text>
                </Box>
              </Flex>
            </Box>

            {/* 2. CONTROL PRINCIPAL DE PRECIO: STEPPER [-] [$ X.XX] [+] */}
            <Box bg="white" p={3.5} borderRadius="xl" border="1.5px solid" borderColor="emerald.200" boxShadow="xs">
              <Flex justify="space-between" align="center" mb={2}>
                <Text fontSize="11px" fontWeight="800" color="gray.700" textTransform="uppercase" letterSpacing="wide">
                  ¿A cuánto deseas vender (c/IGV)?
                </Text>
                <Text fontSize="11px" color="gray.500" fontWeight="600">
                  Mínimo:{" "}
                  <Text as="span" fontWeight="800" color="gray.800">
                    ${formatThousands(priceFloorConIGV)} USD (Inc. IGV)
                  </Text>
                </Text>
              </Flex>

              {/* Stepper interactivo */}
              <Flex align="center" justify="space-between" bg="gray.50" p={1.5} borderRadius="xl" border="1px solid" borderColor="gray.200">
                <IconButton
                  icon={<Minus size={18} strokeWidth={2.5} />}
                  aria-label="Disminuir precio"
                  onClick={handleStepDown}
                  isDisabled={finalUnitPriceConIGV <= priceFloorConIGV}
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
                    boxShadow: "0 2px 8px rgba(225, 29, 72, 0.2)",
                  }}
                  _active={{ transform: "scale(0.95)" }}
                  _disabled={{ opacity: 0.35, cursor: "not-allowed", borderColor: "gray.200", color: "gray.400" }}
                  transition="all 0.15s ease"
                />

                <HStack spacing={1} justify="center" flex={1}>
                  <Text fontSize="xl" fontWeight="700" color="gray.400" userSelect="none">$</Text>
                  <Input
                    maxW="115px"
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
                  isDisabled={finalUnitPriceConIGV >= priceCeilingConIGV}
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
                    boxShadow: "0 2px 8px rgba(5, 150, 105, 0.2)",
                  }}
                  _active={{ transform: "scale(0.95)" }}
                  _disabled={{ opacity: 0.35, cursor: "not-allowed", borderColor: "gray.200", color: "gray.400" }}
                  transition="all 0.15s ease"
                />
              </Flex>
            </Box>

            {/* 3. CAJA DE DESGLOSE / PREVIEW TRADUCIDO EN TIEMPO REAL */}
            <Box bg="white" p={3} borderRadius="xl" border="1px solid" borderColor="gray.200" boxShadow="xs">
              <Text fontSize="10.5px" fontWeight="800" color="gray.700" textTransform="uppercase" letterSpacing="wide" mb={1.5}>
                💡 Desglose Oficial SAP / Facturación
              </Text>

              <Flex justify="space-between" align="center" wrap="wrap" gap={2} fontSize="11px">
                <Text color="gray.600">
                  Neto (SAP): <Text as="strong" color="#0f172a" fontFamily="mono">${formatThousands(finalUnitPriceSinIGV)}</Text>
                </Text>
                <Text color="gray.300">•</Text>
                <Text color="gray.600">
                  IGV (18%): <Text as="strong" color="#0f172a" fontFamily="mono">+${formatThousands(calculatedTax)}</Text>
                </Text>
                <Text color="gray.300">•</Text>
                <Text color="gray.600">
                  Total c/IGV: <Text as="strong" color="#047857" fontFamily="mono">${formatThousands(finalUnitPriceConIGV)}</Text>
                </Text>
              </Flex>

              <Text fontSize="10.5px" color="gray.500" mt={2} pt={1.5} borderTop="1px dashed" borderColor="gray.200">
                Descuento total equivalente: <Text as="strong" color="gray.800">{effectiveTotalDiscPct}%</Text> sobre lista (${formatThousands(basePrice)} neto / ${formatThousands(basePriceConIGV)} c/IGV)
                {currentDisc !== 0 && (
                  <Text as="span" color={currentDisc > 0 ? "orange.700" : "blue.700"} fontWeight="700">
                    {" "}(Base: {baseFixedDisc}% {currentDisc > 0 ? `+ Ajuste: ${currentDisc.toFixed(2)}%` : `- Aumento: ${Math.abs(currentDisc).toFixed(2)}%`})
                  </Text>
                )}
              </Text>
            </Box>

            {/* 4. RESUMEN CLARO Y ESTADO DE APROBACIÓN */}
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
                        ? `Supera el límite (mínimo $${formatThousands(priceFloorConIGV)} USD)`
                        : requiresApproval
                        ? `Requiere Aprobación Comercial (${effectiveTotalDiscPct}% desc.)`
                        : isPriceDiscounted
                        ? `Rebaja a $${formatThousands(finalUnitPriceConIGV)} (Aprobación directa)`
                        : isPriceHigher
                        ? `Aumento a $${formatThousands(finalUnitPriceConIGV)} (Mayor margen)`
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
                    P. Unitario c/IGV
                  </Text>
                  <Text fontSize="md" fontWeight="900" color="gray.900" fontFamily="mono">
                    ${formatThousands(finalUnitPriceConIGV)}
                  </Text>
                </Box>
              </Flex>

              {qty > 1 && (
                <Flex justify="space-between" align="center" mt={2} pt={2} borderTop="1px dashed" borderColor="rgba(0,0,0,0.1)" fontSize="11px">
                  <Text color="gray.600" fontWeight="600">
                    Total en la cotización ({qty} unidades con IGV):
                  </Text>
                  <Text fontWeight="800" color="gray.800" fontFamily="mono">
                    ${formatThousands(finalLineTotalConIGV)} USD
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
            bg={requiresApproval ? "#d97706" : "#0f766e"}
            _hover={{ bg: requiresApproval ? "#b45309" : "#115e59" }}
            color="white"
            onClick={handleConfirm}
            isDisabled={isExceedingCeiling}
            fontWeight="800"
            px={4}
            borderRadius="lg"
            boxShadow="xs"
          >
            Confirmar Precio (${formatThousands(finalUnitPriceConIGV)})
          </Button>
        </Flex>
      </ModalContent>
    </Modal>
  );
}

export default DiscountPopoverModal;
