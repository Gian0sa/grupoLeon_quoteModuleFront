import React, { useState, useMemo } from "react";
import {
  Box, Badge, Text, HStack, VStack, Flex,
  NumberInput, NumberInputField,
  Popover, PopoverTrigger, PopoverContent, PopoverBody, PopoverArrow,
  Button,
  useDisclosure,
} from "@chakra-ui/react";
import { Package } from "lucide-react";
import { parsePackagingUnit, boxesToUnits, unitsToBoxes, getPackagingLabel } from "../utils/packagingUtils";

/**
 * PackagingHelper — Facilitador visual de unidad de empaque.
 * 
 * Muestra un badge compacto (📦 CJ×6) junto al input de cantidad.
 * Al hacer clic, abre un Popover con un mini-calculador de cajas → unidades.
 * 
 * INVARIANTE: El campo `quantity` siempre almacena UNIDADES individuales.
 * Este componente solo es un helper visual; nunca modifica la estructura de datos.
 * 
 * @param {string} itemName - Nombre del artículo para detectar empaque
 * @param {string} [sigla] - Sigla del producto (respaldo)
 * @param {number} currentQuantity - Cantidad actual en UNIDADES
 * @param {function} onQuantityChange - Callback para actualizar la cantidad (en unidades)
 * @param {boolean} [isReadOnly=false] - Deshabilitar interacción
 */
export default function PackagingHelper({
  itemName,
  sigla,
  raw,
  currentQuantity = 1,
  onQuantityChange,
  isReadOnly = false,
}) {
  const factor = useMemo(() => parsePackagingUnit(itemName, sigla, raw), [itemName, sigla, raw]);
  const label = useMemo(() => getPackagingLabel(factor), [factor]);
  const { isOpen, onOpen, onClose } = useDisclosure();

  // Si el factor es 1 (unidad suelta), solo mostrar un badge informativo sin Popover
  if (factor <= 1) {
    return (
      <Badge
        colorScheme="gray"
        fontSize="0.6rem"
        fontWeight="700"
        px={1.5}
        py={0.5}
        borderRadius="md"
        variant="subtle"
      >
        {label}
      </Badge>
    );
  }

  return (
    <Popover
      isOpen={isOpen}
      onOpen={isReadOnly ? undefined : onOpen}
      onClose={onClose}
      placement="bottom"
      isLazy
      closeOnBlur={true}
    >
      <PopoverTrigger>
        <Badge
          bg="#ecfdf5"
          color="#065f46"
          border="1.5px solid"
          borderColor="#6ee7b7"
          fontSize="0.6rem"
          fontWeight="900"
          px={1.5}
          py={0.5}
          borderRadius="md"
          cursor={isReadOnly ? "default" : "pointer"}
          _hover={isReadOnly ? undefined : { bg: "#d1fae5", borderColor: "#34d399", transform: "scale(1.05)" }}
          transition="all 0.15s ease"
          title={`Empaque: ${factor} unidades por caja — Clic para calcular`}
        >
          📦 {label}
        </Badge>
      </PopoverTrigger>
      <PopoverContent
        w="240px"
        borderRadius="xl"
        border="1.5px solid"
        borderColor="emerald.200"
        boxShadow="lg"
        _focus={{ outline: "none" }}
      >
        <PopoverArrow bg="white" />
        <PopoverBody p={3}>
          <PackagingCalculator
            factor={factor}
            currentQuantity={currentQuantity}
            onApply={(totalUnits) => {
              onQuantityChange(totalUnits);
              onClose();
            }}
          />
        </PopoverBody>
      </PopoverContent>
    </Popover>
  );
}

/**
 * Mini-calculador interno: Ingresa N° de cajas → muestra total en unidades.
 */
function PackagingCalculator({ factor, currentQuantity, onApply }) {
  const initial = unitsToBoxes(currentQuantity, factor);
  const [boxCount, setBoxCount] = useState(initial.boxes || 1);

  const totalUnits = boxesToUnits(boxCount, factor);

  return (
    <VStack spacing={2.5} align="stretch">
      {/* Encabezado */}
      <Flex align="center" gap={1.5}>
        <Package className="w-4 h-4 text-emerald-700" />
        <Text fontSize="xs" fontWeight="900" color="emerald.900">
          Calculador de Empaque
        </Text>
      </Flex>

      {/* Etiqueta de presentación */}
      <Box bg="emerald.50" px={2.5} py={1.5} borderRadius="lg" border="1px solid" borderColor="emerald.100">
        <Text fontSize="0.65rem" color="emerald.800" fontWeight="800" textAlign="center">
          Presentación: <strong>📦 Caja × {factor} und</strong>
        </Text>
      </Box>

      {/* Input de cajas */}
      <Box>
        <Text fontSize="0.6rem" color="gray.600" fontWeight="800" mb={1} textTransform="uppercase">
          N° de Cajas
        </Text>
        <NumberInput
          size="sm"
          min={1}
          max={999}
          value={boxCount}
          onChange={(valStr) => {
            const parsed = parseInt(valStr, 10);
            if (!isNaN(parsed) && parsed >= 0) {
              setBoxCount(parsed);
            }
          }}
        >
          <NumberInputField
            textAlign="center"
            fontWeight="900"
            fontSize="md"
            bg="white"
            borderRadius="lg"
            border="1.5px solid"
            borderColor="emerald.300"
            _focus={{ borderColor: "emerald.500", boxShadow: "0 0 0 1px #10b981" }}
          />
        </NumberInput>
      </Box>

      {/* Resultado en tiempo real */}
      <Box bg="blue.50" px={2.5} py={2} borderRadius="lg" border="1px solid" borderColor="blue.200">
        <HStack justify="center" spacing={1}>
          <Text fontSize="xs" color="blue.700" fontWeight="700">
            {boxCount} {boxCount === 1 ? "Caja" : "Cajas"} × {factor} =
          </Text>
          <Text fontSize="md" color="blue.900" fontWeight="900">
            {totalUnits}
          </Text>
          <Text fontSize="xs" color="blue.700" fontWeight="700">
            Und
          </Text>
        </HStack>
      </Box>

      {/* Botón Aplicar */}
      <Button
        size="sm"
        w="full"
        bg="linear-gradient(135deg, #065f46 0%, #047857 50%, #059669 100%)"
        color="white"
        fontWeight="900"
        fontSize="xs"
        borderRadius="lg"
        boxShadow="0 2px 8px rgba(5, 150, 105, 0.3)"
        _hover={{ bg: "#047857", transform: "translateY(-1px)" }}
        _active={{ transform: "scale(0.98)" }}
        onClick={() => onApply(totalUnits)}
        isDisabled={totalUnits < 1}
      >
        ✓ Aplicar {totalUnits} Unidades
      </Button>
    </VStack>
  );
}
