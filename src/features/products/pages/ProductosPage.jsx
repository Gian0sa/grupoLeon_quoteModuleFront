import { MainLayout } from "../../../components/layouts/MainLayout";
import { useState } from "react";
import { ProductSearch } from "../components/productSearch";
import { ProductDetail } from "../components/ProductDetail";

export function ProductosPage() {
    const [value, setValue] = useState("");

    return (
        <MainLayout>
            
            <ProductSearch setValue={setValue}/>
            {value && <ProductDetail value={value} />}

        </MainLayout>
    )
}
