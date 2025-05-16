import { Button, Flex, Input, Text, Spinner } from "@chakra-ui/react";
import { useState } from "react";
import { MainLayout } from "../../../components/layouts/MainLayout";
import { useClientQueries } from "../hooks/queries/clientQueries";
import { useNavigate } from "react-router-dom";
import { adaptClientFromApi } from "../adapters/clientAdapter";

export function ClientPage() {
  const [inputValue, setInputValue] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const navigate = useNavigate();
  
  const { data, isLoading, error } = useClientQueries(searchTerm);

  const client = data ? adaptClientFromApi(data) : null;

  const handleSearch = () => {
    setSearchTerm(inputValue);
  };

  const handleKeyPress = (e) => {
    if (e.key === "Enter") {
      handleSearch();
    }
  };

  return (
    <MainLayout>
      <Flex direction="column" gap="4" justify="center">
        <Input
          placeholder="Buscar cliente"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyPress={handleKeyPress}
        />
        <Button onClick={handleSearch} isLoading={isLoading}>
          Buscar
        </Button>
        
        {isLoading && <Spinner mt="4" />}
        
        {error && (
          <Text color="red.500" mt="4">
            Error al buscar cliente: {error.message}
          </Text>
        )}
        
        {client && !isLoading && (
          <Flex direction="column" mt="4" p="4" borderWidth="1px" borderRadius="md">
            <Text fontWeight="bold">Cliente encontrado:</Text>
            <Text>Nombre: {client.firstName}</Text>
            <Text>Código: {client.id}</Text>
            <Text>Dirección: {client.lastName}</Text>
            <Text>Teléfono: {client.phone}</Text>
            <Button onClick={() => {
              navigate("/quotes", { state: { data } });
            }}>Cotizar</Button>
          </Flex>
        )}
      </Flex>
    </MainLayout>
  );
}