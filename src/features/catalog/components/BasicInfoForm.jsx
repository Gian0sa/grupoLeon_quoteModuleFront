import React from "react";
import { FormControl, FormLabel, Input, Select, Switch, VStack } from "@chakra-ui/react";

export default function BasicInfoForm({ formData, onChange }) {
  return (
    <VStack spacing={4} align="stretch">
      <FormControl isRequired>
        <FormLabel>Sigla</FormLabel>
        <Input value={formData.sigla} onChange={(e) => onChange("sigla", e.target.value)} />
      </FormControl>

      <FormControl isRequired>
        <FormLabel>Código</FormLabel>
        <Input value={formData.itemCode} onChange={(e) => onChange("itemCode", e.target.value)} />
      </FormControl>

      <FormControl isRequired>
        <FormLabel>Nombre</FormLabel>
        <Input value={formData.itemName} onChange={(e) => onChange("itemName", e.target.value)} />
      </FormControl>

      <FormControl>
        <FormLabel>Descripción</FormLabel>
        <Input value={formData.description} onChange={(e) => onChange("description", e.target.value)} />
      </FormControl>

      <FormControl isRequired>
        <FormLabel>Marca</FormLabel>
        <Input value={formData.brand} onChange={(e) => onChange("brand", e.target.value)} />
      </FormControl>

      <FormControl>
        <FormLabel>Tipo</FormLabel>
        <Input value={formData.type} onChange={(e) => onChange("type", e.target.value)} />
      </FormControl>

      <FormControl>
        <FormLabel>Subtipo</FormLabel>
        <Input value={formData.subtype} onChange={(e) => onChange("subtype", e.target.value)} />
      </FormControl>

      <FormControl>
        <FormLabel>Unidad</FormLabel>
        <Select value={formData.unit} onChange={(e) => onChange("unit", e.target.value)}>
          <option value="pieza">Pieza</option>
          <option value="caja">Caja</option>
          <option value="paquete">Paquete</option>
        </Select>
      </FormControl>

      <FormControl>
        <FormLabel>Peso (kg)</FormLabel>
        <Input 
          type="number" 
          step="0.01"
          value={formData.weight} 
          onChange={(e) => onChange("weight", parseFloat(e.target.value) || 0)} 
        />
      </FormControl>

      <FormControl>
        <FormLabel>Cantidad por paquete</FormLabel>
        <Input 
          type="number" 
          min="1"
          value={formData.packageQty} 
          onChange={(e) => onChange("packageQty", parseInt(e.target.value) || 1)} 
        />
      </FormControl>

      <FormControl>
        <FormLabel>Código de barras</FormLabel>
        <Input value={formData.barcode} onChange={(e) => onChange("barcode", e.target.value)} />
      </FormControl>

      <FormControl>
        <FormLabel>Imagen (URL)</FormLabel>
        <Input value={formData.imageUrl} onChange={(e) => onChange("imageUrl", e.target.value)} />
      </FormControl>

      <FormControl display="flex" alignItems="center">
        <FormLabel mb="0">Activo</FormLabel>
        <Switch isChecked={formData.isActive} onChange={(e) => onChange("isActive", e.target.checked)} />
      </FormControl>
    </VStack>
  );
}