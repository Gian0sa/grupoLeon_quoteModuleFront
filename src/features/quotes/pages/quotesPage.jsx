import { ProductSection } from "../components/ProductSection";
import { ClientSection } from "../components/ClientSection";
import { MainLayout } from "../../../components/layouts/MainLayout";
import { Button, Flex } from "@chakra-ui/react";
import { useQuoteStore } from "../stores/quoteStore";
import { useEffect } from "react";

export function QuotesPage() {
    const client = useQuoteStore((state) => state.client);
    
      

    return (
        <MainLayout>
            <ClientSection client={client} />
            <ProductSection />
            <Flex>
                <Button onClick={() => console.log("Guardar")}>Guardar</Button>
                <Button onClick={() => console.log("Aprobar")}>Aprobar</Button>
            </Flex>
        </MainLayout>
    );
}

