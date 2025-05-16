export function adaptBusinessPartner(data) {
    return {
      cardCode: data.CardCode,
      cardName: data.CardName,
      cardType: data.CardType,
      federalTaxID: data.FederalTaxID,
      address: data.Address,
      city: data.City,
      country: data.Country,
      phone: data.Phone1,
      email: data.EmailAddress,
      currency: data.Currency,
      salesPersonCode: data.SalesPersonCode,
      groupCode: data.GroupCode,
      vatLiable: data.VatLiable,
      valid: data.Valid === 'tYES',
      frozen: data.Frozen === 'tYES',
      shipToDefault: data.ShipToDefault,
      billToDefault: data.BilltoDefault,
      website: data.Website,
      companyType: data.CompanyPrivate,
      languageCode: data.LanguageCode,
      globalLocationNumber: data.GlobalLocationNumber
    };
  }
  