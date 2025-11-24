
import { useColorModeValue } from "@chakra-ui/react";
import { Box, HStack, VStack, Text, Badge, Icon } from "@chakra-ui/react";
import { CheckCircleIcon } from "@chakra-ui/icons";

export default function UserListItem({ user, isSelected, onClick }) {
  const hoverBg = useColorModeValue("green.50", "green.900");
  const selectedBg = useColorModeValue("green.100", "green.800");
  const borderColor = useColorModeValue("gray.200", "gray.600");
  
  return (
    <Box
      w="full"
      p={4}
      borderRadius="md"
      cursor="pointer"
      bg={isSelected ? selectedBg : "white"}
      border="2px solid"
      borderColor={isSelected ? "green.400" : borderColor}
      _hover={{ 
        bg: isSelected ? selectedBg : hoverBg,
        transform: "translateY(-2px)",
        boxShadow: "md"
      }}
      onClick={onClick}
      transition="all 0.2s"
      position="relative"
    >
      <HStack justify="space-between" spacing={4}>
        <VStack align="start" spacing={1} flex={1}>
          <HStack>
            <Text fontWeight="bold" fontSize="md">{user.username}</Text>
            {isSelected && (
              <Icon as={CheckCircleIcon} color="green.500" />
            )}
          </HStack>
          <Text fontSize="sm" color="gray.600" noOfLines={1}>
            {user.email}
          </Text>
          {user.salesEmployeeCode && (
            <Badge colorScheme="blue" fontSize="xs">
              Código: {user.salesEmployeeCode}
            </Badge>
          )}
        </VStack>

        <Badge 
          colorScheme={user.active ? "green" : "red"}
          fontSize="sm"
          px={2}
          py={1}
        >
          {user.active ? "Activo" : "Inactivo"}
        </Badge>
      </HStack>
    </Box>
  );
}