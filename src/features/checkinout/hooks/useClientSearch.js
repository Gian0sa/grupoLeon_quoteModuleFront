import { useState } from "react";
import { useClientQueries, useClientQueriesByName, useSearchNewClientsQuery } from "../../clients/hooks/queries/clientQueries";
import { adaptClientFromApi } from "../../clients/adapters/clientAdapter";

export function parseSearchToInitialData(inputString) {
    const str = typeof inputString === "string" ? inputString : "";
    const trimmed = str.trim();
    if (!trimmed) return null;

    const isDigitsOnly = /^\d+$/.test(trimmed);
    const isCLCode = /^CL\d+$/i.test(trimmed);
    const digits = isCLCode ? trimmed.replace(/^CL/i, "") : (isDigitsOnly ? trimmed : "");

    if (digits) {
        if (digits.length === 11) {
            return {
                personType: "JURIDICO",
                documentType: "RUC",
                documentNumber: digits,
                fullName: "",
            };
        } else {
            return {
                personType: "NATURAL",
                documentType: "DNI",
                documentNumber: digits,
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
    const [rawSearchTerm, setRawSearchTerm] = useState("");
    const [isSearchingByCode, setIsSearchingByCode] = useState(true);
    const [selectedClient, setSelectedClientState] = useState(() => {
        try {
            const cached = sessionStorage.getItem("checkin_selected_client");
            return cached ? JSON.parse(cached) : null;
        } catch (e) {
            return null;
        }
    });

    const setSelectedClient = (client) => {
        setSelectedClientState(client);
        try {
            if (client) {
                sessionStorage.setItem("checkin_selected_client", JSON.stringify(client));
            } else {
                sessionStorage.removeItem("checkin_selected_client");
            }
        } catch (e) {}
    };

    const [initialClientData, setInitialClientData] = useState(null);

    const { data: dataByCode, isLoading: isLoadingByCode, error: errorByCode } =
        useClientQueries(isSearchingByCode && searchTerm ? searchTerm : null);

    const { data: dataByName, isLoading: isLoadingByName, error: errorByName } =
        useClientQueriesByName(!isSearchingByCode && searchTerm ? searchTerm : null);

    const { dataNewClients, isLoadingNewClients, errorNewClients } =
        useSearchNewClientsQuery(rawSearchTerm);

    const isSearching = (isSearchingByCode ? isLoadingByCode : isLoadingByName) || isLoadingNewClients;
    const searchError = isSearchingByCode ? errorByCode : errorByName;

    const handleSearch = () => {
        const trimmedInput = inputValue.trim();
        if (!trimmedInput) return;

        setRawSearchTerm(trimmedInput);

        const isDigitsOnly = /^\d+$/.test(trimmedInput);
        const isCLDigits = /^CL\d+$/i.test(trimmedInput);
        const isCLTemp = /^CL-TEMP/i.test(trimmedInput);

        if (isCLTemp) {
            setIsSearchingByCode(false);
            setSearchTerm("");
            return;
        }

        const isCode = isDigitsOnly || isCLDigits;
        setIsSearchingByCode(isCode);

        if (isDigitsOnly) {
            setSearchTerm(`CL${trimmedInput}`);
        } else if (isCLDigits) {
            setSearchTerm(trimmedInput.toUpperCase());
        } else {
            setSearchTerm(trimmedInput);
        }
    };

    const handleKeyPress = (e) => {
        if (e.key === "Enter") handleSearch();
    };

    const handleSelectClient = (clientData) => {
        const client = adaptClientFromApi(clientData);

        setSelectedClient({
            ...client,
            type: "SAP",
            isTemporary: false,
        });

        setInputValue("");
        setSearchTerm("");
        setRawSearchTerm("");
    };

    const handleSelectTempClient = (clientData) => {
        const tempCode = clientData.sapCode || `CL-TEMP-${clientData.id}`;
        setSelectedClient({
            type: "NEW_TEMP",
            id: tempCode,
            sapCode: tempCode,
            cardCode: tempCode,
            clientCode: tempCode,
            newClientId: clientData.id,
            firstName: clientData.fullName || "Cliente Nuevo",
            fullName: clientData.fullName,
            address: clientData.address || "Registrado en campo (Sin registrar en SAP)",
            personType: clientData.personType,
            documentType: clientData.documentType,
            documentNumber: clientData.documentNumber,
            phone: clientData.phone,
            email: clientData.email,
            createdBy: clientData.createdBy,
            createdAt: clientData.createdAt,
            isTemporary: true,
        });

        setInputValue("");
        setSearchTerm("");
        setRawSearchTerm("");
    };

    const handleCreateNewClient = (formData) => {
        const generatedCode = formData.documentNumber
            ? `CL${formData.documentNumber}`
            : `CL-TEMP-${Date.now()}`;

        setSelectedClient({
            type: "NEW",
            id: generatedCode,
            sapCode: generatedCode,
            cardCode: generatedCode,
            firstName: formData.firstName || formData.fullName || "Cliente Nuevo",
            address: formData.address || "Cliente Nuevo (Sin registrar en SAP)",

            personType: formData.personType,
            documentType: formData.documentType,
            documentNumber: formData.documentNumber,
            phone: formData.phone,
            email: formData.email,
            isTemporary: true,
        });

        setInputValue("");
        setSearchTerm("");
        setRawSearchTerm("");
    };

    const handleClearClient = () => {
        setSelectedClient(null);
        setInputValue("");
        setSearchTerm("");
        setRawSearchTerm("");
    };

    const resetSearch = () => {
        setSelectedClient(null);
        setInputValue("");
        setSearchTerm("");
        setRawSearchTerm("");
        setIsSearchingByCode(true);
    };

    return {
        inputValue,
        setInputValue,
        searchTerm,
        rawSearchTerm,
        isSearchingByCode,
        selectedClient,
        setSelectedClient,
        dataByCode,
        dataByName,
        dataNewClients: dataNewClients || [],
        isSearching,
        searchError,
        initialClientData,
        setInitialClientData,
        handleSearch,
        handleKeyPress,
        handleSelectClient,
        handleSelectTempClient,
        handleCreateNewClient,
        handleClearClient,
        resetSearch,
    };
}