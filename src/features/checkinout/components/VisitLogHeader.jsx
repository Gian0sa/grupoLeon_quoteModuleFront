import { Flex, Box, Heading } from "@chakra-ui/react";
import {BackButton} from "../../../components/BackButton"

export function VisitLogHeader() {
    return (
        <Flex
            bg="green.600"
            color="white"
            align="center"
            justify="center"
            w="100%"
            h="56px"
            px={4}
            position="sticky"
            top={0}
            zIndex={10}
            boxShadow="sm"
        >
            <Box position="absolute" left={4}>
                <BackButton color="white" />
            </Box>
            <Heading textAlign="center" fontSize="lg" fontWeight="600">
                Registro de Visita
            </Heading>
        </Flex>
    );
}