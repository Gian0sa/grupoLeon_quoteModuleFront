import React from "react";
import { Box, Button, Input, VStack, Text, HStack, Select, Checkbox, IconButton } from "@chakra-ui/react";
import { DeleteIcon } from "@chakra-ui/icons";

export default function CrossReferencesForm({ formData, setFormData }) {
  const addCrossReference = () => {
    setFormData((prev) => ({
      ...prev,
      crossReferences: [...prev.crossReferences, {
        referenceBrand: "",
        referenceCode: "",
        source: "",
        isOfficial: false,
        note: ""
      }]
    }));
  };

  const updateCrossReference = (index, field, value) => {
    const updated = [...formData.crossReferences];
    updated[index][field] = value;
    setFormData((prev) => ({ ...prev, crossReferences: updated }));
  };

  const removeCrossReference = (index) => {
    const updated = formData.crossReferences.filter((_, i) => i !== index);
    setFormData((prev) => ({ ...prev, crossReferences: updated }));
  };

  return (
    <Box>
      <Text fontWeight="bold" fontSize="lg" mb={4}>Referencias Cruzadas</Text>
      <VStack spacing={4} align="stretch">
        {formData.crossReferences.map((ref, i) => (
          <Box key={i} p={4} border="1px" borderColor="gray.200" borderRadius="md">
            <HStack justify="space-between" mb={3}>
              <Text fontWeight="semibold">Referencia {i + 1}</Text>
              <IconButton
                icon={<DeleteIcon />}
                size="sm"
                colorScheme="red"
                variant="ghost"
                onClick={() => removeCrossReference(i)}
              />
            </HStack>
            
            <VStack spacing={3}>
              <HStack w="full">
                <Input 
                  placeholder="Marca de Referencia" 
                  value={ref.referenceBrand} 
                  onChange={(e) => updateCrossReference(i, "referenceBrand", e.target.value)} 
                />
                <Input 
                  placeholder="Código de Referencia" 
                  value={ref.referenceCode} 
                  onChange={(e) => updateCrossReference(i, "referenceCode", e.target.value)} 
                />
              </HStack>
              
              <HStack w="full">
                <Input 
                  placeholder="Fuente del catálogo" 
                  value={ref.source} 
                  onChange={(e) => updateCrossReference(i, "source", e.target.value)} 
                />
                <Checkbox 
                  isChecked={ref.isOfficial} 
                  onChange={(e) => updateCrossReference(i, "isOfficial", e.target.checked)}
                >
                  Es oficial
                </Checkbox>
              </HStack>
              
              <Input 
                placeholder="Notas adicionales" 
                value={ref.note} 
                onChange={(e) => updateCrossReference(i, "note", e.target.value)} 
              />
            </VStack>
          </Box>
        ))}
        
        <Button onClick={addCrossReference} colorScheme="green" variant="outline">
          + Añadir Referencia
        </Button>
      </VStack>
    </Box>
  );
}