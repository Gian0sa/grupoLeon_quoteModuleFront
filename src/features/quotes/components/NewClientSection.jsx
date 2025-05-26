import {
  Box,
  Text,
  Input,
  RadioGroup,
  Stack,
  Radio,
  FormLabel,
  VStack,
} from "@chakra-ui/react";
import ReactSelect from "react-select";
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

  // Opciones para react-select (puntos de llegada)
  const deliveryOptions = deliveryPoints.map((point) => ({
    value: point.AddressName,
    label: `${point.AddressName} - ${point.Street}`,
  }));

  // Opciones para react-select (transportes), con multilínea usando React Fragment
  const transportOptions = transports.map((transport) => ({
    value: transport.Name,
    label: (
      <div>
        <div><strong>Nombre:</strong> {transport.Name}</div>
        <div style={{ fontSize: "smaller", color: "Black" }}>
          Dirección: {transport.U_TQC_DIREC}
        </div>
      </div>
    ),
  }));

  return (
    <Box>
      <Text fontSize="xl" fontWeight="bold" mb={4}>
        Client Section
      </Text>

      <Text>Nombre: {clientAdapted.cardName}</Text>
      <Text>Dirección: {clientAdapted.address}</Text>

      <Box mt={4}>
        <FormLabel>Punto de llegada</FormLabel>
        <ReactSelect
          options={deliveryOptions}
          value={
            selectedPoint
              ? { value: selectedPoint.AddressName, label: `${selectedPoint.AddressName} - ${selectedPoint.Street}` }
              : null
          }
          onChange={(selected) => {
            const selectedObj = deliveryPoints.find(
              (p) => p.AddressName === selected.value
            );
            setSelectedPoint(selectedObj);
          }}
          placeholder="Selecciona un punto de llegada"
          styles={{
            container: (provided) => ({
              ...provided,
              maxWidth: "800px",
              width: "100%",
              color: "black",
            }),
          }}
        />
      </Box>

      <Box mt={4}>
        <FormLabel>Transporte</FormLabel>
        <ReactSelect
          options={transportOptions}
          value={
            selectedTransport
              ? {
                  value: selectedTransport.Name,
                  label: (
                    <div>
                      <div style={{ fontSize: "smaller", color: "Black" }}>Nombre: {selectedTransport.Name}</div>
                      <div style={{ fontSize: "smaller", color: "Black" }}>
                        Dirección: {selectedTransport.U_TQC_DIREC}
                      </div>
                    </div>
                  ),
                }
              : null
          }
          onChange={(selected) => {
            const selectedObj = transports.find(
              (t) => t.Name === selected.value
            );
            setSelectedTransport(selectedObj);
          }}
          placeholder="Selecciona un transporte"
          styles={{
            container: (provided) => ({
              ...provided,
              maxWidth: "800px",
              width: "100%",
              color: "black",
            }),
            singleValue: (provided) => ({
              ...provided,
              whiteSpace: "normal", // Para que el texto multilínea no se corte
            }),
            option: (provided) => ({
              ...provided,
              whiteSpace: "normal",
            }),
          }}
        />
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
