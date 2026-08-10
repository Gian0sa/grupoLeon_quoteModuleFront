import { FormControl, FormLabel, Spinner, FormErrorMessage } from "@chakra-ui/react";
import Select from "react-select";
import { useSellersData } from "../features/auth/hooks/queries/authQueries";

export default function SellerSelect({
  selectedSeller,
  setSelectedSeller,
  setValue,
  error,
  hideLabel = false,
  size = "md",
  placeholder = "Selecciona un vendedor",
}) {
  const { data: sellers, isLoading } = useSellersData();

  const sellerOptions = [
    { value: 0, label: "Todos los vendedores" }, // ✅ Opción global
    ...(sellers?.sellers || [])
      .filter((s) => s.SalesEmployeeCode !== -1 && s.Active === "tYES")
      .map((s) => ({
        value: s.SalesEmployeeCode,
        label: s.SalesEmployeeName,
        email: s.Email,
      })),
  ];

  const isSmall = size === "sm";

  const customStyles = {
    control: (base, state) => ({
      ...base,
      backgroundColor: isSmall ? "#f7fafc" : "#f0f4f8",
      borderColor: state.isFocused ? "#10b981" : isSmall ? "#e2e8f0" : "#cbd5e0",
      minHeight: isSmall ? "36px" : "40px",
      height: isSmall ? "36px" : "40px",
      borderRadius: isSmall ? "12px" : "8px",
      boxShadow: state.isFocused ? "0 0 0 1px #10b981" : "none",
      fontSize: isSmall ? "12px" : "14px",
      fontWeight: isSmall ? "600" : "400",
      "&:hover": {
        borderColor: state.isFocused ? "#10b981" : "#cbd5e0",
      },
    }),
    valueContainer: (base) => ({
      ...base,
      height: isSmall ? "36px" : "40px",
      padding: isSmall ? "0 8px" : "0 12px",
      display: "flex",
      alignItems: "center",
    }),
    singleValue: (base) => ({
      ...base,
      color: "#2d3748",
      fontSize: isSmall ? "12px" : "14px",
      fontWeight: isSmall ? "600" : "400",
      margin: 0,
    }),
    placeholder: (base) => ({
      ...base,
      color: "#718096",
      fontSize: isSmall ? "12px" : "14px",
      fontWeight: isSmall ? "500" : "400",
      margin: 0,
    }),
    input: (base) => ({
      ...base,
      margin: 0,
      padding: 0,
      fontSize: isSmall ? "12px" : "14px",
    }),
    indicatorsContainer: (base) => ({
      ...base,
      height: isSmall ? "36px" : "40px",
    }),
    dropdownIndicator: (base) => ({
      ...base,
      padding: isSmall ? "4px 8px" : "8px",
    }),
    menu: (base) => ({
      ...base,
      backgroundColor: "#ffffff",
      borderRadius: "12px",
      boxShadow: "0 10px 25px rgba(0,0,0,0.1)",
      overflow: "hidden",
      zIndex: 9999,
    }),
    option: (base, { isFocused, isSelected }) => ({
      ...base,
      backgroundColor: isSelected ? "#10b981" : isFocused ? "#f0fdf4" : "#ffffff",
      color: isSelected ? "#ffffff" : isFocused ? "#047857" : "#2d3748",
      fontSize: isSmall ? "12px" : "14px",
      fontWeight: isSelected ? "700" : "500",
      padding: isSmall ? "8px 12px" : "10px 14px",
      cursor: "pointer",
    }),
  };

  return (
    <FormControl isInvalid={!!error} w="full">
      {!hideLabel && <FormLabel mb={1.5} fontSize="xs" fontWeight="700">Selecciona un Vendedor</FormLabel>}
      {isLoading ? (
        <Spinner size="sm" color="green.500" />
      ) : (
        <Select
          styles={customStyles}
          options={sellerOptions}
          onChange={(selected) => {
            setSelectedSeller(selected);
            if (setValue) setValue("salesPerson", selected?.value === 0 ? null : selected);
          }}
          value={selectedSeller}
          placeholder={placeholder}
        />
      )}
      <FormErrorMessage>{error?.message}</FormErrorMessage>
    </FormControl>
  );
}
