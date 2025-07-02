import {
  Box,
  Text
} from "@chakra-ui/react";
import { adaptBusinessPartner } from "../adapters/quotesAdapter";

export function NewClientSection({
  client
}) {
  if (!client) return <Text>Cargando cliente...</Text>;
  console.log(client);

  const clientAdapted = adaptBusinessPartner(client);


  return (
    <Box>
      <Text>Codigo: {clientAdapted.cardCode}</Text>
      <Text>Nombre: {clientAdapted.cardName}</Text>
      <Text>Dirección: {clientAdapted.address}</Text>
    </Box>
  );
}
