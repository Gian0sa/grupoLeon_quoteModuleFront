import { Box, Button, Input, VStack, Text, HStack, Tag, TagLabel, TagCloseButton, Wrap, WrapItem } from "@chakra-ui/react";
import { useState } from "react";

export default function CompatibilityIdsForm({ formData, setFormData }) {
  const [newId, setNewId] = useState("");

  // Asegurar que compatibilityIds existe
  const compatibilityIds = formData.compatibilityIds || [];

  const addCompatibilityId = () => {
    const id = parseInt(newId);
    if (!isNaN(id) && !compatibilityIds.includes(id)) {
      setFormData((prev) => ({
        ...prev,
        compatibilityIds: [...(prev.compatibilityIds || []), id]
      }));
      setNewId("");
    }
  };

  const removeCompatibilityId = (idToRemove) => {
    setFormData((prev) => ({
      ...prev,
      compatibilityIds: (prev.compatibilityIds || []).filter(id => id !== idToRemove)
    }));
  };

  return (
    <Box>
      <Text fontWeight="bold" fontSize="lg" mb={4}>IDs de Compatibilidad</Text>
      <VStack spacing={4} align="stretch">
        <HStack>
          <Input 
            placeholder="Ingrese ID numérico" 
            type="number"
            value={newId}
            onChange={(e) => setNewId(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && addCompatibilityId()}
          />
          <Button onClick={addCompatibilityId} colorScheme="teal">
            Agregar ID
          </Button>
        </HStack>
        
        {compatibilityIds.length > 0 && (
          <Wrap>
            {compatibilityIds.map((id, index) => (
              <WrapItem key={index}>
                <Tag size="lg" colorScheme="teal" borderRadius="full">
                  <TagLabel>{id}</TagLabel>
                  <TagCloseButton onClick={() => removeCompatibilityId(id)} />
                </Tag>
              </WrapItem>
            ))}
          </Wrap>
        )}
        
        {compatibilityIds.length === 0 && (
          <Text color="gray.500" fontSize="sm">No hay IDs de compatibilidad agregados</Text>
        )}
      </VStack>
    </Box>
  );
}