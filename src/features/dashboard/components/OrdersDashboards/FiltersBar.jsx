// src/components/OrdersDashboards/FiltersBar.jsx
import React, { useMemo, useState, useEffect } from "react";
import {
  Box,
  HStack,
  Select,
  Button,
  FormControl,
  FormLabel,
} from "@chakra-ui/react";
import SellerSelect from "../../../../components/SellerSelect";

export default function FiltersBar({
  initialFilters = {},
  onApply,
  hideSellerField = false,
}) {
  const currentYear = new Date().getFullYear();

  // Crear lista de años
  const years = useMemo(() => {
    const arr = [];
    for (let y = currentYear; y >= currentYear - 5; y--) arr.push(y);
    return arr;
  }, [currentYear]);

  // Lista de meses (1-12)
  const months = useMemo(() => {
    return Array.from({ length: 12 }, (_, i) => i + 1);
  }, []);

  // Nombres de los meses
  const monthNames = [
    "Enero",
    "Febrero",
    "Marzo",
    "Abril",
    "Mayo",
    "Junio",
    "Julio",
    "Agosto",
    "Septiembre",
    "Octubre",
    "Noviembre",
    "Diciembre",
  ];

  // Estado local
  const [local, setLocal] = useState({
    yearFrom: initialFilters.yearFrom ?? currentYear,
    monthFrom: initialFilters.monthFrom ?? 1,
    monthTo: initialFilters.monthTo ?? 12,
    sellerCode: initialFilters.sellerCode ?? 0,
  });

  // Estado para el SellerSelect
  const [selectedSeller, setSelectedSeller] = useState(null);

  // Sincronizar selectedSeller cuando cambia initialFilters.sellerCode
  useEffect(() => {
    if (initialFilters.sellerCode && initialFilters.sellerCode > 0) {
      setLocal((prev) => ({
        ...prev,
        sellerCode: initialFilters.sellerCode,
      }));
    }
  }, [initialFilters.sellerCode]);

  // Cuando cambia el seller seleccionado, actualizar local.sellerCode
  useEffect(() => {
    if (selectedSeller?.value) {
      setLocal((prev) => ({ ...prev, sellerCode: selectedSeller.value }));
    } else {
      setLocal((prev) => ({ ...prev, sellerCode: 0 }));
    }
  }, [selectedSeller]);

  const handleApply = () => {
    const monthFrom = Number(local.monthFrom);
    const monthTo = Number(local.monthTo);

    // Si from > to, invertir
    if (monthFrom > monthTo) {
      onApply &&
        onApply({ ...local, monthFrom: monthTo, monthTo: monthFrom });
      return;
    }
    onApply && onApply(local);
  };

  return (
    <Box mb={4} p={4} bg="white" borderRadius="md" shadow="sm">
      <HStack spacing={3} align="end" flexWrap="wrap">
        <FormControl width="140px">
          <FormLabel fontSize="sm">Año</FormLabel>
          <Select
            value={local.yearFrom}
            onChange={(e) =>
              setLocal((s) => ({
                ...s,
                yearFrom: Number(e.target.value),
              }))
            }
            size="sm"
          >
            {years.map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </Select>
        </FormControl>

        <FormControl width="160px">
          <FormLabel fontSize="sm">Mes desde</FormLabel>
          <Select
            value={local.monthFrom}
            onChange={(e) =>
              setLocal((s) => ({
                ...s,
                monthFrom: Number(e.target.value),
              }))
            }
            size="sm"
          >
            {months.map((m) => (
              <option key={m} value={m}>
                {String(m).padStart(2, "0")} - {monthNames[m - 1]}
              </option>
            ))}
          </Select>
        </FormControl>

        <FormControl width="160px">
          <FormLabel fontSize="sm">Mes hasta</FormLabel>
          <Select
            value={local.monthTo}
            onChange={(e) =>
              setLocal((s) => ({
                ...s,
                monthTo: Number(e.target.value),
              }))
            }
            size="sm"
          >
            {months.map((m) => (
              <option key={m} value={m}>
                {String(m).padStart(2, "0")} - {monthNames[m - 1]}
              </option>
            ))}
          </Select>
        </FormControl>

        {!hideSellerField && (
          <Box width="250px">
            <SellerSelect
              selectedSeller={selectedSeller}
              setSelectedSeller={setSelectedSeller}
              setValue={() => {}}
              error={null}
            />
          </Box>
        )}

        <Button
          colorScheme="blue"
          size="sm"
          onClick={handleApply}
          mt={hideSellerField ? 0 : 6}
        >
          Aplicar
        </Button>
      </HStack>
    </Box>
  );
}
