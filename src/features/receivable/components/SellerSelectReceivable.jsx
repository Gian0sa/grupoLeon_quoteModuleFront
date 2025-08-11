import {
  FormControl,
  FormLabel,
  Skeleton,
  FormErrorMessage,
} from "@chakra-ui/react";
import Select from "react-select";
import { useSellersData } from "../../auth/hooks/queries/authQueries";

export default function SellerSelectReceivable({
  selectedSeller,
  setSelectedSeller,
  setValue,
  error,
}) {
  const { data: sellers, isLoading } = useSellersData();

  const rawSellers = (sellers?.sellers || [])
    .filter((s) => s.SalesEmployeeCode !== -1 && s.Active === "tYES")
    .map((s) => ({
      value: s.SalesEmployeeCode,
      label: s.SalesEmployeeName,
      email: s.Email,
    }));

  const sellerOptions = [
    { value: "", label: "Todos los vendedores" },
    ...rawSellers,
  ];

  return (
    <FormControl isInvalid={!!error}>
      {isLoading ? (
        <Skeleton
          height="32px"
          borderRadius="20px"
          startColor="#e2e8f0"
          endColor="#cbd5e0"
        />
      ) : (
        <Select
          styles={{
            control: (base) => ({
              ...base,
              backgroundColor: "#f0f4f8",
              fontSize: "12px",
              borderColor: "#cbd5e0",
              minHeight: "32px",
              height: "32px",
              boxShadow: "none",
              borderRadius: "20px",
              "&:hover": {
                borderColor: "#a0aec0",
              },
            }),
            valueContainer: (base) => ({
              ...base,
              padding: "0 8px",
              fontSize: "12px",
            }),
            input: (base) => ({
              ...base,
              margin: "0px",
              paddingTop: "0px",
              paddingBottom: "0px",
              fontSize: "12px",
            }),
            placeholder: (base) => ({
              ...base,
              fontSize: "12px",
              color: "#718096",
            }),
            singleValue: (base) => ({
              ...base,
              fontSize: "12px",
              color: "#2d3748",
            }),
            indicatorSeparator: () => ({
              display: "none",
            }),
            dropdownIndicator: (base) => ({
              ...base,
              padding: "4px",
            }),
            menu: (base) => ({
              ...base,
              backgroundColor: "#ffffff",
              fontSize: "12px",
              zIndex: 9999,
            }),
            option: (base, { isFocused, isSelected }) => ({
              ...base,
              backgroundColor: isSelected
                ? "#4299e1"
                : isFocused
                ? "#e2e8f0"
                : "#ffffff",
              color: isSelected ? "#ffffff" : "#2d3748",
              fontSize: "12px",
              padding: "8px 12px",
              "&:active": {
                backgroundColor: "#4299e1",
              },
            }),
          }}
          options={sellerOptions}
          onChange={(selected) => {
            setSelectedSeller(selected);
            setValue("salesPerson", selected);
          }}
          value={selectedSeller}
          placeholder="Selecciona un vendedor"
          isSearchable={true}
          menuPosition="fixed"
        />
      )}
      <FormErrorMessage>{error?.message}</FormErrorMessage>
    </FormControl>
  );
}
