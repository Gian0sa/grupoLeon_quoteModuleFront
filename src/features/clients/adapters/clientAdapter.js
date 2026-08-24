export function adaptClientFromApi(apiClient) {
  return {
    id: apiClient.CardCode,
    sapCode: apiClient.CardCode,
    firstName: apiClient.CardName,
    address: apiClient.Address,
    phone: apiClient.Phone1 || apiClient.Cellular,
    contactEmployees: apiClient.ContactEmployees || [],
    contactPerson: apiClient.ContactPerson || null,
  };
}