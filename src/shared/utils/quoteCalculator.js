// Calculadora matemática unificada de totales de cotización/pedido para Grupo León / SAP B1
import { reconcileLineTotalsWithSap } from "../../features/quotes/utils/sapLineReconciliation.js";
import {
  isSpecialAgreementItem,
  resolveSpecialDiscountPct,
} from "../../features/quotes/utils/discountBreakdown.js";
export const APPROVAL_DISCOUNT_THRESHOLD = 50.0; // Umbral a partir del cual requiere aprobación comercial (50.0%)
export const REGULAR_DISCOUNT_CEILING = 55.0;    // Tope comercial estándar para artículos regulares (55.0%)
export const STANDARD_DISCOUNT_CEILING = 55.0;   // Compatibilidad estándar (55.0%)
export const MAX_DISCOUNT_CEILING = 55.0;        // Tope regular base (55.0%)

export const getItemMaxDiscountCeiling = (item) => {
  if (!item) return REGULAR_DISCOUNT_CEILING;
  const isSpecial = isSpecialAgreementItem(item);
  if (isSpecial) {
    const specialDisc = resolveSpecialDiscountPct(item);
    return Math.max(REGULAR_DISCOUNT_CEILING, specialDisc);
  }
  const sapDisc = Math.max(0, Math.min(100, Number(item.sapDiscount ?? item.discount ?? 0)));
  const promoDisc = Math.max(0, Math.min(100, Number(item.promoDiscount ?? item.PromoDiscount ?? 0)));
  const hasPromo = Boolean(promoDisc > 0 || item.promoPrice || item.promoPriceConIGV || item.U_US_PROMO || item.totalDiscountPct);
  if (hasPromo) {
    const promoBaseDisc = Number(item.totalDiscountPct || (sapDisc + promoDisc).toFixed(2));
    return Math.max(REGULAR_DISCOUNT_CEILING, Math.max(80.0, promoBaseDisc));
  }
  return Math.max(REGULAR_DISCOUNT_CEILING, sapDisc);
};

export const isItemWithoutStock = (p) => Boolean(
  p && (
    p.isAgotado === true ||
    (p.stockChecked && typeof p.stock === "number" && p.stock <= 0) ||
    (p.stock !== undefined && p.stock !== null && Number(p.stock) === 0)
  )
);

export const isItemTaxOnly = (p) => Boolean(
  p && (
    p.isTaxOnly === true ||
    p.taxOnly === true ||
    p.taxOnly === "tYES" ||
    p.TaxOnly === "tYES" ||
    p.taxOnly === "Y" ||
    p.TaxOnly === "Y"
  )
);

export function calculateQuoteTotals(products = [], exchangeRate = 3.45, options = {}) {
  const tc = Number(exchangeRate) || 3.45;
  const isSapDoc = Boolean(options.isSapDoc || options.isSapDirect);

  let grossSubtotalUSD = 0;   // Suma de (qty × precio de lista) antes de descuentos
  let totalDiscountUSD = 0;  // Suma de montos descontados
  let netSubtotalUSD = 0;    // Base imponible neta (Suma de líneas con descuento)
  let taxOnlyBaseRefUSD = 0; // Base referencial neta de líneas Transferencia Gratuita (solo para IGV)
  let taxOnlyCount = 0;
  let hasAdditionalDiscount = false;
  let hasVolumeDiscount = false; // Descuentos mayores a 50% hasta 55% por volumen (>100 uds)
  let hasDiscountAboveThreshold = false; // Descuentos mayores o iguales a 50%
  let hasExceededDiscountCeiling = false;

  const normalizedProducts = (products || []).map((p) => {
    const qty = Math.max(0, Number(p.quantity ?? p.Quantity ?? 1));
    const isOutOfStock = isItemWithoutStock(p);
    const isTaxOnly = !isOutOfStock && isItemTaxOnly(p);

    // Detección de artículo de Convenio de Precios Especiales (OSPP SAP)
    const isSpecial = !isOutOfStock && isSpecialAgreementItem(p);
    const specialDisc = isSpecial ? resolveSpecialDiscountPct(p) : 0;

    // Si no tiene stock, no tiene precio ni descuento en el cálculo comercial (Demanda Back Order)
    const rawListPrice = Math.max(0, Number(p.price ?? p.Price ?? p.unitPrice ?? p.UnitPrice ?? p.importe ?? p.itemPrice ?? (isSpecial ? p.listPrice : 0) ?? 0));
    const listPrice = isOutOfStock ? 0 : rawListPrice;

    // Respetar precio de lista y lógica inversa del IGV para artículos de convenio
    const calculatedSpecialConIGV = isSpecial && listPrice > 0 && specialDisc > 0
      ? Number((Number((listPrice * 1.18).toFixed(2)) * (1 - specialDisc / 100)).toFixed(2))
      : null;
    const targetSpecialPriceConIGV = isSpecial && (calculatedSpecialConIGV || p.specialPriceConIGV || p.targetSpecialPriceConIGV) && Number(calculatedSpecialConIGV || p.specialPriceConIGV || p.targetSpecialPriceConIGV) > 0
      ? Number(calculatedSpecialConIGV || p.specialPriceConIGV || p.targetSpecialPriceConIGV)
      : null;
    const targetSpecialNeto = isSpecial
      ? ((p.specialPrice && Number(p.specialPrice) > 0)
          ? Number(p.specialPrice)
          : (targetSpecialPriceConIGV ? Number((targetSpecialPriceConIGV / 1.18).toFixed(6)) : null))
      : null;
    const hasSpecialPrice = Boolean(isSpecial && (targetSpecialNeto > 0 || targetSpecialPriceConIGV > 0 || specialDisc > 0));

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

    const customPrice = !isOutOfStock && (p.customPriceConIGV || p.unitPriceConIGV || p.PriceAfterVAT) && Number(p.customPriceConIGV || p.unitPriceConIGV || p.PriceAfterVAT) > 0
      ? Number(p.customPriceConIGV || p.unitPriceConIGV || p.PriceAfterVAT)
      : null;

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

    // Regla de simulación matemática unificada 18% SUNAT / SAP B1 por línea (Lógica Inversa):
    let netUnitPrice;
    let unitTax;
    let unitPriceConIGV;
    let resolvedBaseSpecialConIGV = 0;
    let isPromoConIGV = false;

    if (isOutOfStock) {
      netUnitPrice = 0;
      unitTax = 0;
      unitPriceConIGV = 0;
    } else if (isLineFromSap && p.finalPrice) {
      netUnitPrice = Number(Number(p.finalPrice).toFixed(6));
      unitTax = Number((netUnitPrice * 0.18).toFixed(6));
      unitPriceConIGV = Number((netUnitPrice + unitTax).toFixed(2));
    } else if (hasSpecialPrice && (targetSpecialNeto > 0 || targetSpecialPriceConIGV > 0 || specialDisc > 0)) {
      // Convenio Oficial SAP B1 (Lógica Inversa oficial)
      const baseSpecialNeto = targetSpecialNeto > 0 
        ? targetSpecialNeto 
        : (listPrice > 0 && specialDisc > 0 ? Number((listPrice * (1 - specialDisc / 100)).toFixed(6)) : Number((targetSpecialPriceConIGV / 1.18).toFixed(6)));
      const baseSpecialConIGV = targetSpecialPriceConIGV > 0
        ? targetSpecialPriceConIGV
        : (listPrice > 0 && specialDisc > 0 ? Number((Number((listPrice * 1.18).toFixed(2)) * (1 - specialDisc / 100)).toFixed(2)) : Number((baseSpecialNeto * 1.18).toFixed(2)));
      resolvedBaseSpecialConIGV = baseSpecialConIGV;
      const clampedAddDisc = Math.min(0, addDisc);
      if (customPrice && customPrice >= baseSpecialConIGV - 0.02) {
        unitPriceConIGV = Number(customPrice.toFixed(2));
        netUnitPrice = Number((unitPriceConIGV / 1.18).toFixed(6));
        const finalNet2 = Number(netUnitPrice.toFixed(2));
        unitTax = Number((unitPriceConIGV - finalNet2).toFixed(2));
        if (listPrice > 0) {
          totalDisc = Math.min(specialDisc, Math.max(0, Number((((listPrice - netUnitPrice) / listPrice) * 100).toFixed(2))));
          addDisc = Number((totalDisc - specialDisc).toFixed(2));
        }
      } else if (clampedAddDisc === 0) {
        unitPriceConIGV = Number(baseSpecialConIGV.toFixed(2));
        netUnitPrice = Number((unitPriceConIGV / 1.18).toFixed(6));
        const finalNet2 = Number(netUnitPrice.toFixed(2));
        unitTax = Number((unitPriceConIGV - finalNet2).toFixed(2));
      } else {
        netUnitPrice = Number((baseSpecialNeto * (1 - clampedAddDisc / 100)).toFixed(6));
        const finalNet2 = Number(netUnitPrice.toFixed(2));
        unitTax = Number((finalNet2 * 0.18).toFixed(2));
        unitPriceConIGV = Number((finalNet2 + unitTax).toFixed(2));
        if (listPrice > 0) {
          totalDisc = Math.min(specialDisc, Math.max(0, Number((((listPrice - netUnitPrice) / listPrice) * 100).toFixed(2))));
        }
      }
    } else if (customPrice) {
      // Lógica Inversa oficial con IGV
      unitPriceConIGV = Number(customPrice.toFixed(2));
      netUnitPrice = Number((unitPriceConIGV / 1.18).toFixed(6));
      const finalNet2 = Number(netUnitPrice.toFixed(2));
      unitTax = Number((unitPriceConIGV - finalNet2).toFixed(2));
    } else if (hasPromoPrice && targetPromoNeto > 0) {
      if (targetPromoPriceConIGV > 0 && addDisc === 0) {
        // U_US_PROMO es el precio final CON IGV: se respeta exacto, igual que lo envía el
        // backend a SAP (PriceAfterVAT). Partir del neto daba 117.91 en vez de 117.90.
        unitPriceConIGV = Number(targetPromoPriceConIGV.toFixed(2));
        netUnitPrice = Number((unitPriceConIGV / 1.18).toFixed(6));
        const finalNet2 = Number(netUnitPrice.toFixed(2));
        unitTax = Number((unitPriceConIGV - finalNet2).toFixed(2));
      } else {
        netUnitPrice = Number((targetPromoNeto * (1 - addDisc / 100)).toFixed(6));
        const finalNet2 = Number(netUnitPrice.toFixed(2));
        unitTax = Number((finalNet2 * 0.18).toFixed(2));
        unitPriceConIGV = Number((finalNet2 + unitTax).toFixed(2));
      }
      // Con precio de oferta con IGV, la línea se totaliza desde el precio con IGV (como en SAP)
      isPromoConIGV = targetPromoPriceConIGV > 0;
    } else {
      netUnitPrice = Number((listPrice * (1 - totalDisc / 100)).toFixed(6));
      const finalNet2 = Number(netUnitPrice.toFixed(2));
      unitTax = Number((finalNet2 * 0.18).toFixed(2));
      unitPriceConIGV = Number((finalNet2 + unitTax).toFixed(2));
    }

    const isDirectConIGV = customPrice || (hasSpecialPrice && targetSpecialPriceConIGV > 0 && addDisc <= 0) || isPromoConIGV;
    const finalUnitPrice = Number(netUnitPrice.toFixed(2));
    const referentialNetLine = isOutOfStock
      ? 0
      : (isLineFromSap && (p.referentialNetTotal || (!isTaxOnly && (p.subtotal || p.lineTotal)))
        ? Number(Number(p.referentialNetTotal || p.subtotal || p.lineTotal).toFixed(2))
        : Number((qty * (isDirectConIGV ? netUnitPrice : finalUnitPrice)).toFixed(2)));

    const lineTax = isOutOfStock
      ? 0
      : (isLineFromSap && p.taxTotal !== undefined && Number(p.taxTotal) > 0 && isTaxOnly
        ? Number(Number(p.taxTotal).toFixed(2))
        : (isDirectConIGV && !isTaxOnly
          ? Number((unitPriceConIGV * qty - referentialNetLine).toFixed(2))
          : Number((referentialNetLine * 0.18).toFixed(2))));

    const netLine = (isOutOfStock || isTaxOnly) ? 0 : referentialNetLine;
    const referentialLineConIGV = isOutOfStock
      ? 0
      : (isDirectConIGV ? Number((unitPriceConIGV * qty).toFixed(2)) : Number((referentialNetLine + lineTax).toFixed(2)));
    const lineTotalConIGV = isOutOfStock
      ? 0
      : (isTaxOnly ? lineTax : referentialLineConIGV);

    const discAmount = (isOutOfStock || isTaxOnly) ? 0 : Math.max(0, grossLine - netLine);

    const isVolumeLine = !isOutOfStock && !isTaxOnly && qty > 100 && totalDisc > APPROVAL_DISCOUNT_THRESHOLD + 0.01;
    if (isVolumeLine) {
      hasVolumeDiscount = true;
    }
    // Si el artículo proviene de un convenio oficial SAP (OSPP) con precio pactado, no dispara alerta comercial a menos que haya descuento adicional
    if (!isOutOfStock && !isTaxOnly && !hasSpecialPrice && totalDisc > APPROVAL_DISCOUNT_THRESHOLD + 0.009) {
      hasDiscountAboveThreshold = true;
    }

    if (!isOutOfStock) {
      if (isTaxOnly) {
        taxOnlyCount += 1;
        taxOnlyBaseRefUSD += referentialNetLine;
      } else {
        grossSubtotalUSD += grossLine;
        totalDiscountUSD += discAmount;
        netSubtotalUSD += netLine;
      }
    }

    const requiresApproval = !isOutOfStock && (
      isTaxOnly ||
      (hasSpecialPrice 
        ? (addDisc > 0 || isVolumeLine) 
        : (totalDisc > APPROVAL_DISCOUNT_THRESHOLD + 0.009 || isVolumeLine))
    );

    return {
      ...p,
      customPriceConIGV: customPrice,
      quantity: qty,
      price: listPrice,
      unitPrice: listPrice,
      sapDiscount: sapDisc,
      promoDiscount: promoDisc,
      campaignName: !isOutOfStock ? (p.campaignName || (hasSpecialPrice ? "Convenio Cliente" : (promoDisc > 0 ? "Oferta del Mes" : undefined))) : undefined,
      lineDiscount: addDisc,
      discountPercent: Number(totalDisc.toFixed(2)),
      discount: sapDisc,
      discountAmount: Number(discAmount.toFixed(2)),
      discountedUnitPrice: netUnitPrice,
      unitPriceConIGV,
      isTaxOnly,
      taxOnly: isTaxOnly,
      referentialNetTotal: referentialNetLine,
      referentialLineConIGV,
      lineTotal: netLine,
      totalPrice: netLine,
      lineTotalConIGV,
      taxTotal: lineTax,
      igvLine: lineTax,
      requiresApproval,
      isHigherMargin: !isOutOfStock && !isTaxOnly && (addDisc < 0 || Boolean(hasSpecialPrice && customPrice && resolvedBaseSpecialConIGV > 0 && unitPriceConIGV > resolvedBaseSpecialConIGV + 0.009)),
      isVolumeDiscount: isVolumeLine,
      isExceedingCeiling: !isOutOfStock && !isTaxOnly && !isLineFromSap && !hasSpecialPrice && (sapDisc + promoDisc + addDisc > MAX_DISCOUNT_CEILING + 0.01),
      isDirectConIGV: Boolean(isDirectConIGV && !isOutOfStock && !isTaxOnly),
      rawNetLineExact: (isOutOfStock || isTaxOnly) ? 0 : (qty * netUnitPrice),
      isOutOfStock,
      isBackOrder: isOutOfStock,
    };
  });

  // Reconciliación dinámica por documento para líneas con precio fijo con IGV (Convenio,
  // Oferta del Mes, precio editado): SAP calcula el Neto del documento desde el Bruto total
  // (Gross / 1.18) y el IGV como diferencia, absorbiendo el ±0.01 en la línea más cercana a 0.5¢.
  const directLines = normalizedProducts.filter((p) => p.isDirectConIGV);
  if (directLines.length > 0) {
    const directGrossSum = Number(directLines.reduce((acc, it) => acc + (it.lineTotalConIGV || 0), 0).toFixed(2));
    const officialDirectNet = Number((directGrossSum / 1.18).toFixed(2));
    const reconciledDirectNets = reconcileLineTotalsWithSap(
      directLines.map((d) => ({ rawLineTotal: d.rawNetLineExact })),
      officialDirectNet
    );
    directLines.forEach((line, idx) => {
      const reconciledNet = reconciledDirectNets[idx];
      if (typeof reconciledNet === "number" && !isNaN(reconciledNet)) {
        line.lineTotal = reconciledNet;
        line.totalPrice = reconciledNet;
        line.taxTotal = Number((line.lineTotalConIGV - reconciledNet).toFixed(2));
        line.igvLine = line.taxTotal;
      }
    });
  }
  
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
    hasTaxOnlyItems: taxOnlyCount > 0,
    taxOnlyCount,
    taxOnlyBaseRefUSD: Number(taxOnlyBaseRefUSD.toFixed(2)),
    taxOnlyBaseRefSOL: Number((taxOnlyBaseRefUSD * tc).toFixed(2)),
    requiresDiscountApproval: hasVolumeDiscount || hasDiscountAboveThreshold || taxOnlyCount > 0,
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

const SPANISH_MONTHS = [
  "Enero",
  "Febrero",
  "Marzo",
  "Abril",
  "Mayo",
  "Junio",
  "Julio",
  "Agosto",
  "Setiembre",
  "Octubre",
  "Noviembre",
  "Diciembre",
];

/**
 * Extrae día, mes y año calendario sin desplazamiento UTC (-1 día en Perú UTC-5)
 * para cadenas ISO como "2026-11-26" o "2026-11-26T00:00:00Z".
 */
export function parseCalendarDateParts(rawDate) {
  if (typeof rawDate === "string") {
    const clean = rawDate.trim().split("T")[0];
    const match = clean.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (match) {
      const year = Number(match[1]);
      const monthIdx = Number(match[2]) - 1;
      const dayNum = Number(match[3]);
      if (monthIdx >= 0 && monthIdx <= 11 && dayNum >= 1 && dayNum <= 31) {
        return {
          day: String(dayNum).padStart(2, "0"),
          monthIndex: monthIdx,
          monthName: SPANISH_MONTHS[monthIdx],
          fullYear: String(year),
          shortYear: String(year).slice(-2),
        };
      }
    }
  }

  const parsed = rawDate ? new Date(rawDate) : new Date();
  const dateObj = isNaN(parsed.getTime()) ? new Date() : parsed;
  const fullYear = String(dateObj.getFullYear());
  return {
    day: String(dateObj.getDate()).padStart(2, "0"),
    monthIndex: dateObj.getMonth(),
    monthName: SPANISH_MONTHS[dateObj.getMonth()],
    fullYear,
    shortYear: fullYear.slice(-2),
  };
}

/**
 * Resuelve los totales oficiales (Subtotal, IGV y Total) para vistas, drawer y talonario PDF.
 * Evita que totales obsoletos guardados en `quote.totals` (p. ej. antes de sincronizar promociones)
 * contradigan el total oficial de SAP (`DocTotalFc` / `DocTotalSys`) o la suma real de las líneas.
 */
export function resolveOfficialDocumentTotals(
  quote = {},
  calcRes = {},
  { isSol = false, tc = 3.45, isEmittedToSap = false } = {}
) {
  const rate = Number(tc) > 0 ? Number(tc) : 3.45;
  const hasTaxOnly = Boolean(
    quote?.totals?.hasTaxOnlyItems ||
      quote?.hasTaxOnlyItems ||
      calcRes?.hasTaxOnlyItems
  );
  const hasCalculatedProducts =
    Array.isArray(calcRes?.normalizedProducts) &&
    calcRes.normalizedProducts.length > 0;

  const calcSubUSD = Number(calcRes?.subtotalUSD || 0);
  const calcIgvUSD = Number(calcRes?.igvUSD || 0);
  const calcGrandUSD = Number(calcRes?.grandTotalUSD || 0);

  const docRate = Number(quote?.DocRate || quote?.docRate || 0);
  const docCurrency = String(quote?.DocCurrency || "").toUpperCase();
  const isSapLocalSol = docCurrency === "PEN" || docCurrency === "SOL";

  const sapGrandUSD = Number(
    quote?.DocTotalSys && Number(quote.DocTotalSys) > 0
      ? Number(quote.DocTotalSys)
      : quote?.DocTotalFc && Number(quote.DocTotalFc) > 0
        ? Number(quote.DocTotalFc)
        : quote?.DocTotal && docRate > 0 && !isSapLocalSol
          ? Number((Number(quote.DocTotal) / docRate).toFixed(2))
          : 0
  );
  const sapIgvUSD = Number(
    quote?.VatSumSys && Number(quote.VatSumSys) > 0
      ? Number(quote.VatSumSys)
      : quote?.VatSumFc && Number(quote.VatSumFc) > 0
        ? Number(quote.VatSumFc)
        : quote?.VatSum && docRate > 0 && !isSapLocalSol
          ? Number((Number(quote.VatSum) / docRate).toFixed(2))
          : 0
  );

  const storedGrandUSD = Number(
    quote?.totals?.grandTotalUSD ??
      quote?.totals?.grandTotal ??
      quote?.grandTotalUSD ??
      0
  );
  const storedSubUSD = Number(
    quote?.totals?.subtotalUSD ??
      quote?.totals?.subTotalUSD ??
      quote?.subtotalUSD ??
      0
  );
  const storedIgvUSD = Number(
    quote?.totals?.igvUSD ?? quote?.totals?.igv ?? quote?.igvUSD ?? 0
  );
  const hasStoredSubUSD =
    quote?.totals?.subtotalUSD !== undefined ||
    quote?.totals?.subTotalUSD !== undefined ||
    quote?.subtotalUSD !== undefined;

  const isStoredCoherentWithCalc =
    storedGrandUSD > 0 &&
    Math.abs(storedGrandUSD - calcGrandUSD) <= 0.1 &&
    (storedSubUSD > 0 || (hasTaxOnly && hasStoredSubUSD)) &&
    Math.abs(storedSubUSD - calcSubUSD) <= 0.1 &&
    Math.abs(storedSubUSD + storedIgvUSD - storedGrandUSD) <= 0.05;

  let grandTotalUSD = 0;
  let subtotalUSD = 0;
  let igvUSD = 0;

  if (isEmittedToSap && sapGrandUSD > 0) {
    grandTotalUSD = Number(sapGrandUSD.toFixed(2));
    if (sapIgvUSD > 0) {
      igvUSD = Number(sapIgvUSD.toFixed(2));
      subtotalUSD =
        hasTaxOnly && calcSubUSD === 0
          ? 0
          : Number(Math.max(0, grandTotalUSD - igvUSD).toFixed(2));
    } else if (hasTaxOnly && calcSubUSD === 0) {
      subtotalUSD = 0;
      igvUSD = grandTotalUSD;
    } else {
      subtotalUSD = Number((grandTotalUSD / 1.18).toFixed(2));
      igvUSD = Number(Math.max(0, grandTotalUSD - subtotalUSD).toFixed(2));
    }
  } else if (hasCalculatedProducts && (calcGrandUSD > 0 || hasTaxOnly)) {
    if (isStoredCoherentWithCalc) {
      subtotalUSD = Number(storedSubUSD.toFixed(2));
      igvUSD = Number(storedIgvUSD.toFixed(2));
      grandTotalUSD = Number(storedGrandUSD.toFixed(2));
    } else {
      subtotalUSD = Number(calcSubUSD.toFixed(2));
      igvUSD = Number(calcIgvUSD.toFixed(2));
      grandTotalUSD = Number(calcGrandUSD.toFixed(2));
    }
  } else {
    grandTotalUSD =
      storedGrandUSD > 0
        ? Number(storedGrandUSD.toFixed(2))
        : Number((sapGrandUSD || calcGrandUSD || 0).toFixed(2));
    subtotalUSD =
      storedSubUSD > 0 || (hasTaxOnly && hasStoredSubUSD)
        ? Number(storedSubUSD.toFixed(2))
        : hasTaxOnly
          ? Number(calcSubUSD.toFixed(2))
          : Number((grandTotalUSD / 1.18).toFixed(2));
    igvUSD =
      storedIgvUSD > 0 && Math.abs(subtotalUSD + storedIgvUSD - grandTotalUSD) <= 0.05
        ? Number(storedIgvUSD.toFixed(2))
        : Number(Math.max(0, grandTotalUSD - subtotalUSD).toFixed(2));
  }

  let grandTotalSOL = Number((grandTotalUSD * rate).toFixed(2));
  let subtotalSOL = Number((subtotalUSD * rate).toFixed(2));
  let igvSOL = Number(Math.max(0, grandTotalSOL - subtotalSOL).toFixed(2));

  if (isSol && isEmittedToSap && isSapLocalSol && Number(quote?.DocTotal || 0) > 0) {
    grandTotalSOL = Number(Number(quote.DocTotal).toFixed(2));
    const sapVatSol = Number(quote?.VatSum || 0);
    if (sapVatSol > 0) {
      igvSOL = Number(sapVatSol.toFixed(2));
      subtotalSOL =
        hasTaxOnly && calcSubUSD === 0
          ? 0
          : Number(Math.max(0, grandTotalSOL - igvSOL).toFixed(2));
    } else {
      subtotalSOL = hasTaxOnly && calcSubUSD === 0 ? 0 : Number((grandTotalSOL / 1.18).toFixed(2));
      igvSOL = Number(Math.max(0, grandTotalSOL - subtotalSOL).toFixed(2));
    }
  } else if (isSol) {
    const storedGrandSOL = Number(quote?.totals?.grandTotalSOL ?? quote?.totals?.grandTotalPEN ?? 0);
    const storedSubSOL = Number(quote?.totals?.subtotalSOL ?? quote?.totals?.subtotalPEN ?? 0);
    const storedIgvSOL = Number(quote?.totals?.igvSOL ?? 0);
    if (
      storedGrandSOL > 0 &&
      Math.abs(storedGrandSOL - grandTotalSOL) <= 0.15 &&
      Math.abs(storedSubSOL + storedIgvSOL - storedGrandSOL) <= 0.05
    ) {
      grandTotalSOL = Number(storedGrandSOL.toFixed(2));
      subtotalSOL = Number(storedSubSOL.toFixed(2));
      igvSOL = Number(storedIgvSOL.toFixed(2));
    }
  }

  return {
    subtotalUSD,
    igvUSD,
    grandTotalUSD,
    subtotalSOL,
    igvSOL,
    grandTotalSOL,
    subtotalDocNum: isSol ? subtotalSOL : subtotalUSD,
    igvDocNum: isSol ? igvSOL : igvUSD,
    documentTotalNum: isSol ? grandTotalSOL : grandTotalUSD,
    hasTaxOnly,
  };
}

