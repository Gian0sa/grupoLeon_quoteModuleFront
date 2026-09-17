import React, { useState, useMemo } from "react";
import {
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  ModalCloseButton,
  Button,
  Input,
  FormControl,
  FormLabel,
  FormHelperText,
  VStack,
  HStack,
  Text,
  Badge,
  Box,
  Flex,
  Textarea,
  RadioGroup,
  Radio,
  Icon,
  Tooltip,
  useToast,
  Divider,
} from "@chakra-ui/react";
import {
  MessageSquare,
  Share2,
  Copy,
  ExternalLink,
  Check,
  Send,
  Phone,
  User,
  DollarSign,
  Calendar,
  AlertTriangle,
  CheckCircle2,
  FileText,
  Edit3,
  Save,
  Loader2,
  Lock,
  Unlock,
  RotateCcw,
} from "lucide-react";
import {
  generateStatementUrl,
  createShortStatementUrl,
  calculateVD,
} from "../utils/statementTokenUtils";
import { generateAccountStatementPDF } from "../utils/receivablePDF";
import { fetchClientByCode } from "../../clients/services/clientService";
import {
  getClientPhone,
  saveClientPhone,
  normalizeClientKey,
} from "../utils/clientPhoneDirectory";

export function WhatsAppStatementModal({ isOpen, onClose, debt }) {
  const toast = useToast();

  const clientKey = useMemo(() => {
    if (!debt) return "";
    const rawCode = debt.clientCode || debt.ruc || debt.documents?.[0]?.CARDCODE || "";
    return normalizeClientKey(rawCode);
  }, [debt]);

  // Estado del teléfono y origen
  const [phoneNumber, setPhoneNumber] = useState("");
  const [sapOfficialPhone, setSapOfficialPhone] = useState("");
  const [hasSapPhone, setHasSapPhone] = useState(false);
  const [isUsingAlternativePhone, setIsUsingAlternativePhone] = useState(false);
  const [isLoadingSapPhone, setIsLoadingSapPhone] = useState(false);
  const [countryCode, setCountryCode] = useState("51"); // Por defecto Perú (+51)
  const [messageTone, setMessageTone] = useState("friendly"); // friendly | formal | urgent
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedMessage, setCopiedMessage] = useState(false);
  const [isSavedPhone, setIsSavedPhone] = useState(false);

  // Estado del enlace corto
  const [statementUrl, setStatementUrl] = useState("");
  const [isGeneratingShortUrl, setIsGeneratingShortUrl] = useState(false);

  // Generar URL corta asíncrona al abrir el modal o cambiar de cliente
  React.useEffect(() => {
    if (!isOpen || !debt) {
      setStatementUrl("");
      return;
    }

    // 1. Respaldo síncrono inmediato
    const syncUrl = generateStatementUrl(debt);
    setStatementUrl(syncUrl);

    // 2. Generar enlace corto en backend (ej. https://dominio/s/s-6415-a8f2)
    setIsGeneratingShortUrl(true);
    createShortStatementUrl(debt)
      .then((shortUrl) => {
        if (shortUrl) {
          setStatementUrl(shortUrl);
        }
      })
      .finally(() => {
        setIsGeneratingShortUrl(false);
      });
  }, [isOpen, debt]);

  // Consultar teléfono a SAP B1 al abrir el modal con try/catch seguro
  React.useEffect(() => {
    if (!isOpen || !debt) return;

    setIsUsingAlternativePhone(false);

    // 1. Revisar si ya viene con número directo de SAP en el objeto
    const raw = debt.raw || {};
    const directCandidate =
      debt.Cellular ||
      debt.cellular ||
      debt.Phone1 ||
      debt.telefono ||
      debt.phone ||
      debt.documents?.[0]?.Cellular ||
      debt.documents?.[0]?.Phone1 ||
      "";
    const cleanDirect = String(directCandidate).replace(/\D/g, "");

    if (cleanDirect) {
      setSapOfficialPhone(cleanDirect);
      setPhoneNumber(cleanDirect);
      setHasSapPhone(true);
      return;
    }

    // 2. Consulta con try/catch a SAP B1 mediante API
    const querySap = async () => {
      if (!clientKey) return;
      setIsLoadingSapPhone(true);
      try {
        let sapClient = null;
        try {
          sapClient = await fetchClientByCode(`CL${clientKey}`);
        } catch {
          try {
            sapClient = await fetchClientByCode(clientKey);
          } catch {}
        }

        if (sapClient) {
          const rawFound =
            sapClient.Cellular ||
            sapClient.Phone1 ||
            sapClient.Phone2 ||
            sapClient.ContactEmployees?.[0]?.MobilePhone ||
            sapClient.ContactEmployees?.[0]?.Phone1 ||
            "";
          const cleanSap = String(rawFound).replace(/\D/g, "");
          if (cleanSap) {
            setSapOfficialPhone(cleanSap);
            setPhoneNumber(cleanSap);
            setHasSapPhone(true);
            return;
          }
        }

        // Si SAP no tiene teléfono, revisar si se guardó previamente en nuevo cliente
        const savedInDirectory = getClientPhone(clientKey);
        if (savedInDirectory) {
          setPhoneNumber(savedInDirectory);
          setHasSapPhone(false);
        } else {
          setPhoneNumber("");
          setHasSapPhone(false);
        }
      } catch (err) {
        console.warn("No se pudo obtener teléfono de SAP B1:", err);
        setHasSapPhone(false);
      } finally {
        setIsLoadingSapPhone(false);
      }
    };

    querySap();
  }, [isOpen, debt, clientKey]);

  // Cálculos rápidos de saldos
  const {
    clientName,
    clientCode,
    salesperson,
    totalUSD,
    totalPEN,
    totalConsolidado,
    hasUsd,
    hasPen,
    isCreditBalance,
    totalVencidoUSD,
    vencidosCount,
    hasOverdue,
    hasVenceHoy,
    totalVenceHoyUSD,
    totalVenceHoyPEN,
    venceHoyCount,
    venceHoyDocs,
    nextUpcomingDue,
  } = useMemo(() => {
    if (!debt) return { clientName: "", totalUSD: 0, totalPEN: 0, totalConsolidado: 0, hasUsd: false, hasPen: false, isCreditBalance: false, hasOverdue: false, vencidosCount: 0, hasVenceHoy: false, totalVenceHoyUSD: 0, totalVenceHoyPEN: 0, venceHoyCount: 0, venceHoyDocs: [], nextUpcomingDue: null };
    const rawDocs = debt.documents || debt.documentos || [];
    const docs = rawDocs.filter((d) => {
      const info = (d?.INFORMACION_DETALLADA || d?.detalle || '').toLowerCase();
      const tipo = (d?.tipoDocumento || d?.TIPO_DOC || '').toLowerCase();
      const numDoc = (d?.numeroDocumento || d?.NRO_DOC || '').trim();
      if (!numDoc || numDoc === '—' || numDoc === '-' || numDoc.toLowerCase() === 'null') return false;
      if (tipo.includes('otro')) return false;
      if (info.includes('dif. cambio') || info.includes('diferencia de cambio')) return false;
      return true;
    });
    const name = debt.nombre || debt.clientName || docs[0]?.CARDNAME || rawDocs[0]?.CARDNAME || "Estimado(a) Cliente";
    const code = debt.clientCode || debt.ruc || docs[0]?.CARDCODE || rawDocs[0]?.CARDCODE || "";
    const sales = debt.vendedor || docs.find(d => d?.NOMBVENDEDOR && d.NOMBVENDEDOR.trim())?.NOMBVENDEDOR || rawDocs.find(d => d?.NOMBVENDEDOR && d.NOMBVENDEDOR.trim())?.NOMBVENDEDOR || "Autopartes S.A.";

    let sUSD = 0;
    let sPEN = 0;
    let vUSD = 0;
    let vPEN = 0;
    let vCount = 0;
    let vhUSD = 0;
    let vhPEN = 0;
    let vhCount = 0;
    const vhDocList = [];

    // Rastrear próximo vencimiento para deudas al día
    let earliestFutureDue = null;

    docs.forEach((d) => {
      const mon = (d.moneda || d.TIPOCAMBIO || d.mon || "USD").toUpperCase();
      const isPEN = mon.includes("PEN") || mon.includes("SOL") || mon.includes("S/");
      const saldoU = !isPEN ? Number(d.saldoPendiente?.USD ?? d.SALDO_USD ?? d.sUsd ?? d.tot ?? d.totalDocumento ?? d.TOTAL_DOC ?? 0) : 0;
      const saldoP = isPEN ? Number(d.saldoPendiente?.PEN ?? d.SALDO_PEN ?? d.sPen ?? d.tot ?? d.totalDocumento ?? d.TOTAL_DOC ?? 0) : 0;
      sUSD += saldoU;
      sPEN += saldoP;

      const dateStr = d.REFDATE || d.fechaContable || d.fechaVencimiento || d.ven || "";
      const vdInfo = calculateVD(dateStr);
      const isDocOverdue = Boolean(d.estaVencido || d.vdStatus === "VENCIDO" || vdInfo.status === "VENCIDO" || (d.saldoVencidoUSD && Number(d.saldoVencidoUSD) > 0));
      const isDocVenceHoy = !isDocOverdue && Boolean(
        d.isVenceHoy || 
        d.vdStatus === "HOY" || 
        d.vdStatus === "VENCE_HOY" || 
        d.categoriaVencimiento === "HOY" || 
        vdInfo.status === "HOY"
      );

      if (isDocOverdue && (saldoU > 0 || saldoP > 0)) {
        vUSD += saldoU;
        vPEN += saldoP;
        vCount++;
      } else if (isDocVenceHoy && (saldoU > 0 || saldoP > 0)) {
        vhUSD += saldoU;
        vhPEN += saldoP;
        vhCount++;
        const num = d.numeroDocumento || d.NRO_DOC || d.num || "";
        if (num) vhDocList.push(num);
      } else if (!isDocOverdue && !isDocVenceHoy && (saldoU > 0 || saldoP > 0) && vdInfo.status === "POR_VENCER") {
        if (!earliestFutureDue || vdInfo.days < earliestFutureDue.days) {
          earliestFutureDue = {
            dateStr: d.ven || d.fechaContable || dateStr,
            days: vdInfo.days,
            saldoUSD: saldoU,
            saldoPEN: saldoP,
            num: d.numeroDocumento || d.NRO_DOC || d.num || "",
          };
        }
      }
    });

    const finalUSD = sUSD || Number(debt.saldoUSD || debt.saldoPrincipal || 0);
    const finalPEN = sPEN || Number(debt.saldoPEN || 0);
    const isCredit = finalUSD < -0.001 || finalPEN < -0.001 || debt.tipoDocumento === "Nota de Crédito";
    const realHasOverdue = !isCredit && (vCount > 0 || (debt.saldoVencidoUSD && Number(debt.saldoVencidoUSD) > 0));
    const realHasVenceHoy = !isCredit && !realHasOverdue && (vhCount > 0 || debt.dueTodayDocumentsCount > 0 || debt.hasVenceHoy);

    let totalConsolidado = debt.totalConsolidadoUSD ?? 
      debt.saldoConsolidadoUSD ?? 
      debt.resumenSapCrystal?.totalConsolidadoUSD;

    if (totalConsolidado == null) {
      if (docs.length > 0) {
        totalConsolidado = Number(
          docs.reduce((acc, d) => {
            const num = (d.numeroDocumento || d.NRO_DOC || d.num || "").toUpperCase();
            const tipo = (d.tipoDocumento || d.TIPO_DOC || "").toLowerCase();
            const isCredit = num.startsWith("NC-") ||
              num.startsWith("ABO-") ||
              num.startsWith("AB0-") ||
              num.includes("07F") ||
              tipo.includes("credito") ||
              tipo.includes("abono") ||
              Number(d.saldoPendiente?.PEN ?? d.SALDO_PEN ?? d.sPen ?? 0) < 0 ||
              Number(d.saldoPendiente?.USD ?? d.SALDO_USD ?? d.sUsd ?? 0) < 0;
            
            let valUSD = 0;
            if (d.saldoUsdEquivalente != null && !isNaN(Number(d.saldoUsdEquivalente))) {
              valUSD = Math.abs(Number(d.saldoUsdEquivalente));
            } else if (d.SALDO_SYS != null && !isNaN(Number(d.SALDO_SYS))) {
              valUSD = Math.abs(Number(d.SALDO_SYS));
            } else {
              const sUsd = Number(d.saldoPendiente?.USD ?? d.SALDO_USD ?? d.sUsd ?? d.saldoUsd ?? 0);
              const sPen = Number(d.saldoPendiente?.PEN ?? d.SALDO_PEN ?? d.sPen ?? d.saldoPen ?? 0);
              if (sUsd !== 0) {
                valUSD = Math.abs(sUsd);
              } else if (sPen !== 0) {
                const rate = Number(d.docRate || d.DocRate || d.DOCRATE || 3.371);
                valUSD = rate > 0 ? Number((Math.abs(sPen) / rate).toFixed(2)) : Math.abs(sPen);
              }
            }
            return acc + (isCredit ? -valUSD : valUSD);
          }, 0).toFixed(2)
        );
      } else {
        totalConsolidado = finalUSD + (finalPEN !== 0 ? Number((finalPEN / 3.371).toFixed(2)) : 0);
      }
    }

    return {
      clientName: name,
      clientCode: code,
      salesperson: sales,
      totalUSD: finalUSD,
      totalPEN: finalPEN,
      totalConsolidado,
      hasUsd: Math.abs(finalUSD) > 0.001,
      hasPen: Math.abs(finalPEN) > 0.001,
      isCreditBalance: isCredit,
      totalVencidoUSD: isCredit ? 0 : (vUSD || Number(debt.saldoVencidoUSD || 0)),
      totalVencidoPEN: isCredit ? 0 : vPEN,
      vencidosCount: isCredit ? 0 : vCount,
      hasOverdue: realHasOverdue,
      hasVenceHoy: realHasVenceHoy,
      totalVenceHoyUSD: vhUSD || Number(debt.dueTodayAmount?.USD || 0),
      totalVenceHoyPEN: vhPEN || Number(debt.dueTodayAmount?.PEN || 0),
      venceHoyCount: vhCount || Number(debt.dueTodayDocumentsCount || (realHasVenceHoy ? 1 : 0)),
      venceHoyDocs: vhDocList,
      nextUpcomingDue: earliestFutureDue,
    };
  }, [debt]);

  // Sincronizar automáticamente tono según el estado financiero bancario
  React.useEffect(() => {
    if (hasOverdue) {
      setMessageTone("urgent");
    } else if (hasVenceHoy) {
      setMessageTone("preventive");
    } else {
      setMessageTone("friendly");
    }
  }, [hasOverdue, hasVenceHoy, isOpen]);

  // Construir plantilla de mensaje según el tono seleccionado
  const generatedMessage = useMemo(() => {
    if (!debt) return "";

    const fechaHoy = new Date().toLocaleDateString("es-PE", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });

    const formatMoney = (val) =>
      Number(Math.abs(val) || 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

    let saldoText = "";
    if (isCreditBalance) {
      saldoText = `$ ${formatMoney(totalConsolidado)} USD (A favor del cliente)`;
    } else {
      saldoText = `$ ${formatMoney(totalConsolidado)} USD`;
    }

    let cuotaHoyText = "";
    if (totalVenceHoyUSD > 0 && totalVenceHoyPEN > 0) {
      cuotaHoyText = `$ ${formatMoney(totalVenceHoyUSD)} USD y S/ ${formatMoney(totalVenceHoyPEN)} PEN`;
    } else if (totalVenceHoyPEN > 0) {
      cuotaHoyText = `S/ ${formatMoney(totalVenceHoyPEN)} PEN`;
    } else if (totalVenceHoyUSD > 0) {
      cuotaHoyText = `$ ${formatMoney(totalVenceHoyUSD)} USD`;
    }

    const docHoyRef = venceHoyDocs.length > 0 ? ` (${venceHoyDocs.join(", ")})` : "";

    let proximoVenceText = "";
    if (nextUpcomingDue && !hasOverdue && !hasVenceHoy) {
      const pMonto = nextUpcomingDue.saldoUSD > 0
        ? `$ ${formatMoney(nextUpcomingDue.saldoUSD)} USD`
        : `S/ ${formatMoney(nextUpcomingDue.saldoPEN)} PEN`;
      proximoVenceText = `📅 *Próximo Vencimiento:* ${nextUpcomingDue.dateStr} (en ${nextUpcomingDue.days} ${nextUpcomingDue.days === 1 ? "día" : "días"}) - ${pMonto}`;
    }

    const estadoBadge = hasOverdue
      ? `⚠️ *Estado:* Pendiente de regularización (Cuotas vencidas)`
      : hasVenceHoy
      ? `⏰ *Estado:* Cuota vence hoy (Fecha límite: ${fechaHoy})`
      : isCreditBalance
      ? `💳 *Estado:* Saldo a favor disponible (Nota de crédito)`
      : `✅ *Estado:* Al día (Sin cuotas vencidas)`;

    if (messageTone === "urgent") {
      return (
`Hola *${clientName}*, le saluda *${salesperson}* de *Autopartes S.A.* 🚗

Le escribimos para recordarle que registra cuotas con vencimiento pendiente en su estado de cuenta comercial.

📌 ${estadoBadge}
💰 *Saldo Pendiente:* ${saldoText}
📅 *Fecha de Corte:* ${fechaHoy}

🔗 *Consulte el detalle completo e interactivo de sus documentos aquí:*
${statementUrl}

Por favor, si ya realizó el abono, compártanos su constancia por este medio para regularizar su cuenta. ¡Muchas gracias!`
      );
    } else if (messageTone === "preventive") {
      return (
`Hola *${clientName}*, le saluda *${salesperson}* de *Autopartes S.A.* 🚗

Le escribimos para recordarle cordialmente que el día de hoy *${fechaHoy}* es la fecha límite de pago de su cuota:

📌 ⏰ *Estado:* Vence Hoy (Último día de pago)
💳 *Cuota que vence hoy:* ${cuotaHoyText}${docHoyRef}
💰 *Saldo Total en Cuenta:* ${saldoText}
📅 *Fecha Límite:* ${fechaHoy}

🔗 *Consulte el detalle completo e interactivo de sus comprobantes aquí:*
${statementUrl}

Le recordamos realizar su abono el día de hoy para mantener su línea de crédito activa y su récord comercial impecable. Si ya realizó el pago, por favor compártanos su constancia por este medio. ¡Muchas gracias!`
      );
    } else if (messageTone === "formal") {
      return (
`Estimado(a) *${clientName}*,

Por medio de la presente, *Autopartes S.A.* le hace llegar su *Estado de Cuenta Comercial* actualizado al ${fechaHoy}:

📌 ${estadoBadge}
💰 *${isCreditBalance ? "Saldo a Favor" : "Saldo Actual"}:* ${saldoText}
${hasVenceHoy ? `⏰ *Cuota con vencimiento hoy:* ${cuotaHoyText}${docHoyRef}\n` : ""}${proximoVenceText ? `${proximoVenceText}\n` : ""}👤 *Asesor Comercial:* ${salesperson}

🔗 *Puede visualizar sus documentos, comprobantes y descargar el reporte oficial en:*
${statementUrl}

${hasVenceHoy ? "Le sugerimos realizar su abono a tiempo para mantener su línea de crédito habilitada. " : "Quedamos atentos a cualquier consulta. "}Saludos cordiales.`
      );
    } else {
      // Friendly / Estándar
      return (
`¡Hola *${clientName}*! 👋 Le saluda *${salesperson}* de *Autopartes S.A.*

Le compartimos su *Estado de Cuenta Comercial* actualizado:

📌 ${estadoBadge}
💰 *${isCreditBalance ? "Saldo a Favor" : "Saldo Total"}:* ${saldoText}
${hasVenceHoy ? `⏰ *Cuota que vence hoy:* ${cuotaHoyText}${docHoyRef}\n` : ""}${proximoVenceText ? `${proximoVenceText}\n` : ""}📅 *Corte:* ${fechaHoy}

🔗 *Revise el detalle de sus comprobantes en el siguiente enlace:*
${statementUrl}

${hasVenceHoy ? "Le sugerimos realizar su abono el día de hoy para mantener su cuenta al día. " : proximoVenceText ? "Le recordamos tener presente su próxima fecha de vencimiento para mantener su línea activa. " : ""}Cualquier consulta estamos a su entera disposición. ¡Que tenga un excelente día!`
      );
    }
  }, [debt, clientName, salesperson, totalUSD, totalPEN, isCreditBalance, hasOverdue, hasVenceHoy, totalVenceHoyUSD, totalVenceHoyPEN, venceHoyDocs, nextUpcomingDue, statementUrl, messageTone]);

  // Guardar teléfono manualmente en el directorio
  const handleSavePhoneManually = () => {
    const cleanNum = phoneNumber.replace(/\D/g, "");
    if (!cleanNum || cleanNum.length < 7) {
      toast({
        title: "Número inválido",
        description: "Por favor, ingresa un número de al menos 7 dígitos.",
        status: "warning",
        duration: 2500,
      });
      return;
    }
    const success = saveClientPhone(clientKey, cleanNum, clientName);
    if (success) {
      setIsSavedPhone(true);
      setTimeout(() => setIsSavedPhone(false), 3000);
      toast({
        title: "💾 Teléfono Guardado",
        description: `El número +${countryCode} ${cleanNum} quedó memorizado para ${clientName}.`,
        status: "success",
        duration: 3000,
      });
    }
  };

  // Manejar apertura de WhatsApp
  const handleOpenWhatsApp = () => {
    const cleanNum = phoneNumber.replace(/\D/g, "");
    if (!cleanNum || cleanNum.length < 7) {
      toast({
        title: "Número de teléfono no válido",
        description: "Por favor, ingresa un número de WhatsApp válido (ej. 987654321).",
        status: "warning",
        duration: 3500,
        isClosable: true,
      });
      return;
    }

    // Persistir automáticamente en el directorio para futuras consultas
    if (clientKey && cleanNum) {
      saveClientPhone(clientKey, cleanNum, clientName);
    }

    const fullPhone = cleanNum.startsWith("51") && cleanNum.length > 9
      ? cleanNum
      : `${countryCode}${cleanNum.replace(/^0+/, "")}`;

    const encodedText = encodeURIComponent(generatedMessage);
    const waUrl = `https://api.whatsapp.com/send?phone=${fullPhone}&text=${encodedText}`;

    window.open(waUrl, "_blank", "noopener,noreferrer");
    toast({
      title: "📲 Abriendo WhatsApp",
      description: `Redirigiendo chat con ${clientName}...`,
      status: "success",
      duration: 3000,
    });
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(statementUrl);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
      toast({
        title: "🔗 Enlace copiado",
        description: "El enlace web del estado de cuenta se copió al portapapeles.",
        status: "info",
        duration: 2500,
      });
    } catch {}
  };

  const handleCopyMessage = async () => {
    try {
      await navigator.clipboard.writeText(generatedMessage);
      setCopiedMessage(true);
      setTimeout(() => setCopiedMessage(false), 2000);
      toast({
        title: "📋 Mensaje copiado",
        description: "El texto formateado para WhatsApp se copió al portapapeles.",
        status: "info",
        duration: 2500,
      });
    } catch {}
  };

  if (!debt) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} size={{ base: "full", md: "xl" }} isCentered scrollBehavior="inside">
      <ModalOverlay backdropFilter="blur(4px)" bg="blackAlpha.600" />
      <ModalContent borderRadius={{ base: "none", md: "2xl" }} overflow="hidden" boxShadow="2xl">
        <ModalHeader bg="#126C36" color="white" py={3.5} px={{ base: 4, md: 6 }}>
          <Flex justify="space-between" align="center">
            <HStack spacing={2.5}>
              <Box p={1.5} bg="whiteAlpha.200" borderRadius="lg">
                <MessageSquare className="w-5 h-5 text-emerald-200" />
              </Box>
              <Box>
                <Text fontSize={{ base: "14px", md: "16px" }} fontWeight="800">
                  Enviar Estado de Cuenta por WhatsApp
                </Text>
                <Text fontSize="11px" opacity={0.85} fontWeight="500">
                  {clientName} {clientCode && `• ${clientCode}`}
                </Text>
              </Box>
            </HStack>
          </Flex>
          <ModalCloseButton color="white" top={3.5} right={4} />
        </ModalHeader>

        <ModalBody p={{ base: 4, md: 5 }} bg="#f8fafc">
          <VStack spacing={4} align="stretch">
            {/* Tarjeta de Resumen Rápido */}
            <Box bg="white" p={3.5} borderRadius="xl" border="1px solid" borderColor="gray.200" boxShadow="xs">
              <Flex justify="space-between" align="center" wrap="wrap" gap={2}>
                <HStack spacing={2}>
                  <Badge
                    colorScheme={hasOverdue ? "red" : hasVenceHoy ? "orange" : isCreditBalance ? "blue" : "green"}
                    fontSize="11px"
                    px={2.5}
                    py={0.8}
                    borderRadius="full"
                    fontWeight="800"
                  >
                    {hasOverdue
                      ? `⚠️ ${vencidosCount} Cuotas Vencidas`
                      : hasVenceHoy
                      ? `⏰ ${venceHoyCount} Cuota${venceHoyCount > 1 ? "s" : ""} Vence Hoy (Último día)`
                      : isCreditBalance
                      ? "💳 Saldo a Favor"
                      : "✅ Cliente al Día"}
                  </Badge>
                  <Text fontSize="xs" fontWeight="700" color="gray.600">
                    Vendedor: <strong>{salesperson}</strong>
                  </Text>
                </HStack>
                <VStack align={{ base: "flex-start", sm: "flex-end" }} spacing={0}>
                  <Text
                    fontSize="sm"
                    fontWeight="900"
                    color={isCreditBalance ? "blue.600" : "emerald.700"}
                  >
                    {isCreditBalance ? "Saldo a Favor Total: " : "Saldo Total: "}
                    $ {Math.abs(Number(totalConsolidado || 0)).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD
                  </Text>
                  {hasUsd && hasPen && (
                    <Text fontSize="11px" color="gray.500" fontWeight="600">
                      ($ {Math.abs(totalUSD).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD + S/ {Math.abs(totalPEN).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })})
                    </Text>
                  )}
                </VStack>
              </Flex>
            </Box>

            {/* Configuración de Teléfono */}
            <Box bg="white" p={4} borderRadius="xl" border="1px solid" borderColor="gray.200" boxShadow="xs">
              <FormControl>
                <Flex justify="space-between" align="center" mb={2} wrap="wrap" gap={2}>
                  <FormLabel fontSize="xs" fontWeight="800" color="gray.700" display="flex" alignItems="center" gap={1.5} mb={0}>
                    <Phone className="w-3.5 h-3.5 text-emerald-600" />
                    {hasSapPhone && !isUsingAlternativePhone
                      ? "Número Oficial:"
                      : isUsingAlternativePhone
                      ? "Número Alternativo para este Envío:"
                      : "Número de WhatsApp del Cliente:"}
                  </FormLabel>

                  {hasSapPhone && !isUsingAlternativePhone ? (
                    <Badge colorScheme="green" fontSize="10px" px={2} py={0.5} borderRadius="full" display="flex" alignItems="center" gap={1}>
                      <Lock className="w-2.5 h-2.5" /> Oficial
                    </Badge>
                  ) : isUsingAlternativePhone ? (
                    <Button
                      size="xs"
                      variant="ghost"
                      colorScheme="teal"
                      leftIcon={<RotateCcw className="w-3 h-3" />}
                      onClick={() => {
                        setIsUsingAlternativePhone(false);
                        setPhoneNumber(sapOfficialPhone);
                      }}
                      fontSize="10.5px"
                      fontWeight="700"
                      h="24px"
                    >
                      Restaurar oficial ({sapOfficialPhone})
                    </Button>
                  ) : (
                    <Button
                      size="xs"
                      colorScheme={isSavedPhone ? "green" : "teal"}
                      variant={isSavedPhone ? "solid" : "ghost"}
                      leftIcon={isSavedPhone ? <Check className="w-3 h-3" /> : <Save className="w-3 h-3" />}
                      onClick={handleSavePhoneManually}
                      fontSize="10.5px"
                      fontWeight="700"
                      h="24px"
                      isDisabled={!phoneNumber || phoneNumber.length < 7}
                    >
                      {isSavedPhone ? "Guardado" : "Guardar Teléfono"}
                    </Button>
                  )}
                </Flex>

                <HStack spacing={2}>
                  <Box minW="75px" maxW="80px">
                    <Input
                      size="sm"
                      fontWeight="700"
                      textAlign="center"
                      value={`+${countryCode}`}
                      onChange={(e) => setCountryCode(e.target.value.replace(/\D/g, ""))}
                      borderRadius="lg"
                      isReadOnly={hasSapPhone && !isUsingAlternativePhone}
                      bg={hasSapPhone && !isUsingAlternativePhone ? "gray.50" : "white"}
                    />
                  </Box>
                  <Input
                    size="sm"
                    fontWeight="800"
                    placeholder={hasSapPhone ? sapOfficialPhone : "Ej. 987654321"}
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    borderRadius="lg"
                    borderColor={hasSapPhone && !isUsingAlternativePhone ? "gray.300" : phoneNumber ? "emerald.400" : "gray.300"}
                    focusBorderColor={hasSapPhone && !isUsingAlternativePhone ? "gray.400" : "emerald.500"}
                    isReadOnly={hasSapPhone && !isUsingAlternativePhone}
                    bg={hasSapPhone && !isUsingAlternativePhone ? "#f8fafc" : "white"}
                    cursor={hasSapPhone && !isUsingAlternativePhone ? "default" : "text"}
                  />
                  {hasSapPhone && !isUsingAlternativePhone ? (
                    <Tooltip label="Teléfono oficial registrado (Protegido contra cambios)">
                      <Box p={1.5} color="emerald.600">
                        <Lock className="w-4 h-4" />
                      </Box>
                    </Tooltip>
                  ) : null}
                </HStack>

                {/* Mensaje de estado y botón para número alternativo */}
                <Box mt={2}>
                  {isLoadingSapPhone ? (
                    <HStack spacing={1.5} color="emerald.600" fontSize="10.5px">
                      <Loader2 className="w-3 h-3 animate-spin" />
                      <Text>Consultando teléfono oficial...</Text>
                    </HStack>
                  ) : hasSapPhone && !isUsingAlternativePhone ? (
                    <Flex justify="space-between" align="center" wrap="wrap" gap={2}>
                      <HStack spacing={1.5} color="emerald.700" fontSize="10.5px" fontWeight="600">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
                        <Text>Teléfono oficial verificado (+51 {phoneNumber}).</Text>
                      </HStack>
                      <Button
                        size="xs"
                        variant="link"
                        colorScheme="blue"
                        onClick={() => {
                          setIsUsingAlternativePhone(true);
                          setPhoneNumber("");
                        }}
                        fontSize="10.5px"
                        fontWeight="700"
                      >
                        + Enviar a otro número temporal
                      </Button>
                    </Flex>
                  ) : isUsingAlternativePhone ? (
                    <Text fontSize="10.5px" color="orange.700" fontWeight="600">
                      ℹ️ Modo número alternativo: Solo se usará para abrir el chat de este envío.
                    </Text>
                  ) : (
                    <Text fontSize="10.5px" color="gray.500">
                      ℹ️ Cliente sin teléfono registrado. Ingresa el número para enviar el mensaje por WhatsApp.
                    </Text>
                  )}
                </Box>
              </FormControl>
            </Box>

            {/* Selector de Tono del Mensaje */}
            <Box
              bg="white"
              p={3.5}
              borderRadius="xl"
              border="1px solid"
              borderColor={hasOverdue ? "red.200" : hasVenceHoy ? "orange.200" : "gray.200"}
              boxShadow="xs"
            >
              <Flex justify="space-between" align="center" mb={2} wrap="wrap" gap={1}>
                <Text fontSize="xs" fontWeight="800" color={hasOverdue ? "red.700" : hasVenceHoy ? "orange.700" : "gray.700"}>
                  Tipo de Mensaje:
                </Text>
                {hasOverdue ? (
                  <Badge colorScheme="red" variant="subtle" fontSize="10px" px={2} py={0.5} borderRadius="full">
                    ⚠️ Obligatorio: Cliente con deuda vencida
                  </Badge>
                ) : hasVenceHoy ? (
                  <Badge colorScheme="orange" variant="subtle" fontSize="10px" px={2} py={0.5} borderRadius="full">
                    ⏰ Preventivo: Cuota vence hoy (Último día)
                  </Badge>
                ) : (
                  <Badge colorScheme="green" variant="subtle" fontSize="10px" px={2} py={0.5} borderRadius="full">
                    ✅ Cliente al día
                  </Badge>
                )}
              </Flex>
              <RadioGroup value={messageTone} onChange={setMessageTone}>
                <HStack spacing={4} wrap="wrap">
                  {hasOverdue ? (
                    <Radio value="urgent" colorScheme="red" size="sm">
                      <Text fontSize="xs" fontWeight="800" color="red.600">
                        Aviso de Vencimiento ({vencidosCount} {vencidosCount === 1 ? "Cuota Vencida" : "Cuotas Vencidas"})
                      </Text>
                    </Radio>
                  ) : hasVenceHoy ? (
                    <>
                      <Radio value="preventive" colorScheme="orange" size="sm">
                        <Text fontSize="xs" fontWeight="800" color="orange.700">
                          ⏰ Recordatorio Preventivo (Vence Hoy)
                        </Text>
                      </Radio>
                      <Radio value="friendly" colorScheme="orange" size="sm">
                        <Text fontSize="xs" fontWeight="700">Amable y Cercano</Text>
                      </Radio>
                      <Radio value="formal" colorScheme="orange" size="sm">
                        <Text fontSize="xs" fontWeight="700">Formal Corporativo</Text>
                      </Radio>
                    </>
                  ) : (
                    <>
                      <Radio value="friendly" colorScheme="green" size="sm">
                        <Text fontSize="xs" fontWeight="700">Amable y Cercano</Text>
                      </Radio>
                      <Radio value="formal" colorScheme="green" size="sm">
                        <Text fontSize="xs" fontWeight="700">Formal Corporativo</Text>
                      </Radio>
                    </>
                  )}
                </HStack>
              </RadioGroup>
            </Box>

            {/* Vista Previa Estilo Burbuja de WhatsApp */}
            <Box>
              <Flex justify="space-between" align="center" mb={1.5}>
                <Text fontSize="xs" fontWeight="800" color="gray.600" textTransform="uppercase">
                  Vista Previa en WhatsApp:
                </Text>
                <HStack spacing={1.5}>
                  <Button
                    size="xs"
                    variant="ghost"
                    leftIcon={copiedMessage ? <Check className="w-3 h-3 text-green-600" /> : <Copy className="w-3 h-3" />}
                    onClick={handleCopyMessage}
                    fontSize="11px"
                    fontWeight="700"
                  >
                    {copiedMessage ? "Copiado" : "Copiar Texto"}
                  </Button>
                  <Button
                    size="xs"
                    variant="ghost"
                    leftIcon={copiedLink ? <Check className="w-3 h-3 text-green-600" /> : <Share2 className="w-3 h-3" />}
                    onClick={handleCopyLink}
                    fontSize="11px"
                    fontWeight="700"
                  >
                    {copiedLink ? "Enlace Copiado" : "Copiar URL"}
                  </Button>
                </HStack>
              </Flex>

              <Box
                bg="#e7f5e8"
                p={4}
                borderRadius="2xl"
                border="1px solid"
                borderColor="#bbf7d0"
                boxShadow="xs"
                position="relative"
              >
                <Text
                  fontSize={{ base: "12px", md: "12.5px" }}
                  color="gray.900"
                  whiteSpace="pre-wrap"
                  lineHeight="1.6"
                  fontFamily="-apple-system, BlinkMacSystemFont, Segoe UI, Roboto, Helvetica, Arial, sans-serif"
                >
                  {generatedMessage}
                </Text>
              </Box>
            </Box>
          </VStack>
        </ModalBody>

        <ModalFooter
          bg="gray.50"
          borderTop="1px solid"
          borderColor="gray.200"
          py={3}
          px={{ base: 4, md: 6 }}
          gap={2.5}
          flexDirection={{ base: "column-reverse", sm: "row" }}
          justifyContent="space-between"
        >
          <Flex
            w={{ base: "full", sm: "auto" }}
            gap={2}
            direction={{ base: "column", sm: "row" }}
          >
            <Button
              size="sm"
              variant="outline"
              colorScheme="teal"
              leftIcon={<ExternalLink className="w-3.5 h-3.5" />}
              onClick={() => window.open(statementUrl, "_blank")}
              fontWeight="700"
              fontSize="xs"
              w={{ base: "full", sm: "auto" }}
            >
              Ver Enlace Web
            </Button>
            <Button
              size="sm"
              variant="outline"
              colorScheme="gray"
              leftIcon={<FileText className="w-3.5 h-3.5 text-gray-700" />}
              onClick={() => generateAccountStatementPDF(debt)}
              fontWeight="700"
              fontSize="xs"
              w={{ base: "full", sm: "auto" }}
            >
              Descargar PDF
            </Button>
          </Flex>

          <Button
            size="md"
            minH="42px"
            colorScheme="whatsapp"
            bg="#25d366"
            _hover={{ bg: "#20bd5a" }}
            leftIcon={<Send className="w-4 h-4" />}
            onClick={handleOpenWhatsApp}
            fontWeight="800"
            fontSize="sm"
            px={6}
            w={{ base: "full", sm: "auto" }}
            boxShadow="0 4px 14px 0 rgba(37, 211, 102, 0.39)"
          >
            📲 Enviar por WhatsApp
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}

export default WhatsAppStatementModal;
