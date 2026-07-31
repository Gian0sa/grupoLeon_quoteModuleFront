import { useState } from "react";
import { useClientQueries, useClientQueriesByName } from "../../clients/hooks/queries/clientQueries";
import { adaptClientFromApi } from "../../clients/adapters/clientAdapter";

export function parseSearchToInitialData(inputString) {
    const trimmed = (inputString || "").trim();
    if (!trimmed) return null;

    const isDigitsOnly = /^\d+$/.test(trimmed);
    if (isDigitsOnly) {
        if (trimmed.length === 11) {
            return {
                personType: "JURIDICO",
                documentType: "RUC",
                documentNumber: trimmed,
                fullName: "",
            };
        } else {
            return {
                personType: "NATURAL",
                documentType: "DNI",
                documentNumber: trimmed,
                fullName: "",
            };
        }
    } else {
        return {
            personType: "NATURAL",
            documentType: "DNI",
            documentNumber: "",
            fullName: trimmed,
        };
    }
}

export function useClientSearch() {
    const [inputValue, setInputValue] = useState("");
    const [searchTerm, setSearchTerm] = useState("");
    const [isSearchingByCode, setIsSearchingByCode] = useState(true);
    const [selectedClient, setSelectedClient] = useState(null);
    const [initialClientData, setInitialClientData] = useState(null);

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

        setSelectedClient({
            ...client,
            type: "SAP",
        });

        setInputValue("");
        setSearchTerm("");
    };

    const handleCreateNewClient = (formData) => {
        setSelectedClient({
            type: "NEW",
            id: null,
            firstName: formData.firstName,
            address: formData.address,

            personType: formData.personType,
            documentType: formData.documentType,
            documentNumber: formData.documentNumber,
            phone: formData.phone,
            email: formData.email,
        });

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
        initialClientData,
        setInitialClientData,
        handleSearch,
        handleKeyPress,
        handleSelectClient,
        handleCreateNewClient,
        handleClearClient,
        resetSearch,
    };
}