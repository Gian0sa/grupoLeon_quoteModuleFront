import { useMemo } from "react";
import { FormControl, FormLabel, Badge, VStack, Center, Text } from "@chakra-ui/react";
import UserSearch from "./UserSearch";
import UserListItem from "./UserListItem";

export default function UserList({ users, selectedUserId, onSelectUser, searchTerm, onSearchChange }) {
  const filteredUsers = useMemo(() => {
    if (!users) return [];
    return users
      .filter(u =>
        `${u.username} ${u.email} ${u.salesEmployeeCode || ''}`
          .toLowerCase()
          .includes(searchTerm.toLowerCase())
      )
      .sort((a, b) => a.username.localeCompare(b.username));
  }, [users, searchTerm]);

  return (
    <FormControl>
      <FormLabel fontWeight="semibold" fontSize="lg">
        Selecciona un usuario
        <Badge ml={2} colorScheme="gray">
          {filteredUsers.length} usuarios
        </Badge>
      </FormLabel>

      <VStack spacing={3} align="stretch">
        <UserSearch value={searchTerm} onChange={onSearchChange} />

        <VStack
          maxH="350px"
          overflowY="auto"
          border="1px solid"
          borderColor="gray.200"
          borderRadius="lg"
          p={3}
          spacing={2}
          bg="gray.50"
        >
          {filteredUsers.length === 0 ? (
            <Center py={8}>
              <VStack spacing={2}>
                <Text fontSize="2xl">🔍</Text>
                <Text fontSize="sm" color="gray.500">
                  No se encontraron usuarios
                </Text>
              </VStack>
            </Center>
          ) : (
            filteredUsers.map((user) => (
              <UserListItem
                key={user.id}
                user={user}
                isSelected={selectedUserId === user.id}
                onClick={() => onSelectUser(user.id)}
              />
            ))
          )}
        </VStack>
      </VStack>
    </FormControl>
  );
}