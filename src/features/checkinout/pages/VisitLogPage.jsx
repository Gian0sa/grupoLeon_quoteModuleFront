import { Box, VStack, Flex, Spinner } from "@chakra-ui/react";
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

import { useClientSearch } from "../hooks/useClientSearch";
import { useImageUpload } from "../hooks/useImageUpload";
import { useVisitSubmit } from "../hooks/useVisitSubmit";
import { useClientImage } from "../hooks/queries/visitLogQueries";
import { useSyncQueue } from "../hooks/useSyncQueue";

import { useDisclosure } from "@chakra-ui/react";
import { NewClientModal } from "../components/NewClientModal";

export default function VisitLogPage() {
    const { username, salesEmployeeCode } = useAuthStore();
    const navigate = useNavigate();
    const { isOpen, onOpen, onClose } = useDisclosure();

    const {
        queueItems,
        isSyncing,
        syncPending,
        retryItem,
        removeItem,
    } = useSyncQueue();

    const {
        data: activeVisitData,
        isLoading: isLoadingActiveVisit,
        refetch: refetchActiveVisit,
    } = useActiveVisitByVendor(username);

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
        handleSearch,
        handleKeyPress,
        handleSelectClient,
        handleCreateNewClient,
        handleClearClient,
        resetSearch,
    } = useClientSearch();

    const { image, imagePreview, isProcessingImage, handleImageChange, resetImage } =
        useImageUpload();

    const {
        data: clientImageData,
        isLoading: isLoadingClientImage,
    } = useClientImage(selectedClient?.id);

    console.log("selectedClient", selectedClient);
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
        <Box minH="100vh" bg="gray.50" pb={6}>
            <VisitLogHeader />

            {hasActiveCheckIn && activeVisit && <ActiveVisitAlert activeVisit={activeVisit} />}

            <SyncQueueStatus
                queueItems={queueItems}
                onRetry={retryItem}
                onDelete={removeItem}
                isSyncing={isSyncing}
                onSyncAll={syncPending}
            />

            {isLoadingActiveVisit && (
                <Flex justify="center" py={4}>
                    <Spinner color="green.500" size="sm" />
                </Flex>
            )}

            <Box px={4} pt={6}>
                <VStack spacing={5} align="stretch">
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
                        onCreateNewClient={onOpen}
                        onClearClient={handleClearClient}
                    />

                    {!hasActiveCheckIn && (
                        <ImageUploadCard
                            image={image}
                            imagePreview={imagePreview}
                            isProcessingImage={isProcessingImage}
                            onImageChange={handleImageChange}
                            existingImageData={clientImageData}   // <-- nuevo
                            isLoadingExistingImage={isLoadingClientImage} // <-- nuevo
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
                <NewClientModal
                    isOpen={isOpen}
                    onClose={onClose}
                    onCreate={(data) => {
                        handleCreateNewClient(data);
                        onClose();
                    }}
                />
            </Box>
        </Box>
    );
}