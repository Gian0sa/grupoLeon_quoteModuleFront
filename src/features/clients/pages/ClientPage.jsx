import { Button, Flex, Input, Text, Spinner } from "@chakra-ui/react";
import { useState } from "react";
import { MainLayout } from "../../../components/layouts/MainLayout";
import { useClientQueries } from "../hooks/queries/clientQueries";
import { useClientQueriesByName } from "../hooks/queries/clientQueries";
import { useNavigate } from "react-router-dom";
import { adaptClientFromApi } from "../adapters/clientAdapter";
import { useQuoteStore } from "../../quotes/stores/quoteStore";

export function ClientPage() {
  const [inputValue, setInputValue] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [isSearchingByCode, setIsSearchingByCode] = useState(true);
  const navigate = useNavigate();
  const setClient = useQuoteStore((state) => state.setClient);

  const {
    data: dataByCode,
    isLoading: isLoadingByCode,
    error: errorByCode,
  } = useClientQueries(isSearchingByCode ? searchTerm : null);

  const {
    data: dataByName,
    isLoading: isLoadingByName,
    error: errorByName,
  } = useClientQueriesByName(!isSearchingByCode ? searchTerm : null);

  const isLoading = isSearchingByCode ? isLoadingByCode : isLoadingByName;
  const error = isSearchingByCode ? errorByCode : errorByName;

  const handleSearch = () => {
    const trimmedInput = inputValue.trim();
    if (!trimmedInput) return;

    const isNumeric = /^\d+$/.test(trimmedInput);
    setIsSearchingByCode(isNumeric);
    setSearchTerm(trimmedInput);
  };

  const handleKeyPress = (e) => {
    if (e.key === "Enter") {
      handleSearch();
    }
  };

  const renderClientCard = (clientData) => {
    const client = adaptClientFromApi(clientData);

    return (
      <Flex
        key={client.id}
        direction="column"
        mt="4"
        p="4"
        borderWidth="1px"
        borderRadius="md"
      >
        <Text fontWeight="bold">Cliente encontrado:</Text>
        <Text>Nombre: {client.firstName}</Text>
        <Text>Código: {client.id}</Text>
        <Text>Dirección: {client.address}</Text>
        <Button
          onClick={() => {
            setClient(clientData);
            navigate("/newquotes");
          }}
        >
          Cotizar
        </Button>
      </Flex>
    );
  };

  return (
    <MainLayout>
      <Flex direction="column" gap="4" justify="center">
        <Input
          placeholder="Buscar cliente por RUC/DNI o nombre"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value.toUpperCase())}
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

        {/* Mostrar un cliente único si es por código */}
        {isSearchingByCode && dataByCode && !isLoading && renderClientCard(dataByCode)}

        {/* Mostrar lista si es por nombre */}
        {!isSearchingByCode &&
          dataByName?.value &&
          dataByName.value.length > 0 &&
          dataByName.value.map((clientData) => renderClientCard(clientData))}

        {/* No se encontró ningún cliente */}
        {!isLoading &&
          !error &&
          ((isSearchingByCode && !dataByCode) ||
            (!isSearchingByCode && dataByName?.value?.length === 0)) && (
            <Text mt="4">No se encontró ningún cliente.</Text>
          )}
      </Flex>
    </MainLayout>
  );
}
