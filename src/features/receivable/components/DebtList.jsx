import { SimpleGrid, Text, Center } from "@chakra-ui/react";
import { DebtCard } from "./DebtCard";

export function DebtList({ debts, onViewInvoices, onViewDetails }) {
  if (!debts || debts.length === 0) {
    return (
      <Center py={10}>
        <Text color="gray.500" fontSize="lg">
          No se encontraron deudas
        </Text>
      </Center>
    );
  }

  return (
    <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4} w="full">
      {debts.map((debt, index) => {
        // Montos por moneda desde el backend
        const saldoPEN = debt.pendingAmount?.PEN || 0;
        const saldoUSD = debt.pendingAmount?.USD || 0;
        const saldoVencidoPEN = debt.overdueAmount?.PEN || 0;
        const saldoVencidoUSD = debt.overdueAmount?.USD || 0;

        // Documentos
        const totalDocumentos = debt.totalDocuments || 0;
        const documentosVencidos = debt.overdueDocumentsCount || 0;

        // Estado
        let estado = "al_dia";
        if (documentosVencidos > 0) {
          const porcentajeVencidos = Math.round((documentosVencidos / totalDocumentos) * 100);
          estado = porcentajeVencidos === 100 ? "vencido" : "parcialmente_vencido";
        }

        // Determinar tipo de documento (para casos especiales como Notas de Crédito)
        const tieneNotaCredito = debt.documents?.some(
          d => d.tipoDocumento === "Nota de Crédito"
        );

        // Extraer fechas y días de mora del documento más antiguo
        const docs = Array.isArray(debt.documents) ? debt.documents : [];
        const overdueDocs = docs.filter(d => d.estaVencido || (d.diasVencimiento && d.diasVencimiento > 0));
        const maxOverdueDays = overdueDocs.length > 0
          ? Math.max(...overdueDocs.map(d => Number(d.diasVencimiento || 0)))
          : Number(debt.maxOverdueDays || 0);
        const oldestDueDate = overdueDocs.length > 0
          ? overdueDocs.sort((a, b) => Number(b.diasVencimiento || 0) - Number(a.diasVencimiento || 0))[0]?.fechaContable
          : docs[0]?.fechaContable || debt.oldestDueDate || "";

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

              // Montos pendientes por moneda (ambas separadas)
              saldoPEN,
              saldoUSD,
              
              // Montos vencidos por moneda
              saldoVencidoPEN,
              saldoVencidoUSD,

              // Información de documentos
              totalDocumentos,
              documentosVencidos,

              // Estado
              estado,
              
              // Tipo de documento especial
              tipoDocumento: tieneNotaCredito ? "Nota de Crédito" : "",

              // Data original para acciones (PDF, detalles, etc)
              ...debt
            }}
            onViewInvoices={onViewInvoices}
            onViewDetails={onViewDetails}
          />
        );
      })}
    </SimpleGrid>
  );
}