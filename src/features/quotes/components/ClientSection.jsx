import { Text } from "@chakra-ui/react";
import { adaptBusinessPartner } from "../adapters/quotesAdapter";

export function ClientSection({ client }){
    const clientAdapted = adaptBusinessPartner(client);
    return(
        <div>
            <h1>Client Section</h1>
            <Text>{clientAdapted.cardName}</Text>
            <Text>{clientAdapted.cardCode}</Text>
            <Text>{clientAdapted.cardType}</Text>
            <Text>{clientAdapted.federalTaxID}</Text>
            <Text>{clientAdapted.address}</Text>
            <Text>{clientAdapted.city}</Text>
            <Text>{clientAdapted.country}</Text>
            <Text>{clientAdapted.phone}</Text>
            <Text>{clientAdapted.email}</Text>
        </div>
    )
}