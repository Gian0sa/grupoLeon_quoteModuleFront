import { MainLayout } from "../../../components/layouts/MainLayout";
import { useProductQueries } from "../hooks/queries/productQueries"
import { Skeleton } from "@chakra-ui/react";
import { useQuoteStore } from "../../quotes/stores/quoteStore";
import { Button } from "@chakra-ui/react";
import { useState } from "react";

export function ProductosPage() {
    const { data: products, isLoading, isError } = useProductQueries();
    const { addProductToQuote } = useQuoteStore();
    const [quantities, setQuantities] = useState({});
    
    const handleQuantityChange = (productId, value) => {
        setQuantities((prev) => ({
            ...prev,
            [productId]: value
        }));
    };

    const handleAddProduct = (product) => {
        const quantity = parseInt(quantities[product.id], 10) || 1;
        addProductToQuote({ ...product, quantity });
    };

    if (isLoading) return <Skeleton height="100vh" />;
    if (isError) return <div>Error al cargar los productos</div>;   
    return (
        <MainLayout>
            <h1>Productos Page</h1>
            <h2>Productos</h2>
            {products.map((product) => (
                <div key={product.id}>
                    <h3>{product.name || "Sin nombre"}</h3>
                    <p>{product.description || "Sin descripción"}</p>
                    <p>{product.price || "Sin precio"}</p>
                    <input
                        type="number"
                        min="1"
                        value={quantities[product.id] || 1}
                        onChange={e => handleQuantityChange(product.id, e.target.value)}
                        style={{ width: '60px', marginRight: '8px' }}
                    />
                    <Button onClick={() => handleAddProduct(product)}>Agregar a cotización</Button>
                </div>
            ))}
        </MainLayout>
    )
}
