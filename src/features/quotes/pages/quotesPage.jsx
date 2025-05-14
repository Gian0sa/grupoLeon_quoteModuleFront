import { ProductSection } from "../components/ProductSection";
import { ClientSection } from "../components/ClientSection";
import { MainLayout } from "../../../components/layouts/MainLayout";
import { Button, Flex } from "@chakra-ui/react";
import { useNavigate } from "react-router-dom";

export function QuotesPage( {route} ){
    const navigate = useNavigate();
    const { client } = route.params;
    
    const HandleAprove = () => {
        console.log("Aprobar");
    }
    const HandleSave = () => {
        console.log("Guardar");
    }

    return(
        <MainLayout>
            <ClientSection client={client} />
            <ProductSection />
            <Flex>
                <Button onClick={HandleSave}>Guardar</Button>
                <Button onClick={HandleAprove}>Aprobar</Button>
            </Flex>
        </MainLayout>
    )
}
