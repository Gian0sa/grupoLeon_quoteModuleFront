import { Box } from "@chakra-ui/react";
import { SearchHeader } from "../components/SearchHeader";
import { ListHeader } from "../components/ListHeader";
import { DebtList } from "../components/DebtList";
import { useReceivables } from "../hooks/useReceivables";
import styles from "./ReceivablePage.module.css";

export function ReceivablePage() {
  const {
    debts,
    showFilters,
    handleSearch,
    handleToggleFilters,
    handleViewInvoices,
    handleViewDetails
  } = useReceivables();

  return (
    <Box bg="gray.50" minH="100vh">
      <SearchHeader
        title="Cuentas por cobrar"
        placeholder="Buscar nombre de cliente"
        onSearch={handleSearch}
      />
      

      <Box p={4}>
        <ListHeader
          title="Todas las deudas"
          showFilters={showFilters}
          onToggleFilters={handleToggleFilters}
        />

        <DebtList
          debts={debts}
          onViewInvoices={handleViewInvoices}
          onViewDetails={handleViewDetails}
        />
      </Box>
    </Box>
  );
}