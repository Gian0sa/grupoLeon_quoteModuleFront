export function adaptClientFromApi(apiClient) {
    return {
      id: apiClient.CardCode,
      firstName: apiClient.CardName,
      address: apiClient.Address,
      phone: apiClient.Phone1,
    };
  }