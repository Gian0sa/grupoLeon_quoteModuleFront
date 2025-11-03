// src/components/OrdersDashboards/FiltersBarDrawer.jsx
import React from "react";
import {
  Drawer,
  DrawerBody,
  DrawerHeader,
  DrawerOverlay,
  DrawerContent,
  DrawerCloseButton,
  useColorModeValue,
} from "@chakra-ui/react";
import FiltersBar from "./FiltersBar";

export default function FiltersBarDrawer({
  isOpen,
  onClose,
  initialFilters,
  onApply,
  hideSellerField,
  placement = "right", // 👈 puede ser "left" si prefieres
}) {
  const bg = useColorModeValue("white", "gray.800");

  return (
    <Drawer placement={placement} onClose={onClose} isOpen={isOpen} size="md">
      <DrawerOverlay />
      <DrawerContent bg={bg}>
        <DrawerCloseButton />
        <DrawerHeader borderBottomWidth="1px">
          Filtros de Búsqueda
        </DrawerHeader>
        <DrawerBody>
          <FiltersBar
            initialFilters={initialFilters}
            onApply={(data) => {
              onApply(data);
              onClose(); // Cierra automáticamente al aplicar
            }}
            hideSellerField={hideSellerField}
          />
        </DrawerBody>
      </DrawerContent>
    </Drawer>
  );
}
