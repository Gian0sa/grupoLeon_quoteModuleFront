import { create } from 'zustand'

export const useQuoteStore = create((set) => ({
  clientId: null,
  products: [],
  setClient: (id) => set({ clientId: id }),

  addProduct: (product) =>
    set((state) => {
      const existe = state.products.find((p) => p.id === product.id)
      if (existe) {
        return {
          products: state.products.map((p) =>
            p.id === product.id
              ? { ...p, quantity: p.quantity + product.quantity }
              : p
          ),
        }
      }
      return { products: [...state.products, product] }
    }),

  removeProduct: (id) =>
    set((state) => ({
      products: state.products.filter((p) => p.id !== id),
    })),

  clear: () => set({ clientId: null, products: [] }),
}))
