import { HStack, Select, Spinner } from "@chakra-ui/react";
import { useSellersData } from "../../../auth/hooks/queries/authQueries";

export default function FiltersBar({ selectedSeller, onSellerChange }) {
  const { data: sellers, isLoading } = useSellersData();

  return (
    <HStack spacing={4} mb={6}>
      {isLoading ? (
        <Spinner size="sm" />
      ) : (
        <Select
          placeholder="Seleccionar vendedor"
          maxW="250px"
          value={selectedSeller}
          onChange={(e) => onSellerChange(e.target.value)}
        >
          <option value={0}>Todos</option>
          {sellers?.map((seller) => (
            <option key={seller.SlpCode} value={seller.SlpCode}>
              {seller.SlpName}
            </option>
          ))}
        </Select>
      )}
    </HStack>
  );
}
