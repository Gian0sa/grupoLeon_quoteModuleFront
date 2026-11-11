export function adaptClientFromApi(apiClient) {
  if (!apiClient) return null;
  return {
    id: apiClient.CardCode,
    sapCode: apiClient.CardCode,
    firstName: apiClient.CardName,
    address: apiClient.Address,
    phone: apiClient.Phone1 || apiClient.Cellular,
    contactEmployees: apiClient.ContactEmployees || [],
    contactPerson: apiClient.ContactPerson || null,
    U_TQC_LMCRED: apiClient.U_TQC_LMCRED,
    CreditLimit: apiClient.CreditLimit,
    MaxCommitment: apiClient.MaxCommitment,
    CurrentAccountBalance: apiClient.CurrentAccountBalance,
    OpenOrdersBalance: apiClient.OpenOrdersBalance,
    OpenDeliveryNotesBalance: apiClient.OpenDeliveryNotesBalance,
    raw: apiClient,
  };
}