import React from "react";
import { Box, Button, Input, VStack, Text, HStack, Select, IconButton } from "@chakra-ui/react";
import { DeleteIcon } from "@chakra-ui/icons";

export default function ApplicationsForm({ formData, setFormData }) {
  const addApplication = () => {
    setFormData((prev) => ({
      ...prev,
      applications: [...prev.applications, {
        vehicleBrand: "",
        vehicleModel: "",
        yearFrom: new Date().getFullYear(),
        yearTo: new Date().getFullYear(),
        engineType: "Gasolina",
        engineDisplacement: "",
        fuelType: "Gasolina",
        bodyType: "",
        notes: ""
      }]
    }));
  };

  const updateApplication = (index, field, value) => {
    const updated = [...formData.applications];
    updated[index][field] = value;
    setFormData((prev) => ({ ...prev, applications: updated }));
  };

  const removeApplication = (index) => {
    const updated = formData.applications.filter((_, i) => i !== index);
    setFormData((prev) => ({ ...prev, applications: updated }));
  };

  return (
    <Box>
      <Text fontWeight="bold" fontSize="lg" mb={4}>Aplicaciones del Producto</Text>
      <VStack spacing={4} align="stretch">
        {formData.applications.map((app, i) => (
          <Box key={i} p={4} border="1px" borderColor="gray.200" borderRadius="md">
            <HStack justify="space-between" mb={3}>
              <Text fontWeight="semibold">Aplicación {i + 1}</Text>
              <IconButton
                icon={<DeleteIcon />}
                size="sm"
                colorScheme="red"
                variant="ghost"
                onClick={() => removeApplication(i)}
              />
            </HStack>
            
            <VStack spacing={3}>
              <HStack w="full">
                <Input 
                  placeholder="Marca del Vehículo" 
                  value={app.vehicleBrand} 
                  onChange={(e) => updateApplication(i, "vehicleBrand", e.target.value)} 
                />
                <Input 
                  placeholder="Modelo" 
                  value={app.vehicleModel} 
                  onChange={(e) => updateApplication(i, "vehicleModel", e.target.value)} 
                />
              </HStack>
              
              <HStack w="full">
                <Input 
                  type="number"
                  placeholder="Año Desde" 
                  value={app.yearFrom} 
                  onChange={(e) => updateApplication(i, "yearFrom", parseInt(e.target.value))} 
                />
                <Input 
                  type="number"
                  placeholder="Año Hasta" 
                  value={app.yearTo} 
                  onChange={(e) => updateApplication(i, "yearTo", parseInt(e.target.value))} 
                />
              </HStack>
              
              <HStack w="full">
                <Select 
                  value={app.engineType} 
                  onChange={(e) => updateApplication(i, "engineType", e.target.value)}
                >
                  <option value="Gasolina">Gasolina</option>
                  <option value="Diesel">Diesel</option>
                  <option value="Híbrido">Híbrido</option>
                  <option value="Eléctrico">Eléctrico</option>
                </Select>
                <Input 
                  placeholder="Cilindrada (ej: 1.8L)" 
                  value={app.engineDisplacement} 
                  onChange={(e) => updateApplication(i, "engineDisplacement", e.target.value)} 
                />
              </HStack>
              
              <HStack w="full">
                <Select 
                  value={app.fuelType} 
                  onChange={(e) => updateApplication(i, "fuelType", e.target.value)}
                >
                  <option value="Gasolina">Gasolina</option>
                  <option value="Diesel">Diesel</option>
                  <option value="GLP">GLP</option>
                  <option value="GNV">GNV</option>
                </Select>
                <Input 
                  placeholder="Tipo de Carrocería" 
                  value={app.bodyType} 
                  onChange={(e) => updateApplication(i, "bodyType", e.target.value)} 
                />
              </HStack>
              
              <Input 
                placeholder="Notas adicionales" 
                value={app.notes} 
                onChange={(e) => updateApplication(i, "notes", e.target.value)} 
              />
            </VStack>
          </Box>
        ))}
        
        <Button onClick={addApplication} colorScheme="blue" variant="outline">
          + Añadir Aplicación
        </Button>
      </VStack>
    </Box>
  );
}