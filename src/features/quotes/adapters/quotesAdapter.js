export function adaptBusinessPartner(data) {
  return {
    cardCode: data.CardCode,
    cardName: data.clientName,
    address: data.clientAddress,
    deliveryPoints: data.puntollegada?.map((p) => p.name) || [],
    transports: data.transports?.map((t) => t.name) || [],
  };
}
