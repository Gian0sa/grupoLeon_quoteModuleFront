import { Box, Spinner, Center, Text, Alert, AlertIcon } from "@chakra-ui/react";
import { SearchHeader } from "../components/SearchHeader";
import { ListHeader } from "../components/ListHeader";
import { DebtList } from "../components/DebtList";
import SellerSelectReceivable from "../components/SellerSelectReceivable";
import { useGetAccountsReceivable } from "../hooks/receivableQueries";
import { useState, useEffect, useRef } from "react";
import styles from "./ReceivablePage.module.css";
import InvoicesModal from "../components/InvoicesModal";

export function ReceivablePage() {
  const [currentPage, setCurrentPage] = useState(1);
  const [cliente, setCliente] = useState('');
  const [searchValue, setSearchValue] = useState('');
  const [selectedSeller, setSelectedSeller] = useState(null);
  const [selectedInvoices, setSelectedInvoices] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  // ✅ Referencias para el debounce
  const debounceTimer = useRef(null);
  const lastSearchValue = useRef('');

  // ✅ Debounce automático opcional - solo cuando el usuario escribe
  useEffect(() => {
    // Solo hacer debounce si searchValue tiene contenido y cambió
    if (searchValue && searchValue !== lastSearchValue.current && searchValue.length > 2) {
      // Limpiar timer anterior
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current);
      }
      
      // Configurar nuevo timer
      debounceTimer.current = setTimeout(() => {
        console.log("🕐 Búsqueda automática (debounce):", searchValue);
        setCliente(searchValue.trim());
        setCurrentPage(1);
        lastSearchValue.current = searchValue;
      }, 800); // 800ms de debounce
    }
    
    // Si el searchValue está vacío, limpiar la búsqueda
    if (!searchValue && cliente) {
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current);
      }
      debounceTimer.current = setTimeout(() => {
        console.log("🧹 Limpiando búsqueda automática");
        setCliente('');
        setCurrentPage(1);
        lastSearchValue.current = '';
      }, 500);
    }

    // Cleanup
    return () => {
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current);
      }
    };
  }, [searchValue, cliente]);

  const handlePageChange = (page) => {
    console.log("📄 handlePageChange llamado con página:", page);
    setCurrentPage(page);
  };

  const handleJumpBack = () => {
    setCurrentPage((prev) => Math.max(prev - 10, 1));
  };

  const handleJumpForward = () => {
    setCurrentPage((prev) => Math.min(prev + 10, pagination?.totalPaginas || 1));
  };

  // ✅ Búsqueda manual (Enter o click en lupa)
  const handleClientSearch = (value) => {
    console.log("🔍 Búsqueda MANUAL de cliente:", value);
    
    // Limpiar debounce timer si existe
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }
    
    const trimmedValue = value.trim();
    setCliente(trimmedValue);
    setCurrentPage(1);
    lastSearchValue.current = trimmedValue;
  };

  // ✅ Solo actualizar el valor del input (no buscar automáticamente)
  const handleSearchInputChange = (value) => {
    console.log("📝 Cambio en input:", value);
    setSearchValue(value);
  };

  const handleSellerChange = (seller) => {
    console.log("🏪 Cambio de vendedor:", seller);
    
    // Limpiar debounce timer si existe
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }
    
    // Solo resetear si realmente cambió el vendedor
    if (selectedSeller?.value !== seller?.value) {
      console.log("🔄 Reseteando por cambio de vendedor");
      setSelectedSeller(seller);
      setCliente('');
      setSearchValue('');
      setCurrentPage(1);
      lastSearchValue.current = '';
    }
  };

  const handleViewInvoices = (debt) => {
    console.log("📋 Ver facturas para:", debt);
    setSelectedInvoices(debt.documentos || []);
    setIsModalOpen(true);
  };

  const handleViewDetails = (debt) => {
    console.log("👁️ Ver detalles para:", debt);
  };

  const vendedorNombre = selectedSeller?.label?.split(".")[1]?.trim() || '';

  const { data, isLoading, error } = useGetAccountsReceivable({ 
    vendedor: vendedorNombre, 
    cliente: cliente,
    page: currentPage 
  });

  console.log("🎯 Datos del backend:", data);
  console.log("📊 Estado actual - Página:", currentPage, "Cliente:", cliente, "Vendedor:", vendedorNombre);
  
  // Extraer datos del response
  const summary = data?.summary || {};
  const clients = data?.clientes || [];
  const pagination = data?.paginacion || {};

  // ✅ Usar el estado local como fuente de verdad para la página actual
  const adjustedPagination = {
    ...pagination,
    paginaActual: currentPage
  };

  // Mostrar loading
  if (isLoading) {
    return (
      <Box bg="gray.50" minH="100vh">
        <SearchHeader
          title="Cuentas por cobrar"
          placeholder="Buscar nombre de cliente"
          searchValue={searchValue}
          onSearch={handleClientSearch}
          onSearchInputChange={handleSearchInputChange}
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
          searchValue={searchValue}
          onSearch={handleClientSearch}
          onSearchInputChange={handleSearchInputChange}
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

  return (
    <Box bg="gray.50" minH="100vh">
      <Box className={styles.heading}>
        <SearchHeader
          title="Cuentas por cobrar"
          placeholder="Buscar nombre de cliente"
          searchValue={searchValue}
          onSearch={handleClientSearch}
          onSearchInputChange={handleSearchInputChange}
        />

        <Box p={4}>
          <SellerSelectReceivable
            selectedSeller={selectedSeller}
            setSelectedSeller={handleSellerChange}
            setValue={() => {}}
            error={null}
          />
        </Box>
      </Box>

      <Box p={4}>
        <DebtList
          debts={clients}
          onViewInvoices={handleViewInvoices}
          onViewDetails={handleViewDetails}
        />

        <ListHeader
          pagination={adjustedPagination}
          onPageChange={handlePageChange}
          onJumpBack={handleJumpBack}
          onJumpForward={handleJumpForward}
        />
      </Box>

      <InvoicesModal 
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        documentos={selectedInvoices}
      />
    </Box>
  );
}