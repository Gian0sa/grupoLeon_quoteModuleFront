import React from "react";
import {
  Box,
  Flex,
  Text,
  Badge,
  HStack,
  VStack,
  Grid,
  GridItem,
  Icon,
  Progress
} from "@chakra-ui/react";
import {
  Check,
  Circle,
  Clock,
  XCircle,
  CheckCircle2,
  FileText,
  Send,
  ShieldCheck,
  Truck,
  DollarSign,
  Layers,
  Sparkles
} from "lucide-react";

/**
 * Línea de Tiempo en Tiempo Real de la Solicitud de Pedido (Diseño Imagen 1)
 */
export function OrderTimelineBar({
  status = "GENERADO",
  historyLog = [],
  createdIso,
  submittedIso,
  reviewedIso,
  completedIso,
  isCompact = false
}) {
  const isDraft = !status || ["GENERADO", "BORRADOR", "DRAFT", "draft"].includes(status);
  const isSolSent = !isDraft && status !== "EN_EDICION";
  const isInReview = status === "ENVIADO" || status === "EN_PROCESO" || status === "PENDIENTE_FACTURACION";
  const isObserved = status === "OBSERVADO";
  const isFinalApproved = ["APROBADO", "APROBADO_COMERCIAL", "FACTURADO", "PEDIDO_EMITIDO", "COMPLETADO"].includes(status);
  const isFinalRejected = status === "RECHAZADO" || status === "ANULADO" || status === "CANCELADO";
  const isFinalDone = isFinalApproved || isFinalRejected || isObserved;

  // Formateadores de hora precisos
  const formatTime = (iso) => {
    if (!iso) return "—";
    try {
      const d = new Date(iso);
      if (isNaN(d.getTime())) return "—";
      return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: true }).toUpperCase();
    } catch {
      return "—";
    }
  };

  const getLogTime = (statuses) => {
    if (!Array.isArray(historyLog)) return null;
    const entry = historyLog.find(h => statuses.includes(h.status));
    return entry ? entry.timestamp : null;
  };

  const time1 = formatTime(createdIso || getLogTime(["GENERADO", "BORRADOR", "DRAFT"]));
  const time2 = isSolSent ? formatTime(submittedIso || getLogTime(["ENVIADO", "EN_PROCESO"])) : "—";
  const time3 = (isInReview || isFinalDone) ? formatTime(reviewedIso || getLogTime(["PENDIENTE_FACTURACION", "VISTO", "APROBADO_COMERCIAL", "APROBADO", "RECHAZADO", "OBSERVADO"])) : "—";
  const time4 = isFinalDone ? formatTime(completedIso || getLogTime(["APROBADO", "RECHAZADO", "OBSERVADO", "FACTURADO", "PEDIDO_EMITIDO", "COMPLETADO"])) : "—";

  // Porcentaje de ciclo
  let progressPct = 25;
  if (isSolSent) progressPct = 50;
  if (isInReview) progressPct = 75;
  if (isFinalDone) progressPct = 100;

  return (
    <Box bg="white" p={{ base: 3, md: 5 }} borderRadius="2xl" border="1.5px solid" borderColor="gray.200" boxShadow="sm" overflow="hidden">
      {/* Barra de Título Superior */}
      <Flex justify="space-between" align="center" mb={4} wrap="wrap" gap={2}>
        <HStack spacing={2} wrap="wrap">
          <Text fontSize={{ base: "13px", md: "xs" }} fontWeight="900" color="gray.900" textTransform="uppercase" letterSpacing="wider">
            📍 RUTA / SEGUIMIENTO DE LA SOLICITUD DE PEDIDO
          </Text>
          <Badge colorScheme={isFinalRejected ? "red" : isObserved ? "orange" : "green"} variant="solid" fontSize="9px" px={2} borderRadius="full">
            TIEMPO REAL
          </Badge>
        </HStack>

        <HStack spacing={2} fontSize={{ base: "11px", md: "xs" }}>
          <Text color="gray.600" fontWeight="700">Avance:</Text>
          <Badge
            bg={isFinalRejected ? "red.600" : isObserved ? "orange.600" : isFinalApproved ? "emerald.700" : isInReview ? "blue.600" : "#126C36"}
            color="white"
            fontSize="xs"
            px={2.5}
            py={0.5}
            borderRadius="full"
            fontWeight="900"
          >
            {progressPct}%
          </Badge>
        </HStack>
      </Flex>

      {/* VISTA ESCRITORIO (PC): Línea Horizontal con alto contraste (Imagen 1) */}
      <Box display={{ base: "none", md: "block" }} w="full" position="relative" py={3} px={6} bg="#f8fafc" borderRadius="xl" border="1px solid" borderColor="#e2e8f0">
        {/* Línea Base de Fondo */}
        <Box position="absolute" top="36px" left="60px" right="60px" h="4px" bg="#e2e8f0" borderRadius="full" zIndex={0} />

        {/* Línea de Avance Activo */}
        <Box
          position="absolute"
          top="36px"
          left="60px"
          h="4px"
          bg={isFinalRejected ? "#dc2626" : isObserved ? "#d97706" : isFinalApproved ? "#059669" : isInReview ? "#2563eb" : "#059669"}
          borderRadius="full"
          zIndex={0}
          transition="all 0.5s ease"
          style={{
            width: progressPct === 25 ? "0%" : progressPct === 50 ? "33%" : progressPct === 75 ? "66%" : "calc(100% - 120px)"
          }}
        />

        <Flex justify="space-between" align="flex-start" position="relative" zIndex={1} w="full">
          {/* Paso 1: COTIZADO */}
          <VStack spacing={1.5} align="center" minW="0" flex="1">
            <Text fontSize="11px" fontWeight="900" color="#065f46">COTIZADO</Text>
            <Flex w="36px" h="36px" borderRadius="full" bg="#059669" align="center" justify="center" color="white" boxShadow="0 2px 8px rgba(5,150,105,0.4)">
              <Check className="w-4 h-4 stroke-[3]" />
            </Flex>
            <Badge colorScheme="green" variant="solid" fontSize="10px" borderRadius="full" px={2.5} py={0.5}>
              {time1}
            </Badge>
          </VStack>

          {/* Tiempo 1 a 2 */}
          <Flex align="center" justify="center" h="65px">
            <Badge variant="solid" bg="white" color="#065f46" border="1.5px solid #a7f3d0" fontSize="10px" px={2} py={0.5} borderRadius="full" boxShadow="xs" fontWeight="800">
              {isSolSent ? "✓ Enviado" : "Pendiente"}
            </Badge>
          </Flex>

          {/* Paso 2: SOLICITUD */}
          <VStack spacing={1.5} align="center" minW="0" flex="1">
            <Text fontSize="11px" fontWeight="900" color={isSolSent ? "#065f46" : "#64748b"}>SOLICITUD</Text>
            <Flex
              w="36px"
              h="36px"
              borderRadius="full"
              bg={isSolSent ? "#059669" : "#e2e8f0"}
              align="center"
              justify="center"
              color={isSolSent ? "white" : "#64748b"}
              boxShadow={isSolSent ? "0 2px 8px rgba(5,150,105,0.4)" : "none"}
              border={isSolSent ? "none" : "2px solid #cbd5e1"}
            >
              {isSolSent ? <Check className="w-4 h-4 stroke-[3]" /> : <Circle className="w-4 h-4" />}
            </Flex>
            <Badge colorScheme={isSolSent ? "green" : "gray"} variant={isSolSent ? "solid" : "subtle"} fontSize="10px" borderRadius="full" px={2.5} py={0.5}>
              {time2}
            </Badge>
          </VStack>

          {/* Tiempo 2 a 3 */}
          <Flex align="center" justify="center" h="65px">
            <Badge variant="solid" bg="white" color={isInReview ? "#1e40af" : isFinalDone ? "#065f46" : "gray.600"} border="1.5px solid" borderColor={isInReview ? "#93c5fd" : isFinalDone ? "#a7f3d0" : "#e2e8f0"} fontSize="10px" px={2} py={0.5} borderRadius="full" boxShadow="xs" fontWeight="800">
              {isInReview ? "En Revisión" : isFinalDone ? "Evaluado" : "—"}
            </Badge>
          </Flex>

          {/* Paso 3: REVISIÓN */}
          <VStack spacing={1.5} align="center" minW="0" flex="1">
            <Text fontSize="11px" fontWeight="900" color={isFinalDone ? (isFinalRejected ? "#991b1b" : isObserved ? "#b45309" : "#065f46") : (isInReview ? "#1e40af" : "#64748b")}>
              REVISIÓN
            </Text>
            <Flex
              w="36px"
              h="36px"
              borderRadius="full"
              bg={isFinalDone ? (isFinalRejected ? "#dc2626" : isObserved ? "#d97706" : "#059669") : (isInReview ? "#2563eb" : "#e2e8f0")}
              align="center"
              justify="center"
              color="white"
              boxShadow={isInReview ? "0 0 0 4px rgba(37,99,235,0.25)" : (isFinalDone ? "0 2px 8px rgba(0,0,0,0.15)" : "none")}
              border={isFinalDone || isInReview ? "none" : "2px solid #cbd5e1"}
            >
              {isFinalDone ? (
                isFinalRejected ? <XCircle className="w-4 h-4 stroke-[3]" /> : isObserved ? <Clock className="w-4 h-4 stroke-[3]" /> : <Check className="w-4 h-4 stroke-[3]" />
              ) : isInReview ? (
                <Clock className="w-4 h-4 stroke-[2.5]" />
              ) : (
                <Circle className="w-4 h-4 text-gray-400" />
              )}
            </Flex>
            <Badge colorScheme={isFinalDone ? (isFinalRejected ? "red" : isObserved ? "orange" : "green") : (isInReview ? "blue" : "gray")} variant="solid" fontSize="10px" borderRadius="full" px={2.5} py={0.5}>
              {time3}
            </Badge>
          </VStack>

          {/* Tiempo 3 a 4 */}
          <Flex align="center" justify="center" h="65px">
            <Badge variant="solid" bg="white" color={isFinalRejected ? "#991b1b" : isObserved ? "#b45309" : isFinalApproved ? "#065f46" : "gray.600"} border="1.5px solid" borderColor={isFinalRejected ? "#fca5a5" : isObserved ? "#fde68a" : isFinalApproved ? "#a7f3d0" : "#e2e8f0"} fontSize="10px" px={2} py={0.5} borderRadius="full" boxShadow="xs" fontWeight="800">
              {isFinalDone ? "Concluido" : "—"}
            </Badge>
          </Flex>

          {/* Paso 4: FINAL */}
          <VStack spacing={1.5} align="center" minW="0" flex="1">
            <Text fontSize="11px" fontWeight="900" color={isFinalApproved ? "#065f46" : isObserved ? "#b45309" : isFinalRejected ? "#991b1b" : "#64748b"}>
              {isFinalApproved ? "EMISIÓN SAP" : isObserved ? "OBSERVADO" : isFinalRejected ? "RECHAZADO" : "EMISIÓN"}
            </Text>
            <Flex
              w="36px"
              h="36px"
              borderRadius="full"
              bg={isFinalApproved ? "#059669" : isObserved ? "#d97706" : isFinalRejected ? "#dc2626" : "#e2e8f0"}
              align="center"
              justify="center"
              color="white"
              boxShadow={isFinalApproved ? "0 2px 8px rgba(5,150,105,0.4)" : isFinalRejected ? "0 2px 8px rgba(220,38,38,0.4)" : "none"}
              border={isFinalDone ? "none" : "2px dashed #94a3b8"}
            >
              {isFinalApproved ? (
                <Check className="w-4 h-4 stroke-[3]" />
              ) : isObserved ? (
                <Clock className="w-4 h-4 stroke-[3]" />
              ) : isFinalRejected ? (
                <XCircle className="w-4 h-4 stroke-[3]" />
              ) : (
                <Circle className="w-4 h-4 text-gray-400" />
              )}
            </Flex>
            <Badge colorScheme={isFinalApproved ? "green" : isObserved ? "orange" : isFinalRejected ? "red" : "gray"} variant="solid" fontSize="10px" borderRadius="full" px={2.5} py={0.5}>
              {time4}
            </Badge>
          </VStack>
        </Flex>
      </Box>

      {/* VISTA MÓVIL (Celular): Línea de tiempo vertical táctil */}
      <Box display={{ base: "block", md: "none" }} py={1}>
        <VStack align="stretch" spacing={2.5} position="relative" pl={2}>
          <Box position="absolute" top="15px" bottom="25px" left="16px" w="3px" bg="gray.200" borderRadius="full" zIndex={0} />

          {/* 1. Cotizado */}
          <Flex align="center" gap={3} zIndex={1}>
            <Flex w="28px" h="28px" borderRadius="full" bg="#059669" align="center" justify="center" color="white" flexShrink={0}>
              <Check className="w-3.5 h-3.5 stroke-[3]" />
            </Flex>
            <Box flex="1" bg="emerald.50" p={2} borderRadius="lg" border="1px solid" borderColor="emerald.300">
              <Flex justify="space-between" align="center">
                <Text fontSize="xs" fontWeight="900" color="emerald.900">1. COTIZADO</Text>
                <Badge colorScheme="green" fontSize="9px">{time1}</Badge>
              </Flex>
            </Box>
          </Flex>

          {/* 2. Solicitud */}
          <Flex align="center" gap={3} zIndex={1}>
            <Flex w="28px" h="28px" borderRadius="full" bg={isSolSent ? "#059669" : "#e2e8f0"} align="center" justify="center" color={isSolSent ? "white" : "#64748b"} flexShrink={0}>
              {isSolSent ? <Check className="w-3.5 h-3.5 stroke-[3]" /> : <Circle className="w-3.5 h-3.5" />}
            </Flex>
            <Box flex="1" bg={isSolSent ? "emerald.50" : "white"} p={2} borderRadius="lg" border="1px solid" borderColor={isSolSent ? "emerald.300" : "gray.200"}>
              <Flex justify="space-between" align="center">
                <Text fontSize="xs" fontWeight="900" color={isSolSent ? "emerald.900" : "gray.500"}>2. SOLICITUD ENVIADA</Text>
                <Badge colorScheme={isSolSent ? "green" : "gray"} fontSize="9px">{time2}</Badge>
              </Flex>
            </Box>
          </Flex>

          {/* 3. Revisión */}
          <Flex align="center" gap={3} zIndex={1}>
            <Flex w="28px" h="28px" borderRadius="full" bg={isFinalDone ? (isFinalRejected ? "#dc2626" : isObserved ? "#d97706" : "#059669") : (isInReview ? "#2563eb" : "#e2e8f0")} align="center" justify="center" color="white" flexShrink={0}>
              {isFinalDone ? (isFinalRejected ? <XCircle className="w-3.5 h-3.5 stroke-[3]" /> : <Check className="w-3.5 h-3.5 stroke-[3]" />) : isInReview ? <Clock className="w-3.5 h-3.5 stroke-[2.5]" /> : <Circle className="w-3.5 h-3.5 text-gray-400" />}
            </Flex>
            <Box flex="1" bg={isFinalDone ? (isFinalRejected ? "red.50" : isObserved ? "orange.50" : "emerald.50") : (isInReview ? "blue.50" : "white")} p={2} borderRadius="lg" border="1px solid" borderColor="gray.200">
              <Flex justify="space-between" align="center">
                <Text fontSize="xs" fontWeight="900" color={isFinalDone ? (isFinalRejected ? "red.900" : "emerald.900") : (isInReview ? "blue.900" : "gray.500")}>3. REVISIÓN FACTURACIÓN</Text>
                <Badge colorScheme={isFinalDone ? (isFinalRejected ? "red" : isObserved ? "orange" : "green") : (isInReview ? "blue" : "gray")} fontSize="9px">{time3}</Badge>
              </Flex>
            </Box>
          </Flex>

          {/* 4. Emisión */}
          <Flex align="center" gap={3} zIndex={1}>
            <Flex w="28px" h="28px" borderRadius="full" bg={isFinalApproved ? "#059669" : isObserved ? "#d97706" : isFinalRejected ? "#dc2626" : "#e2e8f0"} align="center" justify="center" color="white" flexShrink={0}>
              {isFinalApproved ? <Check className="w-3.5 h-3.5 stroke-[3]" /> : isFinalRejected ? <XCircle className="w-3.5 h-3.5 stroke-[3]" /> : <Circle className="w-3.5 h-3.5 text-gray-400" />}
            </Flex>
            <Box flex="1" bg={isFinalApproved ? "emerald.50" : isFinalRejected ? "red.50" : "white"} p={2} borderRadius="lg" border="1px solid" borderColor="gray.200">
              <Flex justify="space-between" align="center">
                <Text fontSize="xs" fontWeight="900" color={isFinalApproved ? "emerald.900" : isFinalRejected ? "red.900" : "gray.500"}>4. RESULTADO FINAL</Text>
                <Badge colorScheme={isFinalApproved ? "green" : isFinalRejected ? "red" : "gray"} fontSize="9px">{time4}</Badge>
              </Flex>
            </Box>
          </Flex>
        </VStack>
      </Box>
    </Box>
  );
}

/**
 * Listado con Checks de Avance Comercial (Diseño Exacto Imagen 3)
 * Presenta cada etapa con viñeta (•), tachado cuando está listo y check verde ✓
 */
export function OrderChecklist({
  client,
  products = [],
  saleCondition = "CONTADO",
  creditTerm = "",
  selectedTransport,
  selectedPoint,
  opNum,
  paymentImg,
  approvalStatus = "GENERADO",
}) {
  const isDraft = !approvalStatus || ["GENERADO", "BORRADOR", "DRAFT", "draft"].includes(approvalStatus);
  const isSubmitted = !isDraft && approvalStatus !== "EN_EDICION";
  const isReviewedOrApproved = approvalStatus === "APROBADO_COMERCIAL" || approvalStatus === "PENDIENTE_FACTURACION" || approvalStatus === "APROBADO";
  const isFullyEmitted = approvalStatus === "APROBADO" || approvalStatus === "FACTURADO";

  const hasClient = Boolean(client && (client.CardCode || client.CardName || client.name));
  const hasProducts = Boolean(Array.isArray(products) && products.length > 0);
  const hasConditions = Boolean(saleCondition && (creditTerm || saleCondition === "CONTADO"));
  const hasTransport = Boolean(selectedTransport || selectedPoint || client?.Address || client?.address);
  const hasPayment = Boolean(saleCondition === "CREDITO" || opNum || paymentImg);

  // Lista de Pasos Estilo Flujo Oficial
  const steps = [
    {
      id: 1,
      label: "Informe de necesidad y cliente asignado",
      isDone: hasClient,
      detail: hasClient ? (client.CardName || client.name || "Cliente SAP asignado") : "Seleccionar cliente"
    },
    {
      id: 2,
      label: "Solicitud de ofertas y selección de artículos",
      isDone: hasProducts,
      detail: hasProducts ? `${products.length} artículos en cotización` : "Agregar artículos"
    },
    {
      id: 3,
      label: "Valoración competitiva y descuentos autorizados",
      isDone: hasConditions,
      detail: hasConditions ? `Condición: ${saleCondition} ${creditTerm ? `(${creditTerm})` : ""}` : "Definir condiciones"
    },
    {
      id: 4,
      label: "Preparación de pedido y logística de transporte",
      isDone: hasTransport,
      detail: hasTransport ? "Transporte y destino configurados" : "Configurar agencia"
    },
    {
      id: 5,
      label: "Autorización de abono / comprobante de pago",
      isDone: hasPayment,
      detail: hasPayment ? (opNum ? `Váucher: ${opNum}` : "Crédito aprobado") : "Ingresar voucher o crédito"
    },
    {
      id: 6,
      label: "Emisión y envío de solicitud de pedido",
      isDone: isSubmitted,
      detail: isSubmitted ? "Enviada a facturación" : "Pendiente de envío"
    },
    {
      id: 7,
      label: "Revisión y validación por Facturación (Enrique)",
      isDone: isReviewedOrApproved,
      detail: isReviewedOrApproved ? "Control comercial aprobado" : "Pendiente de revisión"
    },
    {
      id: 8,
      label: "Emisión de pedido oficial en SAP B1",
      isDone: isFullyEmitted,
      detail: isFullyEmitted ? "Orden de Venta emitida en SAP" : "Pendiente de emisión SAP"
    },
  ];

  const completedCount = steps.filter(s => s.isDone).length;
  const totalSteps = steps.length;
  const percentComplete = Math.round((completedCount / totalSteps) * 100);
  const isAllComplete = percentComplete === 100;

  return (
    <Box
      bg="white"
      p={{ base: 4, md: 6 }}
      borderRadius="2xl"
      border="1.5px solid"
      borderColor={isAllComplete ? "#10b981" : "gray.200"}
      boxShadow={isAllComplete ? "0 4px 20px rgba(16,185,129,0.15)" : "sm"}
      transition="all 0.3s ease"
    >
      {/* Cabecera del Listado con Checks */}
      <Flex justify="space-between" align={{ base: "flex-start", sm: "center" }} direction={{ base: "column", sm: "row" }} gap={2} mb={4} pb={3} borderBottom="1.5px solid" borderColor="gray.100">
        <HStack spacing={2.5}>
          <Flex w="32px" h="32px" borderRadius="lg" bg={isAllComplete ? "emerald.100" : "emerald.50"} color="#126C36" align="center" justify="center">
            {isAllComplete ? <Sparkles className="w-5 h-5 text-emerald-600" /> : <Layers className="w-5 h-5" />}
          </Flex>
          <Box>
            <Text fontSize={{ base: "sm", md: "md" }} fontWeight="900" color="gray.900">
              Avance y Verificación de la Solicitud
            </Text>
            <Text fontSize="xs" color="gray.500" fontWeight="600">
              Progreso secuencial del requerimiento comercial
            </Text>
          </Box>
        </HStack>

        <HStack spacing={2}>
          <Badge
            colorScheme={isAllComplete ? "green" : percentComplete >= 50 ? "blue" : "gray"}
            variant="solid"
            fontSize="xs"
            px={3}
            py={1}
            borderRadius="full"
            fontWeight="900"
          >
            {completedCount} / {totalSteps} Pasos ({percentComplete}%)
          </Badge>
        </HStack>
      </Flex>

      {/* Barra de Progreso Suave */}
      <Box mb={5}>
        <Progress
          value={percentComplete}
          size="sm"
          colorScheme={isAllComplete ? "green" : "emerald"}
          borderRadius="full"
          bg="gray.100"
          hasStripe={!isAllComplete}
          isAnimated={!isAllComplete}
        />
      </Box>

      {/* ── LISTADO CON FORMATO EXACTO (IMAGEN 3) ── */}
      <Grid templateColumns={{ base: "1fr", md: "repeat(2, 1fr)" }} gap={{ base: 2, md: 3.5 }}>
        {steps.map((step) => {
          return (
            <GridItem key={step.id}>
              <Flex
                align="center"
                justify="space-between"
                p={2.5}
                borderRadius="xl"
                bg={step.isDone ? "#f0fdf4" : "#f8fafc"}
                border="1px solid"
                borderColor={step.isDone ? "#bbf7d0" : "#e2e8f0"}
                transition="all 0.2s ease"
              >
                {/* Viñeta (•) y Texto (Tachado si está completado) */}
                <HStack spacing={2} minW={0} flex="1" pr={2}>
                  <Text
                    fontSize="sm"
                    fontWeight="900"
                    color={step.isDone ? "#16a34a" : "#94a3b8"}
                  >
                    •
                  </Text>
                  <VStack align="flex-start" spacing={0} minW={0}>
                    <Text
                      fontSize={{ base: "12px", md: "13px" }}
                      fontWeight={step.isDone ? "700" : "600"}
                      color={step.isDone ? "#14532d" : "#334155"}
                      textDecoration={step.isDone ? "line-through" : "none"}
                      textDecorationColor="#16a34a"
                      textDecorationThickness="1.5px"
                      lineHeight="1.3"
                    >
                      {step.label}
                    </Text>
                    <Text fontSize="10px" color={step.isDone ? "#15803d" : "#64748b"} fontWeight="600" isTruncated>
                      {step.detail}
                    </Text>
                  </VStack>
                </HStack>

                {/* Símbolo de Check Verde Grande (Estilo Imagen 3) */}
                <Box flexShrink={0}>
                  {step.isDone ? (
                    <Text
                      fontSize="18px"
                      fontWeight="900"
                      color="#16a34a"
                      fontFamily="system-ui, -apple-system, sans-serif"
                      lineHeight="1"
                    >
                      ✓
                    </Text>
                  ) : (
                    <Circle className="w-4 h-4 text-gray-300 stroke-[1.5]" />
                  )}
                </Box>
              </Flex>
            </GridItem>
          );
        })}
      </Grid>
    </Box>
  );
}

export default OrderTimelineBar;
