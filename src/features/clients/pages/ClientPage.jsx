import { ClientSearch } from "../components/ClientSearch"
import { Button } from "@chakra-ui/react"
import { useState } from "react";
export function ClientPage(){
  const [searchTerm, setSearchTerm] = useState("");
  console.log(searchTerm);
    return (
        <div>
          <ClientSearch onSearch={setSearchTerm} />
          <Button onClick={() => console.log(searchTerm)}>Buscar</Button>
        </div>
    )
}
