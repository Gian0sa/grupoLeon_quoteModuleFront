import { Box, Spinner, Center, Alert, AlertIcon, Button } from "@chakra-ui/react";
import { SearchHeader } from "../components/SearchHeader";
import { DebtList } from "../components/DebtList";
import SellerSelectReceivable from "../components/SellerSelectReceivable";
import { useGetAccountsReceivable } from "../hooks/receivableQueries";
import { useState, useEffect, useRef } from "react";
import styles from "./ReceivablePage.module.css";
import InvoicesModal from "../components/InvoicesModal";
import { useAuthStore } from "../../auth/stores/useAuthStore";
import { QUERY_KEYS } from "../../../shared/utils/queryKeys";


export function ReceivablePage() {
  const [cliente, setCliente] = useState("");
  const [clientecode, setClientecode] = useState("");
  const [searchValue, setSearchValue] = useState("");
  const [selectedSeller, setSelectedSeller] = useState(null);
  const [selectedInvoices, setSelectedInvoices] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const [lastClient, setLastClient] = useState(null); 
  const [allClients, setAllClients] = useState([]);  

  const username = useAuthStore((state) => state.username);
  const sellerCode = useAuthStore((state) => state.salesEmployeeCode);
  const isSellerProfile = !!sellerCode;

  useEffect(() => {
    if (isSellerProfile) {
      setSelectedSeller({
        value: sellerCode,
        label: `${sellerCode}. ${username}`,
      });
    }
  }, [isSellerProfile, sellerCode, username]);

  const debounceTimer = useRef(null);
  const lastSearchValue = useRef("");

  // búsqueda de cliente
  useEffect(() => {
    if (searchValue && searchValue !== lastSearchValue.current && searchValue.length > 2) {
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
      debounceTimer.current = setTimeout(() => {
        const trimmedValue = searchValue.trim();
        if (/^\d+$/.test(trimmedValue)) {
          setClientecode(`CL${trimmedValue}`);
          setCliente("");
        } else {
          setCliente(trimmedValue);
          setClientecode("");
        }
        setLastClient(null);  // reset cursor en nueva búsqueda
        setAllClients([]);
        lastSearchValue.current = searchValue;
      }, 800);
    }

    if (!searchValue && (cliente || clientecode)) {
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
      debounceTimer.current = setTimeout(() => {
        setCliente("");
        setClientecode("");
        setLastClient(null);
        setAllClients([]);
        lastSearchValue.current = "";
      }, 500);
    }
    return () => {
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
    };
  }, [searchValue, cliente, clientecode]);

  const handleClientSearch = (value) => {
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    const trimmedValue = value.trim();
    if (/^\d+$/.test(trimmedValue)) {
      setClientecode(`CL${trimmedValue}`);
      setCliente("");
    } else {
      setCliente(trimmedValue);
      setClientecode("");
    }
    setLastClient(null);
    setAllClients([]);
    lastSearchValue.current = trimmedValue;
  };

  const handleSearchInputChange = (value) => setSearchValue(value);

  const handleSellerChange = (seller) => {
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    if (selectedSeller?.value !== seller?.value) {
      setSelectedSeller(seller);
      setCliente("");
      setClientecode("");
      setSearchValue("");
      setLastClient(null);
      setAllClients([]);
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
    clientecode,
    lastClient,
  });

  useEffect(() => {
    if (data?.clients?.clients) {
      setAllClients((prev) =>
        lastClient ? [...prev, ...data.clients.clients] : data.clients.clients
      );
    }
  }, [data]);
  const refreshQueries = [
    [QUERY_KEYS.accountsReceivable, vendedorNombre, cliente.toUpperCase(), clientecode, lastClient]
  ];

  if (isLoading && allClients.length === 0) {
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
          refreshQueries={refreshQueries}
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
        <DebtList debts={allClients} onViewInvoices={handleViewInvoices} onViewDetails={() => {}} />

        {data?.hasMore && (
          <Center mt={4}>
            <Button
              colorScheme="green"
              onClick={() => setLastClient(data.lastClient)}
              isLoading={isLoading}
            >
              Cargar más
            </Button>
          </Center>
        )}
      </Box>

      <InvoicesModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        documentos={selectedInvoices}
      />
    </Box>
  );
}
