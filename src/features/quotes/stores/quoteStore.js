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
  const id = item.id || item.productCode || item.itemCode || item.code || item.ItemCode || String(Date.now());
  const code = item.productCode || item.itemCode || item.code || item.ItemCode || item.id || "";
  const name = item.name || item.productName || item.description || item.ItemName || item.ItemDescription || item.Dscription || "Artículo General";
  const price = Number(item.price ?? item.unitPrice ?? item.Price ?? item.importe ?? 0);
  const discount = Number(item.discount ?? item.Discount ?? 0);
  const lineDiscount = Number(item.lineDiscount ?? item.LineDiscount ?? 0);
  const quantity = parseInt(item.quantity ?? item.Quantity ?? 1, 10);
  
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
  selectedTransport: "",
  selectedDeliveryForm: "",
  selectedPaymentType: "",
  paymentImg: null,
  comment: null,
  deliveryDate: null,
  whsCode: "014",
  approvalStatus: null,
  contactPerson: "",
  refNumber: "",
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

  addProduct: (product) =>
    set((state) => {
      const normalized = normalizeQuoteItem(product);
      if (!normalized) return state;
      const existe = state.products.find((p) => (p.id === normalized.id || (p.code && p.code === normalized.code)));
      if (existe) {
        return {
          products: state.products.map((p) =>
            (p.id === normalized.id || (p.code && p.code === normalized.code))
              ? { ...p, quantity: p.quantity + normalized.quantity }
              : p
          ),
        };
      }
      return { products: [...state.products, normalized] };
    }),

  setProducts: (products) =>
    set({
      products: Array.isArray(products)
        ? products.map(normalizeQuoteItem).filter(Boolean)
        : [],
    }),

  removeProduct: (id) =>
    set((state) => ({
      products: state.products.filter((p) => p.id !== id && p.code !== id),
    })),

  updateProduct: (id, updatedFields) =>
    set((state) => ({
      products: state.products.map((product) =>
        (product.id === id || product.code === id)
          ? normalizeQuoteItem({ ...product, ...updatedFields })
          : product
      ),
    })),

  setQuoteData: (quoteData = {}) => {
    const storedClient = quoteData.client || {};
    const client = normalizeQuoteClient({
      ...storedClient,
      CardCode: firstMeaningfulValue(storedClient.CardCode, storedClient.cardCode, quoteData.CardCode, quoteData.cardCode, quoteData.clientCode),
      LicTradNum: firstMeaningfulValue(storedClient.LicTradNum, storedClient.licTradNum, quoteData.LicTradNum, quoteData.clientRuc, quoteData.clientDocument),
      CardName: firstMeaningfulValue(storedClient.CardName, storedClient.cardName, quoteData.clientName),
      Address: firstMeaningfulValue(storedClient.Address, storedClient.address, quoteData.clientAddress),
      raw: storedClient.raw || quoteData.clientRaw || (Object.keys(storedClient).length ? storedClient : null),
    });

    const rawList = Array.isArray(quoteData.products) && quoteData.products.length > 0
      ? quoteData.products
      : (quoteData.items || []);

    const products = rawList.map(normalizeQuoteItem).filter(Boolean);

    set({
      ...initialQuoteState,
      quoteId: quoteData.docNumber || quoteData.id || null,
      client,
      products,
      opNum: quoteData.opNum || null,
      selectedPoint: quoteData.selectedPoint || null,
      selectedTransport: quoteData.selectedTransport || "",
      selectedDeliveryForm: quoteData.selectedDeliveryForm || "",
      selectedPaymentType: quoteData.selectedPaymentType || "",
      paymentImg: quoteData.paymentImg || null,
      comment: quoteData.comment || null,
      deliveryDate: quoteData.deliveryDate || null,
      whsCode: quoteData.whsCode || "014",
      contactPerson: quoteData.contactPerson || "",
      refNumber: quoteData.refNumber || "",
      approvalStatus: quoteData.approvalStatus || quoteData.state || quoteData.status || null,
    });
  },

  clear: () => set({ ...initialQuoteState }),
}));
