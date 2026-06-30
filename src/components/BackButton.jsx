import {Button} from "@chakra-ui/react";
import {ArrowBackIcon} from "@chakra-ui/icons";
import {useNavigate} from "react-router-dom";

export function BackButton() {
    const navigate = useNavigate();

    return (
        <Button leftIcon={<ArrowBackIcon/>}
            colorScheme="gray"
            border="none"
            variant="outline"
            color="white"
            fontSize="20px"
            onClick={
                () => navigate(-1)
        }></Button>
    );
}
