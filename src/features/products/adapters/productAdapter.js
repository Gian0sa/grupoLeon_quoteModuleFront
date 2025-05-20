// Adaptador para un solo producto
export function productAdapter(product) {
    return {
      id: product.ItemCode,
      name: product.ItemName
    };
  }
  
  export function productsAdapter(data) {
    return data?.value?.map(productAdapter) || [];
  }

export function productDetailsAdapter(product) {
    return {
        id: product.ItemCode,
        name: product.ItemName,
        price: product.Price,
        stock: product.OnHand,
    }
}