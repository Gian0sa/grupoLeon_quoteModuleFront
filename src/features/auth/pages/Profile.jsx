import { useState, useEffect } from "react";
import {
  Box,
  Heading,
  FormControl,
  FormLabel,
  Input,
  Button,
  VStack,
  Flex,
  useColorModeValue,
  useToast,
  FormErrorMessage,
  Center,
  Spinner,
} from "@chakra-ui/react";
import { useGetProfileData } from "../hooks/queries/authQueries";
import { useAuthMutations } from "../hooks/mutations/authMutations";
import { BackButton } from "../../../components/BackButton";

export function Profile() {
  const { data, isLoading } = useGetProfileData();
  const { updatePasswordProfile } = useAuthMutations();
  const toast = useToast();

  const boxBg = useColorModeValue("white", "gray.800");
  const pageBg = useColorModeValue("gray.50", "gray.900");

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
        <Spinner size="xl" />
      </Center>
    );
  }

  return (
    <Flex direction="column" h="100vh" w="full" bg={pageBg}>
      <Flex
        bg="green.800"
        color="white"
        align="center"
        p={4}
        borderBottomRadius="2xl"
        justify="center"
        position="relative"
        boxShadow="sm"
      >
        <Box position="absolute" left="4">
          <BackButton color="white" />
        </Box>
        <Heading size="md">Mi Perfil</Heading>
      </Flex>

      <Flex as="form" onSubmit={handleSubmit} direction="column" justify="center" align="center" w="full" flex="1" px={4} py={6}>
        <Box bg={boxBg} p={8} borderRadius="xl" boxShadow="lg" w="full" maxW="md">
          <VStack spacing={6} align="stretch">
            {/* Campos de perfil deshabilitados */}
            <FormControl>
              <FormLabel fontWeight="semibold">Usuario</FormLabel>
              <Input value={data?.username || ""} isDisabled />
            </FormControl>

            <FormControl>
              <FormLabel fontWeight="semibold">Email</FormLabel>
              <Input value={data?.email || ""} isDisabled />
            </FormControl>

            <FormControl>
              <FormLabel fontWeight="semibold">Código de Vendedor</FormLabel>
              <Input value={data?.salesEmployeeCode || ""} isDisabled />
            </FormControl>

            {/* Campos para actualizar contraseña */}
            <FormControl isInvalid={errors.currentPassword}>
              <FormLabel fontWeight="semibold">Contraseña actual</FormLabel>
              <Input
                name="currentPassword"
                type="password"
                value={formData.currentPassword}
                onChange={handleChange}
                focusBorderColor="green.500"
              />
              <FormErrorMessage>{errors.currentPassword}</FormErrorMessage>
            </FormControl>

            <FormControl isInvalid={errors.newPassword}>
              <FormLabel fontWeight="semibold">Nueva contraseña</FormLabel>
              <Input
                name="newPassword"
                type="password"
                value={formData.newPassword}
                onChange={handleChange}
                focusBorderColor="green.500"
              />
              <FormErrorMessage>{errors.newPassword}</FormErrorMessage>
            </FormControl>

            <Button
            type="submit"
            colorScheme="green"
            width="full"
            size="lg"
            borderRadius="lg"
            isLoading={updatePasswordProfile.isLoading} 
            loadingText="Guardando..."
            >
            Guardar contraseña
            </Button>

          </VStack>
        </Box>
      </Flex>
    </Flex>
  );
}
