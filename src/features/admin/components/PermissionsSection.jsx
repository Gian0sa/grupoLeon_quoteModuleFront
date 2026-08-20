import React from "react";
import { FormControl, FormLabel, Badge } from "@chakra-ui/react";
import PermissionsTreeView from "./PermissionsTreeView";

export default function PermissionsSection({ 
  services = [],
  groupedServices, 
  permittedServices = [], 
  onServiceChange,
  onCategoryChange,
  onChange,
}) {
  // Manejador unificado de cambio de array de permisos
  const handlePermittedChange = (newPermitted) => {
    if (typeof onChange === "function") {
      onChange(newPermitted);
    } else if (typeof onCategoryChange === "function") {
      // Fallback para props tradicionales
      const allServices = services.length > 0
        ? services
        : Object.values(groupedServices || {}).flatMap(g => g.services || []);
      onCategoryChange(allServices, false);
      const selectedSrvs = allServices.filter(s => newPermitted.includes(s.id));
      onCategoryChange(selectedSrvs, true);
    }
  };

  // Extraer lista plana de servicios si solo viene groupedServices
  const flatServices = services.length > 0 
    ? services 
    : Object.values(groupedServices || {}).flatMap(g => g.services || []);

  return (
    <FormControl>
      <FormLabel fontWeight="800" fontSize="md" color="gray.800" mb={3}>
        Permisos y Servicios del Sistema
      </FormLabel>
      
      <PermissionsTreeView
        services={flatServices}
        permittedServices={permittedServices}
        onChange={handlePermittedChange}
      />
    </FormControl>
  );
}