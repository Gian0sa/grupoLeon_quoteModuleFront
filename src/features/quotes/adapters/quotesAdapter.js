export function adaptBusinessPartner(data) {
  return {
    cardCode: data.CardCode,
    cardName: data.CardName,
    address: data.Address
  };
}


export function adaptQuote(data) {
  if (!data) return { client: null, products: [] };

  const client = {
    CardName: data.clientName,
    CardCode: data.clientDocument,
    Address: data.clientAddress,
  };

  const products = data.items.map((item) => ({
    id: item.productCode || item.code || item.id,
    name: item.productName || item.name,
    sigla: item.sigla,
    price: item.unitPrice ?? item.price,
    discount: item.discount,
    importe: item.importe,
    quantity: item.quantity,
    isSpecialPrice: Boolean(item.isSpecialPrice),
    specialDiscount: item.specialDiscount,
    specialPrice: item.specialPrice,
    specialPriceNeto: item.specialPriceNeto,
    specialPriceConIGV: item.specialPriceConIGV,
    campaignName: item.campaignName,
    lineDiscount: item.lineDiscount || item.LineDiscount || 0,
    customPriceConIGV: item.customPriceConIGV,
  }));

  return { client, products };
}
