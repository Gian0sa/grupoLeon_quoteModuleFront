import { create } from 'zustand';

export const useQuoteStore = create((set) => ({
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

  setClient: (clientData) => set({ client: clientData }),
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

  setProducts: (products) => set({ products }),

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

  setQuoteData: (quoteData) =>
    set({
      quoteId: quoteData.id || quoteData.docNumber || null,
      client: quoteData.client || null,
      products: quoteData.products || quoteData.items || [],
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
      approvalStatus: quoteData.approvalStatus || quoteData.state || null,
    }),

  clear: () =>
    set({
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
      contactPerson: "",
      refNumber: "",
      approvalStatus: null,
    }),
}));
