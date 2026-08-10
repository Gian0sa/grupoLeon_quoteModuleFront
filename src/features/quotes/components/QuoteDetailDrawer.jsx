import React, { useState } from "react";
import {
  Drawer,
  DrawerOverlay,
  DrawerContent,
  DrawerHeader,
  DrawerBody,
  DrawerCloseButton,
  Box,
  Flex,
  Text,
  Heading,
  Badge,
  VStack,
  HStack,
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
  Icon as ChakraIcon,
  useToast,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  ModalCloseButton,
  FormControl,
  FormLabel,
  FormHelperText,
  Textarea,
  Alert,
  AlertIcon
} from "@chakra-ui/react";
import {
  FileText,
  User,
  Clock,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  History,
  Info,
  Check,
  Circle,
  ShieldCheck,
  Lock,
  Send,
  RotateCcw
} from "lucide-react";
import { RejectReasonModal } from "./RejectReasonModal";
import { useAuthStore } from "../../../features/auth/stores/useAuthStore";

export function QuoteDetailDrawer({ isOpen, onClose, quote, onUpdateStatus }) {
  const { username: authUsername, role: authRole } = useAuthStore();
  const isAdminUser = authRole === "ADMIN" || authUsername?.toLowerCase() === "enrique";
  const activeRole = isAdminUser ? "ADMIN" : "SELLER";
  const adminUsername = isAdminUser ? (authUsername || "Enrique") : "Enrique";

  const [isRejectModalOpen, setIsRejectModalOpen] = useState(false);
  const [isResubmitModalOpen, setIsResubmitModalOpen] = useState(false);
  const [resubmitNote, setResubmitNote] = useState("");
  const toast = useToast();

  if (!quote) return null;

  const client = quote.client || {};
  const products = quote.products || quote.items || [];
  const status = quote.approvalStatus || quote.state || "GENERADO";
  
  // Mapear historial
  const historyLog = quote.historyLog || [
    { status: "GENERADO", timestamp: quote.createdAt || new Date().toISOString(), user: quote.sellerName || "Manuel (Vendedor)", note: "Cotización creada en aplicativo" }
  ];

  // Calcular Totales
  const subtotalUSD = quote.totals?.subtotalUSD || products.reduce((acc, p) => acc + (Number(p.price || p.unitPrice || 0) * Number(p.quantity || 1)), 0);
  const igvUSD = quote.totals?.igvUSD || (subtotalUSD * 0.18);
  const grandTotalUSD = quote.totals?.grandTotalUSD || (subtotalUSD + igvUSD);
  const grandTotalSOL = quote.totals?.grandTotalSOL || (grandTotalUSD * (quote.totals?.tc || 3.43));

  // Formateadores y cálculos de marca de tiempo en vivo
  const formatTimeStr = (isoStr) => {
    if (!isoStr) return "—";
    try {
      const d = new Date(isoStr);
      if (isNaN(d.getTime())) return "—";
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });
    } catch {
      return "—";
    }
  };

  const findLogIso = (targetStatuses) => {
    const entry = historyLog.find(h => targetStatuses.includes(h.status));
    return entry ? entry.timestamp : null;
  };

  const calculateDurationStr = (startIso, endIso) => {
    if (!startIso || !endIso) return "—";
    const startMs = new Date(startIso).getTime();
    const endMs = new Date(endIso).getTime();
    if (isNaN(startMs) || isNaN(endMs) || endMs < startMs) return "—";
    const diffMins = Math.round((endMs - startMs) / 60000);
    if (diffMins < 1) return "< 1 min";
    if (diffMins < 60) return `${diffMins} min`;
    const hours = Math.floor(diffMins / 60);
    const mins = diffMins % 60;
    return `${hours}h ${mins}m`;
  };

  const createdIso = quote.createdAt || historyLog[0]?.timestamp || new Date().toISOString();
  const solicitudIso = findLogIso(["ENVIADO", "EN_PROCESO", "APROBADO", "RECHAZADO"]);
  const revisionIso = findLogIso(["EN_PROCESO", "APROBADO", "RECHAZADO"]);
  const finalIso = findLogIso(["APROBADO", "RECHAZADO"]);

  const stepCotizado = {
    isCompleted: true,
    time: formatTimeStr(createdIso)
  };

  const stepSolicitud = {
    isCompleted: ["ENVIADO", "EN_PROCESO", "APROBADO", "RECHAZADO"].includes(status),
    time: solicitudIso ? formatTimeStr(solicitudIso) : "—"
  };

  const stepRevision = {
    isCompleted: ["EN_PROCESO", "APROBADO", "RECHAZADO"].includes(status),
    time: revisionIso ? formatTimeStr(revisionIso) : "—"
  };

  const stepFinal = {
    isCompleted: ["APROBADO", "RECHAZADO"].includes(status),
    time: finalIso ? formatTimeStr(finalIso) : "—",
    isApproved: status === "APROBADO",
    isRejected: status === "RECHAZADO"
  };

  const dur1To2 = calculateDurationStr(createdIso, solicitudIso);
  const dur2To3 = calculateDurationStr(solicitudIso, revisionIso);
  const dur3To4 = calculateDurationStr(revisionIso, finalIso);
  const totalCiclo = calculateDurationStr(createdIso, finalIso || new Date().toISOString());

  // Definición del banner de alerta de estado
  const getStatusAlert = () => {
    switch (status) {
      case "RECHAZADO":
        return {
          bg: "red.50",
          border: "red.200",
          color: "red.800",
          titleColor: "red.900",
          iconColor: "red.600",
          icon: XCircle,
          title: "Cotización Rechazada",
          subtitle: "ETAPA FINAL: RECHAZADA POR FACTURACIÓN",
          desc: quote.rejectionReason || "La solicitud fue rechazada durante la evaluación comercial.",
          subdesc: "Notificación emitida al vendedor de campo con la observación correspondiente.",
          timeInStage: "Evaluado"
        };
      case "APROBADO":
        return {
          bg: "emerald.50",
          border: "emerald.200",
          color: "emerald.800",
          titleColor: "emerald.900",
          iconColor: "emerald.600",
          icon: CheckCircle2,
          title: "Cotización Aprobada",
          subtitle: "ETAPA FINAL: LISTO PARA FACTURAR",
          desc: "Cotización aprobada exitosamente por la Asesora de Facturación (Enrique). Stock en Almacén 014 y depósito validados.",
          subdesc: "Lista para emisión oficial en SAP Business One.",
          timeInStage: "Aprobado"
        };
      case "EN_PROCESO":
        return {
          bg: "orange.50",
          border: "orange.200",
          color: "orange.800",
          titleColor: "orange.900",
          iconColor: "orange.600",
          icon: Clock,
          title: "Cotización En Revisión",
          subtitle: "FASE 3: EVALUACIÓN POR ASESORA DE FACTURACIÓN",
          desc: `La cotización está siendo evaluada por ${adminUsername || "Enrique"} para verificar la coincidencia del depósito.`,
          subdesc: "Esperando confirmación final de inventarios.",
          timeInStage: "En evaluación"
        };
      case "ENVIADO":
        return {
          bg: "blue.50",
          border: "blue.200",
          color: "blue.800",
          titleColor: "blue.900",
          iconColor: "blue.600",
          icon: Info,
          title: "Cotización Enviada a Validación",
          subtitle: "FASE 2: PENDIENTE DE REVISIÓN",
          desc: `El documento ha sido enviado por ${quote.sellerName || "el vendedor"}. Pendiente de evaluación y firma por Facturación.`,
          subdesc: "Esperando acción del perfil Administrador.",
          timeInStage: "Pendiente"
        };
      default:
        return {
          bg: "gray.50",
          border: "gray.200",
          color: "gray.800",
          titleColor: "gray.900",
          iconColor: "gray.600",
          icon: Info,
          title: "Borrador Generado",
          subtitle: "FASE 1: BORRADOR LOCAL",
          desc: `Documento registrado en la aplicación por ${quote.sellerName || "el vendedor"}.`,
          subdesc: "Presiona 'Guardar y Enviar a Validación' para remitirlo al Administrador.",
          timeInStage: "Reciente"
        };
    }
  };

  const alertDetails = getStatusAlert();

  // Función para aprobar por Admin (Enrique)
  const handleApproveByAdmin = () => {
    if (onUpdateStatus) {
      onUpdateStatus(quote.id || quote.docNumber, "APROBADO", `Aprobado por ${adminUsername || "Admin Facturación"}`);
    }

    // Notificación dirigida al vendedor que creó la cotización
    const notifs = JSON.parse(localStorage.getItem("grupoLeon_notifications") || "[]");
    const sellerUsername = quote.createdByUsername || quote.sellerName || null;
    const newNotif = {
      id: `NOTIF-${Date.now()}`,
      targetRole: "VENDEDOR",
      targetUsername: sellerUsername,           // ← al vendedor que la creó
      fromUsername: adminUsername || "enrique", // ← del admin logueado
      quoteId: quote.docNumber || quote.id,
      quoteObj: quote,
      title: `✅ Cotización ${quote.docNumber || quote.id} Aprobada`,
      description: `La cotización fue aprobada por ${adminUsername || "Administrador"}. Lista para emisión en SAP Business One.`,
      status: "APROBADO",
      timestamp: new Date().toISOString(),
      read: false
    };
    localStorage.setItem("grupoLeon_notifications", JSON.stringify([newNotif, ...notifs]));
    window.dispatchEvent(new Event("localNotificationsUpdated"));

    toast({
      title: "✅ Cotización Aprobada",
      description: `Se notificó al vendedor ${sellerUsername || ""} que la cotización fue aprobada.`,
      status: "success",
      duration: 4000,
      isClosable: true,
    });
  };

  // Función para Subsanar y Reenviar cotización rechazada (RN-01 a RN-10)
  const handleResubmit = () => {
    if (resubmitNote.trim().length < 10) {
      toast({
        title: "Nota obligatoria",
        description: "Debes explicar qué corregiste (mínimo 10 caracteres).",
        status: "warning",
        duration: 3000,
        isClosable: true,
      });
      return;
    }

    const quoteId = quote.id || quote.docNumber;
    const sellerUsername = quote.createdByUsername || quote.sellerName || null;
    const nowIso = new Date().toISOString();
    const prevRejectionReason = quote.rejectionReason || "Sin motivo registrado";

    // Actualizar cotización en localStorage → estado ENVIADO, limpiar rechazo
    const saved = JSON.parse(localStorage.getItem("grupoLeon_local_quotes") || "[]");
    const updatedQuotes = saved.map((q) => {
      if ((q.id || q.docNumber) !== quoteId) return q;
      const prevHistory = q.historyLog || [];
      const newEntry = {
        status: "SUBSANADO",
        timestamp: nowIso,
        user: sellerUsername || "vendedor",
        note: `SUBSANACIÓN: ${resubmitNote.trim()} [Rechazo previo: "${prevRejectionReason}"]`
      };
      const reenviado = {
        status: "ENVIADO",
        timestamp: new Date(Date.now() + 1000).toISOString(),
        user: sellerUsername || "vendedor",
        note: "Cotización reenviada a validación tras subsanación"
      };
      return {
        ...q,
        status: "ENVIADO",
        state: "ENVIADO",
        approvalStatus: "ENVIADO",
        rejectionReason: null,
        updatedAt: nowIso,
        historyLog: [...prevHistory, newEntry, reenviado]
      };
    });
    localStorage.setItem("grupoLeon_local_quotes", JSON.stringify(updatedQuotes));
    window.dispatchEvent(new Event("localQuotesUpdated"));

    // Notificación al Admin (Enrique) — nueva revisión requerida
    const ADMIN_FACTURACION_USERNAME = "enrique";
    const existingNotifs = JSON.parse(localStorage.getItem("grupoLeon_notifications") || "[]");
    const adminNotif = {
      id: `NOTIF-${Date.now()}`,
      targetRole: "FACTURACION",
      targetUsername: ADMIN_FACTURACION_USERNAME,
      fromUsername: sellerUsername || "vendedor",
      quoteId: quoteId,
      quoteObj: quote,
      title: `🔄 Cotización ${quoteId} Subsanada y Reenviada`,
      description: `${sellerUsername || "El vendedor"} ha subsanado la cotización y la reenvía para nueva revisión. Nota: "${resubmitNote.trim()}".`,
      status: "ENVIADO",
      timestamp: nowIso,
      read: false
    };
    // Notificación de confirmación al Vendedor
    const sellerConfirmNotif = {
      id: `NOTIF-${Date.now() + 1}`,
      targetRole: "VENDEDOR",
      targetUsername: sellerUsername,
      fromUsername: "Sistema",
      quoteId: quoteId,
      quoteObj: quote,
      title: `📤 Reenvío Registrado — ${quoteId}`,
      description: `Tu cotización fue subsanada y reenviada exitosamente. Facturación (${ADMIN_FACTURACION_USERNAME}) revisará nuevamente.`,
      status: "ENVIADO",
      timestamp: nowIso,
      read: false
    };
    localStorage.setItem(
      "grupoLeon_notifications",
      JSON.stringify([adminNotif, sellerConfirmNotif, ...existingNotifs])
    );
    window.dispatchEvent(new Event("localNotificationsUpdated"));

    // Llamar onUpdateStatus para sincronizar estado en el componente padre
    if (onUpdateStatus) {
      onUpdateStatus(quoteId, "ENVIADO", `Subsanado y reenviado por ${sellerUsername || "vendedor"}`);
    }

    setResubmitNote("");
    setIsResubmitModalOpen(false);

    toast({
      title: "✅ Reenvío Exitoso",
      description: `Cotización ${quoteId} reenviada a validación. Enrique recibirá la notificación.`,
      status: "success",
      duration: 5000,
      isClosable: true,
    });
  };

  // Función para confirmar Rechazo desde Modal
  const handleConfirmReject = (quoteId, reasonText) => {
    if (onUpdateStatus) {
      onUpdateStatus(quoteId, "RECHAZADO", `Rechazado por ${adminUsername || "Admin Facturación"}: ${reasonText}`);
    }

    // Notificación dirigida al vendedor que creó la cotización
    const notifs = JSON.parse(localStorage.getItem("grupoLeon_notifications") || "[]");
    const sellerUsername = quote.createdByUsername || quote.sellerName || null;
    const newNotif = {
      id: `NOTIF-${Date.now()}`,
      targetRole: "VENDEDOR",
      targetUsername: sellerUsername,           // ← al vendedor que la creó
      fromUsername: adminUsername || "enrique", // ← del admin logueado
      quoteId: quoteId,
      quoteObj: quote,
      title: `❌ Cotización ${quote.docNumber || quote.id} Rechazada`,
      description: `Rechazada por ${adminUsername || "Administrador"}. Motivo: "${reasonText}"`,
      status: "RECHAZADO",
      timestamp: new Date().toISOString(),
      read: false
    };
    localStorage.setItem("grupoLeon_notifications", JSON.stringify([newNotif, ...notifs]));
    window.dispatchEvent(new Event("localNotificationsUpdated"));

    toast({
      title: "❌ Cotización Rechazada",
      description: `Se registró el motivo de rechazo y se notificó al vendedor ${sellerUsername || ""}.`,
      status: "info",
      duration: 5000,
      isClosable: true,
    });
  };

  return (
    <>
      <Drawer isOpen={isOpen} onClose={onClose} placement="right" size="xl">
        <DrawerOverlay bg="blackAlpha.600" backdropFilter="blur(4px)" />
        <DrawerContent
          borderLeftRadius={{ base: "none", md: "2xl" }}
          overflow="hidden"
          w="full"
          maxW={{ base: "100vw", md: "940px" }}
        >
          <DrawerHeader bg="#126C36" color="white" py={3} px={{ base: 4, md: 6 }}>
            <Flex align="center" justify="space-between" gap={2}>
              <HStack spacing={3} minW={0}>
                <FileText className="w-5.5 h-5.5 text-emerald-300 flex-shrink-0" />
                <Box minW={0}>
                  <Heading size="sm" color="white" fontWeight="800" isTruncated>
                    {quote.docNumber || quote.id || "COT-017071"}
                  </Heading>
                  <Text fontSize={{ base: "11px", md: "xs" }} color="emerald.100" fontWeight="500">
                    Seguimiento Comercial y Control de Calidad
                  </Text>
                </Box>
              </HStack>
              <DrawerCloseButton
                color="white"
                position="static"
                flexShrink={0}
                w={{ base: "44px", md: "32px" }}
                h={{ base: "44px", md: "32px" }}
              />
            </Flex>
          </DrawerHeader>

          <DrawerBody p={{ base: 3, md: 5 }} bg="slate.50" overflowY="auto" overflowX="hidden">
            {/* PANEL DE ACCIONES SEGÚN EL ROL AUTENTICADO Y ESTADO DE LA COTIZACIÓN */}
            {activeRole === "SELLER" ? (
              status === "RECHAZADO" ? (
                /* ── Panel Unificado de Subsanación (Vendedor + Rechazo) ── */
                <Box bg="red.50" p={4} borderRadius="xl" border="2px solid" borderColor="red.300" boxShadow="sm" mb={5}>
                  <VStack align="stretch" spacing={3}>
                    <Flex justify="space-between" align={{ base: "flex-start", sm: "center" }} wrap="wrap" gap={2}>
                      <HStack spacing={2.5}>
                        <Flex w="36px" h="36px" borderRadius="full" bg="red.500" align="center" justify="center" color="white" flexShrink={0}>
                          <XCircle className="w-5 h-5 stroke-[2.5]" />
                        </Flex>
                        <Box minW={0}>
                          <Text fontSize={{ base: "14px", md: "sm" }} fontWeight="900" color="red.900" textTransform="uppercase" letterSpacing="wide">
                            Cotización Rechazada por Facturación
                          </Text>
                          <Text fontSize={{ base: "12px", md: "xs" }} color="red.800" fontWeight="600">
                            Evaluada por {adminUsername || "Enrique"} • Acción requerida para subsanar
                          </Text>
                        </Box>
                      </HStack>
                      <Badge colorScheme="red" variant="solid" px={3} py={1} borderRadius="full" fontSize="xs">
                        PENDIENTE DE SUBSANACIÓN
                      </Badge>
                    </Flex>

                    {/* Motivo del rechazo */}
                    <Box bg="white" border="1px solid" borderColor="red.200" p={3} borderRadius="lg">
                      <Text fontSize="10px" fontWeight="800" color="red.700" textTransform="uppercase" mb={1}>
                        💬 Motivo del Rechazo:
                      </Text>
                      <Text fontSize={{ base: "13px", md: "xs" }} fontWeight="700" color="red.900" fontStyle="italic" overflowWrap="anywhere">
                        "{quote.rejectionReason || "No se especificó motivo de rechazo."}"
                      </Text>
                    </Box>

                    <Button
                      size={{ base: "md", md: "sm" }}
                      w={{ base: "full", sm: "auto" }}
                      alignSelf={{ base: "stretch", sm: "flex-start" }}
                      colorScheme="orange"
                      leftIcon={<RotateCcw className="w-4 h-4" />}
                      onClick={() => { setResubmitNote(""); setIsResubmitModalOpen(true); }}
                      fontWeight="800"
                      boxShadow="sm"
                    >
                      Subsanar y Reenviar a Validación
                    </Button>
                  </VStack>
                </Box>
              ) : (
                /* ── Panel estático para otros estados en modo SELLER ── */
                <Box p={3.5} bg="blue.50" borderRadius="xl" border="1px solid" borderColor="blue.200" mb={5}>
                  <HStack spacing={2.5}>
                    <Lock className="w-4 h-4 text-blue-700 flex-shrink-0" />
                    <Text fontSize="xs" color="blue.900" fontWeight="700">
                      🔒 Modo Vendedor ({quote.sellerName || "Manuel"}): Esta cotización está en proceso comercial. La evaluación está a cargo de Enrique (Admin / Facturación).
                    </Text>
                  </HStack>
                </Box>
              )
            ) : status === "APROBADO" ? (
              <Box bg="emerald.50" p={4} borderRadius="xl" border="2px solid" borderColor="emerald.500" boxShadow="sm" mb={5}>
                <Flex align="center" justify="space-between" wrap="wrap" gap={3}>
                  <HStack spacing={3}>
                    <Flex w="36px" h="36px" borderRadius="full" bg="emerald.500" align="center" justify="center" color="white">
                      <CheckCircle2 className="w-5 h-5 stroke-[2.5]" />
                    </Flex>
                    <Box>
                      <Text fontSize="xs" fontWeight="900" color="emerald.900" textTransform="uppercase">
                        ✅ Cotización Aprobada en SAP
                      </Text>
                      <Text fontSize="11px" color="emerald.800" fontWeight="600">
                        La cotización fue validada por {adminUsername || "Enrique"}. Lista para emisión oficial de orden.
                      </Text>
                    </Box>
                  </HStack>
                  <Badge colorScheme="green" variant="solid" px={3} py={1} borderRadius="full" fontSize="xs">
                    CONCLUIDO (APROBADO)
                  </Badge>
                </Flex>
              </Box>
            ) : status === "RECHAZADO" ? (
              <Box bg="red.50" p={4} borderRadius="xl" border="2px solid" borderColor="red.500" boxShadow="sm" mb={5}>
                <Flex align="center" justify="space-between" wrap="wrap" gap={3}>
                  <HStack spacing={3}>
                    <Flex w="36px" h="36px" borderRadius="full" bg="red.500" align="center" justify="center" color="white">
                      <XCircle className="w-5 h-5 stroke-[2.5]" />
                    </Flex>
                    <Box>
                      <Text fontSize="xs" fontWeight="900" color="red.900" textTransform="uppercase">
                        ❌ Cotización Rechazada
                      </Text>
                      <Text fontSize="11px" color="red.800" fontWeight="600">
                        Motivo: "{quote.rejectionReason || "No cumple con las políticas comerciales."}"
                      </Text>
                    </Box>
                  </HStack>
                  <Badge colorScheme="red" variant="solid" px={3} py={1} borderRadius="full" fontSize="xs">
                    CONCLUIDO (RECHAZADO)
                  </Badge>
                </Flex>
              </Box>
            ) : (
              <Box bg="white" p={4} borderRadius="xl" border="2px solid" borderColor="emerald.500" boxShadow="sm" mb={5}>
                <Flex align="center" justify="space-between" wrap="wrap" gap={3}>
                  <Box minW={0}>
                    <Text fontSize={{ base: "13px", md: "xs" }} fontWeight="900" color="emerald.900" textTransform="uppercase" letterSpacing="wide">
                      👑 Panel de Decisión Comercial — Admin / Facturación ({adminUsername || "Enrique"})
                    </Text>
                    <Text fontSize={{ base: "13px", md: "11px" }} color="gray.700">
                      Evalúa la solicitud de {quote.sellerName || "Manuel"}. Aprobar enviará la orden a SAP; Rechazar abrirá la ventana de motivo obligatorio.
                    </Text>
                  </Box>
                  {/* Decisión irreversible: en móvil los botones se apilan a
                      ancho completo y 44px de alto para evitar toques erróneos. */}
                  <Flex
                    direction={{ base: "column", sm: "row" }}
                    gap={3}
                    w={{ base: "full", md: "auto" }}
                  >
                    <Button
                      size={{ base: "md", md: "sm" }}
                      w={{ base: "full", sm: "auto" }}
                      colorScheme="emerald"
                      leftIcon={<CheckCircle2 className="w-4 h-4" />}
                      onClick={handleApproveByAdmin}
                      fontWeight="800"
                    >
                      Aprobar y Emitir en SAP
                    </Button>
                    <Button
                      size={{ base: "md", md: "sm" }}
                      w={{ base: "full", sm: "auto" }}
                      colorScheme="red"
                      leftIcon={<XCircle className="w-4 h-4" />}
                      onClick={() => setIsRejectModalOpen(true)}
                      fontWeight="800"
                    >
                      Rechazar Cotización
                    </Button>
                  </Flex>
                </Flex>
              </Box>
            )}

            {/* FICHA TÉCNICA RÁPIDA */}
            <Grid
              templateColumns={{ base: "repeat(2, 1fr)", md: "repeat(4, 1fr)" }}
              gap={{ base: 3, md: 3 }}
              mb={5}
              bg="white"
              p={3.5}
              borderRadius="xl"
              border="1px solid"
              borderColor="gray.200"
              boxShadow="xs"
            >
              <Box minW={0}>
                <Text fontSize={{ base: "11px", md: "10px" }} fontWeight="700" color="gray.500" textTransform="uppercase">Razón Social</Text>
                <Text fontSize={{ base: "13px", md: "xs" }} fontWeight="800" color="gray.800" isTruncated>{client.CardName || client.name || quote.clientName || "CLIENTE NO REGISTRADO"}</Text>
              </Box>
              <Box minW={0}>
                <Text fontSize={{ base: "11px", md: "10px" }} fontWeight="700" color="gray.500" textTransform="uppercase">RUC / Documento</Text>
                <Text fontSize={{ base: "13px", md: "xs" }} fontWeight="800" color="gray.800" isTruncated>{client.CardCode || client.Ruc || quote.clientDocument || "—"}</Text>
              </Box>
              <Box minW={0}>
                <Text fontSize={{ base: "11px", md: "10px" }} fontWeight="700" color="gray.500" textTransform="uppercase">Vendedor Asignado</Text>
                <Text fontSize={{ base: "13px", md: "xs" }} fontWeight="800" color="gray.800" isTruncated>{quote.sellerName || "Manuel"}</Text>
              </Box>
              <Box minW={0}>
                <Text fontSize={{ base: "11px", md: "10px" }} fontWeight="700" color="gray.500" textTransform="uppercase">Fecha Registro</Text>
                <Text fontSize={{ base: "13px", md: "xs" }} fontWeight="800" color="gray.800" isTruncated>{quote.docDate || new Date(createdIso).toLocaleDateString()}</Text>
              </Box>
            </Grid>

            {/* SECCIÓN 📍 RUTA / SEGUIMIENTO DE LA COTIZACIÓN (ESTILO RAPPI) */}
            <Box bg="white" p={{ base: 3, md: 5 }} borderRadius="2xl" border="1px solid" borderColor="gray.200" boxShadow="sm" mb={5} overflow="hidden">
              <Flex justify="space-between" align="center" mb={4} wrap="wrap" gap={2}>
                <HStack spacing={2} wrap="wrap">
                  <Text fontSize={{ base: "13px", md: "xs" }} fontWeight="800" color="gray.800" textTransform="uppercase" letterSpacing="wider">
                    📍 Ruta / Seguimiento de la Cotización
                  </Text>
                  <Badge colorScheme={status === "RECHAZADO" ? "red" : "emerald"} variant="subtle" fontSize="9px">Tiempo Real</Badge>
                </HStack>
                <HStack spacing={2} fontSize={{ base: "11px", md: "xs" }}>
                  <Text color="gray.600" fontWeight="600">Ciclo Total:</Text>
                  <Badge colorScheme={status === "RECHAZADO" ? "red" : "blue"} fontSize="xs" px={2} py={0.5} borderRadius="full">{totalCiclo}</Badge>
                  <Badge bg={status === "RECHAZADO" ? "red.600" : "emerald.800"} color="white" fontSize="xs" px={2} py={0.5} borderRadius="full">
                    {stepFinal.isCompleted ? "100%" : status === "EN_PROCESO" ? "66%" : status === "ENVIADO" ? "33%" : "0%"}
                  </Badge>
                </HStack>
              </Flex>

              {/* LÍNEA DE PROGRESO INTERACTIVA DINÁMICA (100% Responsiva en Móvil - Sin recortes) */}
              <Box
                w="full"
                maxW="100%"
                overflow="hidden"
                pb={1}
              >
              <Box position="relative" py={3} px={{ base: 2, sm: 4, md: 8 }} bg="gray.50" borderRadius="xl" w="full">
                {/* Línea conectora gris de fondo */}
                <Box position="absolute" top="33px" left={{ base: "30px", sm: "40px", md: "55px" }} right={{ base: "30px", sm: "40px", md: "55px" }} h="3px" bg="gray.200" borderRadius="full" zIndex={0} />

                {/* Línea conectora de progreso activa */}
                <Box
                  position="absolute"
                  top="33px"
                  left={{ base: "30px", sm: "40px", md: "55px" }}
                  h="3px"
                  bg={status === "RECHAZADO" ? "red.500" : status === "EN_PROCESO" ? "orange.400" : "emerald.500"}
                  borderRadius="full"
                  zIndex={0}
                  transition="all 0.4s ease"
                  style={{
                    width: (status === "BORRADOR" || status === "GENERADO") ? "0%" : status === "ENVIADO" ? "33%" : status === "EN_PROCESO" ? "66%" : "100%"
                  }}
                />

                <Flex justify="space-between" align="flex-start" position="relative" zIndex={1} w="full">
                  {/* Paso 1: Cotizado */}
                  <VStack spacing={1} align="center" minW="0" flex="1">
                    <Text fontSize={{ base: "9px", sm: "10px" }} fontWeight="800" color="emerald.800" isTruncated>COTIZADO</Text>
                    <Flex w={{ base: "28px", sm: "32px", md: "34px" }} h={{ base: "28px", sm: "32px", md: "34px" }} borderRadius="full" bg="emerald.500" align="center" justify="center" color="white" boxShadow="sm">
                      <Check className="w-3.5 h-3.5 stroke-[3]" />
                    </Flex>
                    <Text fontSize={{ base: "9px", sm: "10px" }} fontWeight="700" color="gray.600">{stepCotizado.time}</Text>
                  </VStack>

                  {/* Burbuja SLA 1 */}
                  <Flex align="center" justify="center" h={{ base: "58px", sm: "68px" }}>
                    <Badge variant="subtle" colorScheme="green" fontSize={{ base: "7.5px", sm: "9px" }} px={{ base: 1, sm: 2 }} py={0.5} borderRadius="full" bg="white" border="1px solid" borderColor="green.200">
                      {dur1To2}
                    </Badge>
                  </Flex>

                  {/* Paso 2: Solicitud */}
                  <VStack spacing={1} align="center" minW="0" flex="1">
                    <Text fontSize={{ base: "9px", sm: "10px" }} fontWeight="800" color={stepSolicitud.isCompleted ? "emerald.800" : "gray.400"} isTruncated>SOLICITUD</Text>
                    <Flex w={{ base: "28px", sm: "32px", md: "34px" }} h={{ base: "28px", sm: "32px", md: "34px" }} borderRadius="full" bg={stepSolicitud.isCompleted ? "emerald.500" : "gray.200"} align="center" justify="center" color="white" boxShadow="sm">
                      {stepSolicitud.isCompleted ? <Check className="w-3.5 h-3.5 stroke-[3]" /> : <Circle className="w-3.5 h-3.5 text-gray-400" />}
                    </Flex>
                    <Text fontSize={{ base: "9px", sm: "10px" }} fontWeight="700" color="gray.600">{stepSolicitud.time}</Text>
                  </VStack>

                  {/* Burbuja SLA 2 */}
                  <Flex align="center" justify="center" h={{ base: "58px", sm: "68px" }}>
                    <Badge variant="subtle" colorScheme="green" fontSize={{ base: "7.5px", sm: "9px" }} px={{ base: 1, sm: 2 }} py={0.5} borderRadius="full" bg="white" border="1px solid" borderColor="green.200">
                      {dur2To3}
                    </Badge>
                  </Flex>

                  {/* Paso 3: Revisión */}
                  <VStack spacing={1} align="center" minW="0" flex="1">
                    <Text fontSize={{ base: "9px", sm: "10px" }} fontWeight="800" color={stepRevision.isCompleted ? (status === "RECHAZADO" ? "red.800" : "emerald.800") : "gray.400"} isTruncated>REVISIÓN</Text>
                    <Flex w={{ base: "28px", sm: "32px", md: "34px" }} h={{ base: "28px", sm: "32px", md: "34px" }} borderRadius="full" bg={stepRevision.isCompleted ? (status === "RECHAZADO" ? "red.500" : "emerald.500") : "gray.200"} align="center" justify="center" color="white" boxShadow="sm">
                      {stepRevision.isCompleted ? <Check className="w-3.5 h-3.5 stroke-[3]" /> : <Circle className="w-3.5 h-3.5 text-gray-400" />}
                    </Flex>
                    <Text fontSize={{ base: "9px", sm: "10px" }} fontWeight="700" color="gray.600">{stepRevision.time}</Text>
                  </VStack>

                  {/* Burbuja SLA 3 */}
                  <Flex align="center" justify="center" h={{ base: "58px", sm: "68px" }}>
                    <Badge variant="subtle" colorScheme={status === "RECHAZADO" ? "red" : "green"} fontSize={{ base: "7.5px", sm: "9px" }} px={{ base: 1, sm: 2 }} py={0.5} borderRadius="full" bg="white" border="1px solid" borderColor={status === "RECHAZADO" ? "red.200" : "green.200"}>
                      {dur3To4}
                    </Badge>
                  </Flex>

                  {/* Paso 4: Final */}
                  <VStack spacing={1} align="center" minW="0" flex="1">
                    <Text fontSize={{ base: "9px", sm: "10px" }} fontWeight="800" color={stepFinal.isCompleted ? (stepFinal.isRejected ? "red.800" : "emerald.800") : "gray.400"} isTruncated>
                      {stepFinal.isCompleted ? (stepFinal.isRejected ? "RECHAZADO" : "APROBADO") : "FINAL"}
                    </Text>
                    <Flex
                      w={{ base: "28px", sm: "32px", md: "34px" }}
                      h={{ base: "28px", sm: "32px", md: "34px" }}
                      borderRadius="full"
                      bg={
                        stepFinal.isCompleted
                          ? stepFinal.isRejected
                            ? "red.500"
                            : "emerald.500"
                          : "gray.200"
                      }
                      align="center"
                      justify="center"
                      color="white"
                      boxShadow="sm"
                    >
                      {stepFinal.isCompleted ? (
                        stepFinal.isRejected ? (
                          <XCircle className="w-3.5 h-3.5 stroke-[3]" />
                        ) : (
                          <Check className="w-3.5 h-3.5 stroke-[3]" />
                        )
                      ) : (
                        <Circle className="w-3.5 h-3.5 text-gray-400" />
                      )}
                    </Flex>
                    <Text fontSize={{ base: "9px", sm: "10px" }} fontWeight="700" color="gray.600">{stepFinal.time}</Text>
                  </VStack>
                </Flex>
              </Box>
              </Box>

              {/* DETALLE PANEL ALERTA DE ESTADO (Solo para estados no-rechazados para evitar duplicados) */}
              {status !== "RECHAZADO" && (
                <Grid templateColumns={{ base: "1fr", md: "1fr 220px" }} gap={4} p={4} bg={alertDetails.bg} border="1px solid" borderColor={alertDetails.border} borderRadius="xl" mt={3}>
                  <HStack spacing={3.5} align="flex-start">
                    <Box mt={0.5}>
                      <ChakraIcon as={alertDetails.icon} w={5} h={5} color={alertDetails.iconColor} />
                    </Box>
                    <VStack align="stretch" spacing={1}>
                      <Heading fontSize="xs" fontWeight="900" color={alertDetails.titleColor} textTransform="uppercase">
                        {alertDetails.title} <Badge ml={2} colorScheme={status === "RECHAZADO" ? "red" : "emerald"} variant="solid" fontSize="8px">{alertDetails.subtitle}</Badge>
                      </Heading>
                      <Text fontSize="xs" color="gray.700" fontWeight="600">
                        {alertDetails.desc}
                      </Text>
                      <Text fontSize="xs" color="gray.500" fontStyle="italic" bg="white" p={2} borderRadius="md" border="1px solid" borderColor="gray.150" mt={1}>
                        💡 {alertDetails.subdesc}
                      </Text>
                    </VStack>
                  </HStack>

                  <VStack align="stretch" spacing={2} fontSize="xs" borderLeft={{ md: "1px solid" }} borderColor="gray.200" pl={{ md: 4 }} justify="center">
                    <Box>
                      <Text fontSize="9px" fontWeight="700" color="gray.400" textTransform="uppercase">Evaluado Por</Text>
                      <Text fontWeight="800" color="gray.700">👑 Enrique (Admin Facturación)</Text>
                    </Box>
                    <Box>
                      <Text fontSize="9px" fontWeight="700" color="gray.400" textTransform="uppercase">Estado Comercial</Text>
                      <Badge colorScheme={status === "APROBADO" ? "green" : status === "RECHAZADO" ? "red" : "blue"} fontSize="xs">{status}</Badge>
                    </Box>
                    <Box>
                      <Text fontSize="9px" fontWeight="700" color="gray.400" textTransform="uppercase">Última Actualización</Text>
                      <Text fontWeight="700" color="gray.600" fontSize="10px">{new Date().toLocaleString()}</Text>
                    </Box>
                  </VStack>
                </Grid>
              )}
            </Box>

            {/* PARTE INFERIOR: ARTÍCULOS COTIZADOS (IZQ) E HISTORIAL DE ACTIVIDAD (DER) */}
            <Grid templateColumns={{ base: "1fr", lg: "1.2fr 1fr" }} gap={5}>
              {/* Columna Izquierda: Artículos Cotizados */}
              <GridItem>
                <VStack align="stretch" spacing={4}>
                  <Box bg="white" p={{ base: 3, md: 4 }} borderRadius="2xl" border="1px solid" borderColor="gray.200" boxShadow="sm" overflow="hidden">
                    <Flex justify="space-between" align="center" mb={3} gap={2}>
                      <Text fontSize={{ base: "13px", md: "xs" }} fontWeight="800" color="gray.800" textTransform="uppercase">
                        Artículos Cotizados
                      </Text>
                      <Badge colorScheme="teal" variant="solid" borderRadius="full" fontSize="10px" px={2.5} flexShrink={0}>
                        {products.length} Items
                      </Badge>
                    </Flex>

                    {/* Scroll lateral encorsetado: la tabla se desplaza dentro
                        de su propio marco, nunca arrastra el drawer. */}
                    <TableContainer
                      border="1px solid"
                      borderColor="gray.200"
                      borderRadius="lg"
                      overflowX="auto"
                      maxW="100%"
                      sx={{ WebkitOverflowScrolling: "touch" }}
                    >
                      <Table variant="simple" size="sm">
                        <Thead bg="gray.50">
                          <Tr>
                            <Th fontSize={{ base: "11px", md: "10px" }} color="gray.600" px={{ base: 2, md: 4 }}>Código</Th>
                            <Th fontSize={{ base: "11px", md: "10px" }} color="gray.600" px={{ base: 2, md: 4 }}>Descripción</Th>
                            <Th fontSize={{ base: "11px", md: "10px" }} textAlign="right" color="gray.600" px={{ base: 2, md: 4 }}>Cant.</Th>
                            <Th fontSize={{ base: "11px", md: "10px" }} textAlign="right" color="gray.600" px={{ base: 2, md: 4 }}>Total (USD)</Th>
                          </Tr>
                        </Thead>
                        <Tbody fontSize={{ base: "13px", md: "xs" }}>
                          {products.map((item, idx) => {
                            const qty = Number(item.quantity || 1);
                            const price = Number(item.price || item.unitPrice || 0);
                            const total = qty * price;
                            return (
                              <Tr key={idx} _hover={{ bg: "gray.50" }}>
                                <Td fontWeight="800" color="gray.700" fontFamily="mono" px={{ base: 2, md: 4 }}>{item.id || item.productCode || item.code || "ART"}</Td>
                                <Td fontWeight="600" color="gray.900" px={{ base: 2, md: 4 }} minW="140px" whiteSpace="normal">{item.name || item.productName || "Artículo"}</Td>
                                <Td textAlign="right" fontWeight="800" px={{ base: 2, md: 4 }}>{qty}</Td>
                                <Td textAlign="right" fontWeight="850" color="emerald.900" fontFamily="mono" px={{ base: 2, md: 4 }}>${total.toFixed(2)}</Td>
                              </Tr>
                            );
                          })}
                        </Tbody>
                      </Table>
                    </TableContainer>

                    {/* Totales integrados al pie de artículos */}
                    <Box bg="#0f2e22" color="white" p={4} borderRadius="xl" mt={4} boxShadow="sm">
                      <VStack align="stretch" spacing={2} fontSize="xs">
                        <Flex justify="space-between" color="emerald.100">
                          <Text>Subtotal Neto:</Text>
                          <Text fontFamily="mono" fontWeight="700">${subtotalUSD.toFixed(2)}</Text>
                        </Flex>
                        <Flex justify="space-between" color="emerald.100">
                          <Text>I.G.V. (18%):</Text>
                          <Text fontFamily="mono" fontWeight="700">${igvUSD.toFixed(2)}</Text>
                        </Flex>
                        <Divider borderColor="whiteAlpha.300" my={1} />
                        <Flex justify="space-between" align="center">
                          <Text fontWeight="900" fontSize="xs">TOTAL COTIZACIÓN (USD):</Text>
                          <Text fontFamily="mono" fontWeight="950" fontSize="md" color="#6ee7b7">${grandTotalUSD.toFixed(2)}</Text>
                        </Flex>
                        <Flex justify="space-between" align="center" pt={1.5} borderTop="1px dashed" borderColor="whiteAlpha.200">
                          <Text fontSize="10px" color="emerald.200">Equivalente en Soles (TC S/ 3.43):</Text>
                          <Text fontFamily="mono" fontWeight="900" fontSize="xs" color="#facc15">S/ {grandTotalSOL.toFixed(2)}</Text>
                        </Flex>
                      </VStack>
                    </Box>
                  </Box>
                </VStack>
              </GridItem>

              {/* Columna Derecha: Historial de Actividad */}
              <GridItem>
                <Box bg="white" p={4} borderRadius="2xl" border="1px solid" borderColor="gray.200" boxShadow="sm" h="full">
                  <Flex justify="space-between" align="center" mb={4}>
                    <HStack spacing={2}>
                      <History className="w-4 h-4 text-emerald-800" />
                      <Text fontSize="xs" fontWeight="800" color="gray.800" textTransform="uppercase">
                        Historial de Actividad
                      </Text>
                    </HStack>
                    <Badge colorScheme="gray" fontSize="xs" px={2} borderRadius="full">{historyLog.length} Registros</Badge>
                  </Flex>

                  <VStack align="stretch" spacing={4} position="relative" pl={2}>
                    <Box position="absolute" top="10px" bottom="20px" left="17px" w="2px" bg="gray.100" />

                    {historyLog.map((log, idx) => {
                      let dotColor = "orange.500";
                      let bgCircle = "orange.50";
                      let tagText = log.status || "EVENTO";
                      let tagScheme = "orange";
                      
                      if (log.status === "APROBADO") {
                        dotColor = "emerald.600";
                        bgCircle = "emerald.50";
                        tagScheme = "green";
                      } else if (log.status === "RECHAZADO") {
                        dotColor = "red.500";
                        bgCircle = "red.50";
                        tagScheme = "red";
                      } else if (log.status === "ENVIADO") {
                        dotColor = "blue.500";
                        bgCircle = "blue.50";
                        tagScheme = "blue";
                      } else if (log.status === "GENERADO") {
                        dotColor = "gray.500";
                        bgCircle = "gray.100";
                        tagScheme = "gray";
                      }

                      return (
                        <Flex key={idx} align="flex-start" gap={3.5} zIndex={1} position="relative">
                          <Flex
                            w="20px"
                            h="20px"
                            borderRadius="full"
                            bg={bgCircle}
                            border="2px solid"
                            borderColor={dotColor}
                            align="center"
                            justify="center"
                            flexShrink={0}
                            mt={0.5}
                          >
                            <Box w="6px" h="6px" borderRadius="full" bg={dotColor} />
                          </Flex>

                          <Box flex="1" minW={0} bg="gray.50" p={3} borderRadius="lg" border="1px solid" borderColor="gray.150">
                            <Flex align="center" justify="space-between" mb={1} wrap="wrap" gap={1}>
                              <Badge colorScheme={tagScheme} fontSize="9px" px={2} py={0.5} borderRadius="md" fontWeight="800">
                                {tagText}
                              </Badge>
                              <Text fontSize={{ base: "10px", md: "9px" }} color="gray.500" fontWeight="600">
                                ⏰ {new Date(log.timestamp).toLocaleString()}
                              </Text>
                            </Flex>
                            <Text fontWeight="800" color="gray.800" fontSize={{ base: "13px", md: "xs" }} mt={0.5} overflowWrap="anywhere">
                              {log.note || "Cambio de estado comercial"}
                            </Text>
                            <Text fontSize={{ base: "11px", md: "10px" }} color="gray.600" mt={1.5} fontWeight="600" overflowWrap="anywhere">
                              👤 Registrado por: {log.user || "Usuario Sistema"}
                            </Text>
                          </Box>
                        </Flex>
                      );
                    })}
                  </VStack>
                </Box>
              </GridItem>
            </Grid>
          </DrawerBody>
        </DrawerContent>
      </Drawer>

      {/* Modal Obligatorio de Motivo de Rechazo */}
      <RejectReasonModal
        isOpen={isRejectModalOpen}
        onClose={() => setIsRejectModalOpen(false)}
        quoteId={quote.docNumber || quote.id}
        onConfirmReject={handleConfirmReject}
      />

      {/* Modal de Subsanación y Reenvío (RN-03: nota obligatoria mín 10 chars) */}
      <Modal
        isOpen={isResubmitModalOpen}
        onClose={() => setIsResubmitModalOpen(false)}
        isCentered
        size={{ base: "full", md: "md" }}
        scrollBehavior="inside"
      >
        <ModalOverlay backdropFilter="blur(4px)" bg="blackAlpha.600" />
        <ModalContent
          borderRadius={{ base: "none", md: "2xl" }}
          overflow="hidden"
          mx={{ base: 0, md: 3 }}
          maxW={{ base: "100vw", md: "28rem" }}
        >
          <ModalHeader
            bg="orange.500"
            color="white"
            fontSize={{ base: "md", md: "sm" }}
            fontWeight="900"
            py={3}
            px={{ base: 4, md: 6 }}
          >
            <HStack spacing={2}>
              <RotateCcw className="w-4 h-4" />
              <Text>Subsanar y Reenviar Cotización</Text>
            </HStack>
          </ModalHeader>
          <ModalCloseButton color="white" mt={1} w={{ base: "44px", md: "32px" }} h={{ base: "44px", md: "32px" }} />

          <ModalBody py={5} px={{ base: 4, md: 5 }}>
            <VStack spacing={4} align="stretch">
              <Alert status="warning" borderRadius="lg" fontSize={{ base: "13px", md: "xs" }}>
                <AlertIcon />
                Explica detalladamente qué corregiste para subsanar el rechazo.
                El administrador recibirá una notificación con tu nota.
              </Alert>

              {/* Recordatorio del motivo de rechazo original */}
              <Box bg="red.50" border="1px solid" borderColor="red.200" p={3} borderRadius="lg">
                <Text fontSize={{ base: "11px", md: "10px" }} fontWeight="800" color="red.700" textTransform="uppercase" mb={1}>
                  Motivo de Rechazo Original:
                </Text>
                <Text fontSize={{ base: "13px", md: "xs" }} color="red.800" fontStyle="italic" fontWeight="600" overflowWrap="anywhere">
                  "{quote.rejectionReason || "No especificado"}"
                </Text>
              </Box>

              <FormControl isRequired>
                <FormLabel fontSize={{ base: "13px", md: "xs" }} fontWeight="800" color="gray.700">
                  ¿Qué corregiste? (obligatorio)
                </FormLabel>
                <Textarea
                  value={resubmitNote}
                  onChange={(e) => setResubmitNote(e.target.value)}
                  placeholder="Ej: Se adjuntó el nuevo voucher BCP N° 1234567 por el monto correcto de S/180.00. Se actualizó la cantidad del producto X de 2 a 3 unidades..."
                  minH={{ base: "140px", md: "110px" }}
                  fontSize={{ base: "md", md: "xs" }}
                  borderColor={resubmitNote.trim().length > 0 && resubmitNote.trim().length < 10 ? "red.400" : "gray.300"}
                  focusBorderColor="orange.400"
                  resize="vertical"
                />
                <FormHelperText
                  fontSize={{ base: "12px", md: "10px" }}
                  color={resubmitNote.trim().length < 10 ? "red.600" : "green.700"}
                  fontWeight="700"
                >
                  {resubmitNote.trim().length < 10
                    ? `Mínimo 10 caracteres. (${resubmitNote.trim().length}/10)`
                    : `✓ Nota válida (${resubmitNote.trim().length} caracteres)`
                  }
                </FormHelperText>
              </FormControl>
            </VStack>
          </ModalBody>

          <ModalFooter
            borderTop="1px solid"
            borderColor="gray.100"
            gap={3}
            px={{ base: 4, md: 6 }}
            flexDirection={{ base: "column-reverse", sm: "row" }}
          >
            <Button
              variant="ghost"
              size={{ base: "md", md: "sm" }}
              w={{ base: "full", sm: "auto" }}
              onClick={() => setIsResubmitModalOpen(false)}
            >
              Cancelar
            </Button>
            <Button
              colorScheme="orange"
              size={{ base: "md", md: "sm" }}
              w={{ base: "full", sm: "auto" }}
              fontWeight="800"
              leftIcon={<RotateCcw className="w-3.5 h-3.5" />}
              onClick={handleResubmit}
              isDisabled={resubmitNote.trim().length < 10}
            >
              ✅ Confirmar Reenvío
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </>
  );
}

export default QuoteDetailDrawer;
