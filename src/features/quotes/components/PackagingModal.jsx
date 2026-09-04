import React, { useState, useEffect, useMemo } from "react";
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
  NumberInput,
  NumberInputField,
  Badge,
  VStack,
  HStack,
  Alert,
  AlertIcon
} from "@chakra-ui/react";
import { Package, Percent, CheckCircle2, ShoppingBag } from "lucide-react";
import {
  parsePackagingUnit,
  boxesToUnits,
  unitsToBoxes,
  getPackagingLabel,
  extractMaxDiscount
} from "../utils/packagingUtils";

/**
 * PackagingModal — Facilitador Modal de Empaque (Cajas a Unidades para SAP)
 * 
 * Abre un Modal limpio idéntico al estilo de DiscountPopoverModal.
 * Permite seleccionar la presentación (CJ-6, CJ-12, CJ-24, etc.) e ingresar N° de Cajas.
 * Calcula automáticamente las UNIDADES totales para SAP.
 */
export function PackagingModal({
  isOpen,
  onClose,
  item,
  currentQuantity = 1,
  onApplyQuantity
}) {
  const itemName = item?.name || item?.itemName || item?.productName || item?.description || "Artículo";
  const sigla = item?.sigla;
  const raw = item?.raw || item;

  const detectedFactor = useMemo(() => parsePackagingUnit(itemName, sigla, raw), [itemName, sigla, raw]);
  const maxDiscount = useMemo(() => extractMaxDiscount(raw), [raw]);

  const [activeFactor, setActiveFactor] = useState(6);
  const [boxCountStr, setBoxCountStr] = useState("");

  useEffect(() => {
    if (isOpen && item) {
      const factor = detectedFactor > 1 ? detectedFactor : 6;
      setActiveFactor(factor);
      const initialBoxes = unitsToBoxes(currentQuantity, factor);
      setBoxCountStr(initialBoxes.boxes > 0 ? String(initialBoxes.boxes) : "");
    }
  }, [isOpen, item, detectedFactor, currentQuantity]);

  if (!item) return null;

  const numBoxes = boxCountStr === "" ? 0 : Math.max(0, parseInt(boxCountStr, 10) || 0);
  const totalUnits = boxesToUnits(numBoxes, activeFactor);
  const PRESET_PACKS = [6, 12, 24, 50];

  const handleConfirm = () => {
    if (onApplyQuantity && totalUnits > 0) {
      onApplyQuantity(totalUnits);
    }
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      isCentered
      size={{ base: "full", sm: "md" }}
      motionPreset="slideInBottom"
    >
      <ModalOverlay bg="blackAlpha.600" backdropFilter="blur(4px)" />
      <ModalContent
        borderRadius={{ base: "2xl", sm: "2xl" }}
        mx={{ base: 2, sm: 4 }}
        overflow="hidden"
        border="1.5px solid"
        borderColor="emerald.300"
      >
        {/* Encabezado */}
        <ModalHeader bg="#065f46" color="white" py={3.5} px={4}>
          <Flex align="center" justify="space-between">
            <HStack spacing={2.5}>
              <Flex w="32px" h="32px" borderRadius="xl" bg="emerald.500" align="center" justify="center" color="white">
                <Package className="w-5 h-5" />
              </Flex>
              <Box minW={0}>
                <Text fontSize="sm" fontWeight="900" isTruncated maxW="240px">
                  Facilitador de Empaque
                </Text>
                <Text fontSize="10px" color="emerald.100" fontWeight="500" isTruncated maxW="240px">
                  {itemName}
                </Text>
              </Box>
            </HStack>
            <ModalCloseButton color="white" position="static" />
          </Flex>
        </ModalHeader>

        {/* Cuerpo */}
        <ModalBody p={4} bg="slate.50">
          <VStack align="stretch" spacing={3.5}>
            {/* Tarjeta de Información SAP */}
            <Box bg="white" p={3} borderRadius="xl" border="1px solid" borderColor="emerald.200" boxShadow="xs">
              <Grid templateColumns="repeat(3, 1fr)" gap={1.5} textAlign="center" fontSize="xs">
                <Box>
                  <Text fontSize="9px" fontWeight="700" color="gray.500" textTransform="uppercase">Presentación</Text>
                  <Badge colorScheme={detectedFactor > 1 ? "green" : "gray"} fontSize="10px" px={1.5} py={0.5} borderRadius="md">
                    {getPackagingLabel(detectedFactor)}
                  </Badge>
                </Box>
                <Box borderLeft="1px solid" borderColor="gray.200">
                  <Text fontSize="9px" fontWeight="700" color="gray.500" textTransform="uppercase">Empaque Base</Text>
                  <Text fontWeight="800" color="emerald.800">
                    {detectedFactor > 1 ? `${detectedFactor} und/caja` : "1 und (Suelto)"}
                  </Text>
                </Box>
                <Box borderLeft="1px solid" borderColor="gray.200">
                  <Text fontSize="9px" fontWeight="700" color="gray.500" textTransform="uppercase">Max Desc. SAP</Text>
                  <Badge colorScheme={maxDiscount ? "purple" : "gray"} fontSize="10px" px={1.5} py={0.5}>
                    {maxDiscount ? `${maxDiscount}%` : "Estándar"}
                  </Badge>
                </Box>
              </Grid>
            </Box>

            {/* Accesos Rápidos de Presentación */}
            <Box bg="white" p={3} borderRadius="xl" border="1px solid" borderColor="gray.200" boxShadow="xs">
              <Text fontSize="10px" fontWeight="800" color="gray.600" mb={2} textTransform="uppercase" letterSpacing="wide">
                📦 Selecciona Presentación (Caja / Pack):
              </Text>
              <Grid templateColumns="repeat(4, 1fr)" gap={2}>
                {PRESET_PACKS.map((factorVal) => {
                  const isSelected = activeFactor === factorVal;
                  return (
                    <Button
                      key={factorVal}
                      size="sm"
                      h="36px"
                      variant={isSelected ? "solid" : "outline"}
                      colorScheme="emerald"
                      bg={isSelected ? "#059669" : "white"}
                      color={isSelected ? "white" : "#065f46"}
                      borderColor={isSelected ? "#059669" : "#a7f3d0"}
                      onClick={() => setActiveFactor(factorVal)}
                      borderRadius="xl"
                      fontWeight="900"
                      fontSize="xs"
                      _hover={{ bg: isSelected ? "#047857" : "#ecfdf5" }}
                    >
                      CJ×{factorVal}
                    </Button>
                  );
                })}
              </Grid>
            </Box>

            {/* Ingreso de Cajas */}
            <Box bg="white" p={3.5} borderRadius="xl" border="1.5px solid" borderColor="emerald.300" boxShadow="xs">
              <Flex justify="space-between" align="center" mb={1.5}>
                <Text fontSize="xs" fontWeight="800" color="gray.700" textTransform="uppercase">
                  N° de Cajas / Empaques a solicitar:
                </Text>
                <Badge bg="emerald.100" color="emerald.800" fontWeight="800" px={2} py={0.5} borderRadius="md">
                  Factor actual: ×{activeFactor}
                </Badge>
              </Flex>
              <NumberInput
                size="lg"
                min={0}
                max={9999}
                value={boxCountStr}
                onChange={(valStr) => {
                  const cleaned = valStr.replace(/\D/g, "");
                  setBoxCountStr(cleaned);
                }}
              >
                <NumberInputField
                  textAlign="center"
                  fontWeight="900"
                  fontSize="xl"
                  bg="emerald.50"
                  borderRadius="xl"
                  borderColor="emerald.400"
                  color="emerald.900"
                  placeholder="Ingresa N° de Cajas..."
                  _focus={{ borderColor: "emerald.600", boxShadow: "0 0 0 2px #059669" }}
                  onFocus={(e) => e.target.select()}
                />
              </NumberInput>
            </Box>

            {/* Simulación y Cálculo en Tiempo Real */}
            <Box bg="#0f2e22" color="white" p={3.5} borderRadius="xl" boxShadow="sm">
              <VStack align="stretch" spacing={2} fontSize="xs">
                <Flex justify="space-between" align="center">
                  <Text color="emerald.200" fontWeight="600">Fórmula de Empaque:</Text>
                  <Text fontFamily="mono" fontWeight="800" color="white">
                    {numBoxes > 0 ? `${numBoxes} ${numBoxes === 1 ? "Caja" : "Cajas"} × ${activeFactor} und` : `0 Cajas × ${activeFactor} und`}
                  </Text>
                </Flex>
                <Flex justify="space-between" align="center" pt={1.5} borderTop="1px dashed" borderColor="whiteAlpha.300">
                  <Text color="emerald.200" fontWeight="700" fontSize="sm">
                    Total equivalente para SAP:
                  </Text>
                  <HStack spacing={1}>
                    <Text fontFamily="mono" fontWeight="900" fontSize="lg" color="#facc15">
                      {totalUnits}
                    </Text>
                    <Text color="#6ee7b7" fontWeight="800" fontSize="xs">
                      UNIDADES
                    </Text>
                  </HStack>
                </Flex>
              </VStack>
            </Box>

            {/* Alerta Informativa */}
            <Alert status="info" borderRadius="xl" py={2} px={3} bg="blue.50" border="1px solid" borderColor="blue.200">
              <AlertIcon as={ShoppingBag} color="blue.600" />
              <Box fontSize="11px">
                <Text fontWeight="800" color="blue.900">
                  Formato compatible con SAP B1
                </Text>
                <Text color="blue.800" fontWeight="500">
                  SAP facturará exactamente <strong>{totalUnits} unidades</strong> individuales.
                </Text>
              </Box>
            </Alert>
          </VStack>
        </ModalBody>

        {/* Pie de Modal */}
        <Box bg="white" py={3} px={4} borderTop="1px solid" borderColor="gray.200">
          <HStack spacing={2.5} w="full">
            <Button variant="outline" w="40%" onClick={onClose} borderRadius="xl" fontWeight="800">
              Cancelar
            </Button>
            <Button
              colorScheme="emerald"
              bg="#059669"
              _hover={{ bg: "#047857" }}
              w="60%"
              onClick={handleConfirm}
              borderRadius="xl"
              fontWeight="900"
              leftIcon={<CheckCircle2 className="w-4 h-4" />}
            >
              Aplicar {totalUnits} Unidades
            </Button>
          </HStack>
        </Box>
      </ModalContent>
    </Modal>
  );
}

export default PackagingModal;
