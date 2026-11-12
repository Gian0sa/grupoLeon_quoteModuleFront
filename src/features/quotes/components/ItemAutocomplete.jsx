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
export default function ItemAutocomplete({ onSelect, isDisabled = false, placeholder, specialPricesMap = {} }) {
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
    if (!term || term.length < MIN_CHARS) return [];

    const searchRawLower = term.toLowerCase();
    const searchClean = normalizeString(term);
    const searchTermsClean = searchRawLower
      .split(/[\s\-._/]+/)
      .map(normalizeString)
      .filter(Boolean);

    // 1. Extraer artículos de Convenio / Precios Especiales en memoria local (0ms de latencia)
    const specialList = Object.values(specialPricesMap || {});
    const matchingSpecialRecords = [];

    specialList.forEach((sp) => {
      if (!sp) return;
      const spCode = String(sp.itemCode || "").trim();
      const spName = String(sp.itemName || "").trim();
      const spSigla = String(sp.sigla || "").trim();

      const spCodeClean = normalizeString(spCode);
      const spNameClean = normalizeString(spName);
      const spSiglaClean = normalizeString(spSigla);

      const isExactCode = spCodeClean === searchClean;
      const isExactSigla = spSiglaClean === searchClean;
      const isCodeStarts = spCodeClean.startsWith(searchClean);
      const isSiglaStarts = spSiglaClean.startsWith(searchClean);
      const isNameStarts = spNameClean.startsWith(searchClean);
      const isCodeIncludes = spCodeClean.includes(searchClean);
      const isSiglaIncludes = spSiglaClean.includes(searchClean);
      const isNameIncludes = spNameClean.includes(searchClean);
      const matchesAllTerms =
        searchTermsClean.length > 0 &&
        searchTermsClean.every(
          (t) => spCodeClean.includes(t) || spSiglaClean.includes(t) || spNameClean.includes(t)
        );

      if (
        isExactCode ||
        isExactSigla ||
        isCodeStarts ||
        isSiglaStarts ||
        isNameStarts ||
        isCodeIncludes ||
        isSiglaIncludes ||
        isNameIncludes ||
        matchesAllTerms
      ) {
        matchingSpecialRecords.push({
          ITEM_CODE: spCode,
          ITEM_NAME: spName,
          SIGLA: spSigla,
          U_TQC_SIGLA: spSigla,
          MARCA: sp.marca || "AC DELCO",
          STOCK_DISPONIBLE: sp.stock !== undefined && sp.stock !== null ? Number(sp.stock) : 0,
          PRECIO_LISTA: Number(sp.listPrice || 0),
          PRECIO_LISTA_CON_IGV: Number(sp.listPriceConIGV || (Number(sp.listPrice || 0) * 1.18).toFixed(2)),
          PRECIO_DESCUENTO: Number(sp.specialPrice || 0),
          PRECIO_DESCUENTO_CON_IGV: Number(sp.specialPriceConIGV || (Number(sp.specialPrice || 0) * 1.18).toFixed(2)),
          PRECIO_VENTA: Number(sp.listPrice || 0),
          PRECIO_CONTADO: Number(sp.specialPrice || 0),
          PRECIO_CREDITO: Number(sp.listPrice || 0),
          DESCUENTO_PCT: Number(sp.discountPercent || 0),
          isSpecialPrice: true,
          specialDiscount: Number(sp.discountPercent || 0),
          specialPrice: Number(sp.specialPrice || 0),
          specialPriceConIGV: Number(sp.specialPriceConIGV || 0),
          _isSpecialConvenio: true,
          _spData: sp,
        });
      }
    });

    // 2. Filtrar estrictamente registros traídos de la API (descartar artículos que no coinciden)
    const rawApiRecords = data?.records || [];
    const matchedApiRecords = [];

    rawApiRecords.forEach((r) => {
      if (!r) return;
      const codeClean = normalizeString(r.ITEM_CODE);
      const nameClean = normalizeString(r.ITEM_NAME);
      const siglaClean = normalizeString(r.SIGLA || r.U_TQC_SIGLA);

      const isExactCode = codeClean === searchClean;
      const isExactSigla = siglaClean === searchClean;
      const isCodeStarts = codeClean.startsWith(searchClean);
      const isSiglaStarts = siglaClean.startsWith(searchClean);
      const isNameStarts = nameClean.startsWith(searchClean);
      const isCodeIncludes = codeClean.includes(searchClean);
      const isSiglaIncludes = siglaClean.includes(searchClean);
      const isNameIncludes = nameClean.includes(searchClean);
      const matchesAllTerms =
        searchTermsClean.length > 0 &&
        searchTermsClean.every(
          (t) => codeClean.includes(t) || siglaClean.includes(t) || nameClean.includes(t)
        );

      if (
        isExactCode ||
        isExactSigla ||
        isCodeStarts ||
        isSiglaStarts ||
        isNameStarts ||
        isCodeIncludes ||
        isSiglaIncludes ||
        isNameIncludes ||
        matchesAllTerms
      ) {
        matchedApiRecords.push(r);
      }
    });

    // 3. Fusionar y des-duplicar por ITEM_CODE (los de Convenio tienen prioridad)
    const mergedMap = new Map();
    matchingSpecialRecords.forEach((item) => {
      mergedMap.set(item.ITEM_CODE, item);
    });

    matchedApiRecords.forEach((item) => {
      const code = item.ITEM_CODE;
      if (!mergedMap.has(code)) {
        mergedMap.set(code, item);
      } else {
        const existing = mergedMap.get(code);
        if (item.STOCK_DISPONIBLE !== undefined && item.STOCK_DISPONIBLE !== null) {
          existing.STOCK_DISPONIBLE = item.STOCK_DISPONIBLE;
        }
      }
    });

    const combinedList = Array.from(mergedMap.values());

    // 4. Ordenar con algoritmo de scoring de relevancia
    return combinedList.sort((a, b) => {
      const scoreItem = (it) => {
        let score = 0;
        const itCode = normalizeString(it.ITEM_CODE);
        const itSigla = normalizeString(it.SIGLA || it.U_TQC_SIGLA);
        const itName = normalizeString(it.ITEM_NAME);

        // Bonificación de máxima prioridad para Convenio del cliente
        if (it._isSpecialConvenio || it.isSpecialPrice || specialPricesMap[it.ITEM_CODE]) {
          score += 1000;
        }

        if (itCode === searchClean || itSigla === searchClean) score += 500;
        else if (itCode.startsWith(searchClean) || itSigla.startsWith(searchClean)) score += 300;
        else if (itName.startsWith(searchClean)) score += 200;
        else if (itCode.includes(searchClean) || itSigla.includes(searchClean)) score += 100;
        else if (itName.includes(searchClean)) score += 50;

        return score;
      };

      return scoreItem(b) - scoreItem(a);
    });
  }, [data, term, specialPricesMap]);

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

    const sp =
      r._spData ||
      (specialPricesMap
        ? specialPricesMap[r.ITEM_CODE] ||
          specialPricesMap[r.itemCode] ||
          specialPricesMap[String(r.ITEM_CODE || "").trim()]
        : null) ||
      (r.isSpecialPrice ? r : null);

    const isSpecialPrice = Boolean(sp || r.isSpecialPrice);
    const spDiscount = isSpecialPrice ? Number(sp?.discountPercent ?? r.specialDiscount ?? 0) : 0;
    const spPrice = isSpecialPrice ? Number(sp?.specialPrice ?? r.specialPrice ?? 0) : null;
    const spPriceConIGV = isSpecialPrice ? Number(sp?.specialPriceConIGV ?? r.specialPriceConIGV ?? 0) : null;

    const basePrice = isSpecialPrice && (sp?.listPrice ?? r.PRECIO_LISTA)
      ? Number(sp?.listPrice ?? r.PRECIO_LISTA)
      : (Number(r.PRECIO_LISTA ?? r.PRECIO_VENTA ?? r.Price ?? 0) || 0);

    const baseImporte = isSpecialPrice && spPrice
      ? spPrice
      : (Number(r.PRECIO_DESCUENTO ?? r.PRECIO_VENTA ?? r.PRECIO_LISTA ?? r.Price ?? 0) || 0);

    const baseDiscount = isSpecialPrice ? spDiscount : (Number(r.DESCUENTO_PCT ?? r.Discount ?? 0) || 0);
    const effectiveStockVal = stockVal ?? (isSpecialPrice && sp?.stock !== undefined && sp?.stock !== null ? Number(sp.stock) : null);
    const effectiveStockChecked = hasValidStock || (isSpecialPrice && sp?.stock !== undefined && sp?.stock !== null);
    const effectiveIsAgotado = isAgotado || (effectiveStockChecked && effectiveStockVal === 0);

    onSelect?.({
      id: r.ITEM_CODE,
      name: isSpecialPrice && (sp?.itemName || r.ITEM_NAME) ? (sp?.itemName || r.ITEM_NAME) : r.ITEM_NAME,
      sigla: r.SIGLA ?? r.Sigla ?? r.U_TQC_SIGLA ?? r.sigla ?? sp?.sigla,
      U_TQC_SIGLA: r.U_TQC_SIGLA ?? r.SIGLA ?? r.Sigla ?? r.sigla ?? sp?.sigla,
      price: basePrice,
      importe: baseImporte,
      discount: baseDiscount,
      promoDiscount: isSpecialPrice ? 0 : promoDiscount,
      promoPrice: isSpecialPrice ? null : promoPrice,
      promoPriceConIGV: isSpecialPrice ? null : promoPriceConIGV,
      promoPriceNeto: isSpecialPrice ? null : promoPrice,
      totalDiscountPct: isSpecialPrice ? spDiscount : (promo ? Number(promo.totalDiscountPct || 0) : 0),
      U_US_PROMO: isSpecialPrice ? null : (promoPriceConIGV || promoPrice),
      campaignName: isSpecialPrice ? "Convenio Cliente" : campaignName,
      isSpecialPrice,
      specialDiscount: spDiscount,
      specialPrice: spPrice,
      specialPriceNeto: spPrice,
      specialPriceConIGV: spPriceConIGV,
      stock: effectiveStockVal,
      stockChecked: effectiveStockChecked,
      isAgotado: effectiveIsAgotado,
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
              const sp =
                r._spData ||
                (specialPricesMap
                  ? specialPricesMap[r.ITEM_CODE] ||
                    specialPricesMap[r.itemCode] ||
                    specialPricesMap[String(r.ITEM_CODE || "").trim()]
                  : null) ||
                (r.isSpecialPrice ? r : null);
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
                    <HStack spacing={1.5} flexShrink={0}>
                      {sp ? (
                        <Badge
                          bg="teal.600"
                          color="white"
                          fontSize="0.65rem"
                          px={1.5}
                          py={0.2}
                          borderRadius="md"
                          fontWeight="900"
                        >
                          ⭐ CONVENIO (-{sp.discountPercent}%)
                        </Badge>
                      ) : promo ? (
                        <Badge
                          bg="amber.400"
                          color="amber.950"
                          fontSize="0.65rem"
                          px={1.5}
                          py={0.2}
                          borderRadius="md"
                          fontWeight="900"
                        >
                          🏷️ OFERTA: -{promo.discountPct}%
                        </Badge>
                      ) : null}
                    </HStack>
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
                      {stockVal !== null ? `Stock: ${stockVal} und` : (sp && sp.stock !== undefined ? `Stock: ${sp.stock} und` : "Consultando stock")}
                    </Badge>
                    {sp && (
                      <Text
                        fontSize="11px"
                        fontWeight="800"
                        color="teal.800"
                        bg="teal.50"
                        px={1.5}
                        py={0.2}
                        borderRadius="sm"
                        border="1px solid"
                        borderColor="teal.200"
                      >
                        Pactado: ${Number(sp.specialPrice || 0).toFixed(2)} neto (${Number(sp.specialPriceConIGV || 0).toFixed(2)} c/IGV)
                      </Text>
                    )}
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
