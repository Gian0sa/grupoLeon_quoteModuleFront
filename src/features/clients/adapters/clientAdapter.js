export function adaptClientFromApi(apiClient) {
  console.log("apiClient",apiClient);
    return {
      id: apiClient.CardCode,
      sapCode: apiClient.CardCode,
      firstName: apiClient.CardName,
      address: apiClient.Address,
      phone: apiClient.Phone1,
    };
  }