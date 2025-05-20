import { useProductDetail } from "../hooks/queries/productQueries"
import { Skeleton, Button, FormControl, FormLabel, Input } from "@chakra-ui/react"
import { useQuoteStore } from "../../quotes/stores/quoteStore"
import { useState } from "react"
import { useNavigate } from "react-router-dom"

export function ProductDetail({ code }) {
    const { productDetail, isLoadingDetail, errorDetail } = useProductDetail(code);
    const addProduct = useQuoteStore((state) => state.addProduct);

    const [quantity, setQuantity] = useState(1);
    const navigate = useNavigate();
    if (isLoadingDetail) return <Skeleton height="100vh" />;
    if (errorDetail) return <div>Error: {errorDetail.message}</div>;

    const handleAddToCart = () => {
        if (!quantity || quantity <= 0) return;

        const product = {
            id: productDetail.ItemCode,
            name: productDetail.ItemName,
            price: productDetail.Price,
            stock: productDetail.onHand,
            quantity: Number(quantity),
        };

        addProduct(product);
        navigate('/quotes');
    };

    return (
        <div>
            <h1>Product Detail</h1>
            <div><strong>Código:</strong> {productDetail.ItemCode}</div>
            <div><strong>Nombre:</strong> {productDetail.ItemName}</div>
            <div><strong>Precio:</strong> {productDetail.Price}</div>
            <div><strong>Stock:</strong> {productDetail.onHand}</div>

            <FormControl mt={4}>
                <FormLabel>Quantity</FormLabel>
                <Input
                    type="number"
                    value={quantity}
                    min={1}
                    onChange={(e) => setQuantity(e.target.value)}
                />
            </FormControl>

            <Button mt={4} onClick={handleAddToCart} colorScheme="blue">
                Add to Quote
            </Button>
        </div>
    )
}
