import { ProductSection } from "../components/ProductSection";
import { ClientSection } from "../components/ClientSection";
import { MainLayout } from "../../../components/layouts/MainLayout";
import { Button, Flex } from "@chakra-ui/react";
import { useLocation } from "react-router-dom";

export function QuotesPage() {
    const location = useLocation();
    const { data } = location.state || {};

    console.log("el cliente que pasa a quote es: ", data);
    const client = data ;

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

