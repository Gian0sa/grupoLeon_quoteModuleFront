import { useMemo } from "react";
import {
  FormControl,
  FormLabel,
  Skeleton,
  FormErrorMessage,
} from "@chakra-ui/react";
import Select from "react-select";
import { useSellersData } from "../../auth/hooks/queries/authQueries";

export default function SellerSelectReport({
  selectedSeller,
  setSelectedSeller,
  setValue,
  error,
}) {
  const { data: sellers, isLoading } = useSellersData();

  const rawSellers = useMemo(() => {
    const list = Array.isArray(sellers) ? sellers : (sellers?.sellers || []);
    const parsed = list
      .filter((s) => {
        const code = Number(s.SalesEmployeeCode ?? s.value ?? -1);
        const active = String(s.Active ?? "tYES").toUpperCase();
        return code > 0 && (active === "TYES" || active === "Y" || active === "TRUE");
      })
      .map((s) => ({
        value: s.SalesEmployeeCode ?? s.value,
        label: s.SalesEmployeeName ?? s.label,
        email: s.Email ?? s.email,
      }));

    if (parsed.length > 0) {
      try {
        localStorage.setItem("cached_sap_sellers", JSON.stringify(parsed));
      } catch {}
      return parsed;
    }

    try {
      const saved = localStorage.getItem("cached_sap_sellers");
      if (saved) return JSON.parse(saved);
    } catch {}

    return [];
  }, [sellers]);

  const sellerOptions = useMemo(() => [
    { value: "", label: "Todos los vendedores" },
    ...rawSellers,
  ], [rawSellers]);

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
              fontSize: "13px", // antes 12px
              borderColor: "#cbd5e0",
              minHeight: "34px", // un poquito más alto
              height: "34px",
              boxShadow: "none",
              borderRadius: "14px", // menos redondeado para que no parezca pill tan grande
              "&:hover": {
                borderColor: "#a0aec0",
              },
            }),
            valueContainer: (base) => ({
              ...base,
              padding: "0 8px",
              fontSize: "13px",
            }),
            input: (base) => ({
              ...base,
              margin: "0px",
              paddingTop: "0px",
              paddingBottom: "0px",
              fontSize: "13px",
            }),
            placeholder: (base) => ({
              ...base,
              fontSize: "13px",
              color: "#718096",
            }),
            singleValue: (base) => ({
              ...base,
              fontSize: "13px",
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
              fontSize: "13px",
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
              fontSize: "13px",
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
