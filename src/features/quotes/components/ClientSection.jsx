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
  import { useState } from "react";
  import { adaptBusinessPartner } from "../adapters/quotesAdapter";
  
  export function ClientSection({ client }) {
    const clientAdapted = adaptBusinessPartner(client);
  
    const [selectedPoint, setSelectedPoint] = useState("");
    const [selectedTransport, setSelectedTransport] = useState("");
    const [transportAddress, setTransportAddress] = useState("");
    const [paymentMethod, setPaymentMethod] = useState("");
    const [deposit, setDeposit] = useState("");
    const [bank, setBank] = useState("");
    const [check, setCheck] = useState("");
  
    return (
      <Box>
        <Text fontSize="xl" fontWeight="bold" mb={4}>Client Section</Text>
  
        <Text>Nombre: {clientAdapted.cardName}</Text>
        <Text>Dirección: {clientAdapted.address}</Text>
  
        {/* Punto de llegada */}
        <Box mt={4}>
          <FormLabel>Punto de llegada</FormLabel>
          <Select
            placeholder="Selecciona un punto de llegada"
            value={selectedPoint}
            onChange={(e) => setSelectedPoint(e.target.value)}
          >
            {clientAdapted.deliveryPoints.map((point, index) => (
              <option key={index} value={point}>
                {point}
              </option>
            ))}
          </Select>
        </Box>
  
        {/* Transporte */}
        <Box mt={4}>
          <FormLabel>Transporte</FormLabel>
          <Select
            placeholder="Selecciona un transporte"
            value={selectedTransport}
            onChange={(e) => setSelectedTransport(e.target.value)}
          >
            {clientAdapted.transports.map((transport, index) => (
              <option key={index} value={transport}>
                {transport}
              </option>
            ))}
          </Select>
        </Box>
  
        {/* Dirección del transportista */}
        <Box mt={4}>
          <FormLabel>Dirección del transportista</FormLabel>
          <Input
            placeholder="Ej: Av. Industrial 123"
            value={transportAddress}
            onChange={(e) => setTransportAddress(e.target.value)}
          />
        </Box>
  
        {/* Método de pago */}
        <Box mt={6}>
          <FormLabel>Método de pago</FormLabel>
          <RadioGroup
            onChange={setPaymentMethod}
            value={paymentMethod}
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
  
        {/* Campos de abono, banco y cheque */}
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
  