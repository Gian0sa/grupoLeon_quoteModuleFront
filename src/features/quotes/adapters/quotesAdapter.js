export function adaptBusinessPartner(data) {
  return {
    cardCode: data.CardCode,
    cardName: data.CardName,
    address: data.Address
  };
}
