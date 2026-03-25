import { Box, Flex, Icon, Text, Input } from "@chakra-ui/react";
import { FiUser } from "react-icons/fi";

export function VendorCard({ username }) {
    return (
        <Box bg="white" p={4} borderRadius="lg" boxShadow="sm">
            <Flex align="center" mb={2}>
                <Icon as={FiUser} color="green.600" mr={2} />
                <Text fontSize="sm" fontWeight="500" color="gray.600">
                    Vendedor
                </Text>
            </Flex>
            <Input
                value={username || ""}
                isReadOnly
                bg="gray.50"
                border="none"
                fontSize="md"
                fontWeight="500"
                _focus={{ bg: "gray.50" }}
            />
        </Box>
    );
}