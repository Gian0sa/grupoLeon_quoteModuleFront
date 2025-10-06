import React, { useState, useEffect } from "react";
import { Container, Card, CardBody, VStack, Heading, useColorModeValue, Divider } from "@chakra-ui/react";

import BasicInfoForm from "../components/BasicInfoForm";
import CrossReferencesForm from "../components/CrossReferencesForm";
import ApplicationsForm from "../components/ApplicationsForm";
import SpecificationsForm from "../components/SpecificationsForm";
import ActionButtons from "../components/ActionButtons";
import CompatibilityIdsForm from "../components/CompatibilityIdsForm";
import { useCreateProduct, useUpdateProduct } from "../hooks/mutations/catalogMutations";
import { useProductById } from "../hooks/queries/catalogQueries";
import { useParams } from "react-router-dom";

export function FormCatalogPage() {
  const cardBg = useColorModeValue("white", "gray.700");
  const { id } = useParams(); // si viene en la ruta => edición
  const isEdit = Boolean(id);

  const createProductMutation = useCreateProduct();
  const updateProductMutation = useUpdateProduct();

  // si estamos editando, traemos datos del producto
  const { data: productData, isLoading } = useProductById(id, {
    enabled: isEdit,
  });

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
    specifications: [],
  });

  // cuando traigo datos del backend en edición, los meto en el form
  useEffect(() => {
    if (isEdit && productData) {
      setFormData(productData); // asumiendo mismo formato
    }
  }, [productData, isEdit]);

  const handleInputChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = () => {
    const preparedData = {
      ...formData,
      weight: parseFloat(formData.weight) || 0,
      packageQty: parseInt(formData.packageQty) || 1,
      applications: formData.applications.map((a) => ({
        ...a,
        yearFrom: parseInt(a.yearFrom) || new Date().getFullYear(),
        yearTo: parseInt(a.yearTo) || new Date().getFullYear(),
      })),
      specifications: formData.specifications.map((s) => ({
        ...s,
        order: parseInt(s.order) || 1,
      })),
    };

    if (isEdit) {
      updateProductMutation.mutate({ id, data: preparedData });
    } else {
      createProductMutation.mutate(preparedData);
    }
  };

  if (isEdit && isLoading) return <p>Cargando producto...</p>;

  return (
    <Container maxW="6xl" py={8} bg="gray.50" minH="100vh">
      <Card shadow="lg" bg={cardBg}>
        <CardBody p={8}>
          <Heading size="xl" mb={8} color="blue.600">
            {isEdit ? "Editar producto" : "Crear producto"}
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
              onReset={() =>
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
                  compatibilityIds: [],
                  crossReferences: [],
                  applications: [],
                  specifications: [],
                })
              }
              isLoading={isEdit ? updateProductMutation.isLoading : createProductMutation.isLoading}
              label={isEdit ? "Actualizar" : "Guardar"}
            />
          </VStack>
        </CardBody>
      </Card>
    </Container>
  );
}
