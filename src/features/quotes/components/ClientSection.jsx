import { Text } from "@chakra-ui/react";
export function ClientSection({ client }){

    return(
        <div>
            <h1>Client Section</h1>
            <Text>{client.name || "Sin nombre"}</Text>
            <Text>{client.email || "Sin email"}</Text>
            <Text>{client.phone || "Sin teléfono"}</Text>
            <Text>{client.address || "Sin dirección"}</Text>
            <Text>{client.city || "Sin ciudad"}</Text>
            <Text>{client.state || "Sin estado"}</Text>
            <Text>{client.zip || "Sin código postal"}</Text>
            <Text>{client.country || "Sin país"}</Text>
        </div>
    )
}