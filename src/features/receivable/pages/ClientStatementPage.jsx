import React, { useMemo, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  Box,
  Container,
  Flex,
  Heading,
  Text,
  Badge,
  HStack,
  VStack,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  TableContainer,
  Divider,
  Button,
  Grid,
  GridItem,
  Input,
  IconButton,
  Tooltip,
} from "@chakra-ui/react";
import {
  Printer,
  FileText,
  Calendar,
  DollarSign,
  User,
  ShieldCheck,
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  Clock,
  Building,
  Search,
  Download,
  LayoutList,
  CreditCard,
  Layers,
} from "lucide-react";
import {
  decodeStatementToken,
  fetchPublicStatementByCode,
  calculateVD,
} from "../utils/statementTokenUtils";
import { generateAccountStatementPDF } from "../utils/receivablePDF";
import { Spinner } from "@chakra-ui/react";

export function ClientStatementPage() {
  const { token, code } = useParams();
  const navigate = useNavigate();
  const [filterType, setFilterType] = useState("all"); // all | overdue | current
  const [searchTerm, setSearchTerm] = useState("");
  const [viewMode, setViewMode] = useState("cards"); // 'cards' | 'table' para móviles
  const [remoteData, setRemoteData] = useState(null);
  const [isLoading, setIsLoading] = useState(Boolean(code));
  const [hasError, setHasError] = useState(false);
  const [isDownloadingPdf, setIsDownloadingPdf] = useState(false);

  // Cargar datos remotos si viene de enlace corto (/s/:code)
  React.useEffect(() => {
    if (!code) return;
    let isMounted = true;
    setIsLoading(true);
    setHasError(false);

    fetchPublicStatementByCode(code)
      .then((data) => {
        if (isMounted) {
          if (data) {
            setRemoteData(data);
          } else {
            setHasError(true);
          }
          setIsLoading(false);
        }
      })
      .catch(() => {
        if (isMounted) {
          setHasError(true);
          setIsLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [code]);

  // Decodificar el estado de cuenta desde el token local o desde backend
  const statementData = useMemo(() => {
    if (remoteData) return remoteData;
    if (token) return decodeStatementToken(token);
    return null;
  }, [remoteData, token]);

  const {
    clientName,
    clientCode,
    salesperson,
    docs,
    createdAt,
    hasOverdue,
    totalSaldoPEN,
    totalSaldoUSD,
    vencidos,
    porVencer,
    venceHoy,
    totalVencidosUSD,
    totalPorVencerUSD,
    totalFacturasUSD,
    totalBoletasUSD,
    totalLetrasUSD,
    totalLetrasCarteraUSD,
    totalLetrasBancoUSD,
    totalNCUSD,
    totalNDUSD,
  } = useMemo(() => {
    if (!statementData) {
      return {
        clientName: "—",
        clientCode: "",
        salesperson: "—",
        docs: [],
        createdAt: new Date().toISOString(),
        hasOverdue: false,
        totalSaldoPEN: 0,
        totalSaldoUSD: 0,
        vencidos: [],
        porVencer: [],
        venceHoy: [],
        totalVencidosUSD: 0,
        totalPorVencerUSD: 0,
        totalFacturasUSD: 0,
        totalBoletasUSD: 0,
        totalLetrasUSD: 0,
        totalLetrasCarteraUSD: 0,
        totalLetrasBancoUSD: 0,
        totalNCUSD: 0,
        totalNDUSD: 0,
      };
    }

    const cName = statementData.cName || "CLIENTE";
    const cCode = statementData.cCode || "";
    const sales = statementData.sales || "Autopartes S.A.";
    const rawDocs = statementData.docs || [];

    let sumPEN = 0;
    let sumUSD = 0;
    let vList = [];
    let pvList = [];
    let vhList = [];

    let facUSD = 0;
    let bolUSD = 0;
    let letUSD = 0;
    let letCarteraUSD = 0;
    let letBancoUSD = 0;
    let ncUSD = 0;
    let ndUSD = 0;

    const parsedDocs = rawDocs.map((d) => {
      const isOverdue = d.vdStatus === "VENCIDO";
      const isVenceHoy = d.vdStatus === "VENCE_HOY";
      const sPen = Number(d.sPen || 0);
      const sUsd = Number(d.sUsd || 0);

      sumPEN += sPen;
      sumUSD += sUsd;

      const docObj = {
        ...d,
        isOverdue,
        isVenceHoy,
      };

      if (isOverdue) vList.push(docObj);
      else if (isVenceHoy) vhList.push(docObj);
      else pvList.push(docObj);

      // Clasificación para resumen
      const numUpper = (d.num || "").toUpperCase();
      if (d.esLetra || numUpper.startsWith("LC-") || numUpper.startsWith("LT-")) {
        letUSD += sUsd;
        if (d.isVD) {
          letCarteraUSD += sUsd;
        } else {
          letBancoUSD += sUsd;
        }
      } else if (numUpper.startsWith("FAC-")) {
        facUSD += sUsd;
      } else if (numUpper.startsWith("BOL-")) {
        bolUSD += sUsd;
      } else if (numUpper.startsWith("NC-")) {
        ncUSD += sUsd;
      } else if (numUpper.startsWith("ND-")) {
        ndUSD += sUsd;
      }

      return docObj;
    });

    const sumVencidosUSD = vList.reduce((acc, d) => acc + (d.sUsd || 0), 0);
    const sumPorVencerUSD = pvList.reduce((acc, d) => acc + (d.sUsd || 0), 0);

    return {
      clientName: cName,
      clientCode: cCode,
      salesperson: sales,
      docs: parsedDocs,
      createdAt: statementData.createdAt || new Date().toISOString(),
      hasOverdue: vList.length > 0,
      totalSaldoPEN: sumPEN,
      totalSaldoUSD: sumUSD,
      vencidos: vList,
      porVencer: pvList,
      venceHoy: vhList,
      totalVencidosUSD: sumVencidosUSD,
      totalPorVencerUSD: sumPorVencerUSD,
      totalFacturasUSD: facUSD,
      totalBoletasUSD: bolUSD,
      totalLetrasUSD: letUSD,
      totalLetrasCarteraUSD: letCarteraUSD,
      totalLetrasBancoUSD: letBancoUSD,
      totalNCUSD: ncUSD,
      totalNDUSD: ndUSD,
    };
  }, [statementData]);

  // Filtrado de documentos para la grilla
  const filteredDocs = useMemo(() => {
    return docs.filter((d) => {
      if (filterType === "overdue" && !d.isOverdue) return false;
      if (filterType === "current" && (d.isOverdue || d.isVenceHoy)) return false;

      if (searchTerm.trim()) {
        const term = searchTerm.toLowerCase().trim();
        const num = (d.num || "").toLowerCase();
        const ref = (d.ref || "").toLowerCase();
        const cond = (d.con || "").toLowerCase();
        const uni = (d.uni || "").toLowerCase();
        return num.includes(term) || ref.includes(term) || cond.includes(term) || uni.includes(term);
      }
      return true;
    });
  }, [docs, filterType, searchTerm]);

  // Formato de fechas
  const dateObj = new Date(createdAt);
  const dateFormatted = dateObj.toLocaleDateString("es-PE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
  const timeFormatted = dateObj.toTimeString().split(" ")[0];

  const months = [
    "enero", "febrero", "marzo", "abril", "mayo", "junio",
    "julio", "agosto", "setiembre", "octubre", "noviembre", "diciembre"
  ];
  const dateLongStr = `${dateObj.getDate()} de ${months[dateObj.getMonth()]} de ${dateObj.getFullYear()}`;

  // Manejador directo de descarga de PDF para móviles y escritorio
  const handleDownloadPdf = async () => {
    if (!statementData) return;
    setIsDownloadingPdf(true);
    try {
      const cleanSlug = (clientCode || "CLIENTE").replace(/[^a-zA-Z0-9]/g, "");
      await generateAccountStatementPDF(statementData, {
        filename: `EstadoDeCuenta_${cleanSlug}_${dateFormatted.replace(/\//g, "-")}.pdf`,
        autoDownload: true,
      });
    } catch (err) {
      console.error("Error al descargar PDF:", err);
    } finally {
      setIsDownloadingPdf(false);
    }
  };

  if (isLoading) {
    return (
      <Container maxW="container.md" py={28} textAlign="center">
        <VStack spacing={4}>
          <Spinner size="xl" color="emerald.600" thickness="4px" speed="0.7s" />
          <Heading size="sm" color="gray.700" fontWeight="800">
            Cargando Estado de Cuenta Oficial...
          </Heading>
          <Text fontSize="xs" color="gray.500">
            Autopartes S.A. • Consulta Segura
          </Text>
        </VStack>
      </Container>
    );
  }

  if (!statementData || hasError) {
    return (
      <Container maxW="container.md" py={16} textAlign="center">
        <Box bg="white" p={8} borderRadius="2xl" border="1px solid" borderColor="red.200" boxShadow="lg">
          <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-3" />
          <Heading size="md" color="red.800" mb={2}>
            Estado de Cuenta No Encontrado o Caducado
          </Heading>
          <Text fontSize="sm" color="gray.600" mb={6}>
            El enlace que intentas consultar no contiene datos válidos o ha expirado. Por favor, solicita a tu asesor comercial de Autopartes S.A. que te reenvíe el enlace actualizado.
          </Text>
        </Box>
      </Container>
    );
  }

  return (
    <Box bg="#f1f5f9" minH="100vh" py={{ base: 3, md: 8 }} px={{ base: 2, sm: 4 }}>
      {/* Botones de Acción Superiores (No se imprimen) */}
      <Container maxW="container.lg" mb={3} className="no-print" px={{ base: 1, sm: 4 }}>
        <Flex justify="flex-end" align="center" wrap="wrap" gap={2}>
          <HStack spacing={2}>
            <Button
              size={{ base: "xs", sm: "sm" }}
              colorScheme="green"
              bg="#126C36"
              _hover={{ bg: "#0e572b" }}
              leftIcon={<Download className="w-4 h-4" />}
              onClick={handleDownloadPdf}
              isLoading={isDownloadingPdf}
              fontWeight="800"
              borderRadius="lg"
              boxShadow="sm"
            >
              Descargar PDF
            </Button>
            <Button
              size={{ base: "xs", sm: "sm" }}
              variant="outline"
              bg="white"
              colorScheme="gray"
              leftIcon={<Printer className="w-4 h-4" />}
              onClick={() => window.print()}
              fontWeight="700"
              borderRadius="lg"
              display={{ base: "none", sm: "inline-flex" }}
            >
              Imprimir
            </Button>
          </HStack>
        </Flex>
      </Container>

      {/* DOCUMENTO PRINCIPAL (Hoja A4 Oficial SAP B1) */}
      <Container
        maxW="container.lg"
        bg="white"
        p={{ base: 3.5, sm: 6, md: 10 }}
        borderRadius={{ base: "xl", md: "2xl" }}
        boxShadow={{ base: "sm", md: "xl" }}
        border="1px solid"
        borderColor="gray.200"
        id="statement-printable-sheet"
      >
        {/* Cabecera Oficial Autopartes S.A. */}
        <Flex justify="space-between" align="flex-start" mb={3}>
          <Box>
            <Text fontSize={{ base: "17px", md: "22px" }} fontWeight="900" color="#126C36" letterSpacing="tight">
              Autopartes s.a.
            </Text>
          </Box>

          <VStack align="flex-end" spacing={0.5} fontSize={{ base: "10px", md: "xs" }} color="gray.700">
            <Text fontWeight="700">Fecha {dateFormatted}</Text>
            <Text fontWeight="600">Hora {timeFormatted}</Text>
            <Text color="gray.500" fontSize="10px">Página 1 de 1</Text>
          </VStack>
        </Flex>

        {/* Título Principal */}
        <Box textAlign="center" my={{ base: 2, md: 3 }}>
          <Heading size={{ base: "xs", md: "sm" }} color="gray.900" fontWeight="900" letterSpacing="wide" textTransform="uppercase">
            *** Estado de Cuenta de Clientes ***
          </Heading>
          <Text fontSize={{ base: "11px", md: "xs" }} color="gray.600" fontWeight="600" mt={0.5}>
            Estado de Cuenta al {dateLongStr}
          </Text>
        </Box>

        {/* Hero Card de Estado Financiero */}
        <Box
          bg={hasOverdue ? "#fff1f2" : "#f0fdf4"}
          p={{ base: 3, md: 4 }}
          borderRadius="xl"
          border="1.5px solid"
          borderColor={hasOverdue ? "#fecdd3" : "#bbf7d0"}
          mb={4}
        >
          <Flex direction={{ base: "column", sm: "row" }} justify="space-between" align={{ base: "flex-start", sm: "center" }} gap={3}>
            <HStack spacing={3}>
              <Flex
                w="36px"
                h="36px"
                borderRadius="full"
                bg={hasOverdue ? "#e11d48" : "#16a34a"}
                align="center"
                justify="center"
                color="white"
                flexShrink={0}
              >
                {hasOverdue ? <AlertTriangle className="w-5 h-5" /> : <CheckCircle2 className="w-5 h-5" />}
              </Flex>
              <Box>
                <Badge
                  colorScheme={hasOverdue ? "red" : "green"}
                  variant="solid"
                  fontSize="11px"
                  px={2.5}
                  py={0.5}
                  borderRadius="full"
                  fontWeight="900"
                >
                  {hasOverdue ? `⚠️ ${vencidos.length} CUOTAS VENCIDAS` : "✅ CLIENTE AL DÍA"}
                </Badge>
                <Text fontSize={{ base: "11px", sm: "xs" }} color="gray.700" fontWeight="600" mt={1}>
                  {hasOverdue
                    ? "Registra documentos vencidos que requieren regularización."
                    : "No registra documentos vencidos a la fecha de corte."}
                </Text>
              </Box>
            </HStack>

            <HStack spacing={4} align="center" w={{ base: "full", sm: "auto" }} justify={{ base: "space-between", sm: "flex-end" }}>
              <Box textAlign={{ base: "left", sm: "right" }}>
                <Text fontSize="10px" color="gray.500" fontWeight="700" textTransform="uppercase">Saldo Total USD</Text>
                <Text fontSize={{ base: "md", sm: "xl" }} fontWeight="900" color="gray.900" fontFamily="mono">
                  ${totalSaldoUSD.toFixed(2)}
                </Text>
              </Box>
              {totalSaldoPEN > 0 && (
                <Box textAlign="right">
                  <Text fontSize="10px" color="gray.500" fontWeight="700" textTransform="uppercase">Saldo PEN</Text>
                  <Text fontSize={{ base: "md", sm: "xl" }} fontWeight="900" color="gray.900" fontFamily="mono">
                    S/ {totalSaldoPEN.toFixed(2)}
                  </Text>
                </Box>
              )}
            </HStack>
          </Flex>
        </Box>

        {/* Datos del Vendedor y Cliente */}
        <Box mb={4}>
          <Box textAlign="center" mb={2}>
            <Text fontSize="xs" fontWeight="900" color="gray.900" textDecoration="underline" textUnderlineOffset="3px">
              Vendedor: {salesperson}
            </Text>
          </Box>

          <Flex
            justify="space-between"
            align={{ base: "flex-start", sm: "center" }}
            direction={{ base: "column", sm: "row" }}
            gap={2}
            bg="gray.50"
            p={2.5}
            borderRadius="lg"
            border="1px solid"
            borderColor="gray.200"
          >
            <HStack spacing={2} wrap="wrap">
              <Text fontFamily="mono" fontSize="xs" fontWeight="900" color="emerald.800">
                {clientCode}
              </Text>
              <Text fontSize="xs" fontWeight="800" color="gray.900">
                "{clientName}"
              </Text>
            </HStack>
            <Badge colorScheme="gray" fontSize="10px" px={2} borderRadius="md">
              {docs.length} {docs.length === 1 ? "documento" : "documentos"}
            </Badge>
          </Flex>
        </Box>

        {/* Barra de Filtros, Búsqueda y Switch Móvil (No se imprime) */}
        <Flex justify="space-between" align="center" wrap="wrap" gap={2} mb={3} className="no-print">
          <HStack spacing={1.5} wrap="wrap" w={{ base: "full", sm: "auto" }}>
            <Button
              size="xs"
              variant={filterType === "all" ? "solid" : "outline"}
              colorScheme="green"
              onClick={() => setFilterType("all")}
              fontWeight="800"
            >
              Todos ({docs.length})
            </Button>
            <Button
              size="xs"
              variant={filterType === "overdue" ? "solid" : "outline"}
              colorScheme="red"
              onClick={() => setFilterType("overdue")}
              fontWeight="800"
            >
              Vencidos ({vencidos.length})
            </Button>
            <Button
              size="xs"
              variant={filterType === "current" ? "solid" : "outline"}
              colorScheme="teal"
              onClick={() => setFilterType("current")}
              fontWeight="800"
            >
              Por Vencer ({porVencer.length + venceHoy.length})
            </Button>
          </HStack>

          <Flex gap={2} w={{ base: "full", sm: "auto" }} justify="space-between" align="center">
            <Box maxW={{ base: "full", sm: "220px" }} flex="1">
              <Input
                size="xs"
                placeholder="Buscar documento o cuota..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                borderRadius="md"
              />
            </Box>
            {/* Switch de Vista en Móvil */}
            <HStack spacing={1} display={{ base: "flex", md: "none" }}>
              <Button
                size="xs"
                variant={viewMode === "cards" ? "solid" : "outline"}
                colorScheme="purple"
                onClick={() => setViewMode("cards")}
                fontWeight="700"
                px={2}
              >
                Tarjetas
              </Button>
              <Button
                size="xs"
                variant={viewMode === "table" ? "solid" : "outline"}
                colorScheme="purple"
                onClick={() => setViewMode("table")}
                fontWeight="700"
                px={2}
              >
                Tabla
              </Button>
            </HStack>
          </Flex>
        </Flex>

        {/* VISTA 1: TARJETAS RESPONSIVAS PARA MÓVIL (Táctil, sin recortes) */}
        <Box display={{ base: viewMode === "cards" ? "block" : "none", md: "none" }} className="mobile-cards-view no-print" mb={4}>
          {filteredDocs.length === 0 ? (
            <Box textAlign="center" py={8} bg="gray.50" borderRadius="lg" border="1px dashed" borderColor="gray.300">
              <Text fontSize="xs" color="gray.500">No se encontraron documentos pendientes.</Text>
            </Box>
          ) : (
            <VStack align="stretch" spacing={2.5}>
              {filteredDocs.map((doc, idx) => {
                let serieText = doc.num;
                if (doc.ref && doc.ref !== doc.num) serieText += ` / ${doc.ref}`;
                if (doc.fol && doc.fol !== doc.num && doc.fol !== doc.ref) serieText += ` (${doc.fol})`;

                return (
                  <Box
                    key={idx}
                    bg="white"
                    p={3}
                    borderRadius="xl"
                    border="1px solid"
                    borderColor={doc.isOverdue ? "red.200" : "gray.200"}
                    boxShadow="xs"
                    borderLeft="4px solid"
                    borderLeftColor={doc.isOverdue ? "red.500" : doc.isVD ? "purple.500" : "emerald.500"}
                  >
                    <Flex justify="space-between" align="flex-start" mb={1.5}>
                      <Box>
                        <HStack spacing={1.5} wrap="wrap">
                          <Text fontFamily="mono" fontSize="xs" fontWeight="900" color="gray.900">
                            {serieText}
                          </Text>
                          {doc.isVD && (
                            <Badge colorScheme="purple" variant="solid" fontSize="9px" px={1.5} borderRadius="sm">
                              VD
                            </Badge>
                          )}
                        </HStack>
                        <Text fontSize="10px" color="gray.500" fontWeight="600" mt={0.5}>
                          Condición: {doc.con || "—"} {doc.uni ? `• Cód. Único: ${doc.uni}` : ""}
                        </Text>
                      </Box>
                      <Badge
                        colorScheme={doc.isOverdue ? "red" : "green"}
                        fontSize="10px"
                        px={2}
                        py={0.5}
                        borderRadius="full"
                      >
                        {doc.isOverdue ? "VENCIDO" : "AL DÍA"}
                      </Badge>
                    </Flex>

                    <Flex justify="space-between" align="center" bg="gray.50" p={2} borderRadius="md" my={1.5} fontSize="11px">
                      <Box>
                        <Text fontSize="9px" color="gray.500" fontWeight="700">EMISIÓN</Text>
                        <Text fontWeight="600" color="gray.700">{doc.emi || "—"}</Text>
                      </Box>
                      <Box textAlign="center">
                        <Text fontSize="9px" color="gray.500" fontWeight="700">VENCIMIENTO</Text>
                        <Text fontWeight="800" color={doc.isOverdue ? "red.600" : "gray.800"}>
                          {doc.ven || "—"}
                        </Text>
                      </Box>
                      <Box textAlign="right">
                        <Text fontSize="9px" color="gray.500" fontWeight="700">MONTO ORIGINAL</Text>
                        <Text fontWeight="600" fontFamily="mono">{doc.mon} {doc.tot.toFixed(2)}</Text>
                      </Box>
                    </Flex>

                    <Flex justify="space-between" align="center" pt={1}>
                      <Text fontSize="11px" fontWeight="700" color="gray.600">Saldo Pendiente:</Text>
                      <HStack spacing={2} fontFamily="mono">
                        {doc.sPen > 0 && (
                          <Text fontSize="xs" fontWeight="700" color="gray.700">
                            S/ {doc.sPen.toFixed(2)}
                          </Text>
                        )}
                        <Text fontSize="sm" fontWeight="900" color={doc.sUsd > 0 ? "emerald.800" : "gray.700"}>
                          ${doc.sUsd.toFixed(2)} USD
                        </Text>
                      </HStack>
                    </Flex>
                  </Box>
                );
              })}
            </VStack>
          )}
        </Box>

        {/* VISTA 2: TABLA CLÁSICA OFICIAL SAP B1 (Para PC y para Impresión) */}
        <Box display={{ base: viewMode === "table" ? "block" : "none", md: "block" }} className="print-desktop-table">
          <TableContainer mb={4} borderRadius="lg" border="1px solid" borderColor="gray.300" overflowX="auto">
            <Table size="sm" variant="simple" fontSize="xs">
              <Thead bg="#f8fafc" borderBottom="2px solid #0f172a">
                <Tr>
                  <Th py={2} px={2} fontSize="10px" color="gray.900" fontWeight="900">EMISIÓN</Th>
                  <Th py={2} px={2} fontSize="10px" color="gray.900" fontWeight="900">VENCE</Th>
                  <Th py={2} px={2} fontSize="10px" color="gray.900" fontWeight="900">CONDICIÓN DE PAGO</Th>
                  <Th py={2} px={1} w="28px"></Th>
                  <Th py={2} px={2} fontSize="10px" color="gray.900" fontWeight="900">SERIE - DOCUMENTO</Th>
                  <Th py={2} px={2} fontSize="10px" color="gray.900" fontWeight="900">CODIGO UNICO</Th>
                  <Th py={2} px={2} fontSize="10px" color="gray.900" fontWeight="900" textAlign="right">MONTO</Th>
                  <Th py={2} px={2} fontSize="10px" color="gray.900" fontWeight="900" textAlign="right">SALDO PEN</Th>
                  <Th py={2} px={2} fontSize="10px" color="gray.900" fontWeight="900" textAlign="right">SALDO USD</Th>
                </Tr>
              </Thead>
              <Tbody>
                {filteredDocs.length === 0 ? (
                  <Tr>
                    <Td colSpan={9} textAlign="center" py={6} color="gray.500">
                      No se encontraron documentos pendientes para el filtro seleccionado.
                    </Td>
                  </Tr>
                ) : (
                  filteredDocs.map((doc, idx) => {
                    let serieText = doc.num;
                    if (doc.ref && doc.ref !== doc.num) serieText += ` ${doc.ref}`;
                    if (doc.fol && doc.fol !== doc.num && doc.fol !== doc.ref) serieText += ` ${doc.fol}`;

                    return (
                      <Tr key={idx} _hover={{ bg: "gray.50" }} transition="background 0.15s">
                        <Td px={2} py={1.5} fontSize="11px" fontWeight="600">{doc.emi || "—"}</Td>
                        <Td
                          px={2}
                          py={1.5}
                          fontSize="11px"
                          fontWeight="700"
                          bg={doc.isOverdue ? "#fee2e2" : undefined}
                          color={doc.isOverdue ? "#991b1b" : "inherit"}
                          borderRadius={doc.isOverdue ? "sm" : undefined}
                        >
                          {doc.ven || "—"}
                        </Td>
                        <Td px={2} py={1.5} fontSize="11px" fontWeight="500">{doc.con || "—"}</Td>
                        <Td px={2} py={1.5} textAlign="center">
                          {doc.isVD ? (
                            <Badge
                              colorScheme="purple"
                              variant="solid"
                              fontSize="9.5px"
                              px={1.5}
                              py={0.2}
                              borderRadius="sm"
                              fontWeight="900"
                            >
                              VD
                            </Badge>
                          ) : null}
                        </Td>
                        <Td px={2} py={1.5} fontSize="11px" fontFamily="mono" fontWeight="700">{serieText}</Td>
                        <Td px={2} py={1.5} fontSize="11px" fontFamily="mono">{doc.uni || "—"}</Td>
                        <Td px={2} py={1.5} fontSize="11px" textAlign="right" fontFamily="mono">
                          {doc.mon} {doc.tot.toFixed(2)}
                        </Td>
                        <Td px={2} py={1.5} fontSize="11px" textAlign="right" fontFamily="mono" fontWeight="600">
                          {doc.sPen.toFixed(2)}
                        </Td>
                        <Td px={2} py={1.5} fontSize="11px" textAlign="right" fontFamily="mono" fontWeight="700" color={doc.sUsd > 0 ? "gray.900" : "gray.400"}>
                          {doc.sUsd.toFixed(2)}
                        </Td>
                      </Tr>
                    );
                  })
                )}
              </Tbody>
            </Table>
          </TableContainer>
        </Box>

        {/* Fila de Totales con Doble Subrayado Contable */}
        <Flex justify="flex-end" mb={6}>
          <Box minW={{ base: "200px", sm: "260px" }}>
            <Flex justify="space-between" py={1} borderTop="1px solid #0f172a" fontSize="xs" fontWeight="900" color="gray.900" fontFamily="mono">
              <Text>TOTALES:</Text>
              <HStack spacing={{ base: 4, sm: 6 }}>
                <Text>{totalSaldoPEN.toFixed(2)}</Text>
                <Text>{totalSaldoUSD.toFixed(2)}</Text>
              </HStack>
            </Flex>
            <Divider borderColor="#0f172a" borderWidth="1.5px" mt={0.5} />
            <Divider borderColor="#0f172a" borderWidth="1.5px" mt={0.5} />
          </Box>
        </Flex>

        {/* Sección de Resúmenes en 2 Columnas (Idéntica a SAP B1) */}
        <Grid templateColumns={{ base: "1fr", md: "1fr 1fr" }} gap={{ base: 4, md: 8 }} pt={2}>
          <GridItem>
            <Box bg="gray.50" p={3.5} borderRadius="xl" border="1px solid" borderColor="gray.200">
              <Text fontSize="11px" fontWeight="900" color="gray.900" mb={2.5} textTransform="uppercase" letterSpacing="wider">
                RESUMEN POR VENCIMIENTO
              </Text>
              <VStack align="stretch" spacing={2} fontSize="xs">
                <Flex justify="space-between" align="center">
                  <HStack spacing={1}>
                    <Text color="gray.600">Doc. Vencidos</Text>
                    <Text color="gray.400">:</Text>
                  </HStack>
                  <HStack spacing={4} fontFamily="mono">
                    <Badge colorScheme={vencidos.length > 0 ? "red" : "gray"} fontSize="10px" px={2} borderRadius="full">
                      {vencidos.length}
                    </Badge>
                    <Text fontWeight="800" color={vencidos.length > 0 ? "red.600" : "gray.700"}>
                      ${totalVencidosUSD.toFixed(2)}
                    </Text>
                  </HStack>
                </Flex>

                <Flex justify="space-between" align="center">
                  <HStack spacing={1}>
                    <Text color="gray.600">Doc. Vence Hoy</Text>
                    <Text color="gray.400">:</Text>
                  </HStack>
                  <HStack spacing={4} fontFamily="mono">
                    <Badge colorScheme={venceHoy.length > 0 ? "orange" : "gray"} fontSize="10px" px={2} borderRadius="full">
                      {venceHoy.length}
                    </Badge>
                    <Text fontWeight="700">0.00</Text>
                  </HStack>
                </Flex>

                <Flex justify="space-between" align="center">
                  <HStack spacing={1}>
                    <Text color="gray.600">Doc. por Vencer</Text>
                    <Text color="gray.400">:</Text>
                  </HStack>
                  <HStack spacing={4} fontFamily="mono">
                    <Badge colorScheme="green" fontSize="10px" px={2} borderRadius="full">
                      {porVencer.length}
                    </Badge>
                    <Text fontWeight="800" color="green.700">
                      ${totalPorVencerUSD.toFixed(2)}
                    </Text>
                  </HStack>
                </Flex>

                <Divider borderColor="gray.300" my={1} />

                <Flex justify="space-between" align="center" fontWeight="900" fontSize="xs">
                  <Text>USD</Text>
                  <Text fontFamily="mono" fontSize="sm" color="gray.900">
                    ${totalSaldoUSD.toFixed(2)}
                  </Text>
                </Flex>
              </VStack>
            </Box>
          </GridItem>

          <GridItem>
            <Box bg="gray.50" p={3.5} borderRadius="xl" border="1px solid" borderColor="gray.200">
              <Text fontSize="11px" fontWeight="900" color="gray.900" mb={2.5} textTransform="uppercase" letterSpacing="wider">
                RESUMEN POR TIPO DE DOCUMENTO
              </Text>
              <VStack align="stretch" spacing={1.5} fontSize="xs">
                <Flex justify="space-between" align="center">
                  <HStack spacing={1}>
                    <Text color="gray.600">Total Factura</Text>
                    <Text color="gray.400">:</Text>
                  </HStack>
                  <Text fontFamily="mono" fontWeight="700">${totalFacturasUSD.toFixed(2)}</Text>
                </Flex>

                <Flex justify="space-between" align="center">
                  <HStack spacing={1}>
                    <Text color="gray.600">Total Boleta</Text>
                    <Text color="gray.400">:</Text>
                  </HStack>
                  <Text fontFamily="mono" fontWeight="700">${totalBoletasUSD.toFixed(2)}</Text>
                </Flex>

                <Flex justify="space-between" align="center">
                  <HStack spacing={1}>
                    <Text color="gray.600">Total Nota Cred</Text>
                    <Text color="gray.400">:</Text>
                  </HStack>
                  <Text fontFamily="mono" fontWeight="700">${totalNCUSD.toFixed(2)}</Text>
                </Flex>

                <Flex justify="space-between" align="center">
                  <HStack spacing={1}>
                    <Text color="gray.600">Total Nota Deb</Text>
                    <Text color="gray.400">:</Text>
                  </HStack>
                  <Text fontFamily="mono" fontWeight="700">${totalNDUSD.toFixed(2)}</Text>
                </Flex>

                <Flex justify="space-between" align="center" fontWeight="800">
                  <HStack spacing={1}>
                    <Text>Total Letras</Text>
                    <Text color="gray.400">:</Text>
                  </HStack>
                  <Text fontFamily="mono" color="emerald.800">${totalLetrasUSD.toFixed(2)}</Text>
                </Flex>

                {totalLetrasUSD > 0 && (
                  <VStack align="stretch" spacing={1} pl={3} fontSize="11px" color="gray.600" borderLeft="2px solid" borderColor="emerald.300">
                    <Flex justify="space-between">
                      <Text>En Cartera :</Text>
                      <Text fontFamily="mono" fontWeight="600">${totalLetrasCarteraUSD.toFixed(2)}</Text>
                    </Flex>
                    <Flex justify="space-between">
                      <Text>En el Banco :</Text>
                      <Text fontFamily="mono" fontWeight="600">${totalLetrasBancoUSD.toFixed(2)}</Text>
                    </Flex>
                  </VStack>
                )}

                <Divider borderColor="gray.300" my={1} />

                <Flex justify="space-between" align="center" fontWeight="900" fontSize="xs">
                  <Text>USD</Text>
                  <Text fontFamily="mono" fontSize="sm" color="gray.900">
                    ${totalSaldoUSD.toFixed(2)}
                  </Text>
                </Flex>
              </VStack>
            </Box>
          </GridItem>
        </Grid>

        {/* Pie de Página Oficial */}
        <Box mt={{ base: 6, md: 8 }} pt={4} borderTop="1px solid" borderColor="gray.200" textAlign="center">
          <Text fontSize="10px" color="gray.500" fontWeight="600">
            Documento emitido por Autopartes S.A. • Grupo León. Los saldos reflejados corresponden a la fecha de corte oficial de SAP Business One.
          </Text>
        </Box>
      </Container>

      {/* Estilos CSS @media print para impresión perfecta idéntica a la hoja oficial */}
      <style>{`
        @media print {
          body {
            background: white !important;
            padding: 0 !important;
            margin: 0 !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          .no-print {
            display: none !important;
          }
          .mobile-cards-view {
            display: none !important;
          }
          .print-desktop-table {
            display: block !important;
          }
          #statement-printable-sheet {
            box-shadow: none !important;
            border: none !important;
            padding: 0 !important;
            margin: 0 !important;
            max-width: 100% !important;
            width: 100% !important;
          }
          table {
            width: 100% !important;
          }
          tr {
            page-break-inside: avoid !important;
            break-inside: avoid !important;
          }
          @page {
            size: A4 portrait;
            margin: 8mm 10mm;
          }
        }
      `}</style>
    </Box>
  );
}

export default ClientStatementPage;
