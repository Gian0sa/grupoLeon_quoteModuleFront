import { create } from 'zustand';

export const useQuoteStore = create((set) => ({
  quoteId: null,
  client: null,
  products: [],

  selectedPoint: null,
  selectedTransport: "",
  selectedDeliveryForm: "",
  selectedPaymentType: "",
  paymentImg: null,
  comment: null,
  deliveryDate: null,

  setClient: (clientData) => set({ client: clientData }),
  setQuoteId: (id) => set({ quoteId: id }),

  setSelectedPoint: (point) => set({ selectedPoint: point }),
  setSelectedTransport: (transport) => set({ selectedTransport: transport }),
  setSelectedDeliveryForm: (form) => set({ selectedDeliveryForm: form }),
  setPaymentImg: (file) => set({ paymentImg: file }),
  setComment: (comment) => set({ comment }),
  setDeliveryDate: (date) => set({ deliveryDate: date }),

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

  clear: () =>
    set({
      client: null,
      products: [],
      selectedPoint: null,
      selectedTransport: "",
      paymentMethod: "",
      paymentImg: null,
    }),
}));
