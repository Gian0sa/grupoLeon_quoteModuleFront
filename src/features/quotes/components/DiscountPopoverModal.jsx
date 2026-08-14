import React, { useState, useEffect } from "react";
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
  Text,
  Button,
  Grid,
  NumberInput,
  NumberInputField,
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
import { Sparkles, CheckCircle2 } from "lucide-react";

export function DiscountPopoverModal({ isOpen, onClose, item, onApplyDiscount }) {
  const [currentDisc, setCurrentDisc] = useState(0);
  const [discountType, setDiscountType] = useState("percent"); // "percent" | "amount"
  const [amountValue, setAmountValue] = useState(0);

  const basePrice = Number(item?.price || 0);
  const sapDisc = Number(item?.discount || 0);
  const priceAfterSap = basePrice * (1 - sapDisc / 100);
  const qty = Number(item?.quantity || 1);

  useEffect(() => {
    if (item && isOpen) {
      const initialDisc = Number(item.lineDiscount || 0);
      setCurrentDisc(initialDisc);
      const dollarsPerUnit = priceAfterSap * (initialDisc / 100);
      setAmountValue(Number(dollarsPerUnit.toFixed(2)));
    }
  }, [item, isOpen, priceAfterSap]);

  if (!item) return null;

  const handlePercentChange = (valNum) => {
    const valid = Math.max(0, Math.min(100, isNaN(valNum) ? 0 : valNum));
    setCurrentDisc(valid);
    const dollars = priceAfterSap * (valid / 100);
    setAmountValue(Number(dollars.toFixed(2)));
  };

  const handleAmountChange = (valNum) => {
    const validAmt = Math.max(0, isNaN(valNum) ? 0 : valNum);
    setAmountValue(validAmt);
    if (priceAfterSap > 0) {
      const pct = (validAmt / priceAfterSap) * 100;
      setCurrentDisc(Number(Math.min(100, pct).toFixed(2)));
    }
  };

  const handleConfirm = () => {
    if (onApplyDiscount) {
      onApplyDiscount(item.id, currentDisc);
    }
    onClose();
  };

  const finalUnitPrice = priceAfterSap * (1 - currentDisc / 100);
  const finalLineTotal = finalUnitPrice * qty;

  const quickChips = [
    { label: "0%", value: 0 },
    { label: "3%", value: 3 },
    { label: "5%", value: 5 },
    { label: "7.5%", value: 7.5 },
    { label: "10% ⭐️", value: 10 },
    { label: "12%", value: 12 },
    { label: "15% ⚠️", value: 15 },
    { label: "20% 🔒", value: 20 }
  ];

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
                  Descuento Adicional
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
          <VStack align="stretch" spacing={4}>
            {/* Tarjeta de Información de Precio Base */}
            <Box bg="white" p={3} borderRadius="xl" border="1px solid" borderColor="gray.200" boxShadow="xs">
              <Grid templateColumns="repeat(3, 1fr)" gap={2} textAlign="center" fontSize="xs">
                <Box>
                  <Text fontSize="9px" fontWeight="700" color="gray.500" textTransform="uppercase">P. Unitario</Text>
                  <Text fontWeight="800" color="gray.800">${basePrice.toFixed(2)}</Text>
                </Box>
                <Box borderLeft="1px solid" borderRight="1px solid" borderColor="gray.200">
                  <Text fontSize="9px" fontWeight="700" color="gray.500" textTransform="uppercase">Desc. SAP</Text>
                  <Badge colorScheme="green" fontSize="10px" px={1.5}>{sapDisc}%</Badge>
                </Box>
                <Box>
                  <Text fontSize="9px" fontWeight="700" color="gray.500" textTransform="uppercase">P. c/Desc SAP</Text>
                  <Text fontWeight="800" color="emerald.800">${priceAfterSap.toFixed(2)}</Text>
                </Box>
              </Grid>
            </Box>

            {/* Chips de Selección Rápida */}
            <Box>
              <Text fontSize="11px" fontWeight="800" color="gray.700" mb={2} textTransform="uppercase" letterSpacing="wide">
                ⚡ Selección Rápida (% Porcentaje):
              </Text>
              <Grid templateColumns="repeat(4, 1fr)" gap={2}>
                {quickChips.map((chip) => {
                  const isSelected = Math.abs(currentDisc - chip.value) < 0.1;
                  return (
                    <Button
                      key={chip.value}
                      size="sm"
                      h="38px"
                      variant={isSelected ? "solid" : "outline"}
                      colorScheme={isSelected ? "green" : "gray"}
                      bg={isSelected ? "#126C36" : "white"}
                      color={isSelected ? "white" : "gray.800"}
                      borderColor={isSelected ? "#126C36" : "gray.200"}
                      _hover={{ bg: isSelected ? "#0e572b" : "emerald.50" }}
                      onClick={() => handlePercentChange(chip.value)}
                      borderRadius="xl"
                      fontWeight="800"
                      fontSize="xs"
                    >
                      {chip.label}
                    </Button>
                  );
                })}
              </Grid>
            </Box>

            {/* Modo Personalizado: Porcentaje vs Monto Fijo */}
            <Box bg="white" p={3.5} borderRadius="xl" border="1px solid" borderColor="gray.200" boxShadow="xs">
              <Tabs
                variant="soft-rounded"
                colorScheme="green"
                size="sm"
                index={discountType === "percent" ? 0 : 1}
                onChange={(idx) => setDiscountType(idx === 0 ? "percent" : "amount")}
              >
                <TabList mb={3} bg="gray.100" p={1} borderRadius="xl">
                  <Tab w="50%" borderRadius="lg" fontWeight="800" fontSize="11px">
                    % Porcentaje
                  </Tab>
                  <Tab w="50%" borderRadius="lg" fontWeight="800" fontSize="11px">
                    $ Monto ($ USD)
                  </Tab>
                </TabList>

                <TabPanels>
                  <TabPanel p={0}>
                    <VStack align="stretch" spacing={2}>
                      <Text fontSize="11px" fontWeight="700" color="gray.600">
                        Ingresa el porcentaje de descuento adicional:
                      </Text>
                      <HStack spacing={2}>
                        <NumberInput
                          size="md"
                          min={0}
                          max={100}
                          step={0.5}
                          precision={2}
                          value={currentDisc}
                          onChange={(valStr, valNum) => handlePercentChange(valNum)}
                          w="full"
                        >
                          <NumberInputField
                            textAlign="center"
                            fontWeight="900"
                            fontSize="lg"
                            borderRadius="xl"
                            bg="blue.50"
                            borderColor="blue.300"
                          />
                        </NumberInput>
                        <Text fontSize="lg" fontWeight="900" color="gray.700">%</Text>
                      </HStack>
                    </VStack>
                  </TabPanel>

                  <TabPanel p={0}>
                    <VStack align="stretch" spacing={2}>
                      <Text fontSize="11px" fontWeight="700" color="gray.600">
                        Ingresa el descuento en dólares por unidad:
                      </Text>
                      <HStack spacing={2}>
                        <Text fontSize="lg" fontWeight="900" color="gray.700">$</Text>
                        <NumberInput
                          size="md"
                          min={0}
                          max={priceAfterSap}
                          step={0.5}
                          precision={2}
                          value={amountValue}
                          onChange={(valStr, valNum) => handleAmountChange(valNum)}
                          w="full"
                        >
                          <NumberInputField
                            textAlign="center"
                            fontWeight="900"
                            fontSize="lg"
                            borderRadius="xl"
                            bg="emerald.50"
                            borderColor="emerald.300"
                          />
                        </NumberInput>
                        <Text fontSize="xs" fontWeight="700" color="gray.500">USD</Text>
                      </HStack>
                    </VStack>
                  </TabPanel>
                </TabPanels>
              </Tabs>
            </Box>

            {/* Simulación en Tiempo Real & Semáforo Comercial */}
            <Box bg="#0f2e22" color="white" p={3.5} borderRadius="xl" boxShadow="sm">
              <VStack align="stretch" spacing={2} fontSize="xs">
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
              </VStack>
            </Box>

            {/* Semáforo de Aprobación Comercial */}
            {currentDisc > 10 ? (
              <Alert status="error" borderRadius="xl" py={2.5} px={3} bg="red.50" border="1px solid" borderColor="red.200">
                <AlertIcon />
                <Box fontSize="11px">
                  <Text fontWeight="900" color="red.900">
                    ⚠️ Requiere Aprobación Comercial
                  </Text>
                  <Text color="red.800" fontWeight="500">
                    El descuento adicional es superior al 10%. Pasará a evaluación por Facturación (Enrique).
                  </Text>
                </Box>
              </Alert>
            ) : currentDisc > 5 ? (
              <Alert status="warning" borderRadius="xl" py={2.5} px={3} bg="orange.50" border="1px solid" borderColor="orange.200">
                <AlertIcon />
                <Box fontSize="11px">
                  <Text fontWeight="900" color="orange.900">
                    🟡 Descuento Especial de Vendedor
                  </Text>
                  <Text color="orange.800" fontWeight="500">
                    Descuento entre 5.1% y 10%. Permitido con registro comercial.
                  </Text>
                </Box>
              </Alert>
            ) : (
              <Alert status="success" borderRadius="xl" py={2.5} px={3} bg="emerald.50" border="1px solid" borderColor="emerald.200">
                <AlertIcon />
                <Box fontSize="11px">
                  <Text fontWeight="900" color="emerald.900">
                    🟢 Descuento Estándar Aprobado
                  </Text>
                  <Text color="emerald.800" fontWeight="500">
                    Aprobación automática directa.
                  </Text>
                </Box>
              </Alert>
            )}
          </VStack>
        </ModalBody>

        <Box bg="white" py={3} px={4} borderTop="1px solid" borderColor="gray.200">
          <HStack spacing={2.5} w="full">
            <Button variant="outline" w="50%" onClick={onClose} borderRadius="xl" fontWeight="800">
              Cancelar
            </Button>
            <Button
              colorScheme="green"
              bg="#126C36"
              _hover={{ bg: "#0e572b" }}
              w="50%"
              onClick={handleConfirm}
              borderRadius="xl"
              fontWeight="900"
              leftIcon={<CheckCircle2 className="w-4 h-4" />}
            >
              Aplicar ({currentDisc}%)
            </Button>
          </HStack>
        </Box>
      </ModalContent>
    </Modal>
  );
}
