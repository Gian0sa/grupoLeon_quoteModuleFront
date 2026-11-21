import { formatClientFullAddress } from "../../../shared/utils/quoteLogisticsFormatters";

export function adaptClientFromApi(apiClient) {
  if (!apiClient) return null;
  const fullAddress = formatClientFullAddress(apiClient);
  return {
    id: apiClient.CardCode,
    sapCode: apiClient.CardCode,
    firstName: apiClient.CardName,
    address: apiClient.Address,
    fullAddress: fullAddress || apiClient.Address || "",
    city: apiClient.City,
    county: apiClient.County,
    state: apiClient.BillToState || apiClient.ShipToState || apiClient.State1,
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