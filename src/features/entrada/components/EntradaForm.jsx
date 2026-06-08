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
import { MdLogin, MdLocationOn } from 'react-icons/md';
import { FiClock, FiCamera } from 'react-icons/fi';
import { useEntrada } from '../hooks/useEntrada';
import { useAuthStore } from '../../auth/stores/useAuthStore';

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
    return () => clearInterval(timer);
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
      p={8} 
      borderRadius="xl" 
      boxShadow="xl" 
      maxW="md" 
      w="full"
      textAlign="center"
    >
      <VStack spacing={6}>
        <Box>
          <Heading size="lg" mb={2}>Control de Asistencia</Heading>
          <Text color={textColor}>
            Bienvenido, {username || 'Vendedor'}
          </Text>
        </Box>

        <Divider />

        <Box>
          <HStack justify="center" align="center" color="blue.500" mb={2}>
            <Icon as={FiClock} boxSize={8} />
            <Heading size="2xl" fontWeight="bold">
              {formatTime(currentTime)}
            </Heading>
          </HStack>
          <Text color={textColor} textTransform="capitalize">
            {formatDate(currentTime)}
          </Text>
        </Box>

                {
                !hasMarkedToday ? (
                    <>
                        <Box w="full"
                            bg={
                                useColorModeValue('gray.50', 'gray.700')
                            }
                            p={3}
                            borderRadius="md">
                            <HStack justify="center"
                                spacing={2}
                                color={
                                    location ? "green.500" : "orange.500"
                            }>
                                <Icon as={MdLocationOn}/> {
                                isLoading && !location ? (
                                    <Spinner size="sm"/>
                                ) : (
                                    <Text fontSize="sm" fontWeight="medium">
                                        {
                                        location ? "Ubicación detectada" : "Obteniendo ubicación..."
                                    } </Text>
                                )
                            } </HStack>
                        </Box>

                        {/* Video stream feed */}
                        {isCameraActive && (
                            <Box w="full" borderRadius="md" overflow="hidden" border="2px solid" borderColor="blue.300" bg="black">
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
                            <Box mb={1}
                                w="full"
                                borderRadius="md"
                                overflow="hidden"
                                border="2px solid"
                                borderColor="green.200">
                                <img src={imagePreview}
                                    alt="Selfie Preview"
                                    style={
                                        {
                                            width: "100%",
                                            height: "200px",
                                            objectFit: "cover"
                                        }
                                    }/>
                            </Box>
                        )}

                        {/* Botón para interactuar con la Cámara */}
                        <Box w="full">
                            {isCameraActive ? (
                                <HStack spacing={4}>
                                    <Button colorScheme="blue" flex={1} onClick={capturePhoto} leftIcon={<FiCamera/>} size="lg">
                                        Capturar Foto
                                    </Button>
                                    <Button variant="outline" colorScheme="gray" onClick={() => stopCamera()} flex={1} size="lg">
                                        Cancelar
                                    </Button>
                                </HStack>
                            ) : (
                                <Button onClick={startCamera} variant="outline" colorScheme="blue" width="100%" cursor="pointer"
                                    leftIcon={<FiCamera/>}
                                    size="lg"
                                    isLoading={isProcessingImage}
                                    loadingText="Procesando foto...">
                                    {image ? "Tomar nueva selfie" : "Tomar Selfie"}
                                </Button>
                            )}
                        </Box>

                        <Button w="full" colorScheme="green" size="lg"
                            leftIcon={<MdLogin/>}
                            onClick={handleMarcarIngreso}
                            isLoading={isLoading}
                            loadingText="Registrando..."
                            isDisabled={
                                !location || !image || isCameraActive
                        }>
                            Marcar Ingreso
                        </Button>
                    </>
                ) : (
                    <Alert status="success" variant="subtle" flexDirection="column" alignItems="center" justifyContent="center" textAlign="center" height="180px" borderRadius="md">
                        <AlertIcon boxSize="40px"
                            mr={0}/>
                        <AlertTitle mt={4}
                            mb={1}
                            fontSize="lg">
                            ¡Ingreso Registrado!
                        </AlertTitle>
                        <AlertDescription maxWidth="sm">
                            Ya has marcado tu asistencia por el día de hoy con tu selfie. ¡Que tengas un excelente día de trabajo!
                        </AlertDescription>
                    </Alert>
                )
            } </VStack>
        </Box>
    );
};
