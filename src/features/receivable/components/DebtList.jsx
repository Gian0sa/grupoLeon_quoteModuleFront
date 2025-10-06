import { VStack, Text, Center } from "@chakra-ui/react";
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
    <VStack spacing={1} align="stretch">
      {debts.map((debt, index) => {
        // Montos
        const saldoPEN = debt.pendingAmount?.PEN || 0;
        const saldoUSD = debt.pendingAmount?.USD || 0;
        const saldoVencidoPEN = debt.overdueAmount?.PEN || 0;
        const saldoVencidoUSD = debt.overdueAmount?.USD || 0;

        // Determinar saldo y moneda principal
        const saldoPrincipal = saldoUSD !== 0 ? saldoUSD : saldoPEN;
        const monedaPrincipal = saldoUSD !== 0 ? "USD" : "PEN";

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

        return (
          <DebtCard
            key={debt.clientCode || index}
            debt={{
              // Información del cliente
              nombre: debt.clientName || "Sin nombre",
              ruc: debt.clientCode || "Sin RUC",
              vendedor: debt.vendedor || "Sin vendedor",

              // Montos principales
              saldoPrincipal,
              monedaPrincipal,
              
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
    </VStack>
  );
}