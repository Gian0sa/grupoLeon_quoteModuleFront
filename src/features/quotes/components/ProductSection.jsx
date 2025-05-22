import { useQuoteStore } from "../stores/quoteStore"
import { Button } from "@chakra-ui/react"
import { useNavigate } from "react-router-dom"

export function ProductSection({products}){
    const removeProduct = useQuoteStore((state) => state.removeProduct)
    const navigate = useNavigate()
    return(
        <div>
        <h2> en la cotización</h2>
        <ul>
            {products.map((product) => (
            <li key={product.id}>
                {product.name} - {product.quantity} x S/ {product.price}
                <button onClick={() => removeProduct(product.id)}>Eliminar</button>
            </li>
            ))}
        </ul>
        <Button onClick={() => navigate('/products')}>Añadir</Button>
        </div>
    )
}
