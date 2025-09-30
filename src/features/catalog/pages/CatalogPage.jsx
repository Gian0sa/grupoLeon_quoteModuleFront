import React, { useState } from "react";
import { Container, Card, CardBody, VStack, Heading, useColorModeValue, Divider } from "@chakra-ui/react";

import BasicInfoForm from "../components/BasicInfoForm";
import CrossReferencesForm from "../components/CrossReferencesForm";
import ApplicationsForm from "../components/ApplicationsForm";
import SpecificationsForm from "../components/SpecificationsForm";
import ActionButtons from "../components/ActionButtons";
import  CompatibilityIdsForm  from "../components/CompatibilityIdsForm";
import { useCreateProduct } from "../hooks/mutations/catalogMutations";

export function CatalogPage() {
  const [formData, setFormData] = useState({
    sigla: "",
    itemCode: "",
    itemName: "",
    description: "",
    brand: "",
    type: "",
    subtype: "",
    unit: "pieza",
    weight: 0,
    packageQty: 1,
    barcode: "",
    imageUrl: "",
    isActive: true,
    compatibilityIds: [],
    crossReferences: [],
    applications: [],
    specifications: []
  });

  const cardBg = useColorModeValue("white", "gray.700");
  const createProductMutation = useCreateProduct();

  const handleInputChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

const handleSubmit = () => {
  if (!formData.sigla || !formData.itemCode || !formData.itemName || !formData.brand) {
    alert("Por favor complete los campos obligatorios (Sigla, Código, Nombre y Marca)");
    return;
  }

  const productData = {
    sigla: formData.sigla,
    itemCode: formData.itemCode,
    itemName: formData.itemName,
    description: formData.description,
    brand: formData.brand,
    type: formData.type,
    subtype: formData.subtype,
    unit: formData.unit,
    weight: parseFloat(formData.weight) || 0,
    packageQty: parseInt(formData.packageQty) || 1,
    barcode: formData.barcode,
    imageUrl: formData.imageUrl,
    isActive: formData.isActive,
    compatibilityIds: formData.compatibilityIds, // ← AGREGAR ESTA LÍNEA
    crossReferences: formData.crossReferences.map((ref) => ({
      referenceBrand: ref.referenceBrand,
      referenceCode: ref.referenceCode,
      source: ref.source,
      isOfficial: ref.isOfficial,
      note: ref.note
    })),
    applications: formData.applications.map((app) => ({
      vehicleBrand: app.vehicleBrand,
      vehicleModel: app.vehicleModel,
      yearFrom: parseInt(app.yearFrom) || new Date().getFullYear(),
      yearTo: parseInt(app.yearTo) || new Date().getFullYear(),
      engineType: app.engineType,
      engineDisplacement: app.engineDisplacement,
      fuelType: app.fuelType,
      bodyType: app.bodyType,
      notes: app.notes
    })),
    specifications: formData.specifications.map((spec) => ({
      name: spec.name,
      value: spec.value,
      unit: spec.unit || null,
      order: parseInt(spec.order) || 1
    }))
  };

  console.log("Datos a enviar:", JSON.stringify(productData, null, 2));

  createProductMutation.mutate(productData);
};

  const resetForm = () => {
    setFormData({
      sigla: "",
      itemCode: "",
      itemName: "",
      description: "",
      brand: "",
      type: "",
      subtype: "",
      unit: "pieza",
      weight: 0,
      packageQty: 1,
      barcode: "",
      imageUrl: "",
      isActive: true,
      compatibilityIds: [], // ← AGREGAR ESTA LÍNEA
      crossReferences: [],
      applications: [],
      specifications: []
    });
  };

  return (
    <Container maxW="6xl" py={8} bg="gray.50" minH="100vh">
      <Card shadow="lg" bg={cardBg}>
        <CardBody p={8}>
          <Heading size="xl" mb={8} color="blue.600">
            Catálogo de Productos
          </Heading>

          <VStack spacing={8} align="stretch">
            <BasicInfoForm formData={formData} onChange={handleInputChange} />
            <CompatibilityIdsForm formData={formData} setFormData={setFormData} />
            <CrossReferencesForm formData={formData} setFormData={setFormData} />
            <ApplicationsForm formData={formData} setFormData={setFormData} />
            <SpecificationsForm formData={formData} setFormData={setFormData} />
            <Divider />
            <ActionButtons
              onSubmit={handleSubmit}
              onReset={resetForm}
              isLoading={createProductMutation.isLoading}
            />
          </VStack>
        </CardBody>
      </Card>
    </Container>
  );
}