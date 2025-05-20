import { create } from 'zustand'

export const useQuoteStore = create((set) => ({
  client: null, // antes era solo clientId
  products: [],
  
  setClient: (clientData) => set({ client: clientData }),

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

  clear: () => set({ client: null, products: [] }),
}));
