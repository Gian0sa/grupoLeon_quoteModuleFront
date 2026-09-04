import { useMemo, useState } from "react";
import { Box, Text, HStack, Badge, Flex } from "@chakra-ui/react";
import Select from "react-select";
import { useProductsPriceList } from "../../products/hooks/queries/productQueries";
import { useGetPromotions } from "../hooks/queries/quotesQueries";
import { useDebounce } from "../../../shared/hooks/useDebounce";

const MIN_CHARS = 2;
const DEBOUNCE_MS = 200;

/** Un término que contiene dígitos o guiones se evalúa con búsqueda inteligente de código y nombre. */
function isLikelyItemCode(term) {
  return /^[\d\-]+$/.test(term.trim());
}

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
 * Autocompletado inteligente de artículos contra SAP con soporte para Ofertas del Mes.
 */
export default function ItemAutocomplete({ onSelect, isDisabled = false, placeholder }) {
  const [inputValue, setInputValue] = useState("");
  const debouncedTerm = useDebounce(inputValue, DEBOUNCE_MS);
  const { promotionsMap } = useGetPromotions();

  const term = debouncedTerm.trim();
  const shouldSearch = term.length >= MIN_CHARS;
  const asCode = isLikelyItemCode(term);

  const { data, isFetching } = useProductsPriceList({
    itemCode: asCode ? term : term,
    itemName: asCode ? term : term,
    enabled: shouldSearch,
  });

  const options = useMemo(() => {
    const records = data?.records || [];
    if (!records.length) return [];

    const searchRawLower = term.toLowerCase();
    const searchClean = normalizeString(term);
    const searchTermsClean = searchRawLower.split(/[\s\-._/]+/).map(normalizeString).filter(Boolean);

    const sortedRecords = [...records].sort((a, b) => {
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

    return sortedRecords.map((r) => ({
      value: r.ITEM_CODE,
      label: `${r.ITEM_CODE} — ${r.ITEM_NAME}`,
      record: r,
    }));
  }, [data, term]);

  const handleChange = (option) => {
    if (!option?.record) return;
    const r = option.record;
    const rawStock = r.STOCK_DISPONIBLE ?? r.Stock ?? r.OnHand;
    const hasValidStock = rawStock !== undefined && rawStock !== null && !isNaN(Number(rawStock));
    const stockVal = hasValidStock ? Number(rawStock) : null;
    const isAgotado = hasValidStock && stockVal === 0;

    const promo = promotionsMap ? promotionsMap[r.ITEM_CODE] : null;
    const promoDiscount = promo ? Number(promo.discountPct || 0) : 0;
    const campaignName = promo?.campaignName || (promoDiscount > 0 ? "Oferta del Mes" : undefined);

    onSelect?.({
      id: r.ITEM_CODE,
      name: r.ITEM_NAME,
      sigla: r.SIGLA ?? r.Sigla ?? r.U_TQC_SIGLA ?? r.sigla,
      U_TQC_SIGLA: r.U_TQC_SIGLA ?? r.SIGLA ?? r.Sigla ?? r.sigla,
      price: Number(r.PRECIO_LISTA ?? r.PRECIO_VENTA ?? r.Price ?? 0) || 0,
      importe: Number(r.PRECIO_DESCUENTO ?? r.PRECIO_VENTA ?? r.PRECIO_LISTA ?? r.Price ?? 0) || 0,
      discount: Number(r.DESCUENTO_PCT ?? r.Discount ?? 0) || 0,
      promoDiscount,
      campaignName,
      stock: stockVal,
      stockChecked: hasValidStock,
      isAgotado,
      marca: r.MARCA,
      quantity: "",
      lineDiscount: 0,
      raw: r,
    });

    setInputValue("");
  };

  const noOptionsMessage = () => {
    if (!shouldSearch) return `Escribe al menos ${MIN_CHARS} caracteres...`;
    if (isFetching) return "Buscando en SAP…";
    return "Sin resultados";
  };

  return (
    <Box w="full">
      <Select
        inputValue={inputValue}
        onInputChange={setInputValue}
        options={shouldSearch ? options : []}
        onChange={handleChange}
        isLoading={shouldSearch && isFetching}
        isDisabled={isDisabled}
        value={null}
        placeholder={placeholder || "Escribe código o nombre del Artículo"}
        noOptionsMessage={noOptionsMessage}
        loadingMessage={() => "Buscando en SAP…"}
        filterOption={null}
        formatOptionLabel={(option) => {
          const r = option.record;
          if (!r) return option.label;
          const stock = Number(r.STOCK_DISPONIBLE) || 0;
          const promo = promotionsMap ? promotionsMap[r.ITEM_CODE] : null;
          return (
            <Box>
              <Flex justify="space-between" align="center">
                <Text fontSize="xs" fontWeight="700" color="gray.900" noOfLines={1}>
                  {r.ITEM_NAME}
                </Text>
                {promo && (
                  <Badge bg="amber.400" color="amber.950" fontSize="0.65rem" px={1.5} py={0.2} borderRadius="md" fontWeight="900" flexShrink={0} ml={2}>
                    🏷️ OFERTA: -{promo.discountPct}%
                  </Badge>
                )}
              </Flex>
              <HStack spacing={2} mt={0.5}>
                <Text fontSize="0.7rem" fontWeight="800" color="emerald.700" fontFamily="mono">{r.ITEM_CODE}</Text>
                {r.MARCA && <Text fontSize="0.7rem" color="gray.500">· {r.MARCA}</Text>}
                <Badge colorScheme={stock > 0 ? "green" : "red"} fontSize="0.6rem" px={1}>
                  Stk: {stock}
                </Badge>
              </HStack>
            </Box>
          );
        }}
        styles={{
          control: (base) => ({
            ...base,
            minHeight: "38px",
            height: "38px",
            borderRadius: "8px",
            borderColor: "#cbd5e1",
            boxShadow: "none",
            "&:hover": { borderColor: "#10b981" },
          }),
          valueContainer: (base) => ({
            ...base,
            height: "38px",
            padding: "0 8px",
          }),
          input: (base) => ({
            ...base,
            margin: "0px",
            padding: "0px",
            fontSize: "0.8rem",
          }),
          placeholder: (base) => ({
            ...base,
            fontSize: "0.78rem",
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
            color: "#64748b",
            margin: 0,
          }),
          indicatorsContainer: (base) => ({
            ...base,
            height: "38px",
          }),
          menu: (base) => ({ ...base, zIndex: 20 }),
        }}
      />
    </Box>
  );
}
