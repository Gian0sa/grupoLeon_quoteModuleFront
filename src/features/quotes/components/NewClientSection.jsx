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
import { useState } from "react";

export function NewClientSection({
  client,
  deliveryPoints,
  transports,
  setSelectedPoint,
  setSelectedTransport,
  setPaymentMethod,
  setDeposit,
  setBank,
  setCheck,
}) {
  const clientAdapted = adaptBusinessPartner(client);

  const [localSelectedPoint, setLocalSelectedPoint] = useState("");
  const [localSelectedTransport, setLocalSelectedTransport] = useState("");
  const [localPaymentMethod, setLocalPaymentMethod] = useState("");

  return (
    <Box>
      <Text fontSize="xl" fontWeight="bold" mb={4}>Client Section</Text>

      <Text>Nombre: {clientAdapted.cardName}</Text>
      <Text>Dirección: {clientAdapted.address}</Text>

      <Box mt={4}>
        <FormLabel>Punto de llegada</FormLabel>
          <Select
          placeholder="Selecciona un punto de llegada"
          value={localSelectedPoint?.AddressName || ""}
          onChange={(e) => {
            const selected = deliveryPoints.find(p => p.AddressName === e.target.value);
            setLocalSelectedPoint(selected);
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
          value={localSelectedTransport}
          onChange={(e) => {
            const value = e.target.value;
            setLocalSelectedTransport(value);
            setSelectedTransport(value);
          }}
        >
          {transports.map((transport, index) => (
            <option key={index} value={transport}>
              Nombre : {transport.Name} 
              Direccion : {transport.U_TQC_DIREC}
            </option>
          ))}
        </Select>
      </Box>

      <Box mt={6}>
        <FormLabel>Método de pago</FormLabel>
        <RadioGroup
          onChange={(value) => {
            setLocalPaymentMethod(value);
            setPaymentMethod(value);
          }}
          value={localPaymentMethod}
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
            onChange={(e) => setDeposit(e.target.value)}
          />
        </Box>

        <Box>
          <FormLabel>Banco</FormLabel>
          <Input
            placeholder="Nombre del banco"
            onChange={(e) => setBank(e.target.value)}
          />
        </Box>

        <Box>
          <FormLabel>CH (Cheque)</FormLabel>
          <Input
            placeholder="Número de cheque"
            onChange={(e) => setCheck(e.target.value)}
          />
        </Box>
      </VStack>
    </Box>
  );
}
