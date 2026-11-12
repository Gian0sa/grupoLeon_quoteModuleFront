// Calculadora matemática unificada de totales de cotización/pedido para Grupo León / SAP B1
export const APPROVAL_DISCOUNT_THRESHOLD = 50.0; // Umbral a partir del cual requiere aprobación comercial (50.0%)
export const REGULAR_DISCOUNT_CEILING = 55.0;    // Tope comercial estándar para artículos regulares (55.0%)
export const STANDARD_DISCOUNT_CEILING = 55.0;   // Compatibilidad estándar (55.0%)
export const MAX_DISCOUNT_CEILING = 55.0;        // Tope regular base (55.0%)

export const getItemMaxDiscountCeiling = (item) => {
  if (!item) return REGULAR_DISCOUNT_CEILING;
  const isSpecial = Boolean(item.isSpecialPrice || item.campaignName === "Convenio Cliente" || item.specialPrice || item.specialDiscount);
  if (isSpecial) {
    const specialDisc = Number(item.specialDiscount ?? item.discount ?? 0);
    return Math.max(REGULAR_DISCOUNT_CEILING, specialDisc);
  }
  const sapDisc = Math.max(0, Math.min(100, Number(item.sapDiscount ?? item.discount ?? 0)));
  const promoDisc = Math.max(0, Math.min(100, Number(item.promoDiscount ?? item.PromoDiscount ?? 0)));
  const hasPromo = Boolean(promoDisc > 0 || item.promoPrice || item.promoPriceConIGV || item.U_US_PROMO || item.totalDiscountPct);
  if (hasPromo) {
    const promoBaseDisc = Number(item.totalDiscountPct || (sapDisc + promoDisc).toFixed(2));
    return Math.max(REGULAR_DISCOUNT_CEILING, Math.max(80.0, promoBaseDisc));
  }
  return REGULAR_DISCOUNT_CEILING;
};

export const isItemWithoutStock = (p) => Boolean(
  p && (
    p.isAgotado === true ||
    (p.stockChecked && typeof p.stock === "number" && p.stock <= 0) ||
    (p.stock !== undefined && p.stock !== null && Number(p.stock) === 0)
  )
);

export function calculateQuoteTotals(products = [], exchangeRate = 3.45, options = {}) {
  const tc = Number(exchangeRate) || 3.45;
  const isSapDoc = Boolean(options.isSapDoc || options.isSapDirect);

  let grossSubtotalUSD = 0;   // Suma de (qty × precio de lista) antes de descuentos
  let totalDiscountUSD = 0;  // Suma de montos descontados
  let netSubtotalUSD = 0;    // Base imponible neta (Suma de líneas con descuento)
  let hasAdditionalDiscount = false;
  let hasVolumeDiscount = false; // Descuentos mayores a 50% hasta 55% por volumen (>100 uds)
  let hasDiscountAboveThreshold = false; // Descuentos mayores o iguales a 50%
  let hasExceededDiscountCeiling = false;

  const normalizedProducts = (products || []).map((p) => {
    const qty = Math.max(0, Number(p.quantity ?? p.Quantity ?? 1));
    const isOutOfStock = isItemWithoutStock(p);

    // Detección de artículo de Convenio de Precios Especiales (OSPP SAP)
    const isSpecial = !isOutOfStock && Boolean(p.isSpecialPrice || p.campaignName === "Convenio Cliente" || p.specialPrice || p.specialDiscount);
    const specialDisc = isSpecial ? Number(p.specialDiscount ?? p.discount ?? 0) : 0;
    const targetSpecialPriceConIGV = isSpecial && (p.specialPriceConIGV || p.targetSpecialPriceConIGV) && Number(p.specialPriceConIGV || p.targetSpecialPriceConIGV) > 0
      ? Number(p.specialPriceConIGV || p.targetSpecialPriceConIGV)
      : null;
    const targetSpecialNeto = isSpecial
      ? ((p.specialPrice && Number(p.specialPrice) > 0)
          ? Number(p.specialPrice)
          : (targetSpecialPriceConIGV ? Number((targetSpecialPriceConIGV / 1.18).toFixed(6)) : null))
      : null;
    const hasSpecialPrice = Boolean(isSpecial && (targetSpecialNeto > 0 || targetSpecialPriceConIGV > 0 || specialDisc > 0));

    // Si no tiene stock, no tiene precio ni descuento en el cálculo comercial (Demanda Back Order)
    const rawListPrice = Math.max(0, Number(p.price ?? p.Price ?? p.unitPrice ?? p.UnitPrice ?? p.importe ?? p.itemPrice ?? (isSpecial ? p.listPrice : 0) ?? 0));
    const listPrice = isOutOfStock ? 0 : rawListPrice;

    // Descuento base de SAP (%) - Priorizar siempre sapDiscount si existe
    const sapDisc = isOutOfStock
      ? 0
      : Math.max(0, Math.min(100, Number(p.sapDiscount ?? p.discount ?? 0)));
    // Descuento por Promoción / Oferta del Mes (%)
    const promoDisc = isOutOfStock
      ? 0
      : Math.max(0, Math.min(100, Number(p.promoDiscount ?? p.PromoDiscount ?? 0)));
    // Descuento adicional o ajuste de margen (%)
    let addDisc = isOutOfStock
      ? 0
      : Number(Number(p.lineDiscount ?? p.LineDiscount ?? 0).toFixed(2));
    if (isNaN(addDisc)) addDisc = 0;

    const grossLine = qty * listPrice;
    
    // Detección de precio objetivo promocional (U_US_PROMO en SAP = precio final con IGV)
    const targetPromoPriceConIGV = (!isOutOfStock && !isSpecial) && (
      (p.promoPriceConIGV && Number(p.promoPriceConIGV) > 0) ? Number(p.promoPriceConIGV) :
      (p.U_US_PROMO && Number(p.U_US_PROMO) > 0) ? Number(p.U_US_PROMO) :
      (p.promoPrice && Number(p.promoPrice) > 0 && !p.promoPriceNeto) ? Number((Number(p.promoPrice) * 1.18).toFixed(2)) :
      null
    );
    const targetPromoNeto = targetPromoPriceConIGV
      ? Number((targetPromoPriceConIGV / 1.18).toFixed(6))
      : (p.promoPriceNeto && Number(p.promoPriceNeto) > 0 ? Number(p.promoPriceNeto) : (p.promoPrice && Number(p.promoPrice) > 0 ? Number(p.promoPrice) : null));
    const hasPromoPrice = Boolean(!isOutOfStock && !isSpecial && (targetPromoNeto > 0 || targetPromoPriceConIGV > 0));

    // Si la línea proviene directamente de un documento emitido/registrado en SAP:
    // Respetar el total de descuento y montos oficiales aprobados en SAP sin recortarlos
    const isLineFromSap = isSapDoc || Boolean(p.isSapDirect || p.fromSap);
    let totalDisc;
    if (isOutOfStock) {
      totalDisc = 0;
    } else if (isLineFromSap && p.discountPercent !== undefined && p.discountPercent !== null) {
      totalDisc = Math.max(0, Math.min(100, Number(p.discountPercent)));
      // Si en SAP el descuento total difiere del descuento base y no había addDisc registrado
      if (addDisc === 0 && (sapDisc + promoDisc) > 0 && Math.abs(totalDisc - (sapDisc + promoDisc)) > 0.01) {
        addDisc = Number((totalDisc - (sapDisc + promoDisc)).toFixed(2));
      }
    } else if (hasSpecialPrice) {
      // Convenio oficial SAP: El descuento pactado en SAP (ej. 59.35%) es la base.
      // addDisc solo puede ser <= 0 ("hasta ahí nomás")
      const clampedAddDisc = Math.min(0, addDisc);
      totalDisc = Math.max(0, Math.min(specialDisc, Number((specialDisc + clampedAddDisc).toFixed(2))));
    } else if (hasPromoPrice && targetPromoNeto > 0) {
      // Si el artículo tiene precio de promoción definido, el descuento total es la reducción exacta desde el precio de lista
      const promoNetWithAddDisc = Number((targetPromoNeto * (1 - addDisc / 100)).toFixed(6));
      totalDisc = listPrice > 0
        ? Math.min(100, Math.max(0, Number((((listPrice - promoNetWithAddDisc) / listPrice) * 100).toFixed(2))))
        : Number(p.totalDiscountPct || (sapDisc + promoDisc).toFixed(2));
    } else {
      const rawTotalDisc = sapDisc + promoDisc + addDisc;
      const applicableCeiling = getItemMaxDiscountCeiling({ ...p, sapDiscount: sapDisc, promoDiscount: promoDisc });
      totalDisc = Math.min(applicableCeiling, Math.max(0, rawTotalDisc));
      if (rawTotalDisc > applicableCeiling + 0.01) {
        hasExceededDiscountCeiling = true;
      }
    }

    if (!isOutOfStock && addDisc > 0) {
      hasAdditionalDiscount = true;
    }

    const customPrice = !isOutOfStock && (p.customPriceConIGV || p.unitPriceConIGV || p.PriceAfterVAT) && Number(p.customPriceConIGV || p.unitPriceConIGV || p.PriceAfterVAT) > 0
      ? Number(p.customPriceConIGV || p.unitPriceConIGV || p.PriceAfterVAT)
      : null;

    // Regla de simulación matemática unificada 18% SUNAT / SAP B1 por línea (Lógica Inversa):
    let netUnitPrice;
    let unitTax;
    let unitPriceConIGV;

    if (isOutOfStock) {
      netUnitPrice = 0;
      unitTax = 0;
      unitPriceConIGV = 0;
    } else if (isLineFromSap && p.finalPrice) {
      netUnitPrice = Number(Number(p.finalPrice).toFixed(6));
      unitTax = Number((netUnitPrice * 0.18).toFixed(6));
      unitPriceConIGV = Number((netUnitPrice + unitTax).toFixed(2));
    } else if (customPrice) {
      // Lógica Inversa oficial con IGV
      unitPriceConIGV = Number(customPrice.toFixed(2));
      netUnitPrice = Number((unitPriceConIGV / 1.18).toFixed(6));
      const finalNet2 = Number(netUnitPrice.toFixed(2));
      unitTax = Number((unitPriceConIGV - finalNet2).toFixed(2));
    } else if (hasSpecialPrice && (targetSpecialNeto > 0 || targetSpecialPriceConIGV > 0)) {
      // Convenio Oficial SAP B1 (Lógica Inversa oficial)
      const baseSpecialNeto = targetSpecialNeto > 0 ? targetSpecialNeto : Number((targetSpecialPriceConIGV / 1.18).toFixed(6));
      const clampedAddDisc = Math.min(0, addDisc);
      if (targetSpecialPriceConIGV > 0 && clampedAddDisc === 0) {
        unitPriceConIGV = Number(targetSpecialPriceConIGV.toFixed(2));
        netUnitPrice = Number((unitPriceConIGV / 1.18).toFixed(6));
        const finalNet2 = Number(netUnitPrice.toFixed(2));
        unitTax = Number((unitPriceConIGV - finalNet2).toFixed(2));
      } else {
        netUnitPrice = Number((baseSpecialNeto * (1 - clampedAddDisc / 100)).toFixed(6));
        const finalNet2 = Number(netUnitPrice.toFixed(2));
        unitTax = Number((finalNet2 * 0.18).toFixed(2));
        unitPriceConIGV = Number((finalNet2 + unitTax).toFixed(2));
      }
    } else if (hasPromoPrice && targetPromoNeto > 0) {
      netUnitPrice = Number((targetPromoNeto * (1 - addDisc / 100)).toFixed(6));
      const finalNet2 = Number(netUnitPrice.toFixed(2));
      unitTax = Number((finalNet2 * 0.18).toFixed(2));
      unitPriceConIGV = Number((finalNet2 + unitTax).toFixed(2));
    } else {
      netUnitPrice = Number((listPrice * (1 - totalDisc / 100)).toFixed(6));
      const finalNet2 = Number(netUnitPrice.toFixed(2));
      unitTax = Number((finalNet2 * 0.18).toFixed(2));
      unitPriceConIGV = Number((finalNet2 + unitTax).toFixed(2));
    }

    const finalUnitPrice = Number(netUnitPrice.toFixed(2));
    const netLine = isOutOfStock
      ? 0
      : (isLineFromSap && (p.subtotal || p.lineTotal)
        ? Number(Number(p.subtotal || p.lineTotal).toFixed(2))
        : Number((qty * finalUnitPrice).toFixed(2)));

    const isDirectConIGV = customPrice || (hasSpecialPrice && targetSpecialPriceConIGV > 0 && addDisc <= 0);

    const lineTax = isOutOfStock
      ? 0
      : (isDirectConIGV ? Number((unitPriceConIGV * qty - netLine).toFixed(2)) : Number((netLine * 0.18).toFixed(2)));

    const lineTotalConIGV = isOutOfStock
      ? 0
      : (isDirectConIGV ? Number((unitPriceConIGV * qty).toFixed(2)) : Number((netLine + lineTax).toFixed(2)));

    const discAmount = isOutOfStock ? 0 : Math.max(0, grossLine - netLine);

    const isVolumeLine = !isOutOfStock && qty > 100 && totalDisc > APPROVAL_DISCOUNT_THRESHOLD + 0.01;
    if (isVolumeLine) {
      hasVolumeDiscount = true;
    }
    if (!isOutOfStock && totalDisc > APPROVAL_DISCOUNT_THRESHOLD + 0.009) {
      hasDiscountAboveThreshold = true;
    }

    if (!isOutOfStock) {
      grossSubtotalUSD += grossLine;
      totalDiscountUSD += discAmount;
      netSubtotalUSD += netLine;
    }

    const requiresApproval = !isOutOfStock && (totalDisc > APPROVAL_DISCOUNT_THRESHOLD + 0.009 || isVolumeLine);

    return {
      ...p,
      customPriceConIGV: customPrice,
      quantity: qty,
      price: listPrice,
      unitPrice: listPrice,
      sapDiscount: sapDisc,
      promoDiscount: promoDisc,
      campaignName: !isOutOfStock ? (p.campaignName || (promoDisc > 0 ? "Oferta del Mes" : undefined)) : undefined,
      lineDiscount: addDisc,
      discountPercent: Number(totalDisc.toFixed(2)),
      discount: sapDisc,
      discountAmount: Number(discAmount.toFixed(2)),
      discountedUnitPrice: netUnitPrice,
      unitPriceConIGV,
      lineTotal: netLine,
      totalPrice: netLine,
      lineTotalConIGV,
      taxTotal: lineTax,
      igvLine: lineTax,
      requiresApproval,
      isHigherMargin: !isOutOfStock && addDisc < 0,
      isVolumeDiscount: isVolumeLine,
      isExceedingCeiling: !isOutOfStock && !isLineFromSap && (sapDisc + promoDisc + addDisc > MAX_DISCOUNT_CEILING + 0.01),
      isOutOfStock,
      isBackOrder: isOutOfStock,
    };
  });
  
  const inStockProducts = normalizedProducts.filter((p) => !p.isOutOfStock);
  const backOrderProducts = normalizedProducts.filter((p) => p.isOutOfStock);

  // Totales contables oficiales SUNAT / SAP B1:
  // Base Imponible = Suma exacta de bases netas de las líneas
  // IGV 18% = Suma exacta de impuestos de las líneas
  // Total General = Base Imponible + IGV (sin desfase de centavos ni descuentos ocultos)
  const rawNetSubtotal = inStockProducts.reduce((acc, it) => acc + (it.lineTotal || 0), 0);
  const rawTaxTotal = inStockProducts.reduce((acc, it) => acc + (it.taxTotal || 0), 0);

  const subtotalUSD = Number(rawNetSubtotal.toFixed(2));
  const igvUSD = Number(rawTaxTotal.toFixed(2));
  const grandTotalUSD = Number((subtotalUSD + igvUSD).toFixed(2));

  // Valores equivalentes en Soles (PEN) con coherencia matemática exacta:
  const grandTotalSOL = Number((grandTotalUSD * tc).toFixed(2));
  const subtotalSOL = Number((subtotalUSD * tc).toFixed(2));
  const igvSOL = Number(Math.max(0, grandTotalSOL - subtotalSOL).toFixed(2));
  const discPct = grossSubtotalUSD > 0 ? (totalDiscountUSD / grossSubtotalUSD) * 100 : 0;

  const selectedCurrency = (options.currency === "SOL" || options.currency === "PEN") ? "SOL" : "USD";
  const isSol = selectedCurrency === "SOL";
  const displayGrandTotal = isSol ? grandTotalSOL : grandTotalUSD;
  const displaySubtotal = isSol ? subtotalSOL : subtotalUSD;
  const displayIgv = isSol ? igvSOL : igvUSD;
  const currencySymbol = isSol ? "S/ " : "$";

  return {
    normalizedProducts,
    inStockProducts,
    backOrderProducts,
    hasBackOrder: backOrderProducts.length > 0,
    grossSubtotalUSD: Number(grossSubtotalUSD.toFixed(2)),
    totalDiscountUSD: Number(totalDiscountUSD.toFixed(2)),
    subtotalUSD, // Subtotal neto afectado
    netBaseUSD: subtotalUSD,
    igvUSD,      // IGV 18% exacto sobre la base neta
    grandTotalUSD, // Total general exacto (Subtotal + IGV)
    subtotalSOL,
    igvSOL,
    grandTotalSOL,
    currency: selectedCurrency,
    currencySymbol,
    displayGrandTotal,
    displaySubtotal,
    displayIgv,
    discPct: Number(discPct.toFixed(2)),
    tc,
    hasAdditionalDiscount,
    hasVolumeDiscount,
    hasDiscountAboveThreshold,
    hasExceededDiscountCeiling,
    requiresDiscountApproval: hasVolumeDiscount || hasDiscountAboveThreshold,
    standardDiscountCeiling: STANDARD_DISCOUNT_CEILING,
    maxDiscountCeiling: MAX_DISCOUNT_CEILING,
    approvalDiscountThreshold: APPROVAL_DISCOUNT_THRESHOLD,
  };
}

/**
 * Obtiene el total en USD de una cotización de forma ultra-robusta
 * garantizando que nunca retorne $0.00 si existe un total o items guardados.
 */
export function getQuoteTotalUSD(quoteOrProducts, tc = 3.76) {
  if (!quoteOrProducts) return 0;

  if (typeof quoteOrProducts === "object" && !Array.isArray(quoteOrProducts)) {
    const q = quoteOrProducts;
    // Si la cotización ya fue emitida a SAP y tiene DocTotalFc oficial de SAP, priorizarlo
    const sapOfficialTotal = Number(q.DocTotalFc || q.DocTotalSys || (q.DocTotal && (q.DocCurrency === "USD" || !q.DocCurrency) ? q.DocTotal : null));
    if (q.sapDocNum && !isNaN(sapOfficialTotal) && sapOfficialTotal > 0) {
      return Number(sapOfficialTotal.toFixed(2));
    }

    // 1. Priorizar el total almacenado oficial y confirmado
    const stored = Number(
      q.totals?.grandTotalUSD ??
      q.grandTotalUSD ??
      q.totals?.grandTotal ??
      q.grandTotal ??
      q.totalUSD ??
      q.DocTotalFc ??
      (q.DocTotal && (q.DocCurrency === "USD" || !q.DocCurrency) ? q.DocTotal : null) ??
      q.totals?.netTotal ??
      q.totalAmount ??
      q.total ??
      q.amount ??
      0
    );
    if (!isNaN(stored) && stored > 0) {
      return Number(stored.toFixed(2));
    }

    // 2. Solo si no hay total oficial guardado, recalcular dinámicamente desde los productos
    const prods = q.products || q.items || [];
    if (Array.isArray(prods) && prods.length > 0) {
      const calc = calculateQuoteTotals(prods, q.totals?.tc || tc).grandTotalUSD;
      if (calc > 0) return calc;
    }
    return 0;
  }

  if (Array.isArray(quoteOrProducts)) {
    return calculateQuoteTotals(quoteOrProducts, tc).grandTotalUSD;
  }

  return 0;
}

/**
 * Formatea un número o monto con comas de miles y dos decimales (ej: 2,708.50)
 * Si el valor es nulo, indefinido o no numérico, devuelve "0.00".
 */
export function formatThousands(val, decimals = 2) {
  if (val === null || val === undefined || val === "") return (0).toFixed(decimals);
  const num = Number(val);
  if (isNaN(num)) return (0).toFixed(decimals);
  return num.toLocaleString("en-US", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

/**
 * Convierte un Precio Objetivo Final (Con o Sin IGV) a descuento porcentual exacto sobre el precio lista de SAP.
 */
export function calculateDiscountFromTargetPrice({
  basePrice,
  baseFixedDisc = 0,
  targetPrice,
  isWithTax = true,
  taxRate = 0.18,
}) {
  const pLista = Number(basePrice) || 0;
  const pTarget = Number(targetPrice) || 0;
  if (pLista <= 0 || pTarget <= 0) {
    return {
      netTarget: 0,
      totalDiscPct: 0,
      additionalDisc: 0,
      priceWithTax: 0,
      taxAmount: 0,
    };
  }

  const netTarget = isWithTax ? pTarget / (1 + taxRate) : pTarget;
  const totalDiscPct = ((pLista - netTarget) / pLista) * 100;
  const additionalDisc = totalDiscPct - Number(baseFixedDisc || 0);

  return {
    netTarget: Number(netTarget.toFixed(6)),
    totalDiscPct: Number(totalDiscPct.toFixed(4)),
    additionalDisc: Number(additionalDisc.toFixed(4)),
    priceWithTax: Number((netTarget * (1 + taxRate)).toFixed(2)),
    taxAmount: Number((netTarget * taxRate).toFixed(2)),
  };
}

