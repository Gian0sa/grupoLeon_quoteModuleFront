/**
 * sapPayloadGuide.js
 * 
 * Generador y catálogo explicativo de la Trama JSON enviada a SAP Business One
 * a través de SAP Service Layer (POST /b1s/v2/Orders o /b1s/v2/Quotations).
 * 
 * Utilizado por el Inspector Técnico SAP exclusivo para Administradores.
 */

/**
 * Diccionario maestro con la explicación técnica y empresarial de cada campo en SAP B1
 */
export const SAP_FIELD_DICTIONARY = {
  // --- CABECERA Y DOCUMENTO ---
  DocType: {
    label: "Tipo de Documento",
    sapTable: "ORDR / OQUT",
    type: "String (Enum)",
    importance: "CRÍTICO",
    category: "header",
    description: "Define la estructura base del documento en SAP. 'dDocument_Items' indica documento con líneas de artículos de inventario."
  },
  HandWritten: {
    label: "Documento Manual",
    sapTable: "ORDR",
    type: "String ('tYES' | 'tNO')",
    importance: "ESTÁNDAR",
    category: "header",
    description: "Determina si la numeración proviene de un talonario manual ('tYES') o es autogenerada por SAP B1 ('tNO')."
  },
  Confirmed: {
    label: "Confirmado",
    sapTable: "ORDR",
    type: "String ('tYES' | 'tNO')",
    importance: "ESTÁNDAR",
    category: "header",
    description: "Si es 'tYES', la orden queda confirmada para comprometer stock inmediatamente en el almacén de despacho."
  },
  PartialSupply: {
    label: "Entrega Parcial Permitida",
    sapTable: "ORDR",
    type: "String ('tYES' | 'tNO')",
    importance: "ESTÁNDAR",
    category: "header",
    description: "Permite al almacén realizar entregas o guías parciales si no se cuenta con el stock total del pedido."
  },
  CardCode: {
    label: "Código del Cliente (Socio de Negocio)",
    sapTable: "OCRD",
    type: "String (Máx. 15 car.)",
    importance: "CRÍTICO",
    category: "header",
    description: "Identificador maestro del cliente en SAP B1. Para clientes con RUC suele ser 'C' + RUC o 'CL' + DNI. Debe existir previamente en la tabla OCRD."
  },
  CardName: {
    label: "Razón Social o Nombre del Cliente",
    sapTable: "OCRD",
    type: "String (Máx. 100 car.)",
    importance: "CRÍTICO",
    category: "header",
    description: "Nombre o denominación comercial del cliente registrado en el maestro de socios de negocio."
  },
  JournalMemo: {
    label: "Comentario del Asiento Contable",
    sapTable: "ORDR / OJDT",
    type: "String (Máx. 50 car.)",
    importance: "CRÍTICO",
    category: "header",
    description: "Requisito estricto de la localización peruana en SAP B1: detalle que acompañará los asientos contables en el Libro Mayor."
  },
  DocDate: {
    label: "Fecha de Contabilización",
    sapTable: "ORDR",
    type: "Date (YYYY-MM-DD)",
    importance: "CRÍTICO",
    category: "header",
    description: "Fecha contable oficial del registro del pedido en el ejercicio fiscal de la empresa."
  },
  DocDueDate: {
    label: "Fecha de Vencimiento / Entrega",
    sapTable: "ORDR",
    type: "Date (YYYY-MM-DD)",
    importance: "CRÍTICO",
    category: "header",
    description: "Fecha en la que el cliente requiere recibir la mercadería o fecha de compromiso de despacho de almacén."
  },
  TaxDate: {
    label: "Fecha de Documento Fiscal",
    sapTable: "ORDR",
    type: "Date (YYYY-MM-DD)",
    importance: "ESTÁNDAR",
    category: "header",
    description: "Fecha de emisión fiscal para efectos de reportes tributarios SUNAT."
  },
  DocCurrency: {
    label: "Moneda del Documento",
    sapTable: "ORDR",
    type: "String ('USD' | 'SOL')",
    importance: "CRÍTICO",
    category: "header",
    description: "Moneda de la transacción. En Grupo León la lista de precios y la mayoría de órdenes se pactan en USD (Dólares Americanos)."
  },
  DocRate: {
    label: "Tipo de Cambio Contable",
    sapTable: "ORDR",
    type: "Number",
    importance: "ESTÁNDAR",
    category: "financial",
    description: "Tipo de cambio SUNAT/SAP fijado para la conversión entre moneda local (Soles) y moneda del documento (USD)."
  },
  Comments: {
    label: "Comentarios u Observaciones",
    sapTable: "ORDR",
    type: "String (Máx. 254 car.)",
    importance: "ESTÁNDAR",
    category: "header",
    description: "Notas comerciales, acuerdos con el cliente o instrucciones especiales que se imprimen en el documento de venta."
  },
  NumAtCard: {
    label: "Número de Referencia Web",
    sapTable: "ORDR",
    type: "String (Máx. 100 car.)",
    importance: "CRÍTICO",
    category: "header",
    description: "Código de trazabilidad que vincula el pedido en SAP con el sistema web (ej: COT-000412). Evita duplicidad."
  },
  SalesPersonCode: {
    label: "Código del Asesor de Ventas",
    sapTable: "OSLP",
    type: "Integer",
    importance: "CRÍTICO",
    category: "sales",
    description: "Código del vendedor en SAP (OSLP). El valor 20 corresponde a Administración / Oficina Central cuando aprueba directamente."
  },
  PaymentGroupCode: {
    label: "Condición de Pago",
    sapTable: "OCTG",
    type: "Integer",
    importance: "CRÍTICO",
    category: "financial",
    description: "Código de la condición comercial de pago registrada en SAP B1 (-1 Contado, 1 Crédito 15 días, 2 Crédito 30 días, etc.)."
  },
  TransportationCode: {
    label: "Vía de Transporte",
    sapTable: "OSHP",
    type: "Integer",
    importance: "ESTÁNDAR",
    category: "logistics",
    description: "Código de la vía o medio de envío (terrestre, aéreo, agencia, reparto propio)."
  },

  // --- LÍNEAS DE ARTÍCULOS ---
  DocumentLines: {
    label: "Líneas de Detalle del Pedido",
    sapTable: "RDR1",
    type: "Array<Object>",
    importance: "CRÍTICO",
    category: "lines",
    description: "Listado con el desglose exacto de productos, cantidades, precios unitarios, almacenes y descuentos."
  },
  "DocumentLines.ItemCode": {
    label: "Código de Artículo",
    sapTable: "OITM / RDR1",
    type: "String (Máx. 50 car.)",
    importance: "CRÍTICO",
    category: "lines",
    description: "Código maestro del producto en SAP B1 (ej: 001-0103)."
  },
  "DocumentLines.ItemDescription": {
    label: "Descripción del Artículo",
    sapTable: "RDR1",
    type: "String",
    importance: "ESTÁNDAR",
    category: "lines",
    description: "Nombre comercial del producto registrado en SAP."
  },
  "DocumentLines.Quantity": {
    label: "Cantidad Solicitada",
    sapTable: "RDR1",
    type: "Number",
    importance: "CRÍTICO",
    category: "lines",
    description: "Unidades físicas a facturar y despachar."
  },
  "DocumentLines.UnitPrice": {
    label: "Precio Unitario Lista (USD)",
    sapTable: "RDR1",
    type: "Number",
    importance: "CRÍTICO",
    category: "lines",
    description: "Precio base del artículo según la lista de precios asignada en SAP."
  },
  "DocumentLines.DiscountPercent": {
    label: "Porcentaje Total de Descuento",
    sapTable: "RDR1",
    type: "Number (0.00 a 100.00)",
    importance: "CRÍTICO",
    category: "lines",
    description: "Porcentaje de descuento global aplicado sobre la línea (Descuento de lista + descuento por promoción o volumen)."
  },
  "DocumentLines.WarehouseCode": {
    label: "Código de Almacén",
    sapTable: "OWHS / RDR1",
    type: "String (3 car.)",
    importance: "CRÍTICO",
    category: "lines",
    description: "Almacén de donde se descontará el inventario (predeterminado: '014' Almacén Central de Autopartes)."
  },
  "DocumentLines.TaxCode": {
    label: "Código de Impuesto",
    sapTable: "OSTC / RDR1",
    type: "String ('IGV_18')",
    importance: "CRÍTICO",
    category: "lines",
    description: "Indicador impositivo de SUNAT para cálculo del 18% de IGV (IGV_18)."
  },
  "DocumentLines.U_TQC_DESL": {
    label: "Descuento de Lista (%)",
    sapTable: "RDR1 (UDF)",
    type: "Number",
    importance: "ESTÁNDAR",
    category: "udf",
    description: "Campo de usuario Grupo León: descuento propio de la lista de precios del producto."
  },
  "DocumentLines.U_TQC_DELP": {
    label: "Valor Neto con Desc. Lista",
    sapTable: "RDR1 (UDF)",
    type: "Number",
    importance: "ESTÁNDAR",
    category: "udf",
    description: "Precio del producto tras aplicar únicamente el descuento de lista inicial."
  },
  "DocumentLines.U_TQC_DESV": {
    label: "Descuento Adicional Venta (%)",
    sapTable: "RDR1 (UDF)",
    type: "Number",
    importance: "ESTÁNDAR",
    category: "udf",
    description: "Porcentaje de descuento extra negociado por el asesor o aplicado por oferta comercial."
  },

  // --- CAMPOS DE USUARIO UDFs SUNAT Y GRUPO LEÓN ---
  U_VS_AFEDET: {
    label: "Afecto a Detracción SUNAT",
    sapTable: "ORDR (UDF)",
    type: "String ('Y' | 'N')",
    importance: "CRÍTICO",
    category: "udf",
    description: "Indica si la operación supera el umbral de detracción SUNAT ('Y') o no aplica ('N')."
  },
  U_VS_TIPO_FACT: {
    label: "Tipo de Operación SUNAT",
    sapTable: "ORDR (UDF)",
    type: "String ('0101')",
    importance: "CRÍTICO",
    category: "udf",
    description: "Código SUNAT para facturación electrónica: '0101' indica Venta Interna de Bienes gravada con IGV."
  },
  U_VS_TIPOPER: {
    label: "Tipo de Operación Resumida",
    sapTable: "ORDR (UDF)",
    type: "String ('01')",
    importance: "ESTÁNDAR",
    category: "udf",
    description: "Prefijo de dos dígitos de la operación tributaria SUNAT ('01')."
  },
  U_TQC_TRANSPOR: {
    label: "Nombre de la Agencia de Transporte",
    sapTable: "ORDR (UDF)",
    type: "String (Máx. 100 car.)",
    importance: "ESTÁNDAR",
    category: "logistics",
    description: "Agencia de carga asignada para el traslado de la mercadería (ej: MARVISUR, SHALOM, ETTUSA)."
  },
  U_VS_MPAGO: {
    label: "Código Medio de Pago SUNAT",
    sapTable: "ORDR (UDF)",
    type: "String ('001', '003', etc.)",
    importance: "ESTÁNDAR",
    category: "financial",
    description: "Código SUNAT de la forma de pago ('001' Depósito en cuenta, '003' Transferencia, '008' Yape/Plin, '011' Letra)."
  },
  U_OK1_Anulada: {
    label: "Estado de Anulación",
    sapTable: "ORDR (UDF)",
    type: "String ('N' | 'Y')",
    importance: "ESTÁNDAR",
    category: "udf",
    description: "Marca del addon de facturación electrónica. 'N' indica documento activo y válido."
  },
  AddressExtension: {
    label: "Extensión de Direcciones de Envío y Facturación",
    sapTable: "RDR12",
    type: "Object",
    importance: "ESTÁNDAR",
    category: "logistics",
    description: "Estructura normalizada de direcciones de destino (ShipToStreet, ShipToCity, BillToStreet) para la guía de remisión."
  }
};

/**
 * Construye la trama técnica canónica exacta que consume SAP Service Layer
 * a partir de un objeto de cotización web.
 */
export function buildCanonicalSapPayload(quote = {}) {
  const q = quote || {};
  const client = q.client || {};
  const products = q.products || q.items || [];
  const totals = q.totals || {};

  // Formato de fechas YYYY-MM-DD
  const formatDate = (val) => {
    if (!val) return new Date().toISOString().split("T")[0];
    if (val instanceof Date) return val.toISOString().split("T")[0];
    const s = String(val).trim();
    if (s.includes("T")) return s.split("T")[0];
    if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
    const d = new Date(s);
    return !isNaN(d.getTime()) ? d.toISOString().split("T")[0] : new Date().toISOString().split("T")[0];
  };

  const docDate = formatDate(q.docDate || q.createdAt);
  const dueDate = formatDate(q.docDueDate || q.deliveryDate || q.docDate);

  // Cliente SAP
  const cardCode = String(
    client.CardCode ||
    q.clientDocument ||
    q.clientRuc ||
    (client.documentNumber ? `CL${client.documentNumber}` : "")
  ).trim();

  const cardName = String(
    client.CardName ||
    client.name ||
    q.clientName ||
    "CLIENTE GENERAL"
  ).trim();

  // Vendedor
  const resolvedSalesPerson = Number(
    q.SlpCode ||
    q.slpCode ||
    q.salesPersonCode ||
    q.salesEmployeeCode ||
    totals.salesEmployeeCode ||
    20
  );

  // Forma de Entrega y Transporte
  const rawTransport = q.selectedTransport || q.transport || q.U_TQC_TRANSPOR;
  const transportName = typeof rawTransport === "object" && rawTransport !== null
    ? (rawTransport.Name || rawTransport.name || rawTransport.label || "")
    : String(rawTransport || "");

  // Detracción
  const grandTotal = Number(totals.grandTotalUSD || totals.docTotal || totals.total || 0);
  const isSubjectToDetraction = grandTotal > 700; // Umbral referencial SUNAT aprox. S/ 700

  // Comentarios limpios
  const cleanComments = String(
    q.comment ||
    q.comments ||
    q.observations ||
    totals.comment ||
    `Cotización Web ${q.docNumber || ""}`
  ).trim().slice(0, 254);

  // Referencia
  const numAtCard = String(q.refNumber || q.docNumber || q.id || `COT-${Date.now().toString().slice(-6)}`).trim();

  // Mapeo de Líneas de Artículos
  const documentLines = products.map((p, idx) => {
    const itemCode = p.productCode || p.itemCode || p.ItemCode || p.code || `PROD-${idx + 1}`;
    const itemDesc = p.productName || p.description || p.name || p.ItemDescription || "Artículo sin descripción";
    const qty = Number(p.quantity || p.Quantity || 1);
    const unitPrice = Number(p.unitPrice ?? p.price ?? p.Price ?? 0);
    const sapDisc = Number(p.sapDiscount ?? p.discount ?? p.Discount ?? 0);
    const promoDisc = Number(p.promoDiscount ?? p.PromoDiscount ?? 0);
    const addDisc = Number(p.lineDiscount ?? p.LineDiscount ?? 0);
    const totalDisc = Number(p.discountPercent ?? (sapDisc + promoDisc + addDisc));
    const finalPrice = Number((unitPrice * (1 - totalDisc / 100)).toFixed(2));
    const valorDescLista = Number((unitPrice * (1 - sapDisc / 100)).toFixed(2));
    const descVenta = Number(Math.max(0, totalDisc - sapDisc).toFixed(2));

    return {
      LineNum: idx,
      ItemCode: itemCode,
      ItemDescription: itemDesc,
      Quantity: qty,
      UnitPrice: unitPrice,
      Price: finalPrice,
      DiscountPercent: totalDisc,
      WarehouseCode: p.whsCode || q.whsCode || "014",
      SalesPersonCode: resolvedSalesPerson,
      TaxCode: "IGV_18",
      VatGroup: "IGV_18",
      TaxLiable: "tYES",
      MeasureUnit: "NIU",
      UnitsOfMeasurment: 1.0,
      ShipDate: dueDate,
      U_TQC_DESL: sapDisc,
      U_TQC_DELP: valorDescLista,
      U_TQC_DESV: descVenta,
      U_BPP_OPER: "A",
      U_tipoOpT12: "99",
      U_VS_ONEROSO: "1"
    };
  });

  // Condición de Pago
  let paymentGroupCode = -1; // -1 = Contado en SAP B1
  const rawPayType = q.selectedPaymentType || q.paymentType || totals.paymentType;
  if (typeof rawPayType === "object" && rawPayType !== null) {
    paymentGroupCode = Number(rawPayType.GroupNum ?? rawPayType.GroupNumber ?? -1);
  } else if (!isNaN(Number(rawPayType))) {
    paymentGroupCode = Number(rawPayType);
  }

  // Dirección
  const delivPt = q.selectedPoint || q.deliveryPoint;
  const addressExtension = {
    ShipToStreet: delivPt?.Street || q.clientAddress || client.Address || "LIMA",
    ShipToCity: delivPt?.City || "LIMA",
    ShipToState: delivPt?.State || "15",
    ShipToCountry: "PE",
    BillToStreet: q.clientAddress || client.Address || "LIMA",
    BillToCity: "LIMA",
    BillToCountry: "PE"
  };

  return {
    DocType: "dDocument_Items",
    HandWritten: "tNO",
    Confirmed: "tYES",
    PartialSupply: "tYES",
    CardCode: cardCode,
    CardName: cardName,
    JournalMemo: cardName.slice(0, 50),
    DocDate: docDate,
    DocDueDate: dueDate,
    TaxDate: docDate,
    RequriedDate: dueDate,
    DocCurrency: q.currency || q.DocCurrency || totals.currency || "USD",
    Comments: cleanComments,
    NumAtCard: numAtCard,
    SalesPersonCode: resolvedSalesPerson,
    PaymentGroupCode: paymentGroupCode,
    TransportationCode: 1,
    U_VS_AFEDET: isSubjectToDetraction ? "Y" : "N",
    U_VS_TIPO_FACT: String(q.sunatOpType || q.U_VS_TIPO_FACT || "0101"),
    U_VS_TIPOPER: "01",
    U_OK1_Anulada: "N",
    ...(transportName ? { U_TQC_TRANSPOR: transportName.slice(0, 100) } : {}),
    AddressExtension: addressExtension,
    DocumentLines: documentLines
  };
}

/**
 * Agrupa la trama en bloques lógicos para el visor guiado
 */
export function groupPayloadByCategories(payload = {}) {
  const lines = payload.DocumentLines || [];
  
  return {
    header: {
      title: "1. Cabecera y Socio de Negocio",
      icon: "Building2",
      description: "Datos principales que identifican al cliente y fechan el documento oficial.",
      fields: [
        { key: "CardCode", value: payload.CardCode },
        { key: "CardName", value: payload.CardName },
        { key: "DocDate", value: payload.DocDate },
        { key: "DocDueDate", value: payload.DocDueDate },
        { key: "DocCurrency", value: payload.DocCurrency },
        { key: "NumAtCard", value: payload.NumAtCard },
        { key: "Comments", value: payload.Comments },
        { key: "JournalMemo", value: payload.JournalMemo },
      ]
    },
    lines: {
      title: `2. Líneas de Artículos (${lines.length} ${lines.length === 1 ? 'producto' : 'productos'})`,
      icon: "Package",
      description: "Artículos solicitados, precios de lista, descuentos y almacén de despacho.",
      lines: lines
    },
    financial: {
      title: "3. Finanzas, SUNAT y Tributación",
      icon: "CreditCard",
      description: "Condición de pago, detracciones e indicadores tributarios SUNAT.",
      fields: [
        { key: "PaymentGroupCode", value: payload.PaymentGroupCode },
        { key: "U_VS_AFEDET", value: payload.U_VS_AFEDET },
        { key: "U_VS_TIPO_FACT", value: payload.U_VS_TIPO_FACT },
        { key: "U_VS_TIPOPER", value: payload.U_VS_TIPOPER },
        { key: "U_OK1_Anulada", value: payload.U_OK1_Anulada },
      ]
    },
    logistics: {
      title: "4. Logística, Despacho y Dirección",
      icon: "Truck",
      description: "Agencia de transporte, almacén físico y dirección de entrega.",
      fields: [
        { key: "U_TQC_TRANSPOR", value: payload.U_TQC_TRANSPOR || "No especificado / Retiro en tienda" },
        { key: "TransportationCode", value: payload.TransportationCode },
        { key: "AddressExtension.ShipToStreet", value: payload.AddressExtension?.ShipToStreet },
        { key: "AddressExtension.ShipToCity", value: payload.AddressExtension?.ShipToCity },
      ]
    },
    sales: {
      title: "5. Asignación Comercial y Control",
      icon: "UserCheck",
      description: "Asesor comercial asignado y banderas de control de inventario.",
      fields: [
        { key: "SalesPersonCode", value: payload.SalesPersonCode },
        { key: "Confirmed", value: payload.Confirmed },
        { key: "PartialSupply", value: payload.PartialSupply },
        { key: "DocType", value: payload.DocType },
      ]
    }
  };
}
