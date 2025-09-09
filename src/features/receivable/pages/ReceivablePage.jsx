import { Box, Spinner, Center, Alert, AlertIcon } from "@chakra-ui/react";
import { SearchHeader } from "../components/SearchHeader";
import { ListHeader } from "../components/ListHeader";
import { DebtList } from "../components/DebtList";
import SellerSelectReceivable from "../components/SellerSelectReceivable";
import { useGetAccountsReceivable } from "../hooks/receivableQueries";
import { useState, useEffect, useRef } from "react";
import styles from "./ReceivablePage.module.css";
import InvoicesModal from "../components/InvoicesModal";
import { useAuthStore } from "../../auth/stores/useAuthStore";

export function ReceivablePage() {
  const [currentPage, setCurrentPage] = useState(0);
  const [cliente, setCliente] = useState("");
  const [searchValue, setSearchValue] = useState("");
  const [selectedSeller, setSelectedSeller] = useState(null);
  const [selectedInvoices, setSelectedInvoices] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const username = useAuthStore((state) => state.username);
  const sellerCode = useAuthStore((state) => state.salesEmployeeCode);

  const isSellerProfile = !!sellerCode;

  // Si es vendedor, setear automáticamente su vendedor
  useEffect(() => {
    if (isSellerProfile) {
      setSelectedSeller({
        value: sellerCode,
        label: `${sellerCode}. ${username}`,
      });
    }
  }, [isSellerProfile, sellerCode, username]);

  // Referencias para debounce
  const debounceTimer = useRef(null);
  const lastSearchValue = useRef("");

  useEffect(() => {
    if (searchValue && searchValue !== lastSearchValue.current && searchValue.length > 2) {
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
      debounceTimer.current = setTimeout(() => {
        setCliente(searchValue.trim());
        setCurrentPage(1);
        lastSearchValue.current = searchValue;
      }, 800);
    }
    if (!searchValue && cliente) {
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
      debounceTimer.current = setTimeout(() => {
        setCliente("");
        setCurrentPage(1);
        lastSearchValue.current = "";
      }, 500);
    }
    return () => {
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
    };
  }, [searchValue, cliente]);

  const handlePageChange = (page) => setCurrentPage(page);
  const handleJumpBack = () => setCurrentPage((prev) => Math.max(prev - 10, 1));
  const handleJumpForward = (pagination) =>
    setCurrentPage((prev) => Math.min(prev + 10, pagination?.totalPaginas || 1));

  const handleClientSearch = (value) => {
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    const trimmedValue = value.trim();
    setCliente(trimmedValue);
    setCurrentPage(1);
    lastSearchValue.current = trimmedValue;
  };

  const handleSearchInputChange = (value) => setSearchValue(value);

  const handleSellerChange = (seller) => {
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    if (selectedSeller?.value !== seller?.value) {
      setSelectedSeller(seller);
      setCliente("");
      setSearchValue("");
      setCurrentPage(1);
      lastSearchValue.current = "";
    }
  };

  const handleViewInvoices = (debt) => {
    setSelectedInvoices(debt.documentos || []);
    setIsModalOpen(true);
  };

  const vendedorNombre = isSellerProfile
    ? username 
    : selectedSeller?.label?.split(".")[1]?.trim() || "";

    const { data, isLoading, error } = useGetAccountsReceivable({
      vendedor: vendedorNombre,
      cliente: cliente.toUpperCase(),
      page: currentPage > 0 ? currentPage - 1 : 0,
    });

  const summary = data?.summary || {};
  const clients = data?.clientes || [];
  const pagination = data?.paginacion || {};

  const adjustedPagination = {
    ...pagination,
    paginaActual: currentPage,
  };

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

        {!isSellerProfile && (
          <Box p={4}>
            <SellerSelectReceivable
              selectedSeller={selectedSeller}
              setSelectedSeller={handleSellerChange}
              setValue={() => {}}
              error={null}
            />
          </Box>
        )}
      </Box>

      <Box p={4}>
        <DebtList debts={clients} onViewInvoices={handleViewInvoices} onViewDetails={() => {}} />

        <ListHeader
          pagination={adjustedPagination}
          onPageChange={handlePageChange}
          onJumpBack={handleJumpBack}
          onJumpForward={() => handleJumpForward(pagination)}
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
