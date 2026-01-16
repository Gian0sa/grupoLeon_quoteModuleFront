import { Tabs, TabList, TabPanels, Tab } from "@chakra-ui/react";

export function ClientTabs({ children }) {
  return (
    <Tabs variant="soft-rounded" colorScheme="green" w="100%">
      <TabList
        gap={{ base: 1, sm: 2, md: 4 }}
        overflowX="auto"
        whiteSpace="nowrap"
        px={{ base: 1, md: 0 }}
        css={{
          scrollbarWidth: "none",
          "&::-webkit-scrollbar": { display: "none" },
        }}
      >
        <TabStyled>Histórico</TabStyled>
        <TabStyled>Stock</TabStyled>
        <TabStyled>Importaciones</TabStyled>
      </TabList>

      <TabPanels mt={{ base: 2, md: 4 }}>
        {children}
      </TabPanels>
    </Tabs>
  );
}

function TabStyled({ children }) {
  return (
    <Tab
      bg="transparent"
      color="gray.700"
      border="1px solid"
      borderColor="green.200"
      borderRadius="full"
      fontSize={{ base: "xs", sm: "sm", md: "md" }}
      px={{ base: 2.5, sm: 4, md: 6 }}
      py={{ base: 1.5, sm: 2 }}
      minH="auto"
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
