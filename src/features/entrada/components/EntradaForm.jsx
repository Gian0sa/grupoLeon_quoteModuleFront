import {useEffect, useState} from 'react';
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
    Flex
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
        isProcessingImage,
        handleImageChange
    } = useEntrada();

    const username = useAuthStore((state) => state.username);
    const [currentTime, setCurrentTime] = useState(new Date());
    const navigate = useNavigate();

    const bgCard = useColorModeValue('white', 'gray.800');
    const textColor = useColorModeValue('gray.600', 'gray.300');

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
        <Box bg={bgCard}
            p={8}
            borderRadius="xl"
            boxShadow="xl"
            maxW="md"
            w="full"
            textAlign="center">
            <VStack spacing={6}>
                <Box w="full" display="flex" justifyContent="flex-start">
                    <Flex bg="green.700" color="white" align="center" justify="center" w="100%"
                        minH={
                            {
                                base: "44px",
                                md: "56px"
                            }
                        }
                        px={
                            {
                                base: 2,
                                md: 4
                            }
                        }
                        borderRadius={
                            {
                                base: "md",
                                md: "xl"
                            }
                        }
                        position="relative">
                        <Box position="absolute"
                            left={2}>
                            <BackButton color="white"/>
                        </Box>

                        <Heading textAlign="center"
                            fontSize={
                                {
                                    base: "md",
                                    sm: "lg",
                                    md: "xl"
                                }
                            }
                            noOfLines={1}>
                            Control de Asistencia
                        </Heading>
                    </Flex>
                </Box>
                <Box>
                    <Heading size="lg"
                        mb={2}></Heading>
                    <Text color={textColor}>
                        Bienvenido, {
                        username || 'Vendedor'
                    } </Text>
                </Box>

                <Divider/>

                <Box>
                    <HStack justify="center" align="center" color="blue.500"
                        mb={2}>
                        <Icon as={FiClock}
                            boxSize={8}/>
                        <Heading size="2xl" fontWeight="bold">
                            {
                            formatTime(currentTime)
                        } </Heading>
                    </HStack>
                    <Text color={textColor}
                        textTransform="capitalize">
                        {
                        formatDate(currentTime)
                    } </Text>
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

                        {/* Preview de la Selfie */}
                        {
                        imagePreview && (
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
                        )
                    }

                        {/* Botón para Tomar Selfie */}
                        <Box w="full">
                            <Button as="label" htmlFor="selfie-input" variant="outline" colorScheme="blue" width="100%" cursor="pointer"
                                leftIcon={<FiCamera/>}
                                size="lg"
                                isLoading={isProcessingImage}
                                loadingText="Procesando foto...">
                                {
                                image ? "Cambiar Foto/Selfie" : "Tomar Selfie / Subir Foto"
                            } </Button>
                            <Input id="selfie-input" type="file" accept="image/*"
                                onChange={handleImageChange}
                                display="none"/>
                        </Box>

                        <Button w="full" colorScheme="green" size="lg"
                            leftIcon={<MdLogin/>}
                            onClick={handleMarcarIngreso}
                            isLoading={isLoading}
                            loadingText="Registrando..."
                            isDisabled={
                                !location || !image
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
