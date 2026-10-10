import { Box, VStack, Flex, Spinner, useColorModeValue } from "@chakra-ui/react";
import { useEffect, useState, useRef, useCallback } from "react";
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

import { useDisclosure, useToast } from "@chakra-ui/react";
import { NewClientModal } from "../components/NewClientModal";
import { getLocation } from "../utils/deviceUtils";
import { getCheckinDraftOwner, readCheckinDraft, saveCheckinDraft, clearCheckinDraft, consumeCameraRecovery } from "../utils/checkinSession";
import { sendDeviceTelemetry } from "../services/telemetryService";

export default function VisitLogPage() {
    const { username, salesEmployeeCode } = useAuthStore();
    const navigate = useNavigate();
    const toast = useToast();
    const draftOwner = getCheckinDraftOwner(username, salesEmployeeCode);
    // Restaurar antes del primer render evita que el auto-guardado sobrescriba el borrador.
    const [restoredDraft] = useState(() => readCheckinDraft(draftOwner));
    const draftSnapshotRef = useRef(null);
    const draftCompletedRef = useRef(false);
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
        rawSearchTerm,
        isSearchingByCode,
        selectedClient,
        setSelectedClient,
        dataByCode,
        dataByName,
        dataNewClients,
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
    } = useClientSearch(restoredDraft);

    const {
        image,
        imagePreview,
        imageInfo,
        isProcessingImage,
        handleImageChange,
        setDirectImage,
        resetImage,
        fileInputKey,
        prepareForCamera,
        handleCameraCancel,
    } = useImageUpload();

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

    draftSnapshotRef.current = {
        owner: draftOwner, selectedClient, initialClientData, inputValue,
        visitType: hasActiveCheckIn ? "OUT" : "IN",
        // La vista actual no tiene un campo de comentario editable.
        comment: restoredDraft?.comment || "",
    };
    const persistDraft = useCallback(() => {
        if (!draftCompletedRef.current) saveCheckinDraft(draftSnapshotRef.current);
    }, []);

    useEffect(() => {
        draftCompletedRef.current = false;
        persistDraft();
    }, [selectedClient, initialClientData, inputValue, persistDraft]);

    useEffect(() => {
        const saveWhenHidden = () => {
            if (document.visibilityState === "hidden") persistDraft();
        };
        document.addEventListener("visibilitychange", saveWhenHidden);
        window.addEventListener("pagehide", persistDraft);
        return () => {
            document.removeEventListener("visibilitychange", saveWhenHidden);
            window.removeEventListener("pagehide", persistDraft);
        };
    }, [persistDraft]);

    useEffect(() => {
        const recovery = consumeCameraRecovery(document.wasDiscarded === true);
        if (!recovery) return;
        void sendDeviceTelemetry("APP_KILLED_BY_OS_OOM", { ...recovery, draftRestored: !!restoredDraft });
        toast({
            title: restoredDraft ? "Datos restaurados" : "La pantalla se reinició",
            description: restoredDraft
                ? "Restauramos tus datos tras una liberación de memoria de tu teléfono. Ya puedes tomar la foto."
                : "Tu teléfono pudo liberar memoria. Selecciona el cliente para continuar.",
            status: "info", duration: 6000, isClosable: true,
        });
    }, [restoredDraft, toast]);

    const handleBeforeCamera = () => {
        persistDraft();
        prepareForCamera();
    };

    useEffect(() => {
        // Pre-calentar el GPS y solicitar permisos desde que el usuario entra a la pantalla
        getLocation().catch(() => {});
    }, []);

    useEffect(() => {
        if (hasActiveCheckIn && activeVisit && !selectedClient) {
            const sapCodeVal = activeVisit.sapCode || activeVisit.cardCode || activeVisit.clientCode || "";
            const isTemp = (typeof sapCodeVal === "string" && sapCodeVal.startsWith("CL-TEMP")) || !!activeVisit.newClientId;
            setSelectedClient({
                id: sapCodeVal || (activeVisit.newClientId ? `CL-TEMP-${activeVisit.newClientId}` : "AUTO"),
                sapCode: sapCodeVal || (activeVisit.newClientId ? `CL-TEMP-${activeVisit.newClientId}` : null),
                cardCode: sapCodeVal || (activeVisit.newClientId ? `CL-TEMP-${activeVisit.newClientId}` : null),
                clientCode: sapCodeVal || (activeVisit.newClientId ? `CL-TEMP-${activeVisit.newClientId}` : null),
                newClientId: activeVisit.newClientId || null,
                firstName: activeVisit.storeName,
                address: activeVisit.address || `Lat: ${activeVisit.latitude || ""}, Lon: ${activeVisit.longitude || ""}`,
                type: (isTemp || activeVisit.newClientId) ? "NEW_TEMP" : (sapCodeVal ? "SAP" : "NEW"),
                isTemporary: isTemp || !!activeVisit.newClientId,
            });
        }
    }, [hasActiveCheckIn, activeVisit, selectedClient]);

    const handleSubmit = (type) => {
        submit(type, {
            onSuccess: async (_, type) => {
                draftCompletedRef.current = true;
                clearCheckinDraft();
                resetImage();
                await refetchActiveVisit();
                if (type === "OUT") {
                    resetSearch();
                    setInitialClientData(null);
                }
            },
        });
    };

    const handleNavigateHistory = () => {
        const storeName = selectedClient?.firstName || activeVisit?.storeName || "";
        const clientCode = selectedClient?.sapCode || selectedClient?.cardCode || activeVisit?.sapCode || activeVisit?.cardCode || "";
        navigate(`/clienteBusqueda?storeName=${encodeURIComponent(storeName)}&clientCode=${encodeURIComponent(clientCode)}&returnTo=/visitLog`);
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
                            rawSearchTerm={rawSearchTerm}
                            isSearchingByCode={isSearchingByCode}
                            dataByCode={dataByCode}
                            dataByName={dataByName}
                            dataNewClients={dataNewClients}
                            selectedClient={selectedClient}
                            hasActiveCheckIn={hasActiveCheckIn}
                            onSelectClient={handleSelectClient}
                            onSelectTempClient={handleSelectTempClient}
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
                                imageInfo={imageInfo}
                                isProcessingImage={isProcessingImage}
                                onImageChange={handleImageChange}
                                onDirectImage={setDirectImage}
                                existingImageData={clientImageData}
                                isLoadingExistingImage={isLoadingClientImage}
                                fileInputKey={fileInputKey}
                                onResetImage={resetImage}
                                onBeforeCamera={handleBeforeCamera}
                                onCameraCancel={handleCameraCancel}
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
                    onSelectExisting={(match) => {
                        if (match.type === "SAP") {
                            handleSelectClient(match.client);
                        } else {
                            handleSelectTempClient(match.client);
                        }
                        onClose();
                    }}
                />
            </Box>
        </Box>
    );
}