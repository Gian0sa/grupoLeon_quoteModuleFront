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
      const existe = state.products.find((p) => p.id === product.id);
      if (existe) {
        return {
          products: state.products.map((p) =>
            p.id === product.id
              ? { ...p, quantity: p.quantity + product.quantity }
              : p
          ),
        };
      }
      return { products: [...state.products, product] };
    }),

  setProducts: (products) => set({ products: Array.isArray(products) ? products : [] }),

  removeProduct: (id) =>
    set((state) => ({
      products: state.products.filter((p) => p.id !== id),
    })),

  updateProduct: (id, updatedFields) =>
    set((state) => ({
      products: state.products.map((product) =>
        product.id === id ? { ...product, ...updatedFields } : product
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

    set({
      ...initialQuoteState,
      quoteId: quoteData.id || quoteData.docNumber || null,
      client,
      products: Array.isArray(quoteData.products) ? quoteData.products : (quoteData.items || []),
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
