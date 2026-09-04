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
  Grid,
  Input,
  Badge,
  VStack,
  HStack,
  Alert,
  AlertIcon,
  Switch
} from "@chakra-ui/react";
import { Sparkles, ShieldAlert, AlertTriangle, Check, Flame } from "lucide-react";

export const STANDARD_DISCOUNT_CEILING = 50.0; // Tope estándar ordinario (50.0%)
export const MAX_DISCOUNT_CEILING = 56.0;      // Tope máximo absoluto por volumen / mayoreo (56.0%)

export function DiscountPopoverModal({ isOpen, onClose, item, onApplyDiscount }) {
  const [currentDisc, setCurrentDisc] = useState(0);
  const [priceInputStr, setPriceInputStr] = useState("0.00");
  const [isVolumeMode, setIsVolumeMode] = useState(false);

  const basePrice = Number(item?.price || item?.unitPrice || 0);
  const sapDisc = Number(item?.discount || item?.sapDiscount || 0);
  const promoDisc = Number(item?.promoDiscount || 0);
  const baseFixedDisc = sapDisc + promoDisc;
  const qty = Number(item?.quantity || 1);

  // Precio estándar con descuento base (SAP + Promo)
  const priceWithBase = Number((basePrice * (1 - baseFixedDisc / 100)).toFixed(2));

  // Precios límite
  const priceAtStandard50 = Number((basePrice * (1 - STANDARD_DISCOUNT_CEILING / 100)).toFixed(2));
  const priceAtVolume56 = Number((basePrice * (1 - MAX_DISCOUNT_CEILING / 100)).toFixed(2));

  // Descuento adicional máximo permitido para alcanzar el tope de 56%
  const maxAllowedAddDisc = Math.max(0, Number((MAX_DISCOUNT_CEILING - baseFixedDisc).toFixed(2)));
  // Descuento adicional para alcanzar el 50% estándar
  const standardAddDisc = Math.max(0, Number((STANDARD_DISCOUNT_CEILING - baseFixedDisc).toFixed(2)));

  useEffect(() => {
    if (item && isOpen) {
      const existingAddDisc = Math.min(maxAllowedAddDisc, Math.max(0, Number(item.lineDiscount || 0)));
      setCurrentDisc(existingAddDisc);
      const effectivePrice = basePrice * (1 - (baseFixedDisc + existingAddDisc) / 100);
      setPriceInputStr(effectivePrice.toFixed(2));
      // Si ya supera el 50% o la cantidad es >= 50, activar modo volumen automáticamente
      if ((baseFixedDisc + existingAddDisc) > STANDARD_DISCOUNT_CEILING || qty >= 50) {
        setIsVolumeMode(true);
      } else {
        setIsVolumeMode(false);
      }
    }
  }, [item, isOpen, basePrice, baseFixedDisc, maxAllowedAddDisc, qty]);

  if (!item) return null;

  // Cálculos en tiempo real
  const rawTotalDisc = baseFixedDisc + currentDisc;
  const effectiveTotalDiscPct = Number(rawTotalDisc.toFixed(2));
  const finalUnitPrice = basePrice * (1 - rawTotalDisc / 100);
  const finalLineTotal = finalUnitPrice * qty;

  const isExceedingVolumeCeiling = effectiveTotalDiscPct > MAX_DISCOUNT_CEILING + 0.01;
  const isVolumeDiscount = effectiveTotalDiscPct > STANDARD_DISCOUNT_CEILING + 0.01;
  const requiresApproval = currentDisc > 0 || isVolumeDiscount;

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

    if (valNum >= priceWithBase) {
      setCurrentDisc(0);
      return;
    }

    if (basePrice > 0) {
      const calculatedTotalDisc = ((basePrice - valNum) / basePrice) * 100;
      const rawAddDisc = calculatedTotalDisc - baseFixedDisc;
      const clampedAddDisc = Math.max(0, Math.min(maxAllowedAddDisc, Number(rawAddDisc.toFixed(2))));
      setCurrentDisc(clampedAddDisc);
      if ((baseFixedDisc + clampedAddDisc) > STANDARD_DISCOUNT_CEILING) {
        setIsVolumeMode(true);
      }
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

    // Si intenta bajar de precio por debajo del tope máximo absoluto del 56%
    if (valNum < priceAtVolume56) {
      valNum = priceAtVolume56;
      setCurrentDisc(maxAllowedAddDisc);
      setPriceInputStr(priceAtVolume56.toFixed(2));
      setIsVolumeMode(true);
      return;
    }

    // Si no está en modo volumen ni lleva >= 50 unidades y baja de 50%, activar modo volumen
    if (valNum < priceAtStandard50) {
      setIsVolumeMode(true);
    }

    // Si es mayor al precio estándar
    if (valNum > priceWithBase) {
      valNum = priceWithBase;
      setCurrentDisc(0);
      setPriceInputStr(priceWithBase.toFixed(2));
      return;
    }

    setPriceInputStr(valNum.toFixed(2));
    if (basePrice > 0) {
      const calculatedTotalDisc = ((basePrice - valNum) / basePrice) * 100;
      const rawAddDisc = calculatedTotalDisc - baseFixedDisc;
      const clampedAddDisc = Math.max(0, Math.min(maxAllowedAddDisc, Number(rawAddDisc.toFixed(2))));
      setCurrentDisc(clampedAddDisc);
    }
  };

  // Botones de ajuste rápido
  const handleQuickSelect = (addDiscVal, forceVolume = false) => {
    const valid = Math.max(0, Math.min(maxAllowedAddDisc, Number(addDiscVal || 0)));
    setCurrentDisc(valid);
    const targetPrice = basePrice * (1 - (baseFixedDisc + valid) / 100);
    setPriceInputStr(targetPrice.toFixed(2));
    if (forceVolume || (baseFixedDisc + valid) > STANDARD_DISCOUNT_CEILING) {
      setIsVolumeMode(true);
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
    <Modal isOpen={isOpen} onClose={onClose} isCentered size={{ base: "full", sm: "md" }} motionPreset="slideInBottom">
      <ModalOverlay bg="blackAlpha.600" backdropFilter="blur(4px)" />
      <ModalContent borderRadius={{ base: "2xl", sm: "2xl" }} mx={{ base: 2, sm: 4 }} overflow="hidden" border="1px solid" borderColor="gray.200">
        <ModalHeader bg="#0f2e22" color="white" py={3.5} px={4}>
          <Flex align="center" justify="space-between">
            <HStack spacing={2.5}>
              <Flex w="32px" h="32px" borderRadius="xl" bg={isVolumeDiscount ? "orange.500" : "emerald.500"} align="center" justify="center" color="white">
                {isVolumeDiscount ? <Flame className="w-4 h-4 text-white" /> : <Sparkles className="w-4 h-4" />}
              </Flex>
              <Box>
                <Text fontSize="sm" fontWeight="900" lineHeight="1.2">
                  Ajuste de Precio Final ({isVolumeDiscount ? "Volumen hasta 56%" : "Estándar 50%"})
                </Text>
                <Text fontSize="10px" color="emerald.300" fontWeight="600" noOfLines={1}>
                  {item.code || item.productCode || item.itemCode} {item.name || item.description}
                </Text>
              </Box>
            </HStack>
            <ModalCloseButton color="white" position="static" />
          </Flex>
        </ModalHeader>

        <ModalBody p={4} bg="slate.50">
          <VStack align="stretch" spacing={3.5}>
            {/* Tarjeta de Información de Precios y Descuentos */}
            <Box bg="white" p={3} borderRadius="xl" border="1px solid" borderColor="gray.200" boxShadow="xs">
              <Grid templateColumns={promoDisc > 0 ? "repeat(5, 1fr)" : "repeat(4, 1fr)"} gap={1} textAlign="center" fontSize="xs">
                <Box>
                  <Text fontSize="9px" fontWeight="700" color="gray.500" textTransform="uppercase">P. Lista</Text>
                  <Text fontWeight="800" color="gray.800">${basePrice.toFixed(2)}</Text>
                </Box>
                <Box borderLeft="1px solid" borderColor="gray.200">
                  <Text fontSize="9px" fontWeight="700" color="gray.500" textTransform="uppercase">Desc. SAP</Text>
                  <Badge colorScheme="green" fontSize="10px" px={1.5}>{sapDisc}%</Badge>
                </Box>
                {promoDisc > 0 && (
                  <Box borderLeft="1px solid" borderColor="gray.200">
                    <Text fontSize="9px" fontWeight="700" color="gray.500" textTransform="uppercase">Promo Mes</Text>
                    <Badge colorScheme="yellow" bg="amber.100" color="amber.900" fontSize="10px" px={1.5}>
                      +{promoDisc}%
                    </Badge>
                  </Box>
                )}
                <Box borderLeft="1px solid" borderColor="gray.200">
                  <Text fontSize="9px" fontWeight="700" color="gray.500" textTransform="uppercase">Desc. Adic.</Text>
                  <Badge colorScheme={currentDisc > 0 ? "purple" : "gray"} fontSize="10px" px={1.5}>
                    +{currentDisc}%
                  </Badge>
                </Box>
                <Box borderLeft="1px solid" borderColor="gray.200">
                  <Text fontSize="9px" fontWeight="700" color="gray.500" textTransform="uppercase">Desc. Total</Text>
                  <Badge colorScheme={isVolumeDiscount ? "orange" : "blue"} fontSize="10px" px={1.5} fontWeight="900">
                    {effectiveTotalDiscPct}%
                  </Badge>
                </Box>
              </Grid>
            </Box>

            {/* Accesos Rápidos Estratégicos */}
            <Box>
              <Flex justify="space-between" align="center" mb={1.5}>
                <Text fontSize="10px" fontWeight="800" color="gray.600" textTransform="uppercase" letterSpacing="wide">
                  ⚡ Ajuste Rápido de Precio:
                </Text>
                <HStack spacing={1.5}>
                  <Text fontSize="10px" fontWeight="700" color={isVolumeMode ? "orange.700" : "gray.500"}>
                    📦 Modo Mayoreo (&gt;50% a 56%)
                  </Text>
                  <Switch
                    size="sm"
                    colorScheme="orange"
                    isChecked={isVolumeMode || qty >= 50}
                    onChange={(e) => setIsVolumeMode(e.target.checked)}
                  />
                </HStack>
              </Flex>

              <Grid templateColumns={{ base: "repeat(2, 1fr)", sm: isVolumeMode || qty >= 50 ? "repeat(4, 1fr)" : "repeat(3, 1fr)" }} gap={1.5}>
                <Button
                  size="xs"
                  h="32px"
                  variant={currentDisc === 0 ? "solid" : "outline"}
                  colorScheme={currentDisc === 0 ? "green" : "gray"}
                  bg={currentDisc === 0 ? "#126C36" : "white"}
                  color={currentDisc === 0 ? "white" : "gray.700"}
                  onClick={() => handleQuickSelect(0)}
                  borderRadius="lg"
                  fontWeight="800"
                >
                  0% Base
                </Button>
                <Button
                  size="xs"
                  h="32px"
                  variant={Math.abs(currentDisc - 5) < 0.2 ? "solid" : "outline"}
                  colorScheme={Math.abs(currentDisc - 5) < 0.2 ? "purple" : "gray"}
                  bg={Math.abs(currentDisc - 5) < 0.2 ? "purple.600" : "white"}
                  color={Math.abs(currentDisc - 5) < 0.2 ? "white" : "gray.700"}
                  onClick={() => handleQuickSelect(5)}
                  borderRadius="lg"
                  fontWeight="800"
                >
                  +5% Adic.
                </Button>
                <Button
                  size="xs"
                  h="32px"
                  variant={Math.abs(currentDisc - standardAddDisc) < 0.1 ? "solid" : "outline"}
                  colorScheme="blue"
                  bg={Math.abs(currentDisc - standardAddDisc) < 0.1 ? "blue.600" : "white"}
                  color={Math.abs(currentDisc - standardAddDisc) < 0.1 ? "white" : "blue.800"}
                  borderColor="blue.300"
                  onClick={() => handleQuickSelect(standardAddDisc)}
                  borderRadius="lg"
                  fontWeight="900"
                  title={`Aplica el precio para alcanzar el 50% estándar ($${priceAtStandard50.toFixed(2)})`}
                >
                  🎯 Tope 50% (${priceAtStandard50.toFixed(2)})
                </Button>

                {(isVolumeMode || qty >= 50) && (
                  <Button
                    size="xs"
                    h="32px"
                    variant={Math.abs(currentDisc - maxAllowedAddDisc) < 0.1 ? "solid" : "outline"}
                    colorScheme="orange"
                    bg={Math.abs(currentDisc - maxAllowedAddDisc) < 0.1 ? "orange.600" : "white"}
                    color={Math.abs(currentDisc - maxAllowedAddDisc) < 0.1 ? "white" : "orange.800"}
                    borderColor="orange.400"
                    onClick={() => handleQuickSelect(maxAllowedAddDisc, true)}
                    borderRadius="lg"
                    fontWeight="900"
                    title={`Aplica el precio mínimo para alcanzar el tope máximo de mayoreo del 56% ($${priceAtVolume56.toFixed(2)})`}
                  >
                    🔥 Mayoreo 56% (${priceAtVolume56.toFixed(2)})
                  </Button>
                )}
              </Grid>
            </Box>

            {/* Input Único de Monto: Precio Final Unitario Deseado */}
            <Box bg="white" p={3.5} borderRadius="xl" border="1px solid" borderColor="gray.200" boxShadow="xs">
              <VStack align="stretch" spacing={2}>
                <Flex justify="space-between" align="center" fontSize="11px" fontWeight="700" color="gray.600">
                  <Text textTransform="uppercase" letterSpacing="wide">💵 Precio Final Deseado ($ USD):</Text>
                  <Text color="gray.500">
                    Tope 50%: <strong style={{ color: "#2563eb" }}>${priceAtStandard50.toFixed(2)}</strong> | Mín 56%: <strong style={{ color: "#c2410c" }}>${priceAtVolume56.toFixed(2)}</strong>
                  </Text>
                </Flex>

                <HStack spacing={2}>
                  <Flex
                    align="center"
                    justify="center"
                    px={3}
                    h="46px"
                    bg="gray.100"
                    borderRadius="xl"
                    border="1px solid"
                    borderColor="gray.300"
                    fontSize="lg"
                    fontWeight="900"
                    color="gray.700"
                  >
                    $
                  </Flex>
                  <Input
                    size="lg"
                    h="46px"
                    type="text"
                    inputMode="decimal"
                    value={priceInputStr}
                    onChange={handlePriceInputChange}
                    onBlur={handlePriceBlur}
                    onFocus={(e) => e.target.select()}
                    textAlign="center"
                    fontWeight="900"
                    fontSize="2xl"
                    borderRadius="xl"
                    bg={isExceedingVolumeCeiling ? "red.50" : isVolumeDiscount ? "orange.50" : "emerald.50"}
                    borderColor={isExceedingVolumeCeiling ? "red.400" : isVolumeDiscount ? "orange.400" : "emerald.400"}
                    focusBorderColor={isVolumeDiscount ? "orange.600" : "emerald.600"}
                    placeholder={priceAtVolume56.toFixed(2)}
                  />
                  <Flex
                    align="center"
                    justify="center"
                    px={3}
                    h="46px"
                    bg="gray.100"
                    borderRadius="xl"
                    border="1px solid"
                    borderColor="gray.300"
                    fontSize="xs"
                    fontWeight="800"
                    color="gray.600"
                  >
                    USD
                  </Flex>
                </HStack>

                {/* Resumen dinámico del cálculo automático */}
                <Flex justify="space-between" align="center" px={1} pt={0.5} fontSize="11px">
                  <Text color="gray.500" fontWeight="600">
                    Precio base: <strong>${priceWithBase.toFixed(2)}</strong>
                  </Text>
                  <Badge
                    colorScheme={isVolumeDiscount ? "orange" : currentDisc > 0 ? "purple" : "gray"}
                    fontSize="11px"
                    px={2}
                    py={0.5}
                    borderRadius="md"
                    fontWeight="800"
                  >
                    Desc. Adic. Requerido: +{currentDisc}%
                  </Badge>
                </Flex>
              </VStack>
            </Box>

            {/* Simulación en Tiempo Real */}
            <Box bg="#0f2e22" color="white" p={3} borderRadius="xl" boxShadow="sm">
              <VStack align="stretch" spacing={1.5} fontSize="xs">
                <Flex justify="space-between" align="center">
                  <Text color="emerald.200" fontWeight="600">Precio final por unidad:</Text>
                  <Text fontFamily="mono" fontWeight="900" fontSize="sm" color="#6ee7b7">
                    ${finalUnitPrice.toFixed(2)} USD
                  </Text>
                </Flex>
                <Flex justify="space-between" align="center">
                  <Text color="emerald.200" fontWeight="600">Total Fila ({qty} uds):</Text>
                  <Text fontFamily="mono" fontWeight="900" fontSize="sm" color="#facc15">
                    ${finalLineTotal.toFixed(2)} USD
                  </Text>
                </Flex>
                <Flex justify="space-between" align="center" pt={1} borderTop="1px dashed" borderColor="whiteAlpha.300">
                  <Text color="emerald.200" fontSize="10px">Descuento Total Acumulado:</Text>
                  <Text fontFamily="mono" fontWeight="900" fontSize="11px" color={isExceedingVolumeCeiling ? "#fca5a5" : isVolumeDiscount ? "#fdba74" : "#a7f3d0"}>
                    {effectiveTotalDiscPct}% (Tope Estándar: {STANDARD_DISCOUNT_CEILING}% • Tope Volumen: {MAX_DISCOUNT_CEILING}%)
                  </Text>
                </Flex>
              </VStack>
            </Box>

            {/* Semáforo de Validación y Aprobación Comercial */}
            {isExceedingVolumeCeiling ? (
              <Alert status="error" borderRadius="xl" py={2.5} px={3} bg="red.50" border="1.5px solid" borderColor="red.400">
                <AlertIcon as={ShieldAlert} color="red.600" />
                <Box fontSize="11px">
                  <Text fontWeight="900" color="red.900">
                    ⛔ BLOQUEADO: Supera el Tope Máximo Absoluto del {MAX_DISCOUNT_CEILING}%
                  </Text>
                  <Text color="red.800" fontWeight="600">
                    El precio (${Number(priceInputStr || 0).toFixed(2)}) genera un descuento total de {effectiveTotalDiscPct}%. El precio mínimo absoluto permitido es ${priceAtVolume56.toFixed(2)}.
                  </Text>
                </Box>
              </Alert>
            ) : isVolumeDiscount ? (
              <Alert status="warning" borderRadius="xl" py={2.5} px={3} bg="#fff7ed" border="1.5px solid" borderColor="#fdba74">
                <AlertIcon as={Flame} color="#ea580c" />
                <Box fontSize="11px">
                  <Text fontWeight="900" color="#9a3412">
                    🔥 ALERTA: Descuento Especial por Volumen ({effectiveTotalDiscPct}%)
                  </Text>
                  <Text color="#c2410c" fontWeight="700">
                    Este descuento supera el tope estándar del {STANDARD_DISCOUNT_CEILING}% hasta un {effectiveTotalDiscPct}% (Tope Máx: {MAX_DISCOUNT_CEILING}%). Se notificará como Mayoreo y requerirá aprobación administrativa explícita de Enrique.
                  </Text>
                </Box>
              </Alert>
            ) : requiresApproval ? (
              <Alert status="warning" borderRadius="xl" py={2.5} px={3} bg="orange.50" border="1.5px solid" borderColor="orange.300">
                <AlertIcon as={AlertTriangle} color="orange.600" />
                <Box fontSize="11px">
                  <Text fontWeight="900" color="orange.900">
                    ⚠️ Requiere Aprobación Comercial Ordinaria
                  </Text>
                  <Text color="orange.800" fontWeight="600">
                    El precio otorgado requiere un descuento adicional (+{currentDisc}%) que pasará a revisión y aprobación por Facturación (Enrique).
                  </Text>
                </Box>
              </Alert>
            ) : (
              <Alert status="success" borderRadius="xl" py={2.5} px={3} bg="emerald.50" border="1.5px solid" borderColor="emerald.300">
                <AlertIcon as={Check} color="emerald.700" />
                <Box fontSize="11px">
                  <Text fontWeight="900" color="emerald.900">
                    🟢 Descuento Estándar ({baseFixedDisc}%)
                  </Text>
                  <Text color="emerald.800" fontWeight="600">
                    Precio estándar con descuento base (${priceWithBase.toFixed(2)} USD).
                  </Text>
                </Box>
              </Alert>
            )}
          </VStack>
        </ModalBody>

        <Flex justify="flex-end" gap={2} p={4} bg="white" borderTop="1px solid" borderColor="gray.200">
          <Button variant="ghost" size="sm" onClick={onClose} fontWeight="700">
            Cancelar
          </Button>
          <Button
            size="sm"
            bg={isVolumeDiscount ? "#ea580c" : "#126C36"}
            color="white"
            _hover={{ bg: isVolumeDiscount ? "#c2410c" : "#0e572b" }}
            onClick={handleConfirm}
            isDisabled={isExceedingVolumeCeiling}
            fontWeight="900"
            px={5}
            borderRadius="lg"
            boxShadow="sm"
            leftIcon={isVolumeDiscount ? <Flame className="w-4 h-4 text-white" /> : undefined}
          >
            {isVolumeDiscount ? `Aplicar Mayoreo (${effectiveTotalDiscPct}%)` : `Confirmar Precio ($${finalUnitPrice.toFixed(2)})`}
          </Button>
        </Flex>
      </ModalContent>
    </Modal>
  );
}

export default DiscountPopoverModal;
