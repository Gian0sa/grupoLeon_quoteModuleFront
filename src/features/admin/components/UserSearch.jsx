import { Input, InputGroup, InputLeftElement } from "@chakra-ui/react";
import { SearchIcon } from "@chakra-ui/icons";

export default function UserSearch({ value, onChange, placeholder = "Buscar por nombre o correo..." }) {
  return (
    <InputGroup>
      <InputLeftElement pointerEvents="none">
        <SearchIcon color="gray.400" />
      </InputLeftElement>
      <Input
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        focusBorderColor="green.500"
        bg="white"
      />
    </InputGroup>
  );
}