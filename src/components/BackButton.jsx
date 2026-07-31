import { IconButton } from "@chakra-ui/react";
import { ArrowBackIcon } from "@chakra-ui/icons";
import { useNavigate } from "react-router-dom";

export function BackButton({ color = "white", to = "/dashboard", onClick, ...props }) {
    const navigate = useNavigate();

    const handleClick = (e) => {
        if (onClick) {
            onClick(e);
        } else {
            navigate(to || "/dashboard");
        }
    };

    return (
        <IconButton
            icon={<ArrowBackIcon boxSize={{ base: 6, md: 7 }} />}
            aria-label="Volver al inicio"
            variant="ghost"
            color={color}
            borderRadius="full"
            w={{ base: "44px", md: "52px" }}
            h={{ base: "44px", md: "52px" }}
            bg="whiteAlpha.150"
            backdropFilter="blur(8px)"
            border="1px solid rgba(255,255,255,0.2)"
            boxShadow="0 4px 12px rgba(0,0,0,0.08)"
            _hover={{ bg: "whiteAlpha.300", transform: "translateY(-1px)" }}
            _active={{ bg: "whiteAlpha.400", transform: "translateY(0)" }}
            _focus={{ boxShadow: "none" }}
            transition="all 0.2s"
            onClick={handleClick}
            {...props}
        />
    );
}
