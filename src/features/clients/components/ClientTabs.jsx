import { Tabs, TabList, TabPanels, Tab } from "@chakra-ui/react";

export function ClientTabs({ children }) {
  return (
    <Tabs variant="soft-rounded" colorScheme="green">
      <TabList
        gap={4}
        overflowX="auto"
        whiteSpace="nowrap"
        css={{
          scrollbarWidth: "none",
          "&::-webkit-scrollbar": { display: "none" },
        }}
      >
        <TabStyled>Histórico de Facturas</TabStyled>
        <TabStyled>Stock y Precios</TabStyled>
        <TabStyled>Importaciones</TabStyled>
      </TabList>

      <TabPanels mt={4}>{children}</TabPanels>
    </Tabs>
  );
}

function TabStyled({ children }) {
  return (
    <Tab
      bg="transparent"
      color="gray.700"
      border="1px solid #c3e2cc"
      borderRadius="full"
      px={6}
      _selected={{
        bg: "green.700",
        color: "white",
        borderColor: "green.700",
      }}
    >
      {children}
    </Tab>
  );
}
