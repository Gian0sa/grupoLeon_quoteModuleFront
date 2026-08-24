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
  Tabs,
  TabList,
  TabPanels,
  Tab,
  TabPanel,
  Alert,
  AlertIcon
} from "@chakra-ui/react";
import { Sparkles, CheckCircle2, ShieldAlert, AlertTriangle, Check } from "lucide-react";

export const MAX_DISCOUNT_CEILING = 55.0; // Tope máximo comercial permitido (%)

export function DiscountPopoverModal({ isOpen, onClose, item, onApplyDiscount }) {
  const [currentDisc, setCurrentDisc] = useState(0);
  const [discInputStr, setDiscInputStr] = useState("0");
  const [discountType, setDiscountType] = useState("percent"); // "percent" | "amount"
  const [amountValue, setAmountValue] = useState(0);
  const [amountInputStr, setAmountInputStr] = useState("0.00");

  const basePrice = Number(item?.price || item?.unitPrice || 0);
  const sapDisc = Number(item?.discount || 0);
  const priceAfterSap = basePrice * (1 - sapDisc / 100);
  const qty = Number(item?.quantity || 1);

  // Calcular el descuento adicional máximo permitido para no exceder el 55% total
  const maxAllowedAddDisc = sapDisc >= MAX_DISCOUNT_CEILING
    ? 0
    : Number((((MAX_DISCOUNT_CEILING - sapDisc) / (100 - sapDisc)) * 100).toFixed(2));

  const maxAllowedDollarDiscount = Number((priceAfterSap * (maxAllowedAddDisc / 100)).toFixed(2));

  useEffect(() => {
    if (item && isOpen) {
      const initialDisc = Math.min(maxAllowedAddDisc, Math.max(0, Number(item.lineDiscount || 0)));
      setCurrentDisc(initialDisc);
      setDiscInputStr(String(initialDisc));
      const dollarsPerUnit = priceAfterSap * (initialDisc / 100);
      const roundedDollars = Number(dollarsPerUnit.toFixed(2));
      setAmountValue(roundedDollars);
      setAmountInputStr(dollarsPerUnit.toFixed(2));
    }
  }, [item, isOpen, priceAfterSap, maxAllowedAddDisc]);

  if (!item) return null;

  // Cálculos de totales y porcentajes en tiempo real
  const finalUnitPrice = priceAfterSap * (1 - currentDisc / 100);
  const finalLineTotal = finalUnitPrice * qty;
  const grossLineTotal = basePrice * qty;
  const totalDiscountAmount = Math.max(0, grossLineTotal - finalLineTotal);
  const effectiveTotalDiscPct = grossLineTotal > 0
    ? Number(((totalDiscountAmount / grossLineTotal) * 100).toFixed(2))
    : sapDisc;

  const isExceedingCeiling = effectiveTotalDiscPct > MAX_DISCOUNT_CEILING + 0.01;
  const requiresApproval = currentDisc > 0;

  const handlePercentInputChange = (e) => {
    let valStr = e.target.value.replace(/,/g, ".");
    // Permitir solo dígitos y un punto decimal
    if (!/^[0-9]*\.?[0-9]*$/.test(valStr)) return;

    setDiscInputStr(valStr);

    if (valStr === "" || valStr === ".") {
      setCurrentDisc(0);
      setAmountValue(0);
      setAmountInputStr("0.00");
      return;
    }

    let valNum = parseFloat(valStr);
    if (isNaN(valNum)) valNum = 0;

    if (valNum > maxAllowedAddDisc) {
      valNum = maxAllowedAddDisc;
      valStr = String(maxAllowedAddDisc);
      setDiscInputStr(valStr);
    }

    setCurrentDisc(valNum);
    const dollars = priceAfterSap * (valNum / 100);
    setAmountValue(Number(dollars.toFixed(2)));
    setAmountInputStr(dollars.toFixed(2));
  };

  const handlePercentBlur = () => {
    if (discInputStr === "" || discInputStr === ".") {
      setDiscInputStr("0");
      setCurrentDisc(0);
      setAmountValue(0);
      setAmountInputStr("0.00");
      return;
    }
    let valNum = parseFloat(discInputStr);
    if (isNaN(valNum) || valNum < 0) valNum = 0;
    if (valNum > maxAllowedAddDisc) valNum = maxAllowedAddDisc;
    setCurrentDisc(valNum);
    setDiscInputStr(String(valNum));
  };

  const handleAmountInputChange = (e) => {
    let valStr = e.target.value.replace(/,/g, ".");
    if (!/^[0-9]*\.?[0-9]*$/.test(valStr)) return;

    setAmountInputStr(valStr);

    if (valStr === "" || valStr === ".") {
      setAmountValue(0);
      setCurrentDisc(0);
      setDiscInputStr("0");
      return;
    }

    let valNum = parseFloat(valStr);
    if (isNaN(valNum)) valNum = 0;

    if (valNum > maxAllowedDollarDiscount) {
      valNum = maxAllowedDollarDiscount;
      valStr = String(maxAllowedDollarDiscount);
      setAmountInputStr(valStr);
    }

    setAmountValue(valNum);
    if (priceAfterSap > 0) {
      const pct = Number(Math.min(maxAllowedAddDisc, (valNum / priceAfterSap) * 100).toFixed(2));
      setCurrentDisc(pct);
      setDiscInputStr(String(pct));
    }
  };

  const handleAmountBlur = () => {
    if (amountInputStr === "" || amountInputStr === ".") {
      setAmountInputStr("0.00");
      setAmountValue(0);
      setCurrentDisc(0);
      setDiscInputStr("0");
      return;
    }
    let valNum = parseFloat(amountInputStr);
    if (isNaN(valNum) || valNum < 0) valNum = 0;
    if (valNum > maxAllowedDollarDiscount) valNum = maxAllowedDollarDiscount;
    setAmountValue(valNum);
    setAmountInputStr(valNum.toFixed(2));
  };

  const handleQuickSelect = (pctVal) => {
    const valid = Math.max(0, Math.min(maxAllowedAddDisc, Number(pctVal || 0)));
    setCurrentDisc(valid);
    setDiscInputStr(String(valid));
    const dollars = priceAfterSap * (valid / 100);
    setAmountValue(Number(dollars.toFixed(2)));
    setAmountInputStr(dollars.toFixed(2));
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
              <Flex w="32px" h="32px" borderRadius="xl" bg="emerald.500" align="center" justify="center" color="white">
                <Sparkles className="w-4 h-4" />
              </Flex>
              <Box minW={0}>
                <Text fontSize="sm" fontWeight="900" isTruncated maxW="240px">
                  Descuento Adicional (Tope 55%)
                </Text>
                <Text fontSize="10px" color="emerald.200" fontWeight="500" isTruncated maxW="240px">
                  {item.name || item.productName || "Artículo"}
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
              <Grid templateColumns="repeat(4, 1fr)" gap={1.5} textAlign="center" fontSize="xs">
                <Box>
                  <Text fontSize="9px" fontWeight="700" color="gray.500" textTransform="uppercase">P. Lista</Text>
                  <Text fontWeight="800" color="gray.800">${basePrice.toFixed(2)}</Text>
                </Box>
                <Box borderLeft="1px solid" borderColor="gray.200">
                  <Text fontSize="9px" fontWeight="700" color="gray.500" textTransform="uppercase">Desc. SAP</Text>
                  <Badge colorScheme="green" fontSize="10px" px={1.5}>{sapDisc}%</Badge>
                </Box>
                <Box borderLeft="1px solid" borderColor="gray.200">
                  <Text fontSize="9px" fontWeight="700" color="gray.500" textTransform="uppercase">Desc. Adic.</Text>
                  <Badge colorScheme={currentDisc > 0 ? "purple" : "gray"} fontSize="10px" px={1.5}>
                    +{currentDisc}%
                  </Badge>
                </Box>
                <Box borderLeft="1px solid" borderColor="gray.200">
                  <Text fontSize="9px" fontWeight="700" color="gray.500" textTransform="uppercase">Desc. Total</Text>
                  <Badge colorScheme={isExceedingCeiling ? "red" : "blue"} fontSize="10px" px={1.5} fontWeight="900">
                    {effectiveTotalDiscPct}%
                  </Badge>
                </Box>
              </Grid>
            </Box>

            {/* Accesos Rápidos Estratégicos */}
            <Box>
              <Text fontSize="10px" fontWeight="800" color="gray.600" mb={1.5} textTransform="uppercase" letterSpacing="wide">
                ⚡ Ajuste Rápido de Descuento:
              </Text>
              <Grid templateColumns="repeat(3, 1fr)" gap={2}>
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
                  0% (Solo SAP)
                </Button>
                <Button
                  size="xs"
                  h="32px"
                  variant={currentDisc === 5 ? "solid" : "outline"}
                  colorScheme={currentDisc === 5 ? "purple" : "gray"}
                  bg={currentDisc === 5 ? "purple.600" : "white"}
                  color={currentDisc === 5 ? "white" : "gray.700"}
                  onClick={() => handleQuickSelect(5)}
                  borderRadius="lg"
                  fontWeight="800"
                >
                  +5% Adicional
                </Button>
                <Button
                  size="xs"
                  h="32px"
                  variant={Math.abs(currentDisc - maxAllowedAddDisc) < 0.1 ? "solid" : "outline"}
                  colorScheme="orange"
                  bg={Math.abs(currentDisc - maxAllowedAddDisc) < 0.1 ? "orange.600" : "white"}
                  color={Math.abs(currentDisc - maxAllowedAddDisc) < 0.1 ? "white" : "orange.800"}
                  borderColor="orange.300"
                  onClick={() => handleQuickSelect(maxAllowedAddDisc)}
                  borderRadius="lg"
                  fontWeight="900"
                  title={`Aplica el máximo adicional para alcanzar el 55% total (+${maxAllowedAddDisc}%)`}
                >
                  🎯 Tope 55%
                </Button>
              </Grid>
            </Box>

            {/* Modo Personalizado: Porcentaje vs Monto Fijo */}
            <Box bg="white" p={3} borderRadius="xl" border="1px solid" borderColor="gray.200" boxShadow="xs">
              <Tabs
                variant="soft-rounded"
                colorScheme="green"
                size="sm"
                index={discountType === "percent" ? 0 : 1}
                onChange={(idx) => setDiscountType(idx === 0 ? "percent" : "amount")}
              >
                <TabList mb={2.5} bg="gray.100" p={1} borderRadius="xl">
                  <Tab w="50%" borderRadius="lg" fontWeight="800" fontSize="11px">
                    % Porcentaje Adicional
                  </Tab>
                  <Tab w="50%" borderRadius="lg" fontWeight="800" fontSize="11px">
                    $ Monto ($ USD)
                  </Tab>
                </TabList>

                <TabPanels>
                  <TabPanel p={0}>
                    <VStack align="stretch" spacing={1.5}>
                      <Flex justify="space-between" fontSize="11px" fontWeight="700" color="gray.600">
                        <Text>Ingresa % adicional:</Text>
                        <Text color="gray.500">Tope máx.: <strong>+{maxAllowedAddDisc}%</strong></Text>
                      </Flex>
                      <HStack spacing={2}>
                        <Input
                          size="md"
                          type="text"
                          inputMode="decimal"
                          value={discInputStr}
                          onChange={handlePercentInputChange}
                          onBlur={handlePercentBlur}
                          onFocus={(e) => e.target.select()}
                          textAlign="center"
                          fontWeight="900"
                          fontSize="lg"
                          borderRadius="xl"
                          bg={isExceedingCeiling ? "red.50" : "blue.50"}
                          borderColor={isExceedingCeiling ? "red.400" : "blue.300"}
                          placeholder="0.00"
                        />
                        <Text fontSize="lg" fontWeight="900" color="gray.700">%</Text>
                      </HStack>
                    </VStack>
                  </TabPanel>

                  <TabPanel p={0}>
                    <VStack align="stretch" spacing={1.5}>
                      <Flex justify="space-between" fontSize="11px" fontWeight="700" color="gray.600">
                        <Text>Ingresa descuento en $ USD:</Text>
                        <Text color="gray.500">Tope máx.: <strong>${maxAllowedDollarDiscount}</strong></Text>
                      </Flex>
                      <HStack spacing={2}>
                        <Text fontSize="lg" fontWeight="900" color="gray.700">$</Text>
                        <Input
                          size="md"
                          type="text"
                          inputMode="decimal"
                          value={amountInputStr}
                          onChange={handleAmountInputChange}
                          onBlur={handleAmountBlur}
                          onFocus={(e) => e.target.select()}
                          textAlign="center"
                          fontWeight="900"
                          fontSize="lg"
                          borderRadius="xl"
                          bg={isExceedingCeiling ? "red.50" : "emerald.50"}
                          borderColor={isExceedingCeiling ? "red.400" : "emerald.300"}
                          placeholder="0.00"
                        />
                        <Text fontSize="xs" fontWeight="700" color="gray.500">USD</Text>
                      </HStack>
                    </VStack>
                  </TabPanel>
                </TabPanels>
              </Tabs>
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
                  <Text fontFamily="mono" fontWeight="900" fontSize="11px" color={isExceedingCeiling ? "#fca5a5" : "#a7f3d0"}>
                    {effectiveTotalDiscPct}% (Tope: {MAX_DISCOUNT_CEILING}%)
                  </Text>
                </Flex>
              </VStack>
            </Box>

            {/* Semáforo de Validación y Aprobación Comercial (Regla del 55%) */}
            {isExceedingCeiling ? (
              <Alert status="error" borderRadius="xl" py={2.5} px={3} bg="red.50" border="1.5px solid" borderColor="red.400">
                <AlertIcon as={ShieldAlert} color="red.600" />
                <Box fontSize="11px">
                  <Text fontWeight="900" color="red.900">
                    ⛔ BLOQUEADO: Supera el Tope del {MAX_DISCOUNT_CEILING}%
                  </Text>
                  <Text color="red.800" fontWeight="600">
                    El descuento total ({effectiveTotalDiscPct}%) supera el límite comercial del {MAX_DISCOUNT_CEILING}%. Reduce el descuento adicional a máximo +{maxAllowedAddDisc}%.
                  </Text>
                </Box>
              </Alert>
            ) : requiresApproval ? (
              <Alert status="warning" borderRadius="xl" py={2.5} px={3} bg="orange.50" border="1.5px solid" borderColor="orange.300">
                <AlertIcon as={AlertTriangle} color="orange.600" />
                <Box fontSize="11px">
                  <Text fontWeight="900" color="orange.900">
                    ⚠️ Requiere Aprobación Comercial
                  </Text>
                  <Text color="orange.800" fontWeight="600">
                    Todo descuento adicional (+{currentDisc}%) pasará a revisión y aprobación por Facturación (Enrique).
                  </Text>
                </Box>
              </Alert>
            ) : (
              <Alert status="success" borderRadius="xl" py={2.5} px={3} bg="emerald.50" border="1.5px solid" borderColor="emerald.300">
                <AlertIcon as={Check} color="emerald.700" />
                <Box fontSize="11px">
                  <Text fontWeight="900" color="emerald.900">
                    🟢 Descuento Estándar SAP ({sapDisc}%)
                  </Text>
                  <Text color="emerald.800" fontWeight="600">
                    No requiere aprobación comercial adicional.
                  </Text>
                </Box>
              </Alert>
            )}
          </VStack>
        </ModalBody>

        <Box bg="white" py={3} px={4} borderTop="1px solid" borderColor="gray.200">
          <HStack spacing={2.5} w="full">
            <Button variant="outline" w="45%" onClick={onClose} borderRadius="xl" fontWeight="800">
              Cancelar
            </Button>
            <Button
              colorScheme={isExceedingCeiling ? "red" : "green"}
              bg={isExceedingCeiling ? "gray.400" : "#126C36"}
              _hover={{ bg: isExceedingCeiling ? "gray.400" : "#0e572b" }}
              isDisabled={isExceedingCeiling}
              w="55%"
              onClick={handleConfirm}
              borderRadius="xl"
              fontWeight="900"
              leftIcon={<CheckCircle2 className="w-4 h-4" />}
            >
              {isExceedingCeiling ? "Bloqueado (>55%)" : `Aplicar (+${currentDisc}%)`}
            </Button>
          </HStack>
        </Box>
      </ModalContent>
    </Modal>
  );
}
