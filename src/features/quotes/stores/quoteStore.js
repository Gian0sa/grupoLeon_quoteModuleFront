import { create } from 'zustand';
/*client,
    products,
    selectedPoint,
    selectedTransport,
    paymentImg,
    selectedDeliveryForm,
    selectedPaymentType,
    comment,
    deliveryDate, */
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

  setClient: (clientData) => set({ client: clientData }),
  setQuoteId: (id) => set({ quoteId: id }),

  setSelectedPoint: (point) => set({ selectedPoint: point }),
  setSelectedTransport: (transport) => set({ selectedTransport: transport }),
  setSelectedDeliveryForm: (form) => set({ selectedDeliveryForm: form }),
  setSelectedPaymentType: (type) => set({ selectedPaymentType: type }),
  setPaymentImg: (file) => set({ paymentImg: file }),
  setComment: (comment) => set({ comment }),
  setDeliveryDate: (date) => set({ deliveryDate: date }),
  setOpNum: (opNum) => set({ opNum }), 

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
      }),
    
}));
