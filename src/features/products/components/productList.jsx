// components/ProductList.jsx
import { Button, Modal, ModalOverlay, ModalContent, ModalHeader, ModalCloseButton, ModalBody, useDisclosure } from "@chakra-ui/react";
import { useState } from "react";
import { ProductDetail } from "./ProductDetail";

export function ProductList({ products }) {
    const { isOpen, onOpen, onClose } = useDisclosure();
    const [selectedProduct, setSelectedProduct] = useState(null);

    const handleView = (product) => {
        console.log("product", product);    
        setSelectedProduct(product.id);
        onOpen();
    };

    return (
        <div>
            <h1>Product List</h1>
            {products && products.map((product) => (
                <div key={product.id}>
                    <h2>{product.name}</h2>
                    <Button onClick={() => handleView(product)}>View</Button>
                </div>
            ))}

            <Modal isOpen={isOpen} onClose={onClose} size="lg">
                <ModalOverlay />
                <ModalContent>
                    <ModalHeader>Product Detail</ModalHeader>
                    <ModalCloseButton />
                    <ModalBody>
                        <ProductDetail code={selectedProduct} />
                    </ModalBody>
                </ModalContent>
            </Modal>
        </div>
    );
}
