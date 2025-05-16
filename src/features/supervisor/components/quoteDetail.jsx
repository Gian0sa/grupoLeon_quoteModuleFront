import { useParams } from "react-router-dom"
import { useSupervisorQueries } from "../hooks/queries/supervisorQueries"

export function QuoteDetail() {
    const { quoteId } = useParams()
    const { data, isLoading, error } = useSupervisorQueries(quoteId)
    console.log(data)
    if (isLoading) return <div>Loading...</div>
    if (error) return <div>Error: {error.message}</div>
    return (
        <div>
            <h1>Quote Detail</h1>   
            <p>{data.id}</p>
            <p>{data.client.name}</p>
            <p>{data.client.email}</p>
            <p>{data.client.phone}</p>
            <p>{data.client.address}</p>
            <p>{data.client.city}</p>
            {data.products.map((product) => (
                <div key={product.id}>
                    <p>{product.name}</p>
                    <p>{product.price}</p>
                    <p>{product.quantity}</p>
                    <p>{product.totalPrice}</p>
                </div>
            ))} 
            <p>{data.totalPrice}</p>
            <p>{data.status}</p>
            <p>{data.createdAt}</p>
            <p>{data.updatedAt}</p>
        </div>
    )
}
