import React from "react";
import {
  Box,
  Flex,
  Text,
  Heading,
  Grid,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  useColorModeValue,
  Button,
  useBreakpointValue,
  VStack,
  HStack,
  Divider,
  Badge
} from "@chakra-ui/react";
import { Check, AlertTriangle, X } from "lucide-react";
import logoImage from "../../../assets/LogoAutopartes.jpg"; // ajusta el path según tu estructura
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { useGetOrderByCode , useGetDeliveryNoteByCode , useGetInvoiceByCode} from "../hooks/queries/reportQueries";

const Step = ({ title, status }) => {
  const icon = {
    complete: <Check color="green" size={20} />,
    warning: <AlertTriangle color="orange" size={20} />,
    pending: <Box w={3} h={3} bg="gray.400" borderRadius="full" />,
  }[status];

  const color = {
    complete: "green.400",
    warning: "orange.300",
    pending: "gray.400",
  }[status];

  return (
    <Flex direction="column" align="center" gap={1} flex={1}>
      {icon}
      <Text fontSize="xs" fontWeight="semibold" color={color} textAlign="center">
        {title}
      </Text>
    </Flex>
  );
};

const TrackingPage = ({ orden }) => {
  const productos = orden.productos || [];
  const entregas = orden.entrega || [];
  const facturas = orden.factura || [];

  console.log(orden)  

  const { data: ordenDetalle, isLoading: loadingOrden } = useGetOrderByCode(orden.orden.id);
  const { data: entregaDetalle, isLoading: loadingDetalle } = useGetDeliveryNoteByCode(orden.entrega[0].id);
  const { data: invoiceDetalle, isLoading:loagindInvoice } = useGetInvoiceByCode(orden.factura[0].id);

  console.log("EL ORDEN DETALLE ES : ", ordenDetalle);

  const bgMain = useColorModeValue("white", "gray.800");
  const bgSection = useColorModeValue("gray.50", "gray.700");
  const textMuted = useColorModeValue("gray.600", "gray.400");
  const textBase = useColorModeValue("gray.800", "white");
  const borderColor = useColorModeValue("gray.200", "gray.600");

  const steps = [
    { title: "Orden de Venta", status: "complete" },
    {
      title: "Preparando Entrega",
      status: entregas.length > 0 ? "complete" : "pending",
    },
    {
      title: "Entrega",
      status:
        entregas.length > 0
          ? productos.some((p) => p.cantidadPendiente > 0)
            ? "warning"
            : "complete"
          : "pending",
    },
    {
      title: "Facturado",
      status: facturas.length > 0 ? "complete" : "pending",
    },
  ];

  // Función para convertir imagen a base64
  const getImageDataURL = (img) => {
    return new Promise((resolve) => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      
      canvas.width = img.width;
      canvas.height = img.height;
      
      ctx.drawImage(img, 0, 0);
      resolve(canvas.toDataURL('image/jpeg', 0.8));
    });
  };

  const handleVerOrden = async () => {
    if (!ordenDetalle) return;

    const doc = new jsPDF();

    // Fuente por defecto
    doc.setFont("helvetica", "normal");

    // === ENCABEZADO ===
    doc.setLineWidth(0.5);
    for (let i = 0; i < 15; i++) {
      doc.line(14 + (i * 2), 8, 14 + (i * 2), 12);
    }

    doc.setFont("helvetica", "bold");
    doc.setFontSize(24);
    doc.text("orden de venta", 14, 25);

    // === AGREGAR LOGO ===
    try {
      const img = new Image();
      img.crossOrigin = "anonymous";
      
      await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = reject;
        img.src = logoImage;
      });

      const imageDataURL = await getImageDataURL(img);
      
      // Agregar la imagen al PDF (posición x, y, ancho, alto)
      doc.addImage(imageDataURL, 'JPEG', 165, 5, 30, 30);
      
    } catch (error) {
      console.warn("No se pudo cargar el logo, usando placeholder:", error);
      // Fallback: círculo con texto si no se puede cargar la imagen
      doc.setLineWidth(1);
      doc.circle(180, 20, 15);
      doc.setFontSize(10);
      doc.text("LOGO", 175, 22);
    }

    // === INFO EMPRESA ===
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.text("DE", 14, 45);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.text("Autopartes SA", 14, 52);

    // === INFO DOCUMENTO ===
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.text("N° DE ORDEN", 140, 45);
    doc.text("FECHA", 140, 52);
    doc.text("HORA", 140, 59);

    doc.text(`${String(ordenDetalle.docNum || "")}`, 180, 45);
    doc.text(String(ordenDetalle.docDate?.slice(0, 10) || "-"), 180, 52);
    doc.text(String(ordenDetalle.time || "-"), 180, 59);

    // === CLIENTE ===
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.text("DATOS DEL CLIENTE", 14, 80);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.text(String(ordenDetalle.cardName || "-"), 14, 87);
    doc.text(String(ordenDetalle.cardCode || "-"), 14, 92);
    doc.text(String(ordenDetalle.address || "-"), 14, 97);

    // === TABLA ===
    const tableData = ordenDetalle.lines.map((line, index) => [
      String(index + 1),
      String(line.itemCode || "-"),
      String(line.description || "-"),
      String(line.quantity || "1"),
      String(parseFloat(line.unitPrice || 0).toFixed(2)),
      String(parseFloat(line.lineTotal || 0).toFixed(2))
    ]);

    autoTable(doc, {
      startY: 110,
      head: [["#", "CÓDIGO", "DESCRIPCIÓN", "CANT.", "PRECIO", "TOTAL"]],
      body: tableData,
      styles: {
        fontSize: 8,
        cellPadding: 2
      },
      headStyles: {
        fillColor: [255, 255, 255],
        textColor: [0, 0, 0],
        fontStyle: 'bold',
        lineWidth: 0.3,
        lineColor: [0, 0, 0]
      },
      columnStyles: {
        0: { cellWidth: 10, halign: 'center' },
        1: { cellWidth: 25 },
        2: { cellWidth: 70 },
        3: { cellWidth: 15, halign: 'right' },
        4: { cellWidth: 20, halign: 'right' },
        5: { cellWidth: 25, halign: 'right' }
      },
      margin: { left: 14 }
    });

    const finalY = doc.lastAutoTable.finalY;

    // === TOTALES CALCULADOS (sin confiar en backend) ===
    const subtotal = ordenDetalle.lines.reduce((acc, item) => {
      const sinIGV = parseFloat(item.lineTotal || 0) / 1.18;
      return acc + sinIGV;
    }, 0);

    const igv = subtotal * 0.18;
    const total = subtotal + igv;

    // Subtotal
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.text("Subtotal", 155, finalY + 15);
    doc.text(subtotal.toFixed(2), 185, finalY + 15);

    // IGV
    doc.text("IGV 18.0%", 155, finalY + 22);
    doc.text(igv.toFixed(2), 185, finalY + 22);

    // TOTAL
    doc.setLineWidth(1);
    doc.rect(145, finalY + 30, 50, 12);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.text("TOTAL", 148, finalY + 38);
    doc.text(`${total.toFixed(2)} S/`, 170, finalY + 38);

    // Guardar PDF
    doc.save(`Orden-Venta-${ordenDetalle.docNum}.pdf`);
  };

   const handleVerEntrega = async () => {
    console.log(entregaDetalle);
    if (!entregaDetalle) return;
  try {
    // Obtener los detalles de la entrega
    
    if (!entregaDetalle) {
      console.error("No se encontraron datos de la entrega");
      return;
    }

    const doc = new jsPDF();

    // Configuración inicial
    doc.setFont("helvetica", "normal");

    // === ENCABEZADO ===
    doc.setLineWidth(0.5);
    for (let i = 0; i < 15; i++) {
      doc.line(14 + (i * 2), 8, 14 + (i * 2), 12);
    }

    doc.setFont("helvetica", "bold");
    doc.setFontSize(24);
    doc.text("GUÍA DE REMISIÓN", 14, 25);

    // === AGREGAR LOGO ===
    try {
      const img = new Image();
      img.crossOrigin = "anonymous";
      
      await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = reject;
        img.src = logoImage;
      });

      const imageDataURL = await getImageDataURL(img);
      doc.addImage(imageDataURL, 'JPEG', 165, 5, 30, 30);
    } catch (error) {
      console.warn("No se pudo cargar el logo:", error);
      doc.setLineWidth(1);
      doc.circle(180, 20, 15);
      doc.setFontSize(10);
      doc.text("LOGO", 175, 22);
    }

    // === INFORMACIÓN BÁSICA ===
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.text("N° DE GUÍA:", 14, 45);
    doc.text("FECHA:", 14, 52);
    doc.text("CLIENTE:", 14, 59);
    doc.text("DIRECCIÓN:", 14, 66);

    doc.setFont("helvetica", "normal");
    doc.text(String(entregaDetalle.docNum || ""), 40, 45);
    doc.text(String(entregaDetalle.docDate?.slice(0, 10) || "-"), 40, 52);
    doc.text(String(entregaDetalle.cardName || "-"), 40, 59);
    doc.text(String(entregaDetalle.address || "-"), 40, 66);

    // === INFORMACIÓN ADICIONAL ===
    doc.setFont("helvetica", "bold");
    doc.text("MONEDA:", 140, 45);
    doc.text("TOTAL:", 140, 52);

    doc.setFont("helvetica", "normal");
    doc.text(String(entregaDetalle.currency || "-"), 180, 45);
    doc.text(String(entregaDetalle.total || "-"), 180, 52);

    // === TABLA DE PRODUCTOS ===
    const tableData = entregaDetalle.lines.map((line, index) => [
      String(index + 1),
      String(line.itemCode || "-"),
      String(line.description || "-"),
      String(line.quantity || "1"),
      String(parseFloat(line.unitPrice || 0).toFixed(2)),
      String(parseFloat(line.lineTotal || 0).toFixed(2))
    ]);

    autoTable(doc, {
      startY: 80,
      head: [["#", "CÓDIGO", "DESCRIPCIÓN", "CANT.", "PRECIO", "TOTAL"]],
      body: tableData,
      styles: {
        fontSize: 8,
        cellPadding: 2
      },
      headStyles: {
        fillColor: [255, 255, 255],
        textColor: [0, 0, 0],
        fontStyle: 'bold',
        lineWidth: 0.3,
        lineColor: [0, 0, 0]
      },
      columnStyles: {
        0: { cellWidth: 10, halign: 'center' },
        1: { cellWidth: 25 },
        2: { cellWidth: 70 },
        3: { cellWidth: 15, halign: 'right' },
        4: { cellWidth: 20, halign: 'right' },
        5: { cellWidth: 25, halign: 'right' }
      },
      margin: { left: 14 }
    });

    // Guardar PDF
    doc.save(`Guia-Remision-${entregaDetalle.docNum}.pdf`);
  } catch (error) {
    console.error("Error al generar PDF de entrega:", error);
  }
};

  const handleVerFactura = async () => {
  if (!invoiceDetalle) return;

  console.log("el invoic es : ",invoiceDetalle);

  const url = `${import.meta.env.VITE_API_URL}/reportModule/pdf/${invoiceDetalle.numAtCard}`;

  try {
    const response = await fetch(url);
    const blob = await response.blob();
    const blobUrl = window.URL.createObjectURL(blob);

    const link = document.createElement("a");
    link.href = blobUrl;
    link.download = `Factura_${invoiceDetalle.id}.pdf`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(blobUrl);
  } catch (err) {
    alert("No se pudo descargar el archivo.");
  }
};

  return (
    <Box
      bg={bgMain}
      borderRadius="lg"
      boxShadow="xl"
      w="full"
      maxW="md"
      mx="auto"
      overflow="hidden"
      border="1px"
      borderColor={borderColor}
    >
      

      {/* Pedido Info */}
      <Box px={4} py={4}>
        <HStack spacing={3} mb={3}>
          <Box 
            w={10} h={10} 
            bg="green.500" 
            borderRadius="full" 
            display="flex" 
            alignItems="center" 
            justifyContent="center"
          >
            <Check color="white" size={20} />
          </Box>
          <VStack align="start" spacing={0}>
            <Text fontWeight="bold" fontSize="lg" color="green.600">
              Pedido #{orden.orden.numero}
            </Text>
            <Text fontSize="sm" color={textMuted}>
              Cliente {orden.cliente.nombre} ({orden.cliente.codigo})
            </Text>
            <Text fontSize="sm" color={textMuted}>
              Fecha: {orden.orden.fechaCreacion}
            </Text>
          </VStack>
        </HStack>
      </Box>

      {/* Productos Section */}
      <Box bg={bgSection} px={4} py={4}>
        <Text fontWeight="bold" fontSize="md" mb={3} color="green.600">
          Productos
        </Text>
        <Table variant="simple" size="sm">
          <Thead>
            <Tr bg="green.500">
              <Th color="white" fontSize="xs" py={2}>Nombre del producto</Th>
              <Th color="white" fontSize="xs" py={2} textAlign="center">Sol.</Th>
              <Th color="white" fontSize="xs" py={2} textAlign="center">Ent.</Th>
            </Tr>
          </Thead>
          <Tbody>
            {productos.map((prod, idx) => {
              const esPendiente = prod.cantidadPendiente > 0;
              const isMobile = useBreakpointValue({ base: true, md: false });
              const descripcionCorta =
                isMobile && prod.descripcion.length > 20
                  ? prod.descripcion.slice(0, 20) + "..."
                  : prod.descripcion;

               return (
                  <Tr
                    key={idx}
                    bg={esPendiente ? useColorModeValue("yellow.100", "yellow.900") : "transparent"}
                  >
                    <Td color={textBase}>
                      <Text noOfLines={1}>
                        {descripcionCorta}
                        {esPendiente && (
                          <Text as="span" ml={1} fontSize="xs" color="orange.400">
                            (Pend.)
                          </Text>
                        )}
                      </Text>
                    </Td>
                    <Td color={textBase}>{prod.cantidadOrdenada}</Td>
                    <Td color={textBase}>{prod.cantidadEntregada}</Td>
                  </Tr>
                );
              })}
          </Tbody>
        </Table>
      </Box>

      <Divider />

      {/* Orden de venta */}
      <Box bg={bgSection} px={4} py={4}>
        <Text fontWeight="bold" fontSize="md" mb={3} color="green.600">
          Orden de venta
        </Text>
        <Box bg="white" p={3} borderRadius="md">
          <HStack justify="space-between" mb={2}>
            <Text fontSize="sm" color={textMuted}>Condición:</Text>
            <Text fontSize="sm" fontWeight="medium">{orden.orden.condicionPago}</Text>
          </HStack>
          <HStack justify="space-between" mb={3}>
            <Text fontSize="sm" color={textMuted}>Monto:</Text>
            <Text fontSize="sm" fontWeight="medium">${orden.orden.montoUsd.toFixed(2)}</Text>
          </HStack>
          <Button 
            size="sm" 
            colorScheme="green" 
            variant="solid"
            w="full"
            onClick={handleVerOrden}
            rightIcon={<Box w={3} h={3} borderRadius="full" bg="white" />}
          >
            Ver detalles
          </Button>
        </Box>
      </Box>

      <Divider />

      {/* Entrega */}
      <Box bg={bgSection} px={4} py={4}>
        <Text fontWeight="bold" fontSize="md" mb={3} color="green.600">
          Entrega
        </Text>
        <Box bg="white" p={3} borderRadius="md">
          {entregas.length > 0 ? (
            entregas.map((e, idx) => (
              <Box key={idx}>
                <HStack justify="space-between" mb={2}>
                  <Text fontSize="sm" color={textMuted}>Fecha:</Text>
                  <Text fontSize="sm" fontWeight="medium">{e.fecha}</Text>
                </HStack>

                <Button 
                  size="sm" 
                  colorScheme="green" 
                  variant="solid"
                  w="full"
                  onClick={() => handleVerEntrega(e)}
                  rightIcon={<Box w={3} h={3} borderRadius="full" bg="white" />}
                >
                  Ver detalles
                </Button>
              </Box>
            ))
          ) : (
            <Text fontSize="sm" color={textMuted} textAlign="center">
              No se ha realizado entrega
            </Text>
          )}
        </Box>
      </Box>

      <Divider />

      {/* Factura */}
      <Box bg={bgSection} px={4} py={4}>
        <Text fontWeight="bold" fontSize="md" mb={3} color="green.600">
          Factura
        </Text>
        <Box bg="white" p={3} borderRadius="md">
          {facturas.length > 0 ? (
            facturas.map((f, idx) => (
              <Box key={idx}>
                <HStack justify="space-between" mb={2}>
                  <Text fontSize="sm" color={textMuted}>Fecha:</Text>
                  <Text fontSize="sm" fontWeight="medium">{f.fecha}</Text>
                </HStack>
                <HStack justify="space-between" mb={3}>
                  <Text fontSize="sm" color={textMuted}>Monto:</Text>
                  <Text fontSize="sm" fontWeight="medium">${f.montoUsd.toFixed(2)}</Text>
                </HStack>
                <Button 
                  size="sm" 
                  colorScheme="green" 
                  variant="solid"
                  w="full"
                  onClick={() => handleVerFactura(f)}
                  rightIcon={<Box w={3} h={3} borderRadius="full" bg="white" />}
                >
                  Ver detalles
                </Button>
              </Box>
            ))
          ) : (
            <Text fontSize="sm" color={textMuted} textAlign="center">
              No facturado
            </Text>
          )}
        </Box>
      </Box>
    </Box>
  );
};

export default TrackingPage;