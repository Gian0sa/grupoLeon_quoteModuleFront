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
  // 🚫 Evitar doble clic mientras se ejecuta una mutación
  if (createProductMutation.isLoading || updateProductMutation.isLoading) {
    return;
  }

  const formDataToSend = new FormData();

  formDataToSend.append("sigla", formData.sigla);
  formDataToSend.append("itemCode", formData.itemCode);
  formDataToSend.append("itemName", formData.itemName);
  formDataToSend.append("description", formData.description || "");
  formDataToSend.append("brand", formData.brand);
  formDataToSend.append("type", formData.type || "");
  formDataToSend.append("subtype", formData.subtype || "");
  formDataToSend.append("unit", formData.unit);
  formDataToSend.append("weight", formData.weight ? parseFloat(formData.weight) : "");
  formDataToSend.append("packageQty", formData.packageQty ? parseInt(formData.packageQty) : "");
  formDataToSend.append("barcode", formData.barcode || "");
  formDataToSend.append("isActive", formData.isActive);

  if (formData.imageFile) {
    formDataToSend.append("image", formData.imageFile);
  }

  if (isEdit && !formData.imageFile && formData.imageUrl) {
    formDataToSend.append("imageUrl", formData.imageUrl);
    formDataToSend.append("oldImageUrl", formData.imageUrl);
  }

  formDataToSend.append(
    "crossReferences",
    JSON.stringify(
      formData.crossReferences.map((ref) => ({
        referenceBrand: ref.referenceBrand,
        referenceCode: ref.referenceCode,
        source: ref.source,
        isOfficial: ref.isOfficial,
        note: ref.note || null,
      }))
    )
  );

  formDataToSend.append(
    "applications",
    JSON.stringify(
      formData.applications.map((app) => ({
        vehicleBrand: app.vehicleBrand,
        vehicleModel: app.vehicleModel,
        yearFrom: parseInt(app.yearFrom) || new Date().getFullYear(),
        yearTo: parseInt(app.yearTo) || new Date().getFullYear(),
        engineType: app.engineType,
        engineDisplacement: app.engineDisplacement,
        fuelType: app.fuelType,
        bodyType: app.bodyType,
        notes: app.notes || null,
      }))
    )
  );

  formDataToSend.append(
    "specifications",
    JSON.stringify(
      formData.specifications.map((spec) => ({
        name: spec.name,
        value: spec.value,
        unit: spec.unit || null,
        order: parseInt(spec.order) || 1,
      }))
    )
  );

  formDataToSend.append("compatibilityIds", JSON.stringify(formData.compatibilityIds || []));

  if (isEdit) {
    updateProductMutation.mutate({ id, data: formDataToSend });
  } else {
    createProductMutation.mutate(formDataToSend);
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
            isDisabled={createProductMutation.isLoading || updateProductMutation.isLoading}
          />
          </VStack>
        </CardBody>
      </Card>
    </Container>
  );
}
