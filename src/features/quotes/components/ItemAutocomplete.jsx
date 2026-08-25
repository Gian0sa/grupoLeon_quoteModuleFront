import { useMemo, useState } from "react";
import { Box, Text, HStack, Badge } from "@chakra-ui/react";
import Select from "react-select";
import { useProductsPriceList } from "../../products/hooks/queries/productQueries";
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
 * Autocompletado inteligente de artículos contra SAP.
 * 
 * Inicia la búsqueda desde 2 caracteres con debounce ultrarrápido de 200ms.
 * Insensible a mayúsculas, minúsculas, tildes, guiones, puntos y espacios.
 */
export default function ItemAutocomplete({ onSelect, isDisabled = false, placeholder }) {
  const [inputValue, setInputValue] = useState("");
  const debouncedTerm = useDebounce(inputValue, DEBOUNCE_MS);

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
    const searchTerms = searchRawLower.split(/[\s\-._/]+/).filter(Boolean);
    const searchTermsClean = searchTerms.map(normalizeString).filter(Boolean);

    // Ranking e Coincidencias Insensibles a Símbolos y Mayúsculas/Minúsculas
    const sortedRecords = [...records].sort((a, b) => {
      const codeRaw = (a.ITEM_CODE || "").toLowerCase();
      const codeClean = normalizeString(a.ITEM_CODE);
      const nameRaw = (a.ITEM_NAME || "").toLowerCase();
      const nameClean = normalizeString(a.ITEM_NAME);

      const codeRawB = (b.ITEM_CODE || "").toLowerCase();
      const codeCleanB = normalizeString(b.ITEM_CODE);
      const nameRawB = (b.ITEM_NAME || "").toLowerCase();
      const nameCleanB = normalizeString(b.ITEM_NAME);

      // 1. Coincidencia exacta de código (limpio de símbolos)
      if (codeClean === searchClean && codeCleanB !== searchClean) return -1;
      if (codeCleanB === searchClean && codeClean !== searchClean) return 1;

      // 2. Inicio de código (limpio)
      if (codeClean.startsWith(searchClean) && !codeCleanB.startsWith(searchClean)) return -1;
      if (codeCleanB.startsWith(searchClean) && !codeClean.startsWith(searchClean)) return 1;

      // 3. Contiene en código (limpio)
      if (codeClean.includes(searchClean) && !codeCleanB.includes(searchClean)) return -1;
      if (codeCleanB.includes(searchClean) && !codeClean.includes(searchClean)) return 1;

      // 4. Coincidencia multi-término en el nombre (insensible a guiones y símbolos)
      const matchesAllA = searchTermsClean.every(t => nameClean.includes(t) || codeClean.includes(t));
      const matchesAllB = searchTermsClean.every(t => nameCleanB.includes(t) || codeCleanB.includes(t));
      if (matchesAllA && !matchesAllB) return -1;
      if (matchesAllB && !matchesAllA) return 1;

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

    onSelect?.({
      id: r.ITEM_CODE,
      name: r.ITEM_NAME,
      sigla: r.SIGLA,
      price: Number(r.PRECIO_LISTA) || 0,
      importe: Number(r.PRECIO_DESCUENTO ?? r.PRECIO_LISTA) || 0,
      discount: Number(r.DESCUENTO_PCT) || 0,
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
          return (
            <Box>
              <Text fontSize="xs" fontWeight="700" color="gray.900" noOfLines={1}>
                {r.ITEM_NAME}
              </Text>
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
