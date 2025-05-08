import {
  Box,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  Menu,
  MenuButton,
  MenuList,
  MenuItem,
  IconButton,
  Text,
} from "@chakra-ui/react";
import { ChevronDownIcon } from "@chakra-ui/icons";

export function ClientList({ clients }) {
  if (clients.length === 0) {
    return <Text>No clients found.</Text>;
  }

  return (
    <Box overflowX="auto">
      <Table variant="simple">
        <Thead>
          <Tr>
            <Th>Code</Th>
            <Th>Name</Th>
            <Th>Actions</Th>
          </Tr>
        </Thead>
        <Tbody>
          {clients.map((client) => (
            <Tr key={client.code}>
              <Td>{client.code}</Td>
              <Td>{client.name}</Td>
              <Td>
                <Menu>
                  <MenuButton as={IconButton} icon={<ChevronDownIcon />} variant="outline" />
                  <MenuList>
                    <MenuItem onClick={() => console.log("Edit", client)}>Edit</MenuItem>
                    <MenuItem onClick={() => console.log("Select", client)}>Select</MenuItem>
                  </MenuList>
                </Menu>
              </Td>
            </Tr>
          ))}
        </Tbody>
      </Table>
    </Box>
  );
}
