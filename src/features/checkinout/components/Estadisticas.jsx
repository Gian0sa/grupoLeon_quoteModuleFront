import { SimpleGrid, Card, CardBody, Stat, StatLabel, StatNumber, StatHelpText } from "@chakra-ui/react";

export default function Estadisticas({ stats, statBg, borderColor }) {
    return (
        <SimpleGrid columns={{ base: 2, md: 2, lg: 4 }} spacing={{ base: 2, md: 4 }} w="full">
                    <Card bg={statBg} borderColor={borderColor}>
                        <CardBody p={{ base: 3, md: 4 }}>
                            <Stat>
                                <StatLabel fontSize={{ base: "xs", md: "sm" }}>Total Visitas</StatLabel>
                                <StatNumber fontSize={{ base: "xl", md: "2xl" }}>{stats.totalVisits}</StatNumber>
                                <StatHelpText fontSize={{ base: "xs", md: "sm" }}>Registradas</StatHelpText>
                            </Stat>
                        </CardBody>
                    </Card>
                    <Card bg={statBg} borderColor={borderColor}>
                        <CardBody p={{ base: 3, md: 4 }}>
                            <Stat>
                                <StatLabel fontSize={{ base: "xs", md: "sm" }}>Completadas</StatLabel>
                                <StatNumber fontSize={{ base: "xl", md: "2xl" }}>{stats.completedVisits}</StatNumber>
                                <StatHelpText fontSize={{ base: "xs", md: "sm" }}>Con Check-In/Out</StatHelpText>
                            </Stat>
                        </CardBody>
                    </Card>
                    <Card bg={statBg} borderColor={borderColor}>
                        <CardBody p={{ base: 3, md: 4 }}>
                            <Stat>
                                <StatLabel fontSize={{ base: "xs", md: "sm" }}>Pendientes</StatLabel>
                                <StatNumber fontSize={{ base: "xl", md: "2xl" }}>{stats.pendingCheckOut}</StatNumber>
                                <StatHelpText fontSize={{ base: "xs", md: "sm" }}>Sin Check-Out</StatHelpText>
                            </Stat>
                        </CardBody>
                    </Card>
                    <Card bg={statBg} borderColor={borderColor}>
                        <CardBody p={{ base: 3, md: 4 }}>
                            <Stat>
                                <StatLabel fontSize={{ base: "xs", md: "sm" }}>Duración Promedio</StatLabel>
                                <StatNumber fontSize={{ base: "md", md: "lg" }}>{stats.avgDuration}</StatNumber>
                                <StatHelpText fontSize={{ base: "xs", md: "sm" }}>Por visita</StatHelpText>
                            </Stat>
                        </CardBody>
                    </Card>
                </SimpleGrid>
    );
}
