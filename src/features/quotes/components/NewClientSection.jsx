import {
  Box,
  Text,
  Select,
  Input,
  RadioGroup,
  Stack,
  Radio,
  FormLabel,
  VStack,
} from "@chakra-ui/react";
import { adaptBusinessPartner } from "../adapters/quotesAdapter";

export function NewClientSection({
  client,
  deliveryPoints,
  transports,
  selectedPoint,
  selectedTransport,
  paymentMethod,
  deposit,
  bank,
  check,
  setSelectedPoint,
  setSelectedTransport,
  setPaymentMethod,
  setDeposit,
  setBank,
  setCheck,
}) {
  const clientAdapted = adaptBusinessPartner(client);

  return (
    <Box>
      <Text fontSize="xl" fontWeight="bold" mb={4}>Client Section</Text>

      <Text>Nombre: {clientAdapted.cardName}</Text>
      <Text>Dirección: {clientAdapted.address}</Text>

      <Box mt={4}>
        <FormLabel>Punto de llegada</FormLabel>
        <Select
          placeholder="Selecciona un punto de llegada"
          value={selectedPoint?.AddressName || ""}
          onChange={(e) => {
            const selected = deliveryPoints.find(p => p.AddressName === e.target.value);
            setSelectedPoint(selected);
          }}
        >
          {deliveryPoints.map((point, index) => (
            <option key={index} value={point.AddressName}>
              {point.AddressName} - {point.Street}
            </option>
          ))}
        </Select>
      </Box>

      <Box mt={4}>
        <FormLabel>Transporte</FormLabel>
        <Select
          placeholder="Selecciona un transporte"
          value={selectedTransport?.Name || ""}
          onChange={(e) => {
            const selected = transports.find(t => t.Name === e.target.value);
            setSelectedTransport(selected);
          }}
        >
          {transports.map((transport, index) => (
            <option key={index} value={transport.Name}>
              {`Nombre: ${transport.Name} | Dirección: ${transport.U_TQC_DIREC}`}
            </option>
          ))}
        </Select>
      </Box>

      <Box mt={6}>
        <FormLabel>Método de pago</FormLabel>
        <RadioGroup
          value={paymentMethod}
          onChange={(value) => setPaymentMethod(value)}
        >
          <Stack direction="row" wrap="wrap">
            <Radio value="contado">Contado</Radio>
            <Radio value="boleta">Boleta</Radio>
            <Radio value="letra">Letra</Radio>
            <Radio value="credito">Crédito</Radio>
            <Radio value="factura">Factura</Radio>
            <Radio value="plazo">Plazo</Radio>
          </Stack>
        </RadioGroup>
      </Box>

      <VStack spacing={4} mt={6} align="stretch">
        <Box>
          <FormLabel>Abono/Transferencia</FormLabel>
          <Input
            placeholder="Ej: S/ 500.00"
            value={deposit}
            onChange={(e) => setDeposit(e.target.value)}
          />
        </Box>

        <Box>
          <FormLabel>Banco</FormLabel>
          <Input
            placeholder="Nombre del banco"
            value={bank}
            onChange={(e) => setBank(e.target.value)}
          />
        </Box>

        <Box>
          <FormLabel>CH (Cheque)</FormLabel>
          <Input
            placeholder="Número de cheque"
            value={check}
            onChange={(e) => setCheck(e.target.value)}
          />
        </Box>
      </VStack>
    </Box>
  );
}
