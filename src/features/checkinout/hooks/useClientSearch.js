import { useState } from "react";
import { useClientQueries, useClientQueriesByName } from "../../clients/hooks/queries/clientQueries";
import { adaptClientFromApi } from "../../clients/adapters/clientAdapter";

export function useClientSearch() {
    const [inputValue, setInputValue] = useState("");
    const [searchTerm, setSearchTerm] = useState("");
    const [isSearchingByCode, setIsSearchingByCode] = useState(true);
    const [selectedClient, setSelectedClient] = useState(null);

    const { data: dataByCode, isLoading: isLoadingByCode, error: errorByCode } =
        useClientQueries(isSearchingByCode ? searchTerm : null);

    const { data: dataByName, isLoading: isLoadingByName, error: errorByName } =
        useClientQueriesByName(!isSearchingByCode ? searchTerm : null);

    const isSearching = isSearchingByCode ? isLoadingByCode : isLoadingByName;
    const searchError = isSearchingByCode ? errorByCode : errorByName;

    const handleSearch = () => {
        const trimmedInput = inputValue.trim();
        if (!trimmedInput) return;

        const isNumeric = /^\d+$/.test(trimmedInput);
        setIsSearchingByCode(isNumeric);
        setSearchTerm(isNumeric ? `CL${trimmedInput}` : trimmedInput);
    };

    const handleKeyPress = (e) => {
        if (e.key === "Enter") handleSearch();
    };

    const handleSelectClient = (clientData) => {
        const client = adaptClientFromApi(clientData);
        setSelectedClient(client);
        setInputValue("");
        setSearchTerm("");
    };

    const handleClearClient = () => {
        setSelectedClient(null);
        setInputValue("");
        setSearchTerm("");
    };

    const resetSearch = () => {
        setSelectedClient(null);
        setInputValue("");
        setSearchTerm("");
        setIsSearchingByCode(true);
    };

    return {
        inputValue,
        setInputValue,
        searchTerm,
        isSearchingByCode,
        selectedClient,
        setSelectedClient,
        dataByCode,
        dataByName,
        isSearching,
        searchError,
        handleSearch,
        handleKeyPress,
        handleSelectClient,
        handleClearClient,
        resetSearch,
    };
}