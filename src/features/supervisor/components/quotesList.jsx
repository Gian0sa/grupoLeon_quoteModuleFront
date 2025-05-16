import { useSupervisorQueries } from "../hooks/queries/supervisorQueries"
export function QuotesList() {
    const { data, isLoading, error } = useSupervisorQueries()
    if (isLoading) return <div>Loading...</div>
    if (error) return <div>Error: {error.message}</div>
    const handleDetail = (quoteId) => {
        navigate(`/supervisor/quotes/${quoteId}`)
        console.log(quoteId)
    }
    return (
        <div>
            <h1>Quotes List</h1>
            <table>
                <thead>
                    <tr>
                        <th>ID</th>
                        <th>Client</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody>
                    {data.map((quote) => (
                        <tr key={quote.id}>
                            <td>{quote.id}</td>
                            <td>{quote.client.name}</td>
                            <td>
                                <button onClick={() => handleDetail(quote.id)}>Detail</button>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    )
}