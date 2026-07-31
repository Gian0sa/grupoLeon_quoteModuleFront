import { useState } from "react";
import {
  Box,
  Heading,
  FormControl,
  FormLabel,
  Input,
  Button,
  VStack,
  HStack,
  Flex,
  Text,
  Badge,
  Image,
  Icon,
  Divider,
  useColorModeValue,
  useToast,
  FormErrorMessage,
  Center,
  Spinner,
} from "@chakra-ui/react";
import {
  MdEmail,
  MdBadge,
  MdShield,
  MdCheckCircle,
  MdVpnKey
} from "react-icons/md";
import { useGetProfileData } from "../hooks/queries/authQueries";
import { useAuthMutations } from "../hooks/mutations/authMutations";
import { TopHeaderBanner } from "../../../components/TopHeaderBanner";

export function Profile() {
  const { data, isLoading } = useGetProfileData();
  const { updatePasswordProfile } = useAuthMutations();
  const toast = useToast();

  const cardBg = useColorModeValue("white", "gray.800");
  const pageBg = useColorModeValue("gray.50", "gray.900");
  const borderColor = useColorModeValue("gray.100", "gray.700");

  const [formData, setFormData] = useState({
    currentPassword: "",
    newPassword: "",
  });
  const [errors, setErrors] = useState({});

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const validate = () => {
    const newErrors = {};
    if (!formData.currentPassword) newErrors.currentPassword = "Contraseña actual requerida";
    if (!formData.newPassword) newErrors.newPassword = "Nueva contraseña requerida";
    return newErrors;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const validationErrors = validate();
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }
    setErrors({});
    
    updatePasswordProfile.mutate(formData);
  };

  if (isLoading) {
    return (
      <Center height="100vh" bg={pageBg}>
        <Spinner size="xl" color="green.600" />
      </Center>
    );
  }

  return (
    <Box w="full" minH="100vh" bg={pageBg} pb="120px">
      <TopHeaderBanner
        title="Mi Perfil"
        subtitle="Gestión de usuario y cambio de contraseña"
        showBack={true}
        mb={{ base: 4, md: 8 }}
      />

      <Box maxW="1100px" mx="auto" px={{ base: 4, md: 6 }}>
        <Flex
          direction={{ base: "column", lg: "row" }}
          gap={{ base: 6, lg: 8 }}
          align="start"
        >
          {/* COLUMNA 1: Tarjeta de Resumen e Identidad del Perfil */}
          <Box
            w={{ base: "full", lg: "360px" }}
            bg={cardBg}
            borderRadius="2xl"
            boxShadow="0 10px 30px rgba(0,0,0,0.05)"
            border="1px solid"
            borderColor={borderColor}
            overflow="hidden"
          >
            {/* Cabecera visual con Avatar */}
            <Box
              bg="linear-gradient(135deg, #14532d 0%, #166534 50%, #15803d 100%)"
              p={6}
              position="relative"
              textAlign="center"
            >
              <Flex justify="center" mb={3}>
                <Box
                  p="3px"
                  borderRadius="full"
                  bg="linear-gradient(135deg, rgba(255,255,255,0.6), rgba(255,255,255,0.2))"
                  boxShadow="0 8px 20px rgba(0,0,0,0.25)"
                >
                  <Image
                    src="/assets/icons/avatar.jpg"
                    boxSize="84px"
                    borderRadius="full"
                    objectFit="cover"
                    alt="Avatar de Usuario"
                  />
                </Box>
              </Flex>
              <Text fontSize="xl" fontWeight="800" color="white" mb={1}>
                {data?.username || "Usuario"}
              </Text>
              <Badge
                bg="whiteAlpha.200"
                color="white"
                px={3}
                py={1}
                borderRadius="full"
                fontSize="xs"
                fontWeight="600"
                backdropFilter="blur(4px)"
                border="1px solid rgba(255,255,255,0.2)"
              >
                Asesor de ventas
              </Badge>
            </Box>

            {/* Detalles Informativos */}
            <VStack spacing={4} align="stretch" p={6}>
              <HStack spacing={3}>
                <Flex
                  w="36px"
                  h="36px"
                  borderRadius="xl"
                  bg="green.50"
                  align="center"
                  justify="center"
                  flexShrink={0}
                >
                  <Icon as={MdEmail} color="green.600" boxSize={5} />
                </Flex>
                <Box overflow="hidden">
                  <Text fontSize="xs" fontWeight="700" color="gray.400" textTransform="uppercase" letterSpacing="wider">
                    Correo Electrónico
                  </Text>
                  <Text fontSize="sm" fontWeight="600" color="gray.800" isTruncated>
                    {data?.email || "No registrado"}
                  </Text>
                </Box>
              </HStack>

              <Divider borderColor="gray.100" />

              <HStack spacing={3}>
                <Flex
                  w="36px"
                  h="36px"
                  borderRadius="xl"
                  bg="green.50"
                  align="center"
                  justify="center"
                  flexShrink={0}
                >
                  <Icon as={MdBadge} color="green.600" boxSize={5} />
                </Flex>
                <Box>
                  <Text fontSize="xs" fontWeight="700" color="gray.400" textTransform="uppercase" letterSpacing="wider">
                    Código de Vendedor
                  </Text>
                  <Text fontSize="sm" fontWeight="600" color="gray.800">
                    {data?.salesEmployeeCode || "N/A"}
                  </Text>
                </Box>
              </HStack>

              <Divider borderColor="gray.100" />

              <HStack spacing={3}>
                <Flex
                  w="36px"
                  h="36px"
                  borderRadius="xl"
                  bg="green.50"
                  align="center"
                  justify="center"
                  flexShrink={0}
                >
                  <Icon as={MdCheckCircle} color="green.600" boxSize={5} />
                </Flex>
                <Box>
                  <Text fontSize="xs" fontWeight="700" color="gray.400" textTransform="uppercase" letterSpacing="wider">
                    Estado del Sistema
                  </Text>
                  <HStack spacing={1.5} mt={0.5}>
                    <Box w="8px" h="8px" borderRadius="full" bg="green.500" />
                    <Text fontSize="sm" fontWeight="700" color="green.700">
                      Cuenta Activa
                    </Text>
                  </HStack>
                </Box>
              </HStack>
            </VStack>
          </Box>

          {/* COLUMNA 2: Formulario de Cambio de Contraseña */}
          <Box
            flex="1"
            w="full"
            bg={cardBg}
            borderRadius="2xl"
            boxShadow="0 10px 30px rgba(0,0,0,0.05)"
            border="1px solid"
            borderColor={borderColor}
            p={{ base: 6, md: 8 }}
            as="form"
            onSubmit={handleSubmit}
          >
            <VStack spacing={6} align="stretch">
              <Box pb={2} borderBottom="1px solid" borderColor="gray.100">
                <HStack spacing={3} mb={1}>
                  <Flex
                    w="40px"
                    h="40px"
                    borderRadius="xl"
                    bg="linear-gradient(135deg, #14532d 0%, #166534 50%, #15803d 100%)"
                    align="center"
                    justify="center"
                    color="white"
                    boxShadow="0 4px 12px rgba(22,101,52,0.25)"
                  >
                    <Icon as={MdShield} boxSize={5} />
                  </Flex>
                  <Box>
                    <Heading size="md" color="gray.800" fontWeight="800">
                      Seguridad de la Cuenta
                    </Heading>
                    <Text fontSize="xs" color="gray.500" fontWeight="500">
                      Actualiza tu contraseña periódicamente para mantener tu cuenta segura
                    </Text>
                  </Box>
                </HStack>
              </Box>

              {/* Form Fields */}
              <FormControl isInvalid={errors.currentPassword}>
                <FormLabel fontWeight="700" fontSize="sm" color="gray.700">
                  Contraseña actual
                </FormLabel>
                <Input
                  name="currentPassword"
                  type="password"
                  value={formData.currentPassword}
                  onChange={handleChange}
                  placeholder="Ingresa tu contraseña actual"
                  h="48px"
                  borderRadius="xl"
                  bg="gray.50"
                  border="1px solid"
                  borderColor="gray.200"
                  _focus={{
                    bg: "white",
                    borderColor: "green.500",
                    boxShadow: "0 0 0 1px #166534",
                  }}
                />
                <FormErrorMessage>{errors.currentPassword}</FormErrorMessage>
              </FormControl>

              <FormControl isInvalid={errors.newPassword}>
                <FormLabel fontWeight="700" fontSize="sm" color="gray.700">
                  Nueva contraseña
                </FormLabel>
                <Input
                  name="newPassword"
                  type="password"
                  value={formData.newPassword}
                  onChange={handleChange}
                  placeholder="Ingresa tu nueva contraseña"
                  h="48px"
                  borderRadius="xl"
                  bg="gray.50"
                  border="1px solid"
                  borderColor="gray.200"
                  _focus={{
                    bg: "white",
                    borderColor: "green.500",
                    boxShadow: "0 0 0 1px #166534",
                  }}
                />
                <FormErrorMessage>{errors.newPassword}</FormErrorMessage>
              </FormControl>

              <Box pt={2}>
                <Button
                  type="submit"
                  bg="linear-gradient(135deg, #14532d 0%, #166534 50%, #15803d 100%)"
                  color="white"
                  width="full"
                  h="50px"
                  borderRadius="xl"
                  fontSize="sm"
                  fontWeight="700"
                  boxShadow="0 6px 18px rgba(22, 101, 52, 0.3)"
                  _hover={{
                    bg: "#0d4226",
                    transform: "translateY(-1px)",
                    boxShadow: "0 8px 22px rgba(22, 101, 52, 0.4)",
                  }}
                  _active={{
                    transform: "translateY(0)",
                  }}
                  transition="all 0.2s ease"
                  isLoading={updatePasswordProfile.isLoading}
                  loadingText="Actualizando contraseña..."
                  leftIcon={<Icon as={MdVpnKey} boxSize={5} />}
                >
                  Actualizar Contraseña
                </Button>
              </Box>
            </VStack>
          </Box>
        </Flex>
      </Box>
    </Box>
  );
}
