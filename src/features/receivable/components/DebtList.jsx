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

  console.log(debts);

  return (
    <VStack spacing={1} align="stretch">
      {debts.map((debt, index) => {
        // Montos
        const saldoPEN = debt.pendingAmount?.PEN || 0;
        const saldoUSD = debt.pendingAmount?.USD || 0;
        const saldoVencidoPEN = debt.overdueAmount?.PEN || 0;
        const saldoVencidoUSD = debt.overdueAmount?.USD || 0;

        // Determinar saldo y moneda principal (si tiene USD, se prioriza USD)
        const saldoPrincipal = saldoUSD > 0 ? saldoUSD : saldoPEN;
        const monedaPrincipal = saldoUSD > 0 ? "USD" : "PEN";

        // Documentos
        const totalDocumentos = debt.totalDocuments || 0;
        const documentosVencidos = debt.overdueDocumentsCount || 0;
        const porcentajeVencidos =
          totalDocumentos > 0
            ? Math.round((documentosVencidos / totalDocumentos) * 100)
            : 0;

        // Estado
        let estado = "al_dia";
        let colorEstado = "green";

        if (documentosVencidos > 0) {
          if (porcentajeVencidos === 100) {
            estado = "vencido";
            colorEstado = "red";
          } else {
            estado = "parcialmente_vencido";
            colorEstado = "yellow";
          }
        }

        return (
          <DebtCard
            key={debt.clientCode || index}
            debt={{
              clienteCodigo: debt.clientCode,
              nombre: debt.clientName || "Sin nombre",
              ruc: debt.clientCode || "Sin RUC",
              vendedor: debt.vendedor || "Sin vendedor",

              // Montos
              saldoPrincipal,
              monedaPrincipal,
              saldoPEN,
              saldoUSD,
              saldoVencidoPEN,
              saldoVencidoUSD,

              // Documentos
              totalDocumentos,
              documentosVencidos,
              porcentajeVencidos,
              antiguedadPromedio: debt.averageAge || 0, // si después calculas edad promedio

              // Estado y prioridad
              estado,
              colorEstado,
              prioridad: debt.priority || 0,

              // Documento principal (para validar tipo)
              tipoDocumento: debt.documents?.some(d => d.tipoDocumento === "Nota de Crédito")
              ? "Nota de Crédito"
              : debt.documents?.[0]?.tipoDocumento || "",


              // Lista de documentos
              documentos: debt.documents || [],

              // Data completa
              raw: debt,
            }}
            onViewInvoices={onViewInvoices}
            onViewDetails={onViewDetails}
          />
        );
      })}
    </VStack>
  );
}
