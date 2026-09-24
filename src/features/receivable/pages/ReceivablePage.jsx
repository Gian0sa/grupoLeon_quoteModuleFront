import { Box, Spinner, Center, Alert, AlertIcon, Button, HStack, Text } from "@chakra-ui/react";
import { SearchHeader } from "../components/SearchHeader";
import { DebtList } from "../components/DebtList";
import { ReceivableStatusFilter } from "../components/ReceivableStatusFilter";
import SellerSelectReceivable from "../components/SellerSelectReceivable";
import { useGetAccountsReceivable } from "../hooks/receivableQueries";
import { useState, useEffect, useRef, useMemo } from "react";
import InvoicesModal from "../components/InvoicesModal";
import ClientInvoiceHistoryModal from "../components/ClientInvoiceHistoryModal";
import { useAuthStore } from "../../auth/stores/useAuthStore";
import { useHasAccess, useIsAdmin } from "../../../shared/utils/permissions";
import { QUERY_KEYS } from "../../../shared/utils/queryKeys";
import { History } from "lucide-react";

export function ReceivablePage() {
  const [cliente, setCliente] = useState("");
  const [clientecode, setClientecode] = useState("");
  const [searchValue, setSearchValue] = useState("");
  const [selectedSeller, setSelectedSeller] = useState(null);
  const [selectedClient, setSelectedClient] = useState(null);
  const [selectedInvoices, setSelectedInvoices] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [historyTargetClient, setHistoryTargetClient] = useState(null);
  const [statusFilter, setStatusFilter] = useState("all"); // 'all' | 'overdue' | 'onTime'

  const [lastClient, setLastClient] = useState(null); 
  const [currentSkip, setCurrentSkip] = useState(0);
  const [allClients, setAllClients] = useState([]);  

  const username = useAuthStore((state) => state.username);
  const sellerCode = useAuthStore((state) => state.salesEmployeeCode);
  const hasAccess = useHasAccess();
  const isAdmin = useIsAdmin();

  // Puede ver todas las cuentas por cobrar si es admin, supervisor o facturación / créditos
  const canViewAllReceivables =
    isAdmin ||
    hasAccess("POST:/quotes/approval") ||
    hasAccess("POST /quotes/approval") ||
    hasAccess("GET:/historyClientAdmin") ||
    hasAccess("GET /historyClientAdmin") ||
    hasAccess("GET:/sellers") ||
    hasAccess("GET /sellers") ||
    !sellerCode;

  // Un vendedor regular puro (sin facturación ni admin) solo ve su propia cartera
  const isPureSeller = !canViewAllReceivables && !!sellerCode;

  useEffect(() => {
    if (isPureSeller) {
      setSelectedSeller({
        value: sellerCode,
        label: `${sellerCode}. ${username}`,
      });
    } else if (canViewAllReceivables) {
      // Inicia por defecto en "Todos los vendedores" para Facturación / Supervisor / Admin
      setSelectedSeller({
        value: "",
        label: "Todos los vendedores",
      });
    }
  }, [isPureSeller, canViewAllReceivables, sellerCode, username]);

  const handleClientSearch = (value) => {
    const trimmedValue = (value || "").trim();
    if (/^\d+$/.test(trimmedValue)) {
      setClientecode(`CL${trimmedValue}`);
      setCliente("");
    } else {
      setCliente(trimmedValue);
      setClientecode("");
    }
    setLastClient(null);
    setCurrentSkip(0);
    setAllClients([]);
    setSearchValue(value || "");
  };

  const handleSearchInputChange = (value) => setSearchValue(value);

  const handleSellerChange = (seller) => {
    if (selectedSeller?.value !== seller?.value) {
      setSelectedSeller(seller);
      setCliente("");
      setClientecode("");
      setSearchValue("");
      setLastClient(null);
      setCurrentSkip(0);
      setAllClients([]);
    }
  };

  const sanitizeDocs = (docs) => {
    if (!Array.isArray(docs)) return [];
    return docs.filter((d) => {
      const info = (d?.INFORMACION_DETALLADA || d?.detalle || '').toLowerCase();
      const tipo = (d?.tipoDocumento || d?.TIPO_DOC || '').toLowerCase();
      const numDoc = (d?.numeroDocumento || d?.NRO_DOC || '').trim();
      if (!numDoc || numDoc === '—' || numDoc === '-' || numDoc.toLowerCase() === 'null') return false;
      if (tipo.includes('otro')) return false;
      if (info.includes('dif. cambio') || info.includes('diferencia de cambio')) return false;
      return true;
    });
  };

  const handleViewInvoices = (debt) => {
    const cleanDocs = sanitizeDocs(debt.documents || []);
    setSelectedClient({ ...debt, documents: cleanDocs });
    setSelectedInvoices(cleanDocs);
    setIsModalOpen(true);
  };

  const handleViewHistory = (debtOrClient) => {
    setHistoryTargetClient(debtOrClient);
    setIsHistoryModalOpen(true);
  };

  const vendedorNombre = isPureSeller
    ? username
    : (cliente || clientecode)
      ? "" // Si busca un cliente específico, buscar en toda la cartera
      : (selectedSeller?.value ? (selectedSeller.label.includes(".") ? selectedSeller.label.split(".")[1].trim() : selectedSeller.label) : "");

  const { data, isLoading, error } = useGetAccountsReceivable({
    vendedor: vendedorNombre,
    cliente: cliente.toUpperCase(),
    clientecode,
    lastClient,
    skip: currentSkip,
  });

  const [isInitialFetching, setIsInitialFetching] = useState(true);

  useEffect(() => {
    const rawIncomingClients = Array.isArray(data?.clients?.clients)
      ? data.clients.clients
      : Array.isArray(data?.clients)
      ? data.clients
      : null;

    if (rawIncomingClients) {
      const incomingClients = rawIncomingClients
        .map((c) => ({
          ...c,
          documents: sanitizeDocs(c.documents || []),
        }))
        .filter((c) => Array.isArray(c.documents) && c.documents.length > 0);

      setAllClients((prev) => {
        const newClients = incomingClients;
        if (!lastClient && currentSkip === 0) return newClients;
        
        // Actualizar clientes existentes con sus nuevos datos de SAP
        const incomingMap = new Map(newClients.map((c) => [c.clientCode || c.cardCode, c]));
        const updatedPrev = prev.map((c) => {
          const code = c.clientCode || c.cardCode;
          return incomingMap.has(code) ? incomingMap.get(code) : c;
        });

        const existingCodes = new Set(prev.map((c) => c.clientCode || c.cardCode));
        const trulyNew = newClients.filter((c) => !existingCodes.has(c.clientCode || c.cardCode));
        return [...updatedPrev, ...trulyNew];
      });
    }

    // 🔄 Autocarga secuencial de páginas para consolidar la cartera completa
    if (data?.hasMore && (data?.lastClient || data?.nextSkip != null)) {
      const timer = setTimeout(() => {
        setLastClient(data.lastClient);
        setCurrentSkip(data.nextSkip || 0);
      }, 100);
      return () => clearTimeout(timer);
    } else if (!data?.hasMore) {
      setIsInitialFetching(false);
    }
  }, [data]);

  const refreshQueries = [
    [QUERY_KEYS.accountsReceivable, vendedorNombre, cliente.toUpperCase(), clientecode, lastClient, currentSkip]
  ];

  // 1. Helper para identificar si un cliente es de TARJETA AZUL (Saldo neto a favor del cliente)
  const isClientCredit = (c) => {
    const penPending = Number(c.pendingAmount?.PEN ?? c.saldoPEN ?? 0);
    const usdPending = Number(c.pendingAmount?.USD ?? c.saldoUSD ?? 0);
    
    // Si el saldo neto total es a favor del cliente (negativo) y no tiene deuda positiva, es azul
    return (penPending < 0 || usdPending < 0) && penPending <= 0 && usdPending <= 0;
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

  // Conteos exactos y mutuamente excluyentes para las 4 pestañas memoizados:
  const totalCount = useMemo(() => allClients.length, [allClients]);
  const overdueCount = useMemo(() => allClients.filter(isClientOverdue).length, [allClients]);
  const creditCount = useMemo(() => allClients.filter(isClientCredit).length, [allClients]);
  const onTimeCount = useMemo(() => allClients.filter(isClientActive).length, [allClients]);

  const [ageFilter, setAgeFilter] = useState("all"); // 'all' | '1-30' | '31-60' | '61-90' | '90+'
  const [sortBy, setSortBy] = useState("debt"); // 'debt' | 'age'

  const getMaxOverdueDays = (c) => {
    const docs = c.documents || [];
    const overdueDays = docs
      .filter((d) => d.estaVencido || d.isOverdue)
      .map((d) => Number(d.diasVencimiento || 0));
    return overdueDays.length > 0 ? Math.max(...overdueDays) : 0;
  };

  const getEquivUSD = (c) => {
    const overduePEN = Number(c.overdueAmount?.PEN ?? c.saldoVencidoPEN ?? 0);
    const overdueUSD = Number(c.overdueAmount?.USD ?? c.saldoVencidoUSD ?? 0);
    return (overduePEN > 0 ? overduePEN / 3.43 : 0) + (overdueUSD > 0 ? overdueUSD : 0);
  };

  // RN-FECHAS-03 y RN-FECHAS-04: Filtrado por tramo de días de mora y ordenación inteligente con useMemo
  const filteredClients = useMemo(() => {
    return allClients
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
  }, [allClients, statusFilter, ageFilter, sortBy]);

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
            {error.message || "Error al cargar los datos"}
          </Alert>
        </Center>
      </Box>
    );
  }

  return (
    <Box bg="gray.50" minH="100vh" pb={8}>
      <SearchHeader
        title="Cuentas por cobrar"
        placeholder="Buscar nombre de cliente"
        searchValue={searchValue}
        onSearch={handleClientSearch}
        onSearchInputChange={handleSearchInputChange}
        refreshQueries={refreshQueries}
      />

      {/* Selector de vendedor para perfil Facturación, Supervisor y Administrador */}
      {canViewAllReceivables && (
        <Box maxW="1200px" mx="auto" px={4} pt={2} pb={1}>
          <SellerSelectReceivable
            selectedSeller={selectedSeller}
            setSelectedSeller={handleSellerChange}
            setValue={() => {}}
            error={null}
          />
        </Box>
      )}

      {/* Barra de progreso de consolidación de cartera en background */}
      {isInitialFetching && data?.hasMore && allClients.length > 0 && (
        <Box maxW="1200px" mx="auto" px={4} pt={2}>
          <HStack spacing={2} bg="#f8fafc" p={2} px={3} borderRadius="lg" border="1px solid" borderColor="#e2e8f0">
            <Spinner size="xs" color="#0284c7" />
            <Text fontSize="xs" color="#475569" fontWeight="600">
              Consolidando cartera ({allClients.length} clientes cargados)...
            </Text>
          </HStack>
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

      {/* Banner de Consulta Histórica SAP si hay búsqueda activa */}
      {searchValue.trim().length >= 4 && (
        <Box maxW="1200px" mx="auto" px={4} pt={1} pb={2}>
          <HStack
            bg="blue.50"
            border="1px solid"
            borderColor="blue.200"
            borderRadius="xl"
            p={3}
            px={4}
            justify="space-between"
            align="center"
            flexWrap="wrap"
            gap={2}
          >
            <HStack spacing={2.5}>
              <Box p={1.5} bg="blue.100" color="blue.700" borderRadius="md">
                <History size={16} />
              </Box>
              <Text fontSize="13px" fontWeight="600" color="blue.950">
                ¿Deseas consultar facturas pasadas o pagadas para <strong>"{searchValue.trim()}"</strong>?
              </Text>
            </HStack>
            <Button
              size="sm"
              colorScheme="blue"
              bg="#0284c7"
              _hover={{ bg: "#0369a1" }}
              borderRadius="full"
              px={4}
              fontSize="12px"
              fontWeight="700"
              leftIcon={<History size={14} />}
              onClick={() =>
                handleViewHistory({
                  clientCode: searchValue.trim(),
                  clientName: filteredClients[0]?.clientName || searchValue.trim(),
                })
              }
            >
              Consultar Historial
            </Button>
          </HStack>
        </Box>
      )}

      <Box maxW="1200px" mx="auto" p={4} pt={2}>
        <DebtList
          debts={filteredClients}
          onViewInvoices={handleViewInvoices}
          onViewHistory={handleViewHistory}
          onViewDetails={() => {}}
        />

        {data?.hasMore && !isInitialFetching && (
          <Center mt={4}>
            <Button
              size="sm"
              variant="outline"
              colorScheme="blue"
              borderRadius="full"
              px={6}
              onClick={() => {
                setLastClient(data.lastClient);
                setCurrentSkip(data.nextSkip || 0);
              }}
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
        cliente={selectedClient}
        documentos={selectedInvoices}
        onOpenHistory={(cli) => handleViewHistory(cli || selectedClient)}
      />

      <ClientInvoiceHistoryModal
        isOpen={isHistoryModalOpen}
        onClose={() => {
          setIsHistoryModalOpen(false);
          setHistoryTargetClient(null);
        }}
        clientDocOrCode={
          historyTargetClient?.clientCode ||
          historyTargetClient?.ruc ||
          historyTargetClient?.cardCode ||
          historyTargetClient?.CARDCODE ||
          (typeof historyTargetClient === "string" ? historyTargetClient : "")
        }
        clientName={
          historyTargetClient?.clientName ||
          historyTargetClient?.nombre ||
          historyTargetClient?.CARDNAME ||
          ""
        }
      />
    </Box>
  );
}
