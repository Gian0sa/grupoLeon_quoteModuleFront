import React from "react";
import {
  Box,
  Heading,
  Spinner,
  Text,
  Center,
  useColorModeValue,
  Badge,
  Progress,
  Image,
  Stack,
  Flex,
} from "@chakra-ui/react";
import { useRules } from "../../hooks/queries/configQueries";

const ConfigRulesList = () => {
  const { data: rules, isLoading, isError } = useRules();

  const bg = useColorModeValue("white", "gray.800");
  const border = useColorModeValue("gray.200", "gray.700");

  if (isLoading) {
    return (
      <Center h="60vh">
        <Spinner size="xl" />
      </Center>
    );
  }

  if (isError || !rules) {
    return (
      <Center h="60vh">
        <Text color="red.500">Error al cargar las reglas.</Text>
      </Center>
    );
  }

  return (
    <Box p={4} bg={bg} border="1px" borderColor={border} borderRadius="lg" shadow="md">
      <Heading mb={4} size="md" fontSize="lg">
        Reglas de Estado
      </Heading>

      <Stack spacing={4}>
        {rules.map((rule) => (
          <Box
            key={rule.id}
            border="1px"
            borderColor={border}
            borderRadius="md"
            p={4}
            shadow="sm"
            bg={useColorModeValue("gray.50", "gray.700")}
          >
            <Flex align="center" mb={2}>
              <Image
                src={`/icons/${rule.icon}`}
                alt={rule.name}
                boxSize="28px"
                borderRadius="sm"
                mr={3}
              />
              <Text fontWeight="bold" fontSize="md">
                {rule.name}
              </Text>
              <Badge
                ml="auto"
                colorScheme={rule.active ? "green" : "red"}
                fontSize="0.7em"
              >
                {rule.active ? "Activa" : "Inactiva"}
              </Badge>
            </Flex>

            <Text fontSize="xs" color="gray.500">
              ID: {rule.id}
            </Text>

            <Text mt={1} fontSize="sm">
              <strong>Condición:</strong> {rule.condition}
            </Text>

            <Text mt={1} fontSize="sm">
              <strong>Status:</strong> {rule.status}
            </Text>

            <Flex mt={2} align="center" gap={2}>
              <Text fontSize="sm">Progreso:</Text>
              <Progress
                value={rule.progress}
                size="xs"
                colorScheme="teal"
                borderRadius="md"
                flex="1"
              />
              <Text fontSize="xs" minW="30px">
                {rule.progress}%
              </Text>
            </Flex>

            <Box mt={2}>
              <Text fontSize="sm">
                <strong>Color:</strong>{" "}
                <Badge bg={rule.color} color="white">
                  {rule.color}
                </Badge>
              </Text>
            </Box>
          </Box>
        ))}
      </Stack>
    </Box>
  );
};

export default ConfigRulesList;
