import { MainLayout } from "../../../components/layouts/MainLayout";
import { Box } from "@chakra-ui/react";
import ConfigRulesList from "../components/config/ConfigRulesList";

export function ConfigRulesPage() {
  return (
    <MainLayout title="Módulo de Configuración">
      <Box w="100%">
        <ConfigRulesList />
      </Box>
    </MainLayout>
  );
}
