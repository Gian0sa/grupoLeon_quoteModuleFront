import { create } from 'zustand';

export const useQuoteStore = create((set) => ({
  draftId: null,
  client: null,
  products: [],

  selectedPoint: null,
  selectedTransport: "",
  paymentMethod: "",
  paymentImg: null,

  setClient: (clientData) => set({ client: clientData }),
  setDraftId: (id) => set({ draftId: id }),

  setSelectedPoint: (point) => set({ selectedPoint: point }),
  setSelectedTransport: (transport) => set({ selectedTransport: transport }),
  setPaymentMethod: (method) => set({ paymentMethod: method }),
  setPaymentImg: (file) => set({ paymentImg: file }),

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

  clear: () =>
    set({
      client: null,
      products: [],
      selectedPoint: null,
      selectedTransport: "",
      paymentMethod: "",
      deposit: "",
      bank: "",
      check: "",
    }),
}));
