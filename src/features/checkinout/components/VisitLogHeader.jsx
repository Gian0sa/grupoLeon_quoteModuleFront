import { Flex, Box, Heading } from "@chakra-ui/react";
import { BackButton } from "../../../components/BackButton";
import { useState, useRef } from "react";

export function VisitLogHeader() {
    const [clickCount, setClickCount] = useState(0);
    const lastClickTimeRef = useRef(0);

    const handleTitleClick = () => {
        const now = Date.now();
        // Si pasa más de 2 segundos entre clics, reiniciamos el contador
        if (now - lastClickTimeRef.current > 2000) {
            setClickCount(1);
        } else {
            const nextCount = clickCount + 1;
            setClickCount(nextCount);
            if (nextCount >= 5) {
                setClickCount(0);
                // Cargar e inicializar eruda desde CDN si no existe
                if (window.eruda) {
                    window.eruda.show();
                } else {
                    const script = document.createElement("script");
                    script.src = "https://cdn.jsdelivr.net/npm/eruda";
                    document.body.appendChild(script);
                    script.onload = () => {
                        window.eruda.init();
                        window.eruda.show();
                    };
                }
            }
        }
        lastClickTimeRef.current = now;
    };

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
            <Heading 
                textAlign="center" 
                fontSize="lg" 
                fontWeight="600"
                onClick={handleTitleClick}
                cursor="pointer"
                userSelect="none"
            >
                Registro de Visita
            </Heading>
        </Flex>
    );
}