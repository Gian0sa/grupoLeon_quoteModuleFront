import { Box, VStack, Flex, Spinner, useColorModeValue } from "@chakra-ui/react";
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuthStore } from "../../auth/stores/useAuthStore";
import { useActiveVisitByVendor } from "../../checkinout/hooks/queries/visitLogQueries";

import { VisitLogHeader } from "../components/VisitLogHeader";
import { ActiveVisitAlert } from "../components/ActiveVisitAlert";
import { VendorCard } from "../components/VendorCard";
import { ClientSearchCard } from "../components/ClientSearchCard";
import { ImageUploadCard } from "../components/ImageUploadCard";
import { VisitActionButtons } from "../components/VisitActionButtons";
import SyncQueueStatus from "../components/SyncQueueStatus";

import { useClientSearch, parseSearchToInitialData } from "../hooks/useClientSearch";
import { useImageUpload } from "../hooks/useImageUpload";
import { useVisitSubmit } from "../hooks/useVisitSubmit";
import { useClientImage } from "../hooks/queries/visitLogQueries";
import { useSyncQueueContext } from "../context/SyncQueueProvider";

import { useDisclosure } from "@chakra-ui/react";
import { NewClientModal } from "../components/NewClientModal";

export default function VisitLogPage() {
    const { username, salesEmployeeCode } = useAuthStore();
    const navigate = useNavigate();
    const { isOpen, onOpen, onClose } = useDisclosure();

    const pageBg = useColorModeValue("gray.50", "gray.900");

    const {
        queueItems,
        isSyncing,
        syncPending,
        retryItem,
        removeItem,
        clearAll,
    } = useSyncQueueContext();

    const {
        data: activeVisitData,
        isLoading: isLoadingActiveVisit,
        refetch: refetchActiveVisit,
    } = useActiveVisitByVendor(username, salesEmployeeCode);

    const activeVisit = activeVisitData?.visit || null;
    const hasActiveCheckIn = activeVisitData?.active || false;

    const {
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
    } = useClientSearch();

    const { image, imagePreview, isProcessingImage, handleImageChange, resetImage, fileInputKey } =
        useImageUpload();

    const {
        data: clientImageData,
        isLoading: isLoadingClientImage,
    } = useClientImage(
        selectedClient?.type === "SAP" ? selectedClient?.sapCode : null
    );

    const { submit, isCreatingVisit, isPending, isSubmitting } = useVisitSubmit({
        username,
        userCode: salesEmployeeCode,
        hasActiveCheckIn,
        activeVisit,
        selectedClient,
        image,
        existingImageData: clientImageData,
    });

    useEffect(() => {
        if (hasActiveCheckIn && activeVisit && !selectedClient) {
            setSelectedClient({
                firstName: activeVisit.storeName,
                cardCode: activeVisit.sapCode,
                address: `Lat: ${activeVisit.latitude}, Lon: ${activeVisit.longitude}`,
            });
        }
    }, [hasActiveCheckIn, activeVisit, selectedClient]);

    const handleSubmit = (type) => {
        submit(type, {
            onSuccess: async (_, type) => {
                await refetchActiveVisit();
                if (type === "OUT") resetSearch();
                resetImage();
            },
        });
    };

    const handleNavigateHistory = () => {
        const storeName = selectedClient?.firstName || activeVisit?.storeName;
        navigate(`/clienteBusqueda?storeName=${encodeURIComponent(storeName)}`);
    };

    return (
        <Box minH="100vh" bg={pageBg} pb="120px">
            <VisitLogHeader />

            <Box maxW="1100px" mx="auto" px={{ base: 4, md: 6 }}>
                {hasActiveCheckIn && activeVisit && <ActiveVisitAlert activeVisit={activeVisit} />}

                <SyncQueueStatus
                    queueItems={queueItems.filter(item => item.status !== "SYNCED")}
                    onRetry={retryItem}
                    onDelete={removeItem}
                    onClearAll={clearAll}
                    isSyncing={isSyncing}
                    onSyncAll={syncPending}
                />

                {isLoadingActiveVisit && (
                    <Flex justify="center" py={4}>
                        <Spinner color="green.600" size="sm" />
                    </Flex>
                )}

                <Flex
                    direction={{ base: "column", lg: "row" }}
                    gap={{ base: 6, lg: 8 }}
                    align="start"
                    pt={{ base: 4, md: 6 }}
                >
                    {/* COLUMNA 1: Estado del Vendedor & Buscador de Cliente */}
                    <VStack spacing={6} align="stretch" flex="1" w="full">
                        <VendorCard username={username} />

                        <ClientSearchCard
                            inputValue={inputValue}
                            onInputChange={setInputValue}
                            onSearch={handleSearch}
                            onKeyPress={handleKeyPress}
                            isSearching={isSearching}
                            searchError={searchError}
                            searchTerm={searchTerm}
                            isSearchingByCode={isSearchingByCode}
                            dataByCode={dataByCode}
                            dataByName={dataByName}
                            selectedClient={selectedClient}
                            hasActiveCheckIn={hasActiveCheckIn}
                            onSelectClient={handleSelectClient}
                            onCreateNewClient={(rawSearch) => {
                                const prefilled = parseSearchToInitialData(rawSearch || inputValue);
                                setInitialClientData(prefilled);
                                onOpen();
                            }}
                            onClearClient={handleClearClient}
                        />
                    </VStack>

                    {/* COLUMNA 2: Fotografía de Verificación & Botones de Acción */}
                    <VStack spacing={6} align="stretch" w={{ base: "full", lg: "400px" }}>
                        {!hasActiveCheckIn && (
                            <ImageUploadCard
                                image={image}
                                imagePreview={imagePreview}
                                isProcessingImage={isProcessingImage}
                                onImageChange={handleImageChange}
                                existingImageData={clientImageData}
                                isLoadingExistingImage={isLoadingClientImage}
                                fileInputKey={fileInputKey}
                            />
                        )}

                        <VisitActionButtons
                            hasActiveCheckIn={hasActiveCheckIn}
                            isCreatingVisit={isCreatingVisit}
                            isSubmitting={isSubmitting}
                            isPending={isPending}
                            selectedClient={selectedClient}
                            activeVisit={activeVisit}
                            onCheckIn={() => handleSubmit("IN")}
                            onCheckOut={() => handleSubmit("OUT")}
                            onNavigateHistory={handleNavigateHistory}
                        />
                    </VStack>
                </Flex>

                <NewClientModal
                    isOpen={isOpen}
                    onClose={onClose}
                    initialData={initialClientData}
                    onCreate={(data) => {
                        handleCreateNewClient(data);
                        onClose();
                    }}
                />
            </Box>
        </Box>
    );
}