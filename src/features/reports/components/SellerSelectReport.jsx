import { FormControl, FormLabel, Spinner, FormErrorMessage } from "@chakra-ui/react";
import Select from "react-select";
import { useSellersData } from "../../auth/hooks/queries/authQueries";

export default function SellerSelectReport({ selectedSeller, setSelectedSeller, setValue, error }) {
  const { data: sellers, isLoading } = useSellersData();

  const rawSellers =
  (sellers?.sellers || [])
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
        <Spinner />
      ) : (
        <Select
          styles={{
            control: (base) => ({
              ...base,
              backgroundColor: "#f0f4f8",
              borderColor: "#cbd5e0",
              minHeight: "40px",
              boxShadow: "none",
              "&:hover": {
                borderColor: "#a0aec0",
              },
            }),
            menu: (base) => ({
              ...base,
              backgroundColor: "#ffffff",
            }),
            option: (base, { isFocused }) => ({
              ...base,
              backgroundColor: isFocused ? "#e2e8f0" : "#ffffff",
              color: "#2d3748",
            }),
          }}
          options={sellerOptions}
          onChange={(selected) => {
            setSelectedSeller(selected);
            setValue("salesPerson", selected);
          }}
          value={selectedSeller}
          placeholder="Selecciona un vendedor"
        />

      )}
      <FormErrorMessage>{error?.message}</FormErrorMessage>
    </FormControl>
  );
}
