import { MainLayout } from "../../../components/layouts/MainLayout";
import { useProductList } from "../hooks/queries/productQueries"
import { Skeleton } from "@chakra-ui/react";
import { useState } from "react";
import { ProductList } from "../components/productList";
import { ProductSearch } from "../components/productSearch";

export function ProductosPage() {
    const [field, setField] = useState("ItemCode");
    const [value, setValue] = useState("");
    
    const { data, isLoading, isError } = useProductList(field, value);

    const products = data;
    console.log("products", products);
    if (isLoading) return <Skeleton height="100vh" />;
    if (isError) return <div>Error al cargar los productos</div>;   
    return (
        <MainLayout>
            
            <ProductSearch setField={setField} setValue={setValue}/>
            <ProductList products={products}/>

        </MainLayout>
    )
}
