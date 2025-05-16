export function adaptClientFromApi(apiClient) {
    return {
      id: apiClient.CardCode,
      firstName: apiClient.CardName,
      lastName: apiClient.CardType,
      phone: apiClient.Phone1,
    };
  }