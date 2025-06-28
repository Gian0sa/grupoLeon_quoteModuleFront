import {
  Box,
  Text,
  FormLabel,
  VStack,
  Image,
  Input,
} from "@chakra-ui/react";
import ReactSelect from "react-select";

export function RequestQuoteClientSection({ client }) {
  if (!client) return <Text>Cargando cliente...</Text>;

  // Convertir la fecha con seguridad
  const formattedDate = (() => {
    try {
      return new Date(client.deliveryDate).toISOString().split("T")[0];
    } catch {
      return "";
    }
  })();

  return (
    <Box p={6} borderRadius="md" boxShadow="md">
      <VStack spacing={4} align="start">
        <Text fontWeight="bold">Código: {client.clientDocument}</Text>
        <Text>Nombre: {client.clientName}</Text>
        <Text>Dirección: {client.clientAddress}</Text>

        <Box>
          <FormLabel>Forma de entrega</FormLabel>
          <ReactSelect
            value={{
              value: client.deliveryForm,
              label: client.deliveryForm,
            }}
            isDisabled
          />
        </Box>

        <Box>
          <FormLabel>Tipo de pago</FormLabel>
          <ReactSelect
            value={{
              value: client.paymentType,
              label: `${client.paymentType.PymntGroup}`,
            }}
            isDisabled
          />
        </Box>

        {client.deliveryPoint?.AddressName && (
          <Box>
            <FormLabel>Punto de llegada</FormLabel>
            <ReactSelect
              value={{
                value: client.deliveryPoint.AddressName,
                label: `${client.deliveryPoint.AddressName} - ${client.deliveryPoint.Street ?? ""}`,
              }}
              isDisabled
            />
          </Box>
        )}

        {client.transport && (
          <Box>
            <FormLabel>Transporte</FormLabel>
            <ReactSelect
              value={{
                value: client.transport,
                label: (
                  <div>
                    <div style={{ fontSize: "smaller", color: "black" }}>
                      Nombre: {client.transport}
                    </div>
                    <div style={{ fontSize: "smaller", color: "black" }}>
                      Dirección: {client.transportDirection}
                    </div>
                  </div>
                ),
              }}
              isDisabled
              styles={{
                singleValue: (p) => ({ ...p, whiteSpace: "normal" }),
                option: (p) => ({ ...p, whiteSpace: "normal" }),
              }}
            />
          </Box>
        )}

        <Box>
          <FormLabel>Fecha de entrega</FormLabel>
          <Input
            type="date"
            value={formattedDate}
            isDisabled
            maxW="300px"
          />
        </Box>

        <Box>
          <FormLabel>Comentarios</FormLabel>
          <Text whiteSpace="pre-wrap">{client.comment || "Sin comentarios"}</Text>
        </Box>

        <Box>
          <FormLabel>Número de Operación</FormLabel>
          <Text>{client.opNum || "Sin número de operación"}</Text>
        </Box>

        <Box>
          <FormLabel>Comprobante</FormLabel>
          {client.pathImg ? (
            <Image
              src={`${import.meta.env.VITE_API_URL}/quoteModule/${client.pathImg}`}
              alt="Comprobante"
              borderRadius="md"
              maxW="400px"
            />
          ) : (
            <Text>No se adjuntó comprobante</Text>
          )}
        </Box>
      </VStack>
    </Box>
  );
}
