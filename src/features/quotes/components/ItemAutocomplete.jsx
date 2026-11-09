import React, { useMemo, useState, useRef, useEffect } from "react";
import {
  Box,
  Text,
  HStack,
  Badge,
  Flex,
  Input,
  InputGroup,
  InputLeftElement,
  InputRightElement,
  IconButton,
  Spinner,
} from "@chakra-ui/react";
import { Search, X } from "lucide-react";
import { useProductsPriceList } from "../../products/hooks/queries/productQueries";
import { useGetPromotions } from "../hooks/queries/quotesQueries";
import { useDebounce } from "../../../shared/hooks/useDebounce";

const MIN_CHARS = 2;
const DEBOUNCE_MS = 250;

/** Normaliza una cadena removiendo tildes, minúsculas y caracteres especiales para comparación insensible a símbolos */
function normalizeString(str) {
  if (!str) return "";
  return String(str)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]/g, "");
}

/**
 * Autocompletado nativo y ultra-ligero para artículos en SAP.
 * Optimizado para móvil y desktop:
 * - Sin chevrons ni menús confusos de selectores estándar.
 * - Input táctil amplio (48px en móvil, 16px de fuente anti-zoom iOS).
 * - Búsqueda instantánea al presionar Enter o pegar.
 * - Despliegue flotante táctil con indicadores claros de stock y ofertas.
 */
export default function ItemAutocomplete({ onSelect, isDisabled = false, placeholder }) {
  const [inputValue, setInputValue] = useState("");
  const [immediateTerm, setImmediateTerm] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(0);

  const containerRef = useRef(null);
  const inputRef = useRef(null);

  const debouncedTerm = useDebounce(inputValue, DEBOUNCE_MS);
  const { promotionsMap } = useGetPromotions();

  const term = (immediateTerm || debouncedTerm).trim();
  const shouldSearch = term.length >= MIN_CHARS;

  const { data, isFetching } = useProductsPriceList({
    itemCode: term,
    itemName: term,
    stock: "N",
    enabled: shouldSearch,
  });

  // Cerrar dropdown al hacer clic o tap fuera del contenedor
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("touchstart", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("touchstart", handleClickOutside);
    };
  }, []);

  const handleInputChange = (e) => {
    const val = e.target.value.toUpperCase();
    setImmediateTerm("");
    setInputValue(val);
    setHighlightedIndex(0);
    if (val.trim().length >= MIN_CHARS) {
      setIsOpen(true);
    } else {
      setIsOpen(false);
    }
  };

  const handleClear = () => {
    setInputValue("");
    setImmediateTerm("");
    setIsOpen(false);
    setHighlightedIndex(0);
    if (inputRef.current) {
      inputRef.current.focus();
    }
  };

  const handlePaste = (e) => {
    const pastedText = e.clipboardData?.getData("text");
    if (pastedText) {
      e.preventDefault();
      const clean = pastedText.replace(/[\r\n\t]+/g, " ").trim().toUpperCase();
      setInputValue(clean);
      setImmediateTerm(clean);
      setHighlightedIndex(0);
      setIsOpen(true);
    }
  };

  const sortedRecords = useMemo(() => {
    const records = data?.records || [];
    if (!records.length) return [];

    const searchRawLower = term.toLowerCase();
    const searchClean = normalizeString(term);
    const searchTermsClean = searchRawLower.split(/[\s\-._/]+/).map(normalizeString).filter(Boolean);

    return [...records].sort((a, b) => {
      const codeClean = normalizeString(a.ITEM_CODE);
      const nameClean = normalizeString(a.ITEM_NAME);

      const aCodeExact = codeClean === searchClean;
      const bCodeExact = b.ITEM_CODE && normalizeString(b.ITEM_CODE) === searchClean;
      if (aCodeExact && !bCodeExact) return -1;
      if (!aCodeExact && bCodeExact) return 1;

      const aCodeStarts = codeClean.startsWith(searchClean);
      const bCodeStarts = b.ITEM_CODE && normalizeString(b.ITEM_CODE).startsWith(searchClean);
      if (aCodeStarts && !bCodeStarts) return -1;
      if (!aCodeStarts && bCodeStarts) return 1;

      const aNameStarts = nameClean.startsWith(searchClean);
      const bNameStarts = b.ITEM_NAME && normalizeString(b.ITEM_NAME).startsWith(searchClean);
      if (aNameStarts && !bNameStarts) return -1;
      if (!aNameStarts && bNameStarts) return 1;

      const aMatchesAll = searchTermsClean.every(t => codeClean.includes(t) || nameClean.includes(t));
      const bMatchesAll = b.ITEM_CODE && searchTermsClean.every(t => normalizeString(b.ITEM_CODE).includes(t) || normalizeString(b.ITEM_NAME || "").includes(t));
      if (aMatchesAll && !bMatchesAll) return -1;
      if (!aMatchesAll && bMatchesAll) return 1;

      return 0;
    });
  }, [data, term]);

  const handleSelectItem = (r) => {
    if (!r) return;
    const rawStock = r.STOCK_DISPONIBLE ?? r.Stock ?? r.OnHand;
    const hasValidStock = rawStock !== undefined && rawStock !== null && !isNaN(Number(rawStock));
    const stockVal = hasValidStock ? Number(rawStock) : null;
    const isAgotado = hasValidStock && stockVal === 0;

    const promo = promotionsMap ? (promotionsMap[r.ITEM_CODE] || promotionsMap[r.itemCode]) : null;
    const promoDiscount = promo ? Number(promo.discountPct || 0) : 0;
    const promoPrice = promo ? Number(promo.promoPrice || promo.promoPriceNeto || 0) : null;
    const promoPriceConIGV = promo ? Number(promo.promoPriceConIGV || promo.U_US_PROMO || 0) : null;
    const campaignName = promo?.campaignName || (promoDiscount > 0 || promoPriceConIGV > 0 ? "Oferta del Mes" : undefined);

    onSelect?.({
      id: r.ITEM_CODE,
      name: r.ITEM_NAME,
      sigla: r.SIGLA ?? r.Sigla ?? r.U_TQC_SIGLA ?? r.sigla,
      U_TQC_SIGLA: r.U_TQC_SIGLA ?? r.SIGLA ?? r.Sigla ?? r.sigla,
      price: Number(r.PRECIO_LISTA ?? r.PRECIO_VENTA ?? r.Price ?? 0) || 0,
      importe: Number(r.PRECIO_DESCUENTO ?? r.PRECIO_VENTA ?? r.PRECIO_LISTA ?? r.Price ?? 0) || 0,
      discount: Number(r.DESCUENTO_PCT ?? r.Discount ?? 0) || 0,
      promoDiscount,
      promoPrice,
      promoPriceConIGV,
      promoPriceNeto: promoPrice,
      totalDiscountPct: promo ? Number(promo.totalDiscountPct || 0) : 0,
      U_US_PROMO: promoPriceConIGV || promoPrice,
      campaignName,
      stock: stockVal,
      stockChecked: hasValidStock,
      isAgotado,
      marca: r.MARCA,
      whsCode: r.WHS_CODE || "014",
      quantity: "",
      lineDiscount: 0,
      raw: r,
    });

    setInputValue("");
    setImmediateTerm("");
    setIsOpen(false);
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter") {
      if (isOpen && sortedRecords.length > 0 && highlightedIndex >= 0) {
        e.preventDefault();
        handleSelectItem(sortedRecords[highlightedIndex]);
        return;
      }
      if (inputValue.trim().length >= MIN_CHARS) {
        setImmediateTerm(inputValue.trim());
        setIsOpen(true);
      }
    } else if (e.key === "ArrowDown") {
      if (isOpen && sortedRecords.length > 0) {
        e.preventDefault();
        setHighlightedIndex((prev) => Math.min(prev + 1, sortedRecords.length - 1));
      }
    } else if (e.key === "ArrowUp") {
      if (isOpen && sortedRecords.length > 0) {
        e.preventDefault();
        setHighlightedIndex((prev) => Math.max(prev - 1, 0));
      }
    } else if (e.key === "Escape") {
      setIsOpen(false);
    }
  };

  return (
    <Box ref={containerRef} position="relative" w="full">
      <InputGroup size="md">
        <InputLeftElement pointerEvents="none" h="full" pl={3}>
          <Search size={18} color="#166534" />
        </InputLeftElement>

        <Input
          ref={inputRef}
          value={inputValue}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onPaste={handlePaste}
          onFocus={() => {
            if (shouldSearch) setIsOpen(true);
          }}
          placeholder={placeholder || "Escribe código o nombre del artículo..."}
          isDisabled={isDisabled}
          h={{ base: "48px", md: "42px" }}
          pl="42px"
          pr={inputValue ? "42px" : "12px"}
          fontSize={{ base: "16px", md: "sm" }}
          fontWeight="600"
          bg="white"
          border="1.5px solid"
          borderColor="gray.300"
          borderRadius="xl"
          _hover={{ borderColor: "#166534" }}
          _focus={{
            borderColor: "#166534",
            boxShadow: "0 0 0 1.5px #166534",
          }}
          textTransform="uppercase"
        />

        <InputRightElement h="full" pr={2}>
          {isFetching ? (
            <Spinner size="sm" color="emerald.600" speed="0.6s" thickness="2px" />
          ) : inputValue ? (
            <IconButton
              icon={<X size={16} />}
              size="sm"
              variant="ghost"
              color="gray.400"
              _hover={{ color: "red.500", bg: "gray.100" }}
              borderRadius="full"
              onClick={handleClear}
              aria-label="Limpiar búsqueda"
            />
          ) : null}
        </InputRightElement>
      </InputGroup>

      {/* DROPDOWN FLOTANTE ERGONÓMICO CON RESULTADOS */}
      {isOpen && shouldSearch && (
        <Box
          position="absolute"
          top="calc(100% + 4px)"
          left={0}
          right={0}
          zIndex={1500}
          bg="white"
          borderRadius="xl"
          border="1.5px solid"
          borderColor="#166534"
          boxShadow="0 14px 35px -5px rgba(0,0,0,0.25)"
          maxH={{ base: "280px", md: "340px" }}
          overflowY="auto"
          sx={{
            WebkitOverflowScrolling: "touch",
          }}
        >
          {isFetching && sortedRecords.length === 0 ? (
            <Flex align="center" justify="center" p={4} gap={2.5} color="emerald.800" fontSize="xs" fontWeight="700">
              <Spinner size="xs" color="emerald.600" speed="0.6s" />
              <Text>Buscando artículos en SAP...</Text>
            </Flex>
          ) : sortedRecords.length === 0 ? (
            <Box p={4} textAlign="center" color="gray.500" fontSize="xs" fontWeight="700">
              No se encontraron artículos para "{term}".
            </Box>
          ) : (
            sortedRecords.map((r, index) => {
              const rawStock = r.STOCK_DISPONIBLE ?? r.Stock ?? r.OnHand;
              const hasValidStock = rawStock !== undefined && rawStock !== null && !isNaN(Number(rawStock));
              const stockVal = hasValidStock ? Number(rawStock) : null;
              const isAgotado = hasValidStock && stockVal === 0;

              const promo = promotionsMap ? (promotionsMap[r.ITEM_CODE] || promotionsMap[r.itemCode]) : null;
              const isHighlighted = index === highlightedIndex;

              return (
                <Box
                  key={r.ITEM_CODE || index}
                  p={{ base: 3, md: 2.5 }}
                  borderBottom="1px solid #f1f5f9"
                  cursor="pointer"
                  bg={isHighlighted ? "#f0fdf4" : "white"}
                  _hover={{ bg: "#f0fdf4" }}
                  _active={{ bg: "#dcfce7" }}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    handleSelectItem(r);
                  }}
                  onTouchEnd={(e) => {
                    e.preventDefault();
                    handleSelectItem(r);
                  }}
                >
                  <Flex justify="space-between" align="flex-start" gap={2} mb={1}>
                    <Text fontSize={{ base: "13px", md: "xs" }} fontWeight="800" color="gray.900" noOfLines={2}>
                      {r.ITEM_NAME}
                    </Text>
                    {promo && (
                      <Badge
                        bg="amber.400"
                        color="amber.950"
                        fontSize="0.65rem"
                        px={1.5}
                        py={0.2}
                        borderRadius="md"
                        fontWeight="900"
                        flexShrink={0}
                      >
                        🏷️ OFERTA: -{promo.discountPct}%
                      </Badge>
                    )}
                  </Flex>

                  <HStack spacing={2} wrap="wrap">
                    <Text fontSize="11px" fontWeight="800" color="#166534" fontFamily="mono">
                      {r.ITEM_CODE}
                    </Text>
                    {r.MARCA && (
                      <Text fontSize="11px" color="gray.500" fontWeight="600">
                        • {r.MARCA}
                      </Text>
                    )}
                    {r.SIGLA && (
                      <Badge bg="gray.100" color="gray.700" fontSize="9px" px={1.5} borderRadius="sm" fontWeight="700">
                        {r.SIGLA}
                      </Badge>
                    )}
                    <Badge
                      colorScheme={stockVal > 0 ? "green" : isAgotado ? "red" : "gray"}
                      fontSize="10px"
                      px={2}
                      py={0.2}
                      borderRadius="md"
                      fontWeight="800"
                    >
                      {stockVal !== null ? `Stock: ${stockVal} und` : "Consultando stock"}
                    </Badge>
                  </HStack>
                </Box>
              );
            })
          )}
        </Box>
      )}
    </Box>
  );
}
