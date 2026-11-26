import { useState, useEffect, useRef } from "react";
import { SimpleGrid, Text, Center, Box, VStack, HStack, Skeleton, SkeletonCircle, Spinner, Button } from "@chakra-ui/react";
import { DebtCard } from "./DebtCard";

const INITIAL_BATCH = 24;
const BATCH_STEP = 24;

export function DebtList({ debts, isLoading = false, onViewInvoices, onViewHistory, onViewDetails }) {
  const [visibleCount, setVisibleCount] = useState(INITIAL_BATCH);
  const sentinelRef = useRef(null);

  // Reiniciar ventana visible cuando cambia la lista (búsqueda, filtro o vendedor) para renderizar en <15ms
  const firstCode = debts?.[0]?.clientCode || "";
  const totalDebts = debts?.length || 0;
  useEffect(() => {
    setVisibleCount(INITIAL_BATCH);
  }, [firstCode, totalDebts]);

  // Carga incremental automática al hacer scroll cerca del final
  useEffect(() => {
    const node = sentinelRef.current;
    if (!node || visibleCount >= totalDebts) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setVisibleCount((prev) => Math.min(prev + BATCH_STEP, totalDebts));
        }
      },
      { rootMargin: "400px 0px" }
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [visibleCount, totalDebts]);
  if (isLoading && (!debts || debts.length === 0)) {
    return (
      <VStack spacing={4} align="stretch" w="full">
        <HStack spacing={2.5} justify="center" py={2}>
          <Spinner size="sm" color="green.500" thickness="2.5px" />
          <Text color="gray.600" fontSize="sm" fontWeight="600">
            Cargando cuentas por cobrar...
          </Text>
        </HStack>
        <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4} w="full">
          {[0, 1, 2, 3].map((i) => (
            <Box
              key={i}
              bg="white"
              borderRadius="2xl"
              border="1px solid"
              borderColor="gray.100"
              p={5}
              boxShadow="sm"
            >
              <HStack justify="space-between" mb={3}>
                <HStack spacing={3} flex={1}>
                  <SkeletonCircle size="36px" startColor="gray.100" endColor="gray.200" />
                  <VStack align="start" spacing={1.5} flex={1}>
                    <Skeleton height="14px" width="70%" borderRadius="md" startColor="gray.100" endColor="gray.200" />
                    <Skeleton height="11px" width="40%" borderRadius="md" startColor="gray.100" endColor="gray.200" />
                  </VStack>
                </HStack>
                <Skeleton height="22px" width="72px" borderRadius="full" startColor="gray.100" endColor="gray.200" />
              </HStack>
              <Skeleton height="44px" borderRadius="xl" mb={3} startColor="gray.100" endColor="gray.200" />
              <HStack justify="space-between">
                <Skeleton height="28px" width="45%" borderRadius="lg" startColor="gray.100" endColor="gray.200" />
                <Skeleton height="28px" width="35%" borderRadius="lg" startColor="gray.100" endColor="gray.200" />
              </HStack>
            </Box>
          ))}
        </SimpleGrid>
      </VStack>
    );
  }

  if (!debts || debts.length === 0) {
    return (
      <Center py={10}>
        <Text color="gray.500" fontSize="lg">
          No se encontraron deudas
        </Text>
      </Center>
    );
  }

  const visibleDebts = debts.slice(0, visibleCount);
  const hasMoreToRender = visibleCount < debts.length;

  return (
    <VStack spacing={4} align="stretch" w="full">
      <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4} w="full">
        {visibleDebts.map((debt, index) => {
        // Montos por moneda desde el backend
        const saldoPEN = debt.pendingAmount?.PEN || 0;
        const saldoUSD = debt.pendingAmount?.USD || 0;
        const saldoVencidoPEN = debt.overdueAmount?.PEN || 0;
        const saldoVencidoUSD = debt.overdueAmount?.USD || 0;

        // Documentos filtrados universalmente (sin asientos internos ni otro documento)
        const rawDocs = Array.isArray(debt.documents) ? debt.documents : [];
        const docs = rawDocs.filter((d) => {
          const info = (d?.INFORMACION_DETALLADA || d?.detalle || '').toLowerCase();
          const tipo = (d?.tipoDocumento || d?.TIPO_DOC || '').toLowerCase();
          const numDoc = (d?.numeroDocumento || d?.NRO_DOC || '').trim();
          return numDoc && numDoc !== '—' && numDoc !== '-' && numDoc.toLowerCase() !== 'null' && !tipo.includes('otro') && !info.includes('dif. cambio');
        });
        const totalDocumentos = docs.length || debt.totalDocuments || 0;
        const documentosVencidos = debt.overdueDocumentsCount || 0;

        // Estado
        let estado = "al_dia";
        if (documentosVencidos > 0) {
          const porcentajeVencidos = Math.round((documentosVencidos / totalDocumentos) * 100);
          estado = porcentajeVencidos === 100 ? "vencido" : "parcialmente_vencido";
        }

        // Determinar tipo de documento (solo marcar como crédito si el saldo neto es a favor)
        const esSaldoFavorNeto = (saldoPEN < 0 || saldoUSD < 0) && saldoPEN <= 0 && saldoUSD <= 0;
        const tipoDocumento = esSaldoFavorNeto ? "Nota de Crédito" : "";

        // Extraer fechas y días de mora del documento más antiguo
        const overdueDocs = docs.filter(d => 
          (d.estaVencido || d.isOverdue || (d.diasVencimiento && d.diasVencimiento > 0)) && 
          (Number(d.saldoPendiente?.PEN || d.saldoPen || 0) > 0 || Number(d.saldoPendiente?.USD || d.saldoUsd || 0) > 0)
        );
        const maxOverdueDays = overdueDocs.length > 0
          ? Math.max(...overdueDocs.map(d => Number(d.diasVencimiento || 0)))
          : 0;

        // Helper para distinguir moneda del documento
        const isDocPEN = (d) => {
          const mon = (d.moneda || d.tipoCambio || d.TIPOCAMBIO || d.mon || "").toUpperCase();
          return mon.includes("PEN") || mon.includes("SOL") || mon.includes("S/");
        };

        // Documentos que vencen hoy (preventivo bancario)
        const venceHoyDocs = docs.filter(d => 
          (d.isVenceHoy || d.categoriaVencimiento === "HOY" || d.vdStatus === "HOY" || d.vdStatus === "VENCE_HOY") &&
          (Number(d.saldoPendiente?.PEN || d.saldoPen || 0) > 0 || Number(d.saldoPendiente?.USD || d.saldoUsd || 0) > 0)
        );
        const hasVenceHoy = overdueDocs.length === 0 && (venceHoyDocs.length > 0 || Number(debt.dueTodayDocumentsCount || 0) > 0);
        const venceHoyCount = venceHoyDocs.length || Number(debt.dueTodayDocumentsCount || 0);

        // Usar cálculo estricto por moneda (no mezclar conversión de SAP con deuda real)
        const saldoVenceHoyPEN = debt.dueTodayAmount?.PEN !== undefined && Number(debt.dueTodayAmount?.PEN) >= 0
          ? Number(debt.dueTodayAmount.PEN)
          : venceHoyDocs
              .filter(isDocPEN)
              .reduce((sum, d) => sum + Number(d.saldoPendiente?.PEN || d.saldoPen || 0), 0);

        const saldoVenceHoyUSD = debt.dueTodayAmount?.USD !== undefined && Number(debt.dueTodayAmount?.USD) >= 0
          ? Number(debt.dueTodayAmount.USD)
          : venceHoyDocs
              .filter(d => !isDocPEN(d))
              .reduce((sum, d) => sum + Number(d.saldoPendiente?.USD || d.saldoUsd || 0), 0);

        // Documentos por vencer en el futuro
        const futureDocs = docs.filter(d => 
          !overdueDocs.includes(d) && !venceHoyDocs.includes(d) &&
          (Number(d.saldoPendiente?.PEN || d.saldoPen || 0) > 0 || Number(d.saldoPendiente?.USD || d.saldoUsd || 0) > 0)
        );
        const nextUpcomingDueDate = futureDocs[0]?.fechaContable || futureDocs[0]?.ven || "";

        const pendingDebtDocs = docs.filter(d => 
          Number(d.saldoPendiente?.PEN || d.saldoPen || 0) > 0 || 
          Number(d.saldoPendiente?.USD || d.saldoUsd || 0) > 0
        );

        const oldestDueDate = overdueDocs.length > 0
          ? overdueDocs.sort((a, b) => Number(b.diasVencimiento || 0) - Number(a.diasVencimiento || 0))[0]?.fechaContable
          : pendingDebtDocs[0]?.fechaContable || docs[0]?.fechaContable || debt.oldestDueDate || "";

        return (
          <DebtCard
            key={debt.clientCode || index}
            debt={{
              // Información del cliente
              nombre: debt.clientName || "Sin nombre",
              ruc: debt.clientCode || "Sin RUC",
              vendedor: debt.vendedor || "Sin vendedor",
              maxOverdueDays,
              oldestDueDate,
              nextUpcomingDueDate,

              // Montos pendientes por moneda (ambas separadas)
              saldoPEN,
              saldoUSD,
              
              // Montos vencidos por moneda
              saldoVencidoPEN,
              saldoVencidoUSD,

              // Montos que vencen hoy
              hasVenceHoy,
              venceHoyCount,
              saldoVenceHoyPEN,
              saldoVenceHoyUSD,

              // Información de documentos
              totalDocumentos,
              documentosVencidos,

              // Estado
              estado: hasVenceHoy ? "vence_hoy" : estado,
              
              // Tipo de documento especial
              tipoDocumento,

              // Data original para acciones (PDF, detalles, etc)
              ...debt
            }}
            onViewInvoices={onViewInvoices}
            onViewHistory={onViewHistory}
            onViewDetails={onViewDetails}
          />
        );
      })}
      </SimpleGrid>

      {hasMoreToRender && (
        <Center ref={sentinelRef} py={3}>
          <Button
            size="sm"
            variant="outline"
            colorScheme="green"
            borderRadius="full"
            px={5}
            onClick={() => setVisibleCount((prev) => Math.min(prev + BATCH_STEP, debts.length))}
          >
            Mostrando {visibleDebts.length} de {debts.length} • Ver más
          </Button>
        </Center>
      )}
    </VStack>
  );
}