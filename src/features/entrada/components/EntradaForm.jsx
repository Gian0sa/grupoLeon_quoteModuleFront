import {useEffect, useState, useRef} from 'react';
import {useNavigate} from 'react-router-dom';
import {BackButton} from '../../../components/BackButton';
import {
    Box,
    Button,
    VStack,
    Heading,
    Text,
    Icon,
    HStack,
    Divider,
    useColorModeValue,
    Spinner,
    Alert,
    AlertIcon,
    AlertTitle,
    AlertDescription,
    Input,
    Flex,
    useToast
} from '@chakra-ui/react';
import {MdLogin, MdLocationOn} from 'react-icons/md';
import {FiClock, FiCamera} from 'react-icons/fi';
import {useEntrada} from '../hooks/useEntrada';
import {useAuthStore} from '../../auth/stores/useAuthStore';

export const EntradaForm = () => {
    const {
        handleMarcarIngreso,
        hasMarkedToday,
        isLoading,
        location,
        getLocation,
        image,
        imagePreview,
        setImage,
        setImagePreview,
        isProcessingImage
    } = useEntrada();

    const username = useAuthStore((state) => state.username);
    const [currentTime, setCurrentTime] = useState(new Date());
    const navigate = useNavigate();
    const toast = useToast();

    const bgCard = useColorModeValue('white', 'gray.800');
    const textColor = useColorModeValue('gray.600', 'gray.300');

    // Camera states
    const [isCameraActive, setIsCameraActive] = useState(false);
    const [stream, setStream] = useState(null);
    const videoRef = useRef(null);

    const startCamera = async () => {
        try {
            setImage(null);
            setImagePreview(null);
            setIsCameraActive(true);
            
            const mediaStream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: "user" }
            });
            setStream(mediaStream);
            
            setTimeout(() => {
                if (videoRef.current) {
                    videoRef.current.srcObject = mediaStream;
                }
            }, 100);
        } catch (err) {
            console.error("Error al iniciar cámara:", err);
            setIsCameraActive(false);
            toast({
                title: "Error de cámara",
                description: "No se pudo acceder a la cámara. Asegúrese de otorgar permisos.",
                status: "error",
                duration: 4000,
                isClosable: true,
                position: "top"
            });
        }
    };

    const stopCamera = (mediaStream = stream) => {
        if (mediaStream) {
            mediaStream.getTracks().forEach(track => track.stop());
        }
        setStream(null);
        setIsCameraActive(false);
    };

    const capturePhoto = () => {
        if (videoRef.current) {
            const video = videoRef.current;
            const canvas = document.createElement("canvas");
            canvas.width = video.videoWidth || 640;
            canvas.height = video.videoHeight || 480;
            const ctx = canvas.getContext("2d");
            
            // Mirror selfie capture
            ctx.translate(canvas.width, 0);
            ctx.scale(-1, 1);
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
            ctx.setTransform(1, 0, 0, 1, 0, 0);

            canvas.toBlob((blob) => {
                if (blob) {
                    const file = new File([blob], "selfie.jpg", { type: "image/jpeg" });
                    setImage(file);
                    
                    const reader = new FileReader();
                    reader.onloadend = () => {
                        setImagePreview(reader.result);
                    };
                    reader.readAsDataURL(file);
                }
            }, "image/jpeg", 0.85);

            stopCamera();
        }
    };

    // Clean up camera on unmount
    useEffect(() => {
        return () => {
            if (stream) {
                stream.getTracks().forEach(track => track.stop());
            }
        };
    }, [stream]);

    useEffect(() => {
        const timer = setInterval(() => {
            setCurrentTime(new Date());
        }, 1000);
        return() => clearInterval(timer);
    }, []);

    useEffect(() => {
        getLocation().catch(() => {});
    }, [getLocation]);

    const formatTime = (date) => {
        return date.toLocaleTimeString('es-ES', {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
        });
    };

    const formatDate = (date) => {
        return date.toLocaleDateString('es-ES', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    };

    return (
        <Box
            bg={bgCard}
            p={{ base: 6, md: 8 }}
            borderRadius="2xl"
            boxShadow="0 10px 35px rgba(0, 0, 0, 0.07)"
            border="1px solid"
            borderColor="gray.100"
            maxW="460px"
            w="full"
            textAlign="center"
        >
            <VStack spacing={5}>
                {/* User Greeting Header */}
                <Box py={1}>
                    <Text fontSize="xs" fontWeight="600" color="gray.400" textTransform="uppercase" letterSpacing="wider">
                        Vendedor Registrado
                    </Text>
                    <Heading size="md" color="gray.800" fontWeight="bold" mt={1}>
                        Bienvenido, {username || 'Vendedor'}
                    </Heading>
                </Box>

                <Divider borderColor="gray.100" />

                {/* Clock Display */}
                <Box py={2}>
                    <HStack justify="center" align="center" color="green.600" mb={1} spacing={2}>
                        <Icon as={FiClock} boxSize={7} color="green.600" />
                        <Heading size="2xl" fontWeight="800" color="green.800" letterSpacing="tight" sx={{ fontVariantNumeric: "tabular-nums" }}>
                            {formatTime(currentTime)}
                        </Heading>
                    </HStack>
                    <Text color="gray.500" fontSize="sm" fontWeight="500" textTransform="capitalize">
                        {formatDate(currentTime)}
                    </Text>
                </Box>

                {!hasMarkedToday ? (
                    <>
                        {/* GPS Location Status Box */}
                        <Box
                            w="full"
                            bg={location ? "green.50" : "orange.50"}
                            py={2.5}
                            px={4}
                            borderRadius="xl"
                            border="1px solid"
                            borderColor={location ? "green.200" : "orange.200"}
                        >
                            <HStack justify="center" spacing={2} color={location ? "green.700" : "orange.700"}>
                                <Icon as={MdLocationOn} boxSize={4} />
                                {isLoading && !location ? (
                                    <Spinner size="xs" color="orange.600" />
                                ) : (
                                    <Text fontSize="xs" fontWeight="700">
                                        {location ? "Ubicación GPS Detectada" : "Obteniendo ubicación..."}
                                    </Text>
                                )}
                            </HStack>
                        </Box>

                        {/* Video stream feed */}
                        {isCameraActive && (
                            <Box w="full" borderRadius="xl" overflow="hidden" border="2px solid" borderColor="green.500" bg="black" boxShadow="lg">
                                <video
                                    ref={videoRef}
                                    autoPlay
                                    playsInline
                                    style={{
                                        width: "100%",
                                        height: "240px",
                                        objectFit: "cover",
                                        transform: "scaleX(-1)"
                                    }}
                                />
                            </Box>
                        )}

                        {/* Preview de la Selfie */}
                        {imagePreview && !isCameraActive && (
                            <Box
                                mb={1}
                                w="full"
                                borderRadius="xl"
                                overflow="hidden"
                                border="2px solid"
                                borderColor="green.400"
                                boxShadow="0 4px 14px rgba(34, 197, 94, 0.15)"
                            >
                                <img
                                    src={imagePreview}
                                    alt="Selfie Preview"
                                    style={{
                                        width: "100%",
                                        height: "200px",
                                        objectFit: "cover"
                                    }}
                                />
                            </Box>
                        )}

                        {/* Botón para interactuar con la Cámara (Slate style) */}
                        <Box w="full">
                            {isCameraActive ? (
                                <HStack spacing={3}>
                                    <Button
                                        bg="linear-gradient(135deg, #14532d 0%, #166534 50%, #15803d 100%)"
                                        color="white"
                                        flex={1}
                                        onClick={capturePhoto}
                                        leftIcon={<FiCamera />}
                                        h="48px"
                                        borderRadius="xl"
                                        fontSize="sm"
                                        fontWeight="bold"
                                        _hover={{ bg: "#0d4226" }}
                                    >
                                        Capturar Foto
                                    </Button>
                                    <Button
                                        variant="outline"
                                        colorScheme="gray"
                                        onClick={() => stopCamera()}
                                        flex={1}
                                        h="48px"
                                        borderRadius="xl"
                                        fontSize="sm"
                                        fontWeight="bold"
                                    >
                                        Cancelar
                                    </Button>
                                </HStack>
                            ) : (
                                <Button
                                    onClick={startCamera}
                                    bg="gray.50"
                                    color="gray.700"
                                    border="1.5px dashed"
                                    borderColor="gray.300"
                                    width="100%"
                                    h="52px"
                                    borderRadius="xl"
                                    fontSize="sm"
                                    fontWeight="700"
                                    cursor="pointer"
                                    leftIcon={
                                        <Flex
                                            w="30px"
                                            h="30px"
                                            borderRadius="lg"
                                            bg="white"
                                            align="center"
                                            justify="center"
                                            border="1px solid"
                                            borderColor="gray.200"
                                            boxShadow="0 2px 5px rgba(0,0,0,0.05)"
                                        >
                                            <Icon as={FiCamera} color="gray.600" boxSize={4} />
                                        </Flex>
                                    }
                                    _hover={{
                                        bg: "gray.100",
                                        borderColor: "green.500",
                                        color: "green.800",
                                        transform: "translateY(-1px)",
                                    }}
                                    transition="all 0.2s"
                                    isLoading={isProcessingImage}
                                    loadingText="Procesando foto..."
                                >
                                    {image ? "Tomar nueva selfie" : "Tomar Selfie de Verificación"}
                                </Button>
                            )}
                        </Box>

                        {/* Botón Principal: Marcar Ingreso */}
                        <Button
                            w="full"
                            bg="linear-gradient(135deg, #14532d 0%, #166534 50%, #15803d 100%)"
                            color="white"
                            size="lg"
                            h="56px"
                            borderRadius="2xl"
                            fontSize="md"
                            fontWeight="800"
                            letterSpacing="wide"
                            boxShadow="0 8px 25px rgba(22, 101, 52, 0.35)"
                            leftIcon={<MdLogin size={22} />}
                            onClick={handleMarcarIngreso}
                            isLoading={isLoading}
                            loadingText="Registrando..."
                            isDisabled={!location || !image || isCameraActive}
                            _hover={{
                                bg: "#0d4226",
                                transform: "translateY(-2px)",
                                boxShadow: "0 12px 30px rgba(22, 101, 52, 0.45)",
                            }}
                            _active={{ transform: "translateY(0)" }}
                            _disabled={{
                                opacity: 1,
                                cursor: "pointer",
                                bg: "linear-gradient(135deg, #14532d 0%, #166534 50%, #15803d 100%)",
                                color: "white",
                                boxShadow: "0 8px 25px rgba(22, 101, 52, 0.35)",
                                _hover: { bg: "#0d4226" }
                            }}
                            transition="all 0.2s"
                        >
                            Marcar Ingreso
                        </Button>
                    </>
                ) : (
                    <Alert
                        status="success"
                        variant="subtle"
                        flexDirection="column"
                        alignItems="center"
                        justifyContent="center"
                        textAlign="center"
                        py={6}
                        px={4}
                        borderRadius="2xl"
                        bg="green.50"
                        border="1px solid"
                        borderColor="green.200"
                    >
                        <AlertIcon boxSize="36px" color="green.600" mr={0} />
                        <AlertTitle mt={3} mb={1} fontSize="md" fontWeight="bold" color="green.900">
                            ¡Ingreso Registrado Exitosamente!
                        </AlertTitle>
                        <AlertDescription maxWidth="sm" fontSize="xs" color="green.800">
                            Ya has marcado tu asistencia el día de hoy. ¡Que tengas una excelente jornada laboral!
                        </AlertDescription>
                    </Alert>
                )}
            </VStack>
        </Box>
    );
};
