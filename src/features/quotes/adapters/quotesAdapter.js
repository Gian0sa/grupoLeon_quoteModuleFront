export function adaptBusinessPartner(data) {
  return {
    cardCode: data.CardCode,
    cardName: data.CardName,
    address: data.Address
  };
}


export function adaptQuoteDraft(data) {
  if (!data) return { client: null, products: [] };

  const client = {
    CardName: data.clientName,
    CardCode: data.clientDocument,
    Address: data.clientAddress,
  };

  const products = data.items.map((item) => ({
    id: item.productCode,
    name: item.productName,
    sigla: item.sigla,
    price: item.unitPrice,
    discount: item.discount,
    importe: item.importe,
    quantity: item.quantity,
  }));

  return { client, products };
}
