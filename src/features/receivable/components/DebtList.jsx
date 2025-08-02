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
    <VStack spacing={4} align="stretch">
      {debts.map((debt, index) => {
        // Calcular información adicional
        const totalDocuments = debt.estadisticas?.totalDocumentos || 0;
        const documentsVencidos = debt.estadisticas?.documentosVencidos || 0;
        const porcentajeVencidos = debt.estadisticas?.porcentajeVencidos || 0;
        const antiguedadPromedio = debt.estadisticas?.antiguedadPromedio || 0;
        
        // Determinar el monto principal basado en la moneda del sistema
        const saldoPrincipal = debt.saldoSistema || 0;
        const monedaPrincipal = debt.saldoUSD > 0 ? 'USD' : 'PEN';
        
        // Determinar el estado basado en los documentos vencidos
        let estado = 'al_dia';
        let colorEstado = 'green';
        
        if (documentsVencidos > 0) {
          if (porcentajeVencidos === 100) {
            estado = 'vencido';
            colorEstado = 'red';
          } else {
            estado = 'parcialmente_vencido';
            colorEstado = 'yellow';
          }
        }

        return (
          <DebtCard
            key={debt.clienteCodigo || index}
            debt={{
              clienteCodigo: debt.clienteCodigo,
              nombre: debt.clienteNombre || "Sin nombre",
              ruc: debt.clienteCodigo?.replace('CL', '') || "Sin RUC",
              vendedor: debt.vendedor || "Sin vendedor",
              
              // Montos
              saldoPrincipal: saldoPrincipal,
              monedaPrincipal: monedaPrincipal,
              saldoPEN: debt.saldoPEN || 0,
              saldoUSD: debt.saldoUSD || 0,
              saldoVencidoPEN: debt.estadisticas?.saldoVencidoPEN || 0,
              saldoVencidoUSD: debt.estadisticas?.saldoVencidoUSD || 0,
              
              // Estadísticas de documentos
              totalDocumentos: totalDocuments,
              documentosVencidos: documentsVencidos,
              porcentajeVencidos: porcentajeVencidos,
              antiguedadPromedio: antiguedadPromedio,
              
              // Estado y prioridad
              estado: estado,
              colorEstado: colorEstado,
              prioridad: debt.prioridad || 0,
              
              // Documentos para el detalle
              documentos: debt.documentos || [],
              
              // Data completa para funciones
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