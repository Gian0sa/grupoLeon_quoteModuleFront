import { create } from 'zustand';

const isMeaningfulValue = (value) => {
  if (value === undefined || value === null) return false;
  const normalized = String(value).trim().toUpperCase();
  return Boolean(normalized) && !["S/N", "N/A", "NA", "NULL", "UNDEFINED"].includes(normalized);
};

const firstMeaningfulValue = (...values) => values.find(isMeaningfulValue);

const cleanDocumentNumber = (value) => {
  if (!isMeaningfulValue(value)) return "";
  return String(value)
    .trim()
    .replace(/^CL/i, "")
    .replace(/\D/g, "");
};

/**
 * Normaliza cualquier ítem proveniente de SAP, la Base de Datos o localStorage
 * para que jamás se pierdan los nombres, códigos ni precios.
 */
export const normalizeQuoteItem = (item) => {
  if (!item || typeof item !== "object") return null;
  const rawCode = item.productCode || item.itemCode || item.code || item.ItemCode || item.id || "";
  const finalCode = String(rawCode).trim();
  const id = finalCode || String(Date.now());
  const code = finalCode;
  const name = item.name || item.productName || item.description || item.ItemName || item.ItemDescription || item.Dscription || "Artículo General";
  const price = Number(item.price ?? item.unitPrice ?? item.Price ?? item.importe ?? 0);
  const discount = Number(item.discount ?? item.Discount ?? 0);
  const lineDiscount = Number(item.lineDiscount ?? item.LineDiscount ?? 0);

  // Permitir temporalmente string vacío al tipear para que el usuario pueda borrar y cambiar la cantidad libremente
  const rawQty = item.quantity ?? item.Quantity;
  let quantity = 1;
  if (rawQty === "") {
    quantity = "";
  } else if (rawQty !== undefined && rawQty !== null) {
    const parsed = parseInt(rawQty, 10);
    quantity = isNaN(parsed) || parsed < 1 ? 1 : parsed;
  }
  
  // Si stock no viene definido en la BD/draft, queda como null para no marcar erróneamente como AGOTADO
  const rawStock = item.stock ?? item.Stock ?? item.OnHand ?? item.STOCK_DISPONIBLE;
  const stock = rawStock !== undefined && rawStock !== null && !isNaN(Number(rawStock))
    ? Number(rawStock)
    : null;
    
  const whsCode = item.whsCode || item.WhsCode || "014";
  const sigla = item.sigla || item.Sigla || "";
  const marca = item.marca || item.Marca || "";
  const isAgotado = Boolean(item.isAgotado || (item.stockChecked && stock === 0));

  return {
    ...item,
    id,
    code,
    productCode: code,
    itemCode: code,
    name,
    productName: name,
    description: name,
    ItemDescription: name,
    ItemName: name,
    price,
    unitPrice: price,
    discount,
    lineDiscount,
    quantity: isNaN(quantity) || quantity < 1 ? 1 : quantity,
    stock,
    stockChecked: item.stockChecked !== undefined ? item.stockChecked : (rawStock !== undefined && rawStock !== null),
    isAgotado,
    whsCode,
    sigla,
    marca,
  };
};

/**
 * Convierte las distintas formas de cliente que devuelve SAP, el backend o
 * localStorage a la forma que consumen el formulario y el autocomplete.
 */
export const normalizeQuoteClient = (clientData) => {
  if (!clientData || typeof clientData !== "object") return null;

  const raw = clientData.raw && typeof clientData.raw === "object"
    ? clientData.raw
    : clientData;

  const cardCode = firstMeaningfulValue(
    clientData.CardCode,
    clientData.cardCode,
    clientData.sapCode,
    clientData.id,
    raw.CardCode,
    raw.cardCode,
    raw.sapCode,
    raw.id,
  ) || "";
  const documentNumber = cleanDocumentNumber(firstMeaningfulValue(
    clientData.LicTradNum,
    clientData.licTradNum,
    clientData.clientRuc,
    clientData.clientDocument,
    clientData.FederalTaxID,
    raw.LicTradNum,
    raw.licTradNum,
    raw.clientRuc,
    raw.clientDocument,
    raw.FederalTaxID,
    cardCode,
  ));
  const normalizedCardCode = cardCode || (documentNumber ? `CL${documentNumber}` : "");
  const cardName = firstMeaningfulValue(
    clientData.CardName,
    clientData.cardName,
    clientData.clientName,
    clientData.name,
    clientData.firstName,
    raw.CardName,
    raw.cardName,
    raw.clientName,
    raw.name,
  ) || "";
  const address = firstMeaningfulValue(
    clientData.Address,
    clientData.address,
    clientData.clientAddress,
    raw.Address,
    raw.address,
  ) || "";

  if (!normalizedCardCode && !documentNumber && !cardName && !address) return null;

  return {
    ...clientData,
    CardCode: normalizedCardCode,
    LicTradNum: documentNumber,
    CardName: cardName,
    Address: address,
    clientRuc: documentNumber,
    clientDocument: documentNumber,
    raw,
  };
};

const initialQuoteState = {
  quoteId: null,
  client: null,
  products: [],
  opNum: null,
  selectedPoint: null,
  selectedTransport: null,
  selectedDeliveryForm: null,
  selectedPaymentType: null,
  paymentImg: null,
  comment: null,
  deliveryDate: null,
  whsCode: "014",
  approvalStatus: null,
  rejectionReason: null,
  observations: null,
  contactPerson: "",
  refNumber: "",
  saleCondition: "CONTADO", // "CONTADO" | "CREDITO"
  documentType: "FACTURA",   // "FACTURA" | "BOLETA"
  isLetra: false,           // boolean
  creditTerm: "ANTICIPADO", // "ANTICIPADO" | "30 DÍAS" | etc.
};

export const useQuoteStore = create((set) => ({
  ...initialQuoteState,

  setClient: (clientData) => set({ client: normalizeQuoteClient(clientData) }),
  setQuoteId: (id) => set({ quoteId: id }),
  setApprovalStatus: (status) => set({ approvalStatus: status }),

  setSelectedPoint: (point) => set({ selectedPoint: point }),
  setSelectedTransport: (transport) => set({ selectedTransport: transport }),
  setSelectedDeliveryForm: (form) => set({ selectedDeliveryForm: form }),
  setSelectedPaymentType: (type) => set({ selectedPaymentType: type }),
  setPaymentImg: (file) => set({ paymentImg: file }),
  setComment: (comment) => set({ comment }),
  setDeliveryDate: (date) => set({ deliveryDate: date }),
  setOpNum: (opNum) => set({ opNum }),
  setWhsCode: (code) => set({ whsCode: code || "014" }),
  setContactPerson: (person) => set({ contactPerson: person }),
  setRefNumber: (ref) => set({ refNumber: ref }),
  setSaleCondition: (saleCondition) => set({ saleCondition }),
  setDocumentType: (documentType) => set({ documentType }),
  setIsLetra: (isLetra) => set({ isLetra }),
  setCreditTerm: (creditTerm) => set({ creditTerm }),

  addProduct: (product) =>
    set((state) => {
      const normalized = normalizeQuoteItem(product);
      if (!normalized) return state;

      const normCode = String(normalized.code || normalized.id || "").trim().toUpperCase();
      const index = state.products.findIndex((p) => {
        const pCode = String(p.code || p.id || "").trim().toUpperCase();
        return pCode && normCode && pCode === normCode;
      });

      if (index >= 0) {
        const updated = [...state.products];
        updated[index] = {
          ...updated[index],
          quantity: updated[index].quantity + normalized.quantity,
        };
        return { products: updated };
      }
      return { products: [...state.products, normalized] };
    }),

  setProducts: (products) =>
    set(() => {
      if (!Array.isArray(products)) return { products: [] };
      const normalizedList = products.map(normalizeQuoteItem).filter(Boolean);
      const uniqueMap = new Map();
      normalizedList.forEach((item) => {
        const key = String(item.code || item.id || "").trim().toUpperCase();
        if (key && !uniqueMap.has(key)) {
          uniqueMap.set(key, item);
        }
      });
      return { products: Array.from(uniqueMap.values()) };
    }),

  removeProduct: (id) =>
    set((state) => {
      const targetKey = String(id || "").trim().toUpperCase();
      return {
        products: state.products.filter((p) => {
          const pCode = String(p.code || p.id || "").trim().toUpperCase();
          const pId = String(p.id || "").trim().toUpperCase();
          return pCode !== targetKey && pId !== targetKey;
        }),
      };
    }),

  updateProduct: (id, updatedFields) =>
    set((state) => {
      const targetKey = String(id || "").trim().toUpperCase();
      return {
        products: state.products.map((product) => {
          const pCode = String(product.code || "").trim().toUpperCase();
          const pId = String(product.id || "").trim().toUpperCase();
          const pProductCode = String(product.productCode || "").trim().toUpperCase();
          const pItemCode = String(product.itemCode || "").trim().toUpperCase();
          if (pCode === targetKey || pId === targetKey || pProductCode === targetKey || pItemCode === targetKey) {
            return normalizeQuoteItem({ ...product, ...updatedFields });
          }
          return product;
        }),
      };
    }),

  setQuoteData: (quoteData = {}) => {
    const rawClient = typeof quoteData.client === "object" && quoteData.client !== null ? quoteData.client : {};
    const clientName = firstMeaningfulValue(
      rawClient.CardName, rawClient.cardName, rawClient.clientName, rawClient.name,
      quoteData.clientName, typeof quoteData.client === "string" ? quoteData.client : null
    );
    const clientDoc = firstMeaningfulValue(
      rawClient.LicTradNum, rawClient.licTradNum, rawClient.clientRuc, rawClient.clientDocument,
      quoteData.clientDocument, quoteData.clientRuc, quoteData.clientRUC, quoteData.LicTradNum
    );
    const cardCode = firstMeaningfulValue(
      rawClient.CardCode, rawClient.cardCode, rawClient.sapCode, rawClient.id,
      quoteData.CardCode, quoteData.cardCode, quoteData.clientCode,
      clientDoc ? `CL${cleanDocumentNumber(clientDoc)}` : null
    );
    const address = firstMeaningfulValue(
      rawClient.Address, rawClient.address, rawClient.clientAddress,
      quoteData.clientAddress, quoteData.address
    );

    const client = normalizeQuoteClient({
      ...rawClient,
      CardCode: cardCode,
      LicTradNum: clientDoc,
      CardName: clientName,
      Address: address,
      raw: rawClient.raw || (Object.keys(rawClient).length ? rawClient : quoteData),
    });

    const rawList = Array.isArray(quoteData.products) && quoteData.products.length > 0
      ? quoteData.products
      : (Array.isArray(quoteData.items) ? quoteData.items : []);

    const normalizedList = rawList.map(normalizeQuoteItem).filter(Boolean);
    const uniqueMap = new Map();
    normalizedList.forEach((item) => {
      const key = String(item.code || item.id || "").trim().toUpperCase();
      if (key && !uniqueMap.has(key)) {
        uniqueMap.set(key, item);
      }
    });

    const contactPersonVal = firstMeaningfulValue(
      quoteData.contactPerson,
      quoteData.totals?.contactPerson,
      quoteData.ContactPerson,
      quoteData.contact_person,
      rawClient.ContactPerson,
      rawClient.contactPerson,
      quoteData.raw?.ContactPerson
    ) || "";

    const refNumberVal = firstMeaningfulValue(
      quoteData.refNumber,
      quoteData.totals?.refNumber,
      quoteData.NumAtCard,
      quoteData.numAtCard,
      quoteData.Reference1,
      quoteData.reference,
      quoteData.ref_number,
      quoteData.ocCliente,
      quoteData.U_VS_OCCLIENTE
    ) || "";

    const saleConditionVal = firstMeaningfulValue(
      quoteData.saleCondition,
      quoteData.condicionVenta,
      quoteData.condicionPago
    ) || (quoteData.paymentType?.isCredit ? "CREDITO" : "CONTADO");

    const documentTypeVal = firstMeaningfulValue(
      quoteData.documentType,
      quoteData.tipoComprobante,
      quoteData.docTypeVenta
    ) || "FACTURA";

    const isLetraVal = Boolean(quoteData.isLetra || quoteData.hasLetra || quoteData.letra);
    const creditTermVal = firstMeaningfulValue(
      quoteData.creditTerm,
      quoteData.plazo,
      quoteData.plazoCredito
    ) || "ANTICIPADO";

    set({
      ...initialQuoteState,
      quoteId: quoteData.docNumber || quoteData.id || null,
      client,
      products: Array.from(uniqueMap.values()),
      opNum: quoteData.opNum || quoteData.U_VS_OPNUM || null,
      selectedPoint: quoteData.selectedPoint || quoteData.ShipToCode || quoteData.deliveryPoint || null,
      selectedTransport: quoteData.selectedTransport || quoteData.TransportationCode || quoteData.transport || "",
      selectedDeliveryForm: quoteData.selectedDeliveryForm || quoteData.deliveryForm || "",
      selectedPaymentType: quoteData.selectedPaymentType || quoteData.PaymentGroupCode || quoteData.PayTermsGrpCode || quoteData.paymentType || "",
      paymentImg: quoteData.paymentImg || null,
      comment: quoteData.comment || quoteData.comments || quoteData.Comments || null,
      deliveryDate: quoteData.deliveryDate || quoteData.DocDueDate || null,
      whsCode: quoteData.whsCode || "014",
      contactPerson: contactPersonVal,
      refNumber: refNumberVal,
      saleCondition: saleConditionVal,
      documentType: documentTypeVal,
      isLetra: isLetraVal,
      creditTerm: creditTermVal,
      approvalStatus: quoteData.approvalStatus || quoteData.state || quoteData.status || null,
      rejectionReason: quoteData.rejectionReason || quoteData.observations || null,
      observations: quoteData.observations || quoteData.rejectionReason || null,
    });
  },

  clear: () => set({ ...initialQuoteState }),
}));
