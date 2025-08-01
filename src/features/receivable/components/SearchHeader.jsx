import { 
  Box, 
  Text, 
  Flex, 
  Input, 
  InputGroup, 
  InputLeftElement, 
  Icon 
} from "@chakra-ui/react";
import { FiSearch } from "react-icons/fi";
import { BackButton } from "../../../components/BackButton";
import styles from "./SearchHeader.module.css"

export function SearchHeader({ title, placeholder, onSearch }) {
  return (
    <Box className={styles.heading} color="white" p={4}>
      <Flex align="center" gap={4}>
        <BackButton />
        <Text fontSize="xl" fontWeight="bold">
          {title}
        </Text>
      </Flex>
      
      <InputGroup mt={4} size="md">
        <InputLeftElement pointerEvents="none">
          <Icon as={FiSearch} color="gray.400" />
        </InputLeftElement>
        <Input
          placeholder={placeholder}
          bg="white"
          borderRadius="full"
          _placeholder={{ color: "gray.400" }}
          onChange={(e) => onSearch?.(e.target.value)}
        />
      </InputGroup>
    </Box>
  );
}