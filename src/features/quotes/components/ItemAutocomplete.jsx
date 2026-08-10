import { useMemo, useState } from "react";
import { Box, Text, HStack, Badge } from "@chakra-ui/react";
import Select from "react-select";
import { useProductsPriceList } from "../../products/hooks/queries/productQueries";
import { useDebounce } from "../../../shared/hooks/useDebounce";

const MIN_CHARS = 3;
const DEBOUNCE_MS = 400;

/** Un término que es puro dígito/guion se trata como código, no como nombre. */
function isLikelyItemCode(term) {
  return /^[\d\-]+$/.test(term.trim());
}

/**
 * Autocompletado de artículos contra la lista de precios de SAP.
 *
 * Exige un mínimo de caracteres y aplica debounce a propósito: el backend
 * ejecuta una escalera de búsquedas de respaldo por término, así que buscar en
 * cada tecla dispara varias llamadas encadenadas a SAP.
 */
export default function ItemAutocomplete({ onSelect, isDisabled = false, placeholder }) {
  const [inputValue, setInputValue] = useState("");
  const debouncedTerm = useDebounce(inputValue, DEBOUNCE_MS);

  const term = debouncedTerm.trim();
  const shouldSearch = term.length >= MIN_CHARS;
  const asCode = isLikelyItemCode(term);

  const { data, isFetching } = useProductsPriceList({
    itemCode: asCode ? term : "",
    itemName: asCode ? "" : term,
    enabled: shouldSearch,
  });

  const options = useMemo(() => {
    const records = data?.records || [];
    return records.map((r) => ({
      value: r.ITEM_CODE,
      label: `${r.ITEM_CODE} — ${r.ITEM_NAME}`,
      record: r,
    }));
  }, [data]);

  const handleChange = (option) => {
    if (!option?.record) return;
    const r = option.record;

    onSelect?.({
      id: r.ITEM_CODE,
      name: r.ITEM_NAME,
      sigla: r.SIGLA,
      price: Number(r.PRECIO_LISTA) || 0,
      // `importe` es el precio unitario con el descuento que ya aplica SAP.
      importe: Number(r.PRECIO_DESCUENTO ?? r.PRECIO_LISTA) || 0,
      discount: Number(r.DESCUENTO_PCT) || 0,
      stock: Number(r.STOCK_DISPONIBLE) || 0,
      marca: r.MARCA,
      quantity: 1,
      lineDiscount: 0,
      raw: r,
    });

    setInputValue("");
  };

  const noOptionsMessage = () => {
    if (!shouldSearch) return `Escribe al menos ${MIN_CHARS} caracteres`;
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
        filterOption={null} /* el filtrado lo hace SAP, no react-select */
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
