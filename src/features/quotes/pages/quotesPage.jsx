import { ProductSection } from "../components/ProductSection";
import { ClientSection } from "../components/ClientSection";
import { MainLayout } from "../../../components/layouts/MainLayout";
import { Button, Flex } from "@chakra-ui/react";
import { useQuoteStore } from "../stores/quoteStore";
import { useAuthStore } from "../../auth/stores/useAuthStore";
import { useQuoteMutations } from "../hooks/mutations/quotesMutations";
import { useGetQuoteDraftById } from "../hooks/queries/quotesQueries";
import { useParams } from "react-router-dom";
import { useEffect } from "react";

export function QuotesPage() {
    const { id } = useParams();
    const { data: quoteDraft, isLoading: quoteDraftLoading, error: quoteDraftError } = useGetQuoteDraftById(parseInt(id));
    const client = useQuoteStore((state) => state.client);
    const products = useQuoteStore((state) => state.products);
    const setClient = useQuoteStore((state) => state.setClient); // ✅ FALTA ESTO
    const setProducts = useQuoteStore((state) => state.setProducts); // ✅ FALTA ESTO

    const { userId } = useAuthStore();
    const { createQuoteDraftMutation } = useQuoteMutations();

    // Llenar datos del borrador
    useEffect(() => {
        if (quoteDraft) {
            console.log("quoteDraft",quoteDraft);
            setClient({
                CardCode: quoteDraft.clientId,
                CardName: quoteDraft.clientName,
                Email: quoteDraft.clientEmail,
                Phone1: quoteDraft.clientPhone,
                Address: quoteDraft.clientAddress,
                LicTradNum: quoteDraft.clientDocument,
            });

            const mappedProducts = quoteDraft.items.map((item) => ({
                id: item.productId,
                name: item.productName,
                code: item.productCode,
                price: item.unitPrice,
                quantity: item.quantity,
                total: item.totalPrice,
            }));

            setProducts(mappedProducts);
        }
    }, [quoteDraft, setClient, setProducts]);

    const HandleSave = () => {
        const quote = {
            clientId: client.CardCode,
            userId,
            status: "draft",
            items: products.map((product) => ({
                productId: product.id,
                quantity: product.quantity,
            })),
        };

        createQuoteDraftMutation.mutate(quote);
    };

    const HandleApprove = () => {
        console.log("Aprobar");
    };

    if (quoteDraftLoading) {
        return <div>Loading...</div>;
    }

    if (quoteDraftError) {
        return <div>Error: {quoteDraftError.message}</div>;
    }
    const testClient = {
        clientName: "Juan Pérez",
        CardCode: "PL20481789282",
        clientAddress: "Av. Siempre Viva 742",
        puntollegada: [
          { name: "Almacén Central" },
          { name: "Sucursal Sur" }
        ],
        transports: [
          { name: "Transporte López" },
          { name: "Camiones del Norte" }
        ]
      };
      
      
    return (
        <MainLayout>
            <ClientSection client={testClient} />
            <ProductSection products={products} />
            <Flex>
                <Button onClick={HandleSave}>Guardar</Button>
                <Button onClick={HandleApprove}>Aprobar</Button>
            </Flex>
        </MainLayout>
    );
}
