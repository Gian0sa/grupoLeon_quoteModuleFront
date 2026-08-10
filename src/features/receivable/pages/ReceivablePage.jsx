import { Box, Spinner, Center, Alert, AlertIcon, Button } from "@chakra-ui/react";
import { SearchHeader } from "../components/SearchHeader";
import { DebtList } from "../components/DebtList";
import { ReceivableStatusFilter } from "../components/ReceivableStatusFilter";
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
  const [statusFilter, setStatusFilter] = useState("all"); // 'all' | 'overdue' | 'onTime'

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
    setSelectedInvoices(debt.documents || []);
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

  const [isInitialFetching, setIsInitialFetching] = useState(true);

  useEffect(() => {
    if (data?.clients?.clients) {
      setAllClients((prev) => {
        const newClients = data.clients.clients;
        if (!lastClient) return newClients;
        // Evitar duplicados por CardCode
        const existingCodes = new Set(prev.map((c) => c.clientCode || c.cardCode));
        const filteredNew = newClients.filter((c) => !existingCodes.has(c.clientCode || c.cardCode));
        return [...prev, ...filteredNew];
      });
    }

    // 🔄 Autocarga secuencial de páginas para consolidar la cartera completa
    if (data?.hasMore && data?.lastClient) {
      const timer = setTimeout(() => {
        setLastClient(data.lastClient);
      }, 100);
      return () => clearTimeout(timer);
    } else if (!data?.hasMore) {
      setIsInitialFetching(false);
    }
  }, [data]);

  const refreshQueries = [
    [QUERY_KEYS.accountsReceivable, vendedorNombre, cliente.toUpperCase(), clientecode, lastClient]
  ];

  // 1. Helper para identificar si un cliente es de TARJETA AZUL (Saldo a favor / Nota de crédito / Monto vencido < 0)
  const isClientCredit = (c) => {
    const overduePEN = Number(c.overdueAmount?.PEN ?? c.saldoVencidoPEN ?? 0);
    const overdueUSD = Number(c.overdueAmount?.USD ?? c.saldoVencidoUSD ?? 0);
    
    // Si el saldo neto es a favor del cliente (negativo), es azul
    if (overduePEN < 0 || overdueUSD < 0) return true;
    
    // Si el saldo neto es deudor (positivo), es MORA REAL (Rojo), sin importar si tiene alguna nota de crédito pequeña
    if (overduePEN > 0 || overdueUSD > 0) return false;
    
    // Si el saldo vencido neto es exactamente 0 pero aún hay documentos de crédito vivos, es azul
    const hasCreditDoc = c.tipoDocumento === "Nota de Crédito" || c.documents?.some((d) => d.tipoDocumento === "Nota de Crédito");
    return hasCreditDoc;
  };

  // 2. Helper para identificar si un cliente posee MORA REAL (Deuda vencida positiva > 0 y NO es azul)
  const isClientOverdue = (c) => {
    if (isClientCredit(c)) return false;
    const overduePEN = Number(c.overdueAmount?.PEN ?? c.saldoVencidoPEN ?? 0);
    const overdueUSD = Number(c.overdueAmount?.USD ?? c.saldoVencidoUSD ?? 0);
    const overdueDocs = Number(c.overdueDocumentsCount ?? c.documentosVencidos ?? 0);
    return overdueDocs > 0 && (overduePEN > 0 || overdueUSD > 0);
  };

  // 3. Helper para clientes ACTIVOS / AL DÍA (No morosos y no azules)
  const isClientActive = (c) => {
    return !isClientCredit(c) && !isClientOverdue(c);
  };

  // Conteos exactos y mutuamente excluyentes para las 4 pestañas:
  const totalCount = allClients.length;
  const overdueCount = allClients.filter(isClientOverdue).length;
  const creditCount = allClients.filter(isClientCredit).length;
  const onTimeCount = allClients.filter(isClientActive).length;

  const [ageFilter, setAgeFilter] = useState("all"); // 'all' | '1-30' | '31-60' | '61-90' | '90+'
  const [sortBy, setSortBy] = useState("debt"); // 'debt' | 'age'

  const getMaxOverdueDays = (c) => {
    const docs = Array.isArray(c.documents) ? c.documents : [];
    const overdueDocs = docs.filter(d => d.estaVencido || (d.diasVencimiento && d.diasVencimiento > 0));
    if (overdueDocs.length > 0) {
      return Math.max(...overdueDocs.map(d => Number(d.diasVencimiento || 0)));
    }
    return Number(c.maxOverdueDays || 0);
  };

  const getEquivUSD = (c) => {
    const overduePEN = Number(c.overdueAmount?.PEN ?? c.saldoVencidoPEN ?? 0);
    const overdueUSD = Number(c.overdueAmount?.USD ?? c.saldoVencidoUSD ?? 0);
    return (overduePEN > 0 ? overduePEN / 3.43 : 0) + (overdueUSD > 0 ? overdueUSD : 0);
  };

  // RN-FECHAS-03 y RN-FECHAS-04: Filtrado por tramo de días de mora y ordenación inteligente
  const filteredClients = allClients
    .filter((debt) => {
      if (statusFilter === "rechazados") {
        if (!isClientOverdue(debt)) return false;
        const maxDays = getMaxOverdueDays(debt);
        if (ageFilter === "1-30") return maxDays >= 1 && maxDays <= 30;
        if (ageFilter === "31-60") return maxDays >= 31 && maxDays <= 60;
        if (ageFilter === "61-90") return maxDays >= 61 && maxDays <= 90;
        if (ageFilter === "90+") return maxDays > 90;
        return true;
      }
      if (statusFilter === "activos") return isClientActive(debt);
      if (statusFilter === "credito") return isClientCredit(debt);
      return true;
    })
    .sort((a, b) => {
      if (statusFilter === "rechazados") {
        if (sortBy === "age") {
          return getMaxOverdueDays(b) - getMaxOverdueDays(a); // Más antiguo primero
        }
        return getEquivUSD(b) - getEquivUSD(a); // Mayor deudor primero (por defecto)
      }
      return 0;
    });

  if ((isLoading || (isInitialFetching && data?.hasMore)) && allClients.length === 0) {
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
      <SearchHeader
        title="Cuentas por cobrar"
        placeholder="Buscar nombre de cliente"
        searchValue={searchValue}
        onSearch={handleClientSearch}
        onSearchInputChange={handleSearchInputChange}
        refreshQueries={refreshQueries}
      />

      {!isSellerProfile && (
        <Box maxW="1200px" mx="auto" px={4} pb={2}>
          <SellerSelectReceivable
            selectedSeller={selectedSeller}
            setSelectedSeller={handleSellerChange}
            setValue={() => {}}
            error={null}
          />
        </Box>
      )}

      {/* Contadores interactivos de estado */}
      <Box maxW="1200px" mx="auto" pt={3} px={4}>
        <ReceivableStatusFilter
          activeFilter={statusFilter}
          onFilterChange={setStatusFilter}
          totalCount={totalCount}
          overdueCount={overdueCount}
          onTimeCount={onTimeCount}
          creditCount={creditCount}
          ageFilter={ageFilter}
          onAgeFilterChange={setAgeFilter}
          sortBy={sortBy}
          onSortByChange={setSortBy}
        />
      </Box>

      <Box maxW="1200px" mx="auto" p={4} pt={2}>
        <DebtList debts={filteredClients} onViewInvoices={handleViewInvoices} onViewDetails={() => {}} />

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
