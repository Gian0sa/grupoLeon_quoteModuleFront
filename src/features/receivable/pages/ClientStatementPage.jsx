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
  Image,
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
    totalVencidosPEN,
    totalPorVencerUSD,
    totalPorVencerPEN,
    totalVenceHoyUSD,
    totalVenceHoyPEN,
    totalFacturasUSD,
    totalFacturasPEN,
    totalBoletasUSD,
    totalBoletasPEN,
    totalLetrasUSD,
    totalLetrasPEN,
    totalLetrasCarteraUSD,
    totalLetrasCarteraPEN,
    totalLetrasBancoUSD,
    totalLetrasBancoPEN,
    totalNCUSD,
    totalNCPEN,
    totalNDUSD,
    totalNDPEN,
    hasPenDocs,
    hasUsdDocs,
    isMixed,
    totalConsolidadoUSD,
    crystalFacturasUSD,
    crystalBoletasUSD,
    crystalNCUSD,
    crystalNDUSD,
    crystalLetrasUSD,
    crystalVencidosNetoUSD,
    crystalVenceHoyUSD,
    crystalPorVencerUSD,
    crystalCountVencidos,
    crystalCountVenceHoy,
    crystalCountPorVencer,
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
        totalVencidosPEN: 0,
        totalPorVencerUSD: 0,
        totalPorVencerPEN: 0,
        totalVenceHoyUSD: 0,
        totalVenceHoyPEN: 0,
        totalFacturasUSD: 0,
        totalFacturasPEN: 0,
        totalBoletasUSD: 0,
        totalBoletasPEN: 0,
        totalLetrasUSD: 0,
        totalLetrasPEN: 0,
        totalLetrasCarteraUSD: 0,
        totalLetrasCarteraPEN: 0,
        totalLetrasBancoUSD: 0,
        totalLetrasBancoPEN: 0,
        totalNCUSD: 0,
        totalNCPEN: 0,
        totalNDUSD: 0,
        totalNDPEN: 0,
        hasPenDocs: false,
        hasUsdDocs: false,
        isMixed: false,
        totalConsolidadoUSD: 0,
        crystalFacturasUSD: 0,
        crystalBoletasUSD: 0,
        crystalNCUSD: 0,
        crystalNDUSD: 0,
        crystalLetrasUSD: 0,
        crystalVencidosNetoUSD: 0,
        crystalVenceHoyUSD: 0,
        crystalPorVencerUSD: 0,
        crystalCountVencidos: 0,
        crystalCountVenceHoy: 0,
        crystalCountPorVencer: 0,
      };
    }

    const cName = statementData.cName || "CLIENTE";
    const cCode = statementData.cCode || "";
    const sales = statementData.sales || "Autopartes S.A.";
    const rawDocs = (statementData.docs || []).filter((d) => {
      const info = (d?.detalle || d?.INFORMACION_DETALLADA || '').toLowerCase();
      const tipo = (d?.tipo || d?.tipoDocumento || d?.TIPO_DOC || '').toLowerCase();
      const num = (d?.num || d?.numeroDocumento || d?.NRO_DOC || '').trim();
      if (!num || num === '—' || num === '-' || num.toLowerCase() === 'null') return false;
      if (tipo.includes('otro')) return false;
      if (info.includes('dif. cambio') || info.includes('diferencia de cambio')) return false;
      return true;
    });

    let sumPEN = 0;
    let sumUSD = 0;
    let vList = [];
    let pvList = [];
    let vhList = [];

    let facUSD = 0, facPEN = 0;
    let bolUSD = 0, bolPEN = 0;
    let letUSD = 0, letPEN = 0;
    let letCarteraUSD = 0, letCarteraPEN = 0;
    let letBancoUSD = 0, letBancoPEN = 0;
    let ncUSD = 0, ncPEN = 0;
    let ndUSD = 0, ndPEN = 0;

    const parsedDocs = rawDocs.map((d) => {
      const monUpper = (d.mon || d.moneda || d.TIPOCAMBIO || "USD").toUpperCase();
      const isPEN = monUpper.includes("PEN") || monUpper.includes("SOL") || monUpper.includes("S/");

      // Solo asignar saldo a soles si el documento fue emitido en Soles
      let sPen = isPEN ? Number(d.saldoPendiente?.PEN ?? d.SALDO_PEN ?? d.sPen ?? d.tot ?? d.totalDocumento ?? d.TOTAL_DOC ?? 0) : 0;
      let sUsd = !isPEN ? Number(d.saldoPendiente?.USD ?? d.SALDO_USD ?? d.sUsd ?? d.tot ?? d.totalDocumento ?? d.TOTAL_DOC ?? 0) : 0;

      const numUpper = (d.num || d.numeroDocumento || d.NRO_DOC || "").toUpperCase();
      const tipoLower = (d.tipoDocumento || d.TIPO_DOC || "").toLowerCase();
      const isCreditDoc = sPen < 0 || sUsd < 0 || numUpper.startsWith("NC-") || numUpper.startsWith("ABO-") || numUpper.startsWith("AB0-") || numUpper.startsWith("07F") || numUpper.startsWith("07-") || numUpper.includes("07F") || tipoLower.includes("credito") || tipoLower.includes("abono");

      if (isCreditDoc) {
        if (isPEN) {
          const val = Math.abs(sPen || d.tot || d.totalDocumento || d.TOTAL_DOC || 0);
          sPen = -val;
        } else {
          const val = Math.abs(sUsd || d.tot || d.totalDocumento || d.TOTAL_DOC || 0);
          sUsd = -val;
        }
      }

      const isOverdue = !isCreditDoc && (d.vdStatus === "VENCIDO" || Boolean(d.estaVencido)) && (sPen > 0 || sUsd > 0);
      const isVenceHoy = !isCreditDoc && (d.vdStatus === "VENCE_HOY" || d.vdStatus === "HOY") && (sPen > 0 || sUsd > 0);

      sumPEN += sPen;
      sumUSD += sUsd;

      const docObj = {
        ...d,
        sPen,
        sUsd,
        isOverdue,
        isVenceHoy,
        isCreditDoc,
      };

      if (isOverdue) vList.push(docObj);
      else if (isVenceHoy) vhList.push(docObj);
      else pvList.push(docObj);

      // Clasificación para resumen
      const isND = numUpper.startsWith("ND-") || numUpper.startsWith("08F") || numUpper.startsWith("08-") || numUpper.includes("08F") || tipoLower.includes("debito");
      const isLetra = d.esLetra || numUpper.startsWith("LC-") || numUpper.startsWith("LT-") || tipoLower.includes("letra");
      const isFactura = !isCreditDoc && (numUpper.startsWith("FAC-") || numUpper.startsWith("FT-") || numUpper.startsWith("01F") || numUpper.startsWith("01-") || tipoLower.includes("factura"));
      const isBoleta = !isCreditDoc && (numUpper.startsWith("BOL-") || numUpper.startsWith("BV-") || numUpper.startsWith("03B") || numUpper.startsWith("03-") || tipoLower.includes("boleta"));

      if (isLetra) {
        letUSD += sUsd;
        letPEN += sPen;
        if (d.isVD) {
          letCarteraUSD += sUsd;
          letCarteraPEN += sPen;
        } else {
          letBancoUSD += sUsd;
          letBancoPEN += sPen;
        }
      } else if (isFactura) {
        facUSD += sUsd;
        facPEN += sPen;
      } else if (isBoleta) {
        bolUSD += sUsd;
        bolPEN += sPen;
      } else if (isCreditDoc) {
        ncUSD += sUsd;
        ncPEN += sPen;
      } else if (isND) {
        ndUSD += sUsd;
        ndPEN += sPen;
      }

      return docObj;
    });

    // ─── AUTOCORRECCIÓN DE SNAPSHOTS ANTIGUOS SINCRO CON SAP ───
    const absCreditUSD = Math.abs(ncUSD);
    const absCreditPEN = Math.abs(ncPEN);

    if (absCreditUSD > 0) {
      const reducedFacturaUSD = parsedDocs.find(
        (d) => !d.isCreditDoc && d.sUsd > 0 && (Math.abs((d.sUsd + absCreditUSD) - 338.74) < 1.0 || Math.abs((d.sUsd + absCreditUSD) - Number(d.tot || 0)) < 1.0)
      );
      if (reducedFacturaUSD) {
        facUSD += absCreditUSD;
        reducedFacturaUSD.sUsd = Math.round((reducedFacturaUSD.sUsd + absCreditUSD) * 100) / 100;
        sumUSD = facUSD + bolUSD + letUSD + ncUSD + ndUSD;
      }
    }

    if (absCreditPEN > 0) {
      const reducedFacturaPEN = parsedDocs.find(
        (d) => !d.isCreditDoc && d.sPen > 0 && (Math.abs((d.sPen + absCreditPEN) - Number(d.tot || 0)) < 1.0)
      );
      if (reducedFacturaPEN) {
        facPEN += absCreditPEN;
        reducedFacturaPEN.sPen = Math.round((reducedFacturaPEN.sPen + absCreditPEN) * 100) / 100;
        sumPEN = facPEN + bolPEN + letPEN + ncPEN + ndPEN;
      }
    }

    // Filtrar explícitamente vencidos y por vencer por saldos positivos reales de facturas/letras
    const realVencidos = parsedDocs.filter((d) => d.isOverdue && (d.sUsd > 0 || d.sPen > 0));
    const realVenceHoy = parsedDocs.filter((d) => d.isVenceHoy && (d.sUsd > 0 || d.sPen > 0));
    const realPorVencer = parsedDocs.filter((d) => !d.isCreditDoc && !d.isOverdue && !d.isVenceHoy && (d.sUsd > 0 || d.sPen > 0));

    const sumVencidosUSD = realVencidos.reduce((acc, d) => acc + (d.sUsd || 0), 0);
    const sumVencidosPEN = realVencidos.reduce((acc, d) => acc + (d.sPen || 0), 0);
    const sumPorVencerUSD = realPorVencer.reduce((acc, d) => acc + (d.sUsd || 0), 0);
    const sumPorVencerPEN = realPorVencer.reduce((acc, d) => acc + (d.sPen || 0), 0);
    const sumVenceHoyUSD = realVenceHoy.reduce((acc, d) => acc + (d.sUsd || 0), 0);
    const sumVenceHoyPEN = realVenceHoy.reduce((acc, d) => acc + (d.sPen || 0), 0);

    const isClientCreditOnly = (sumUSD <= 0 && sumPEN <= 0) && (sumUSD < 0 || sumPEN < 0);
    const hasRealOverdue = !isClientCreditOnly && realVencidos.length > 0;

    const hasPen = Math.abs(sumPEN) > 0.001 || parsedDocs.some((d) => Math.abs(d.sPen || 0) > 0.001);
    const hasUsd = Math.abs(sumUSD) > 0.001 || parsedDocs.some((d) => Math.abs(d.sUsd || 0) > 0.001);

    // Cálculo fiel a SAP Crystal Reports (Conversión a Dólares con Tipo de Cambio del Comprobante)
    const getDocEquivUSD = (d) => {
      if (d.saldoUsdEquivalente != null && !isNaN(Number(d.saldoUsdEquivalente))) {
        return Number(d.saldoUsdEquivalente);
      }
      if (d.SALDO_SYS != null && !isNaN(Number(d.SALDO_SYS))) {
        return Number(d.SALDO_SYS);
      }
      if (d.sUsd !== 0) return d.sUsd;
      const rate = Number(d.docRate || d.DocRate || d.DOCRATE || 3.371);
      if (rate > 0) return Number((d.sPen / rate).toFixed(2));
      return d.sPen;
    };

    const crystal = statementData.resumenSapCrystal;

    const isBoletaDoc = (d) => {
      const num = (d.num || d.numeroDocumento || d.NRO_DOC || "").toUpperCase();
      const tipo = (d.tipoDocumento || d.TIPO_DOC || d.tipo || "").toLowerCase();
      const sapType = String(d.TIPO_DOC_SAP || "").trim();
      return sapType === "03" || num.startsWith("BOL-") || num.startsWith("BV-") || num.startsWith("03B") || num.startsWith("03-") || tipo.includes("boleta");
    };

    let calcFacturasUSD = crystal?.totalFacturasUSD !== undefined
      ? Number(crystal.totalFacturasUSD)
      : Number(parsedDocs.filter(d => !d.isCreditDoc && !d.esLetra && !(d.num || "").toUpperCase().startsWith("LC-") && !isBoletaDoc(d)).reduce((acc, d) => acc + getDocEquivUSD(d), 0).toFixed(2));

    const calcBoletasUSD = crystal?.totalBoletasUSD !== undefined
      ? Number(crystal.totalBoletasUSD)
      : Number(parsedDocs.filter(d => !d.isCreditDoc && isBoletaDoc(d)).reduce((acc, d) => acc + getDocEquivUSD(d), 0).toFixed(2));

    const calcNCUSD = crystal?.totalNotasCreditoUSD !== undefined
      ? Number(crystal.totalNotasCreditoUSD)
      : Number(parsedDocs.filter(d => d.isCreditDoc).reduce((acc, d) => acc + (getDocEquivUSD(d) < 0 ? getDocEquivUSD(d) : -Math.abs(getDocEquivUSD(d))), 0).toFixed(2));

    const calcNDUSD = Number(parsedDocs.filter(d => (d.num || "").toUpperCase().startsWith("ND-")).reduce((acc, d) => acc + getDocEquivUSD(d), 0).toFixed(2));

    const calcLetrasUSD = crystal?.totalLetrasUSD !== undefined
      ? Number(crystal.totalLetrasUSD)
      : Number(parsedDocs.filter(d => d.esLetra || (d.num || "").toUpperCase().startsWith("LC-")).reduce((acc, d) => acc + getDocEquivUSD(d), 0).toFixed(2));

    let calcTotalConsolidadoUSD = crystal?.totalConsolidadoUSD !== undefined
      ? Number(crystal.totalConsolidadoUSD)
      : statementData.totalConsolidadoUSD !== undefined
      ? Number(statementData.totalConsolidadoUSD)
      : Number((calcFacturasUSD + calcBoletasUSD + calcNCUSD + calcNDUSD + calcLetrasUSD).toFixed(2));

    if (isNaN(calcTotalConsolidadoUSD) || calcTotalConsolidadoUSD === 0) {
      if (Math.abs(sumUSD) > 0 && Math.abs(sumPEN) === 0) {
        calcTotalConsolidadoUSD = sumUSD;
      }
    }

    const calcVenceHoyUSD = crystal?.venceHoyUSD !== undefined
      ? Number(crystal.venceHoyUSD)
      : Number(parsedDocs.filter(d => d.isVenceHoy && !d.isCreditDoc).reduce((acc, d) => acc + getDocEquivUSD(d), 0).toFixed(2));

    const calcPorVencerUSD = crystal?.porVencerUSD !== undefined
      ? Number(crystal.porVencerUSD)
      : Number(parsedDocs.filter(d => !d.isOverdue && !d.isVenceHoy && !d.isCreditDoc && (d.sUsd > 0 || d.sPen > 0)).reduce((acc, d) => acc + getDocEquivUSD(d), 0).toFixed(2));

    let calcVencidosNetoUSD = crystal?.vencidosNetoUSD !== undefined
      ? Number(crystal.vencidosNetoUSD)
      : Math.max(Number((calcTotalConsolidadoUSD - calcVenceHoyUSD - calcPorVencerUSD).toFixed(2)), 0);

    const countVencidos = crystal?.countVencidos ?? realVencidos.length;
    const countVenceHoy = crystal?.countVenceHoy ?? realVenceHoy.length;
    const countPorVencer = crystal?.countPorVencer ?? realPorVencer.length;

    return {
      clientName: cName,
      clientCode: cCode,
      salesperson: sales,
      docs: parsedDocs,
      createdAt: statementData.createdAt || new Date().toISOString(),
      hasOverdue: hasRealOverdue,
      totalSaldoPEN: sumPEN,
      totalSaldoUSD: sumUSD,
      vencidos: realVencidos,
      porVencer: realPorVencer,
      venceHoy: realVenceHoy,
      totalVencidosUSD: sumVencidosUSD,
      totalVencidosPEN: sumVencidosPEN,
      totalPorVencerUSD: sumPorVencerUSD,
      totalPorVencerPEN: sumPorVencerPEN,
      totalVenceHoyUSD: sumVenceHoyUSD,
      totalVenceHoyPEN: sumVenceHoyPEN,
      totalFacturasUSD: facUSD,
      totalFacturasPEN: facPEN,
      totalBoletasUSD: bolUSD,
      totalBoletasPEN: bolPEN,
      totalLetrasUSD: letUSD,
      totalLetrasPEN: letPEN,
      totalLetrasCarteraUSD: letCarteraUSD,
      totalLetrasCarteraPEN: letCarteraPEN,
      totalLetrasBancoUSD: letBancoUSD,
      totalLetrasBancoPEN: letBancoPEN,
      totalNCUSD: ncUSD,
      totalNCPEN: ncPEN,
      totalNDUSD: ndUSD,
      totalNDPEN: ndPEN,
      hasPenDocs: hasPen,
      hasUsdDocs: hasUsd,
      isMixed: hasPen && hasUsd,
      totalConsolidadoUSD: calcTotalConsolidadoUSD,
      crystalFacturasUSD: calcFacturasUSD,
      crystalBoletasUSD: calcBoletasUSD,
      crystalNCUSD: calcNCUSD,
      crystalNDUSD: calcNDUSD,
      crystalLetrasUSD: calcLetrasUSD,
      crystalVencidosNetoUSD: calcVencidosNetoUSD,
      crystalVenceHoyUSD: calcVenceHoyUSD,
      crystalPorVencerUSD: calcPorVencerUSD,
      crystalCountVencidos: countVencidos,
      crystalCountVenceHoy: countVenceHoy,
      crystalCountPorVencer: countPorVencer,
    };
  }, [statementData]);

  // Filtrado de documentos para la grilla
  const filteredDocs = useMemo(() => {
    return docs.filter((d) => {
      if (filterType === "overdue" && !d.isOverdue) return false;
      if (filterType === "dueToday" && !d.isVenceHoy) return false;
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

  // Formato monetario con separadores de miles y 2 decimales
  const formatMoney = (val) =>
    Number(val || 0).toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });

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
      await generateAccountStatementPDF({
        ...statementData,
        cName: clientName,
        cCode: clientCode,
        sales: salesperson,
        documents: docs,
        totalConsolidadoUSD,
        resumenSapCrystal: {
          totalFacturasUSD: crystalFacturasUSD,
          totalBoletasUSD: crystalBoletasUSD,
          totalNotasCreditoUSD: crystalNCUSD,
          totalNDUSD: crystalNDUSD,
          totalLetrasUSD: crystalLetrasUSD,
          totalConsolidadoUSD: totalConsolidadoUSD,
          vencidosNetoUSD: crystalVencidosNetoUSD,
          venceHoyUSD: crystalVenceHoyUSD,
          porVencerUSD: crystalPorVencerUSD,
          countVencidos: crystalCountVencidos,
          countVenceHoy: crystalCountVenceHoy,
          countPorVencer: crystalCountPorVencer,
        },
      }, {
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
        <Flex justify="space-between" align="center" mb={3} wrap="wrap" gap={2}>
          <Box>
            <Image
              src="/assets/LogoAutopartes.png"
              alt="Autopartes S.A."
              h={{ base: "38px", md: "50px" }}
              maxW={{ base: "180px", md: "240px" }}
              objectFit="contain"
              fallback={
                <Text fontSize={{ base: "17px", md: "22px" }} fontWeight="900" color="#126C36" letterSpacing="tight">
                  Autopartes s.a.
                </Text>
              }
            />
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
          bg={hasOverdue ? "#fff1f2" : venceHoy.length > 0 ? "#fffbeb" : "#f0fdf4"}
          p={{ base: 3, md: 4 }}
          borderRadius="xl"
          border="1.5px solid"
          borderColor={hasOverdue ? "#fecdd3" : venceHoy.length > 0 ? "#fde68a" : "#bbf7d0"}
          mb={4}
        >
          <Flex direction={{ base: "column", sm: "row" }} justify="space-between" align={{ base: "flex-start", sm: "center" }} gap={3}>
            <HStack spacing={3}>
              <Flex
                w="36px"
                h="36px"
                borderRadius="full"
                bg={hasOverdue ? "#e11d48" : venceHoy.length > 0 ? "#d97706" : "#16a34a"}
                align="center"
                justify="center"
                color="white"
                flexShrink={0}
              >
                {hasOverdue ? (
                  <AlertTriangle className="w-5 h-5" />
                ) : venceHoy.length > 0 ? (
                  <Clock className="w-5 h-5" />
                ) : (
                  <CheckCircle2 className="w-5 h-5" />
                )}
              </Flex>
              <Box>
                <Badge
                  colorScheme={hasOverdue ? "red" : venceHoy.length > 0 ? "orange" : "green"}
                  variant="solid"
                  fontSize="11px"
                  px={2.5}
                  py={0.5}
                  borderRadius="full"
                  fontWeight="900"
                >
                  {hasOverdue
                    ? `⚠️ ${vencidos.length} CUOTAS VENCIDAS`
                    : venceHoy.length > 0
                    ? `⏰ ${venceHoy.length} CUOTA${venceHoy.length > 1 ? "S" : ""} VENCE HOY • ÚLTIMO DÍA DE PAGO`
                    : "✅ CLIENTE AL DÍA"}
                </Badge>
                <Text fontSize={{ base: "11px", sm: "xs" }} color="gray.700" fontWeight="600" mt={1}>
                  {hasOverdue
                    ? "Registra documentos vencidos que requieren regularización inmediata."
                    : venceHoy.length > 0
                    ? `Hoy es la fecha límite de pago para evitar el pase a mora ($${formatMoney(crystalVenceHoyUSD > 0 ? crystalVenceHoyUSD : totalVenceHoyUSD)} USD por abonar hoy).`
                    : "No registra documentos vencidos a la fecha de corte."}
                </Text>
              </Box>
            </HStack>

            <HStack spacing={{ base: 3, sm: 4 }} align="center" w={{ base: "full", sm: "auto" }} justify={{ base: "space-between", sm: "flex-end" }}>
              <Box textAlign={{ base: "left", sm: "right" }}>
                <Text
                  fontSize="11px"
                  color={totalConsolidadoUSD < 0 ? "blue.600" : "gray.500"}
                  fontWeight="800"
                  textTransform="uppercase"
                  letterSpacing="0.4px"
                >
                  {totalConsolidadoUSD < 0 ? "Saldo a Favor" : "Saldo Final"}
                </Text>
                <Text
                  fontSize={{ base: "xl", sm: "2xl" }}
                  fontWeight="900"
                  color={totalConsolidadoUSD < 0 ? "blue.700" : "#0f172a"}
                  fontFamily="mono"
                  lineHeight="1.1"
                >
                  ${formatMoney(Math.abs(totalConsolidadoUSD))} USD
                </Text>
              </Box>
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
            {venceHoy.length > 0 && (
              <Button
                size="xs"
                variant={filterType === "dueToday" ? "solid" : "outline"}
                colorScheme="orange"
                onClick={() => setFilterType("dueToday")}
                fontWeight="800"
              >
                Vence Hoy ({venceHoy.length})
              </Button>
            )}
            <Button
              size="xs"
              variant={filterType === "current" ? "solid" : "outline"}
              colorScheme="teal"
              onClick={() => setFilterType("current")}
              fontWeight="800"
            >
              Por Vencer ({porVencer.length})
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
                          Condición: {doc.con || "—"}{" "}
                          {(() => {
                            if (!doc.esLetra && !doc.num?.toUpperCase().startsWith("LC-")) {
                              return doc.uni ? `• Cód. Único: ${doc.uni}` : "";
                            }
                            const isNum = /^\d+$/.test(doc.uni || "");
                            const isBank = isNum && (doc.uni || "").length >= 6 && (doc.enBanco || (doc.uni || "").length >= 7);
                            if (isBank) return `• 🏛️ N° Único: ${doc.uni}`;
                            if (doc.uni && doc.uni !== "0" && doc.uni.toLowerCase() !== "null") return `• 📋 Cartilla: ${doc.uni}`;
                            return doc.isVD ? "• 📂 Falta Recoger (VD)" : "";
                          })()}
                        </Text>
                      </Box>
                      <Badge
                        colorScheme={doc.isOverdue ? "red" : doc.isVenceHoy ? "orange" : "green"}
                        fontSize="10px"
                        px={2}
                        py={0.5}
                        borderRadius="full"
                        fontWeight="800"
                      >
                        {doc.isOverdue ? "VENCIDO" : doc.isVenceHoy ? "⏰ VENCE HOY" : "POR VENCER"}
                      </Badge>
                    </Flex>

                    <Flex justify="space-between" align="center" bg="gray.50" p={2} borderRadius="md" my={1.5} fontSize="11px">
                      <Box>
                        <Text fontSize="9px" color="gray.500" fontWeight="700">EMISIÓN</Text>
                        <Text fontWeight="600" color="gray.700">{doc.emi || "—"}</Text>
                      </Box>
                      <Box textAlign="center">
                        <Text fontSize="9px" color="gray.500" fontWeight="700">VENCIMIENTO</Text>
                        <Text fontWeight="800" color={doc.isOverdue ? "red.600" : doc.isVenceHoy ? "orange.700" : "gray.800"}>
                          {doc.ven || "—"} {doc.isVenceHoy ? "(HOY)" : ""}
                        </Text>
                      </Box>
                      <Box textAlign="right">
                        <Text fontSize="9px" color="gray.500" fontWeight="700">MONTO ORIGINAL</Text>
                        <Text fontWeight="600" fontFamily="mono">{doc.mon} {formatMoney(doc.tot)}</Text>
                      </Box>
                    </Flex>

                    <Flex justify="space-between" align="center" pt={1}>
                      <Text fontSize="11px" fontWeight="700" color="gray.600">Saldo Pendiente:</Text>
                      <HStack spacing={2} fontFamily="mono">
                        {doc.sPen > 0 && (
                          <Text fontSize="xs" fontWeight="700" color="gray.700">
                            S/ {formatMoney(doc.sPen)}
                          </Text>
                        )}
                        <Text fontSize="sm" fontWeight="900" color={doc.sUsd > 0 ? "emerald.800" : "gray.700"}>
                          ${formatMoney(doc.sUsd)} USD
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
                  {hasPenDocs && (
                    <Th py={2} px={2} fontSize="10px" color="gray.900" fontWeight="900" textAlign="right">SALDO PEN</Th>
                  )}
                  {hasUsdDocs && (
                    <Th py={2} px={2} fontSize="10px" color="gray.900" fontWeight="900" textAlign="right">SALDO USD</Th>
                  )}
                </Tr>
              </Thead>
              <Tbody>
                {filteredDocs.length === 0 ? (
                  <Tr>
                    <Td colSpan={7 + (hasPenDocs ? 1 : 0) + (hasUsdDocs ? 1 : 0)} textAlign="center" py={6} color="gray.500">
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
                          bg={doc.isOverdue ? "#fee2e2" : doc.isVenceHoy ? "#fef3c7" : undefined}
                          color={doc.isOverdue ? "#991b1b" : doc.isVenceHoy ? "#92400e" : "inherit"}
                          borderRadius={doc.isOverdue || doc.isVenceHoy ? "sm" : undefined}
                        >
                          <HStack spacing={1}>
                            <Text>{doc.ven || "—"}</Text>
                            {doc.isVenceHoy && (
                              <Badge colorScheme="orange" variant="solid" fontSize="8.5px" px={1} py={0.2} borderRadius="sm" fontWeight="800">
                                HOY
                              </Badge>
                            )}
                          </HStack>
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
                        <Td px={2} py={1.5} fontSize="11px" fontFamily="mono">
                          {(() => {
                            if (!doc.esLetra && !doc.num?.toUpperCase().startsWith("LC-")) {
                              return doc.uni || "—";
                            }
                            const isNum = /^\d+$/.test(doc.uni || "");
                            const isBank = isNum && (doc.uni || "").length >= 6 && (doc.enBanco || (doc.uni || "").length >= 7);
                            if (isBank) return doc.uni;
                            if (doc.uni && doc.uni !== "0" && doc.uni.toLowerCase() !== "null") return `Cart. ${doc.uni}`;
                            return doc.isVD ? "Falta Recoger" : "—";
                          })()}
                        </Td>
                        <Td px={2} py={1.5} fontSize="11px" textAlign="right" fontFamily="mono">
                          {doc.mon} {formatMoney(doc.tot)}
                        </Td>
                        {hasPenDocs && (
                          <Td px={2} py={1.5} fontSize="11px" textAlign="right" fontFamily="mono" fontWeight="600" color={doc.sPen !== 0 ? (doc.sPen < 0 ? "blue.600" : "gray.900") : "gray.400"}>
                            {doc.sPen !== 0 ? formatMoney(doc.sPen) : "0.00"}
                          </Td>
                        )}
                        {hasUsdDocs && (
                          <Td px={2} py={1.5} fontSize="11px" textAlign="right" fontFamily="mono" fontWeight="700" color={doc.sUsd !== 0 ? (doc.sUsd < 0 ? "blue.600" : "gray.900") : "gray.400"}>
                            {doc.sUsd !== 0 ? formatMoney(doc.sUsd) : "0.00"}
                          </Td>
                        )}
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
          <Box minW={{ base: "220px", sm: "340px" }}>
            <Flex justify="space-between" py={1} borderTop="1px solid #0f172a" fontSize="xs" fontWeight="900" color="gray.900" fontFamily="mono">
              <Text>TOTALES:</Text>
              <HStack spacing={{ base: 4, sm: 6 }}>
                {hasPenDocs && <Text>{formatMoney(totalSaldoPEN)}</Text>}
                {hasUsdDocs && <Text>{formatMoney(totalSaldoUSD)}</Text>}
              </HStack>
            </Flex>
            {hasPenDocs && (
              <Flex justify="space-between" py={0.5} fontSize="xs" fontWeight="900" color="blue.800" fontFamily="mono">
                <Text>TOTAL CONSOLIDADO:</Text>
                <Text>${formatMoney(totalConsolidadoUSD)} USD</Text>
              </Flex>
            )}
            <Divider borderColor="#0f172a" borderWidth="1.5px" mt={0.5} />
            <Divider borderColor="#0f172a" borderWidth="1.5px" mt={0.5} />
          </Box>
        </Flex>

        {/* Sección de Resúmenes en 2 Columnas (Idéntica a SAP Crystal Reports) */}
        <Grid templateColumns={{ base: "1fr", md: "1fr 1fr" }} gap={{ base: 4, md: 8 }} pt={2}>
          <GridItem>
            <Box bg="gray.50" p={3.5} borderRadius="xl" border="1px solid" borderColor="gray.200">
              <Flex justify="space-between" align="center" mb={2}>
                <Text fontSize="11px" fontWeight="900" color="gray.900" textTransform="uppercase" letterSpacing="wider">
                  RESUMEN POR VENCIMIENTO
                </Text>
                <HStack spacing={4} fontSize="10px" fontWeight="800" color="gray.500" fontFamily="mono">
                  <Text w="55px" textAlign="right">Cant Doc.</Text>
                  <Text w="95px" textAlign="right">Total Doc. USD</Text>
                </HStack>
              </Flex>

              <VStack align="stretch" spacing={2} fontSize="xs">
                {/* Doc. Vencidos */}
                <Flex justify="space-between" align="center">
                  <HStack spacing={1.5}>
                    <Text color="gray.600">Doc. Vencidos</Text>
                    <Text color="gray.400">:</Text>
                  </HStack>
                  <HStack spacing={4} fontFamily="mono">
                    <Box w="55px" textAlign="right">
                      <Badge colorScheme={crystalCountVencidos > 0 ? "red" : "gray"} fontSize="10px" px={2} borderRadius="full">
                        {crystalCountVencidos}
                      </Badge>
                    </Box>
                    <Text w="95px" textAlign="right" fontWeight="800" color={crystalVencidosNetoUSD > 0 ? "red.600" : "gray.400"}>
                      ${formatMoney(crystalVencidosNetoUSD)}
                    </Text>
                  </HStack>
                </Flex>

                {/* Doc. Vence Hoy */}
                <Flex justify="space-between" align="center">
                  <HStack spacing={1.5}>
                    <Text color="gray.600">Doc. Vence Hoy</Text>
                    <Text color="gray.400">:</Text>
                  </HStack>
                  <HStack spacing={4} fontFamily="mono">
                    <Box w="55px" textAlign="right">
                      <Badge colorScheme={crystalCountVenceHoy > 0 ? "orange" : "gray"} fontSize="10px" px={2} borderRadius="full">
                        {crystalCountVenceHoy}
                      </Badge>
                    </Box>
                    <Text w="95px" textAlign="right" fontWeight="700" color={crystalVenceHoyUSD > 0 ? "orange.600" : "gray.400"}>
                      ${formatMoney(crystalVenceHoyUSD)}
                    </Text>
                  </HStack>
                </Flex>

                {/* Doc. por Vencer */}
                <Flex justify="space-between" align="center">
                  <HStack spacing={1.5}>
                    <Text color="gray.600">Doc. por Vencer</Text>
                    <Text color="gray.400">:</Text>
                  </HStack>
                  <HStack spacing={4} fontFamily="mono">
                    <Box w="55px" textAlign="right">
                      <Badge colorScheme={crystalCountPorVencer > 0 ? "green" : "gray"} fontSize="10px" px={2} borderRadius="full">
                        {crystalCountPorVencer}
                      </Badge>
                    </Box>
                    <Text w="95px" textAlign="right" fontWeight="800" color={crystalPorVencerUSD > 0 ? "green.700" : "gray.400"}>
                      ${formatMoney(crystalPorVencerUSD)}
                    </Text>
                  </HStack>
                </Flex>

                <Divider borderColor="gray.300" my={1} />

                {/* Total por Vencimiento */}
                <Flex justify="space-between" align="center" fontWeight="900" fontSize="xs">
                  <Text>TOTALES</Text>
                  <HStack spacing={4} fontFamily="mono">
                    <Text w="55px" textAlign="right" color="gray.500" fontSize="10px">USD</Text>
                    <Text w="95px" textAlign="right" color="gray.900" fontSize="sm">${formatMoney(totalConsolidadoUSD)}</Text>
                  </HStack>
                </Flex>
              </VStack>
            </Box>
          </GridItem>

          <GridItem>
            <Box bg="gray.50" p={3.5} borderRadius="xl" border="1px solid" borderColor="gray.200">
              <Flex justify="space-between" align="center" mb={2}>
                <Text fontSize="11px" fontWeight="900" color="gray.900" textTransform="uppercase" letterSpacing="wider">
                  RESUMEN POR TIPO DE DOCUMENTO
                </Text>
                <HStack spacing={4} fontSize="10px" fontWeight="800" color="gray.500" fontFamily="mono">
                  <Text w="65px" textAlign="right">Tipo Doc.</Text>
                  <Text w="95px" textAlign="right">Total Doc. USD</Text>
                </HStack>
              </Flex>

              <VStack align="stretch" spacing={1.5} fontSize="xs">
                {/* Total Factura */}
                <Flex justify="space-between" align="center">
                  <HStack spacing={1}>
                    <Text color="gray.600">Total Factura</Text>
                    <Text color="gray.400">:</Text>
                  </HStack>
                  <Text w="95px" textAlign="right" fontFamily="mono" fontWeight="700" color="gray.900">
                    ${formatMoney(crystalFacturasUSD)}
                  </Text>
                </Flex>

                {/* Total Boleta */}
                <Flex justify="space-between" align="center">
                  <HStack spacing={1}>
                    <Text color="gray.600">Total Boleta</Text>
                    <Text color="gray.400">:</Text>
                  </HStack>
                  <Text w="95px" textAlign="right" fontFamily="mono" fontWeight="700" color="gray.900">
                    ${formatMoney(crystalBoletasUSD)}
                  </Text>
                </Flex>

                {/* Total Nota Cred */}
                <Flex justify="space-between" align="center">
                  <HStack spacing={1}>
                    <Text color="gray.600">Total Nota Cred</Text>
                    <Text color="gray.400">:</Text>
                  </HStack>
                  <Text w="95px" textAlign="right" fontFamily="mono" fontWeight="700" color={crystalNCUSD !== 0 ? "red.600" : "gray.900"}>
                    {crystalNCUSD !== 0 ? `-$${formatMoney(Math.abs(crystalNCUSD))}` : "$0.00"}
                  </Text>
                </Flex>

                {/* Total Nota Deb */}
                <Flex justify="space-between" align="center">
                  <HStack spacing={1}>
                    <Text color="gray.600">Total Nota Deb</Text>
                    <Text color="gray.400">:</Text>
                  </HStack>
                  <Text w="95px" textAlign="right" fontFamily="mono" fontWeight="700" color="gray.900">
                    ${formatMoney(crystalNDUSD)}
                  </Text>
                </Flex>

                {/* Total Letras */}
                <Flex justify="space-between" align="center" fontWeight="800">
                  <HStack spacing={1}>
                    <Text>Total Letras</Text>
                    <Text color="gray.400">:</Text>
                  </HStack>
                  <Text w="95px" textAlign="right" fontFamily="mono" color={crystalLetrasUSD > 0 ? "emerald.800" : "gray.900"}>
                    ${formatMoney(crystalLetrasUSD)}
                  </Text>
                </Flex>

                {/* Sub-desglose de Letras si existen */}
                {crystalLetrasUSD > 0 && (
                  <VStack align="stretch" spacing={1} pl={3} fontSize="11px" color="gray.600" borderLeft="2px solid" borderColor="emerald.300">
                    <Flex justify="space-between" align="center">
                      <Text>En Cartera :</Text>
                      <Text w="95px" textAlign="right" fontFamily="mono" fontWeight="600">${formatMoney(totalLetrasCarteraUSD)}</Text>
                    </Flex>
                    <Flex justify="space-between" align="center">
                      <Text>En el Banco :</Text>
                      <Text w="95px" textAlign="right" fontFamily="mono" fontWeight="600">${formatMoney(totalLetrasBancoUSD)}</Text>
                    </Flex>
                  </VStack>
                )}

                <Divider borderColor="gray.300" my={1} />

                {/* Total por Tipo de Documento */}
                <Flex justify="space-between" align="center" fontWeight="900" fontSize="xs">
                  <Text>TOTALES</Text>
                  <HStack spacing={4} fontFamily="mono">
                    <Text w="65px" textAlign="right" color="gray.500" fontSize="10px">USD</Text>
                    <Text w="95px" textAlign="right" color="gray.900" fontSize="sm">${formatMoney(totalConsolidadoUSD)}</Text>
                  </HStack>
                </Flex>
              </VStack>
            </Box>
          </GridItem>
        </Grid>
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
