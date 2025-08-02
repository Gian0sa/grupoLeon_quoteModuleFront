import { Box, Spinner, Center, Text, Alert, AlertIcon } from "@chakra-ui/react";
import { SearchHeader } from "../components/SearchHeader";
import { ListHeader } from "../components/ListHeader";
import { DebtList } from "../components/DebtList";
import { SummaryCards } from "../components/SummaryCards";
import { useReceivables } from "../hooks/useReceivables";
import { useGetAccountsReceivable } from "../hooks/receivableQueries";
import { useState } from "react";

export function ReceivablePage() {
     const [currentPage, setCurrentPage] = useState(1);

const handlePageChange = (page) => {
  const num = Math.min(Math.max(1, page), pagination?.totalPaginas || 1);
  setCurrentPage(num);
};

const handleJumpBack = () => {
  setCurrentPage((prev) => Math.max(prev - 10, 1));
};

const handleJumpForward = () => {
  setCurrentPage((prev) => Math.min(prev + 10, pagination?.totalPaginas || 1));
};

  const {
    showFilters,
    handleSearch,
    handleToggleFilters,
    handleViewInvoices,
    handleViewDetails
  } = useReceivables();

  const { data, isLoading, error } = useGetAccountsReceivable({ 
    vendedor: '', 
    cliente: '' ,
    page: currentPage 
  });

  console.log("Datos del backend:", data);
  
  // Mostrar loading
  if (isLoading) {
    return (
      <Box bg="gray.50" minH="100vh">
        <SearchHeader
          title="Cuentas por cobrar"
          placeholder="Buscar nombre de cliente"
          onSearch={handleSearch}
        />
        <Center h="50vh">
          <Spinner size="xl" color="green.500" />
        </Center>
      </Box>
    );
  }

  // Mostrar error
  if (error) {
    return (
      <Box bg="gray.50" minH="100vh">
        <SearchHeader
          title="Cuentas por cobrar"
          placeholder="Buscar nombre de cliente"
          onSearch={handleSearch}
        />
        <Center h="50vh">
          <Alert status="error">
            <AlertIcon />
            Error al cargar los datos: {error.message}
          </Alert>
        </Center>
      </Box>
    );
  }

  // Extraer datos del response
  const summary = data?.summary || {};
  const clients = data?.clientes || [];
  const pagination = data?.paginacion || {};

  return (
    <Box bg="gray.50" minH="100vh">
      <SearchHeader
        title="Cuentas por cobrar"
        placeholder="Buscar nombre de cliente"
        onSearch={handleSearch}
      />
      
      <Box p={4}>
        {/* Tarjetas de resumen */}
        {/* <SummaryCards summary={summary} /> */}
        <DebtList
          debts={clients}
          onViewInvoices={handleViewInvoices}
          onViewDetails={handleViewDetails}
        />
        
        <ListHeader
            pagination={pagination}
            onPageChange={handlePageChange}
            onJumpBack={handleJumpBack}
            onJumpForward={handleJumpForward}
            />


      </Box>
    </Box>
  );
}