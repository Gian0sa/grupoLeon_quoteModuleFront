import React, { useMemo, useState, useEffect } from "react";
import {
  Box,
  HStack,
  Select,
  Button,
  FormControl,
  FormLabel,
  VStack,
  Icon,
  Text,
  useColorModeValue,
  IconButton,
  Tooltip,
  Badge,
  Divider,
  Flex,
} from "@chakra-ui/react";
import { CalendarIcon, RepeatIcon } from "@chakra-ui/icons";
import SellerSelect from "../../../../components/SellerSelect";

export default function FiltersBar({
  initialFilters = {},
  onApply,
  hideSellerField = false,
}) {
  const currentYear = new Date().getFullYear();

  // 🎨 Colores adaptativos
  const bg = useColorModeValue("white", "gray.800");
  const borderColor = useColorModeValue("gray.200", "gray.700");
  const labelColor = useColorModeValue("gray.600", "gray.300");
  const iconColor = useColorModeValue("blue.500", "blue.300");
  const cardBg = useColorModeValue("gray.50", "gray.700");

  // 📅 Datos
  const years = useMemo(() => {
    const arr = [];
    for (let y = currentYear; y >= currentYear - 5; y--) arr.push(y);
    return arr;
  }, [currentYear]);

  const monthNames = [
    "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
    "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
  ];

  const months = useMemo(() => Array.from({ length: 12 }, (_, i) => i + 1), []);

  // ⚙️ Estado local
  const [local, setLocal] = useState({
    yearFrom: initialFilters.yearFrom ?? currentYear,
    monthFrom: initialFilters.monthFrom ?? 1,
    monthTo: initialFilters.monthTo ?? 12,
    sellerCode: initialFilters.sellerCode ?? 0,
  });

  const [selectedSeller, setSelectedSeller] = useState(null);
  const [hasChanges, setHasChanges] = useState(false);

  // 🧩 Efectos
  useEffect(() => {
    if (initialFilters.sellerCode && initialFilters.sellerCode > 0) {
      setLocal((prev) => ({ ...prev, sellerCode: initialFilters.sellerCode }));
    }
  }, [initialFilters.sellerCode]);

  useEffect(() => {
    if (selectedSeller?.value) {
      setLocal((prev) => ({ ...prev, sellerCode: selectedSeller.value }));
    } else {
      setLocal((prev) => ({ ...prev, sellerCode: 0 }));
    }
  }, [selectedSeller]);

  useEffect(() => {
    const changed =
      local.yearFrom !== initialFilters.yearFrom ||
      local.monthFrom !== initialFilters.monthFrom ||
      local.monthTo !== initialFilters.monthTo ||
      local.sellerCode !== initialFilters.sellerCode;
    setHasChanges(changed);
  }, [local, initialFilters]);

  // 🧠 Handlers
  const handleApply = () => {
    const { monthFrom, monthTo } = local;
    const adjusted =
      monthFrom > monthTo
        ? { ...local, monthFrom: monthTo, monthTo: monthFrom }
        : local;

    onApply?.(adjusted);
    setHasChanges(false);
  };

  const handleReset = () => {
    const reset = {
      yearFrom: currentYear,
      monthFrom: 1,
      monthTo: 12,
      sellerCode: hideSellerField ? initialFilters.sellerCode : 0,
    };
    setLocal(reset);
    setSelectedSeller(null);
    onApply?.(reset);
    setHasChanges(false);
  };

  // 🧱 UI
  return (
    <Box bg={bg} borderRadius="lg" p={4}>
      <VStack spacing={5} align="stretch">
        {/* 🔹 Encabezado */}
        <Flex justify="space-between" align="center">
          <HStack spacing={2}>
            <Icon as={CalendarIcon} color={iconColor} boxSize={5} />
            <Text fontWeight="semibold" fontSize="lg" color={labelColor}>
              Filtros
            </Text>
          </HStack>
          {hasChanges && (
            <Badge colorScheme="orange" fontSize="xs">
              Cambios sin aplicar
            </Badge>
          )}
        </Flex>

        {/* 🔸 Cuerpo de filtros */}
        <VStack
          spacing={4}
          align="stretch"
          bg={cardBg}
          borderRadius="md"
          p={4}
          border="1px solid"
          borderColor={borderColor}
        >
          {/* Año */}
          <FormControl>
            <FormLabel fontSize="sm" fontWeight="medium" color={labelColor}>
              Año
            </FormLabel>
            <Select
              value={local.yearFrom}
              onChange={(e) => setLocal((s) => ({ ...s, yearFrom: +e.target.value }))}
              size="sm"
            >
              {years.map((y) => (
                <option key={y} value={y}>{y}</option>
              ))}
            </Select>
          </FormControl>

          {/* Rango de meses */}
          <HStack spacing={3}>
            <FormControl>
              <FormLabel fontSize="sm" color={labelColor}>
                Desde
              </FormLabel>
              <Select
                value={local.monthFrom}
                onChange={(e) => setLocal((s) => ({ ...s, monthFrom: +e.target.value }))}
                size="sm"
              >
                {months.map((m) => (
                  <option key={m} value={m}>{monthNames[m - 1]}</option>
                ))}
              </Select>
            </FormControl>

            <FormControl>
              <FormLabel fontSize="sm" color={labelColor}>
                Hasta
              </FormLabel>
              <Select
                value={local.monthTo}
                onChange={(e) => setLocal((s) => ({ ...s, monthTo: +e.target.value }))}
                size="sm"
              >
                {months.map((m) => (
                  <option key={m} value={m}>{monthNames[m - 1]}</option>
                ))}
              </Select>
            </FormControl>
          </HStack>

          {/* Vendedor */}
          {!hideSellerField && (
            <FormControl>
              <FormLabel fontSize="sm" color={labelColor}>
                Vendedor
              </FormLabel>
              <SellerSelect
                selectedSeller={selectedSeller}
                setSelectedSeller={setSelectedSeller}
                setValue={() => {}}
                error={null}
              />
            </FormControl>
          )}
        </VStack>

        <Divider />

        {/* 🔘 Botones */}
        <HStack justify="flex-end" spacing={3}>
          <Tooltip label="Restablecer filtros" hasArrow>
            <IconButton
              icon={<RepeatIcon />}
              variant="ghost"
              colorScheme="gray"
              size="sm"
              onClick={handleReset}
              aria-label="Restablecer filtros"
            />
          </Tooltip>

          <Button
            colorScheme="blue"
            size="sm"
            onClick={handleApply}
            leftIcon={<Icon as={CalendarIcon} />}
            isDisabled={!hasChanges}
            px={6}
            shadow="sm"
          >
            Aplicar
          </Button>
        </HStack>
      </VStack>
    </Box>
  );
}
