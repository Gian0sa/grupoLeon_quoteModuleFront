import React, { useMemo } from "react";
import { Badge, HStack, Flex, useDisclosure } from "@chakra-ui/react";
import { parsePackagingUnit, getPackagingLabel, extractMaxDiscount } from "../utils/packagingUtils";
import { PackagingModal } from "./PackagingModal";

/**
 * PackagingHelper — Trigger compacto para abrir el PackagingModal.
 * 
 * Evita problemas de posicionamiento/scroll de popovers en tablas.
 * Al hacer clic abre el PackagingModal de forma limpia e independiente.
 * 
 * @param {string} itemName - Nombre del artículo para detectar empaque
 * @param {string} [sigla] - Sigla del producto (respaldo)
 * @param {object} [raw] - Objeto con datos crudos de SAP
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
  const detectedFactor = useMemo(() => parsePackagingUnit(itemName, sigla, raw), [itemName, sigla, raw]);
  const maxDiscount = useMemo(() => extractMaxDiscount(raw), [raw]);
  const { isOpen, onOpen, onClose } = useDisclosure();

  const isHasEmpaque = detectedFactor > 1;
  const label = useMemo(() => getPackagingLabel(detectedFactor), [detectedFactor]);

  // Si el producto no tiene unidad de empaque (es UND) y tampoco tiene descuento máximo, no mostrar nada
  if (!isHasEmpaque && !maxDiscount) {
    return null;
  }

  return (
    <>
      <HStack spacing={1} display="inline-flex" mt={0.5}>
        {isHasEmpaque && (
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
            _hover={
              isReadOnly
                ? undefined
                : {
                    bg: "#d1fae5",
                    borderColor: "#34d399",
                    transform: "scale(1.05)"
                  }
            }
            transition="all 0.15s ease"
            onClick={isReadOnly ? undefined : onOpen}
            title={`Presentación: ${label} — Clic para abrir facilitador de empaque`}
          >
            <Flex align="center" gap={1}>
              <span>📦 {label} 🔍</span>
            </Flex>
          </Badge>
        )}

        {maxDiscount && (
          <Badge
            colorScheme="purple"
            fontSize="0.55rem"
            fontWeight="900"
            px={1}
            py={0.2}
            borderRadius="sm"
            title={`Descuento Máximo permitido SAP: ${maxDiscount}%`}
          >
            Max {maxDiscount}%
          </Badge>
        )}
      </HStack>

      {isOpen && (
        <PackagingModal
          isOpen={isOpen}
          onClose={onClose}
          item={{ name: itemName, sigla, raw, ...(typeof raw === "object" ? raw : {}) }}
          currentQuantity={currentQuantity}
          onApplyQuantity={onQuantityChange}
        />
      )}
    </>
  );
}
