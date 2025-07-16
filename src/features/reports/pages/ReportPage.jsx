import SalespersonReports from "../components/SalesReport";

export function ReportPage({salespersonId}){
    return(
        <SalespersonReports salespersonId={salespersonId} />    
    )
}