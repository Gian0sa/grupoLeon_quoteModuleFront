// Calculadora matemática unificada de totales de cotización/pedido para Grupo León / SAP B1
export const STANDARD_DISCOUNT_CEILING = 50.0; // Tope comercial estándar ordinario (50.0%)
export const MAX_DISCOUNT_CEILING = 56.0;      // Tope máximo absoluto para volumen / mayoreo (56.0%)

export function calculateQuoteTotals(products = [], exchangeRate = 3.76) {
  const tc = Number(exchangeRate) || 3.76;

  let grossSubtotalUSD = 0;   // Suma de (qty × precio de lista) antes de descuentos
  let totalDiscountUSD = 0;  // Suma de montos descontados
  let netSubtotalUSD = 0;    // Base imponible neta (Suma de líneas con descuento)
  let hasAdditionalDiscount = false;
  let hasVolumeDiscount = false; // Descuentos mayores a 50% hasta 56% por volumen
  let hasExceededDiscountCeiling = false;

  const normalizedProducts = (products || []).map((p) => {
    const qty = Math.max(0, Number(p.quantity ?? p.Quantity ?? 1));
    const listPrice = Math.max(0, Number(p.price ?? p.Price ?? p.unitPrice ?? p.UnitPrice ?? p.importe ?? p.itemPrice ?? 0));

    // Descuento base de SAP (%)
    const sapDisc = Math.max(0, Math.min(100, Number(p.discount ?? p.sapDiscount ?? 0)));
    // Descuento por Promoción / Oferta del Mes (%)
    const promoDisc = Math.max(0, Math.min(100, Number(p.promoDiscount ?? p.PromoDiscount ?? 0)));
    // Descuento adicional de línea (%)
    const addDisc = Math.max(0, Math.min(100, Number(p.lineDiscount ?? p.LineDiscount ?? 0)));

    if (addDisc > 0) {
      hasAdditionalDiscount = true;
    }

    const grossLine = qty * listPrice;
    
    // Cálculo sumatorio directo (Desc. SAP + Desc. Promo + Desc. Adicional)
    // Regla de Negocio: Descuento mayor al 50% (hasta 56%) aplica ÚNICAMENTE si la cantidad es mayor a 100 (>100 uds)
    const rawTotalDisc = sapDisc + promoDisc + addDisc;
    const applicableCeiling = qty > 100 ? MAX_DISCOUNT_CEILING : STANDARD_DISCOUNT_CEILING;
    const totalDisc = Math.min(applicableCeiling, Math.max(0, rawTotalDisc));
    const discountedUnitPrice = listPrice * (1 - totalDisc / 100);
    const netLine = qty * discountedUnitPrice;
    const discAmount = Math.max(0, grossLine - netLine);
    const effectiveDiscPct = grossLine > 0 ? (discAmount / grossLine) * 100 : totalDisc;

    const isVolumeLine = qty > 100 && totalDisc > STANDARD_DISCOUNT_CEILING + 0.01;
    if (isVolumeLine) {
      hasVolumeDiscount = true;
    }

    if (rawTotalDisc > applicableCeiling + 0.01) {
      hasExceededDiscountCeiling = true;
    }

    grossSubtotalUSD += grossLine;
    totalDiscountUSD += discAmount;
    netSubtotalUSD += netLine;

    return {
      ...p,
      quantity: qty,
      price: listPrice,
      unitPrice: listPrice,
      sapDiscount: sapDisc,
      promoDiscount: promoDisc,
      campaignName: p.campaignName || (promoDisc > 0 ? "Oferta del Mes" : undefined),
      lineDiscount: addDisc,
      discountPercent: Number(totalDisc.toFixed(2)),
      discount: sapDisc,
      discountAmount: Number(discAmount.toFixed(2)),
      discountedUnitPrice: Number(discountedUnitPrice.toFixed(4)),
      lineTotal: Number(netLine.toFixed(2)),
      requiresApproval: addDisc > 0 || isVolumeLine,
      isVolumeDiscount: isVolumeLine,
      isExceedingCeiling: rawTotalDisc > applicableCeiling + 0.01,
    };
  });
  
  const igvUSD = netSubtotalUSD * 0.18;
  const grandTotalUSD = netSubtotalUSD + igvUSD;

  const subtotalSOL = netSubtotalUSD * tc;
  const igvSOL = igvUSD * tc;
  const grandTotalSOL = grandTotalUSD * tc;
  const discPct = grossSubtotalUSD > 0 ? (totalDiscountUSD / grossSubtotalUSD) * 100 : 0;

  return {
    normalizedProducts,
    grossSubtotalUSD: Number(grossSubtotalUSD.toFixed(2)),
    totalDiscountUSD: Number(totalDiscountUSD.toFixed(2)),
    subtotalUSD: Number(netSubtotalUSD.toFixed(2)), // Subtotal neto afectado
    netBaseUSD: Number(netSubtotalUSD.toFixed(2)),
    igvUSD: Number(igvUSD.toFixed(2)),               // IGV 18% exacto sobre la base neta
    grandTotalUSD: Number(grandTotalUSD.toFixed(2)), // Total general exacto (Subtotal + IGV)
    subtotalSOL: Number(subtotalSOL.toFixed(2)),
    igvSOL: Number(igvSOL.toFixed(2)),
    grandTotalSOL: Number(grandTotalSOL.toFixed(2)),
    discPct: Number(discPct.toFixed(2)),
    tc,
    hasAdditionalDiscount,
    hasVolumeDiscount,
    hasExceededDiscountCeiling,
    requiresDiscountApproval: hasAdditionalDiscount || hasVolumeDiscount,
    standardDiscountCeiling: STANDARD_DISCOUNT_CEILING,
    maxDiscountCeiling: MAX_DISCOUNT_CEILING,
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
    const prods = q.products || q.items || [];
    if (Array.isArray(prods) && prods.length > 0) {
      const calc = calculateQuoteTotals(prods, q.totals?.tc || tc).grandTotalUSD;
      if (calc > 0) return calc;
    }
    const stored = Number(
      q.totals?.grandTotalUSD ??
      q.totals?.grandTotal ??
      q.totals?.netTotal ??
      q.grandTotalUSD ??
      q.totalUSD ??
      q.totalAmount ??
      q.total ??
      q.amount ??
      0
    );
    return !isNaN(stored) && stored > 0 ? Number(stored.toFixed(2)) : 0;
  }

  if (Array.isArray(quoteOrProducts)) {
    return calculateQuoteTotals(quoteOrProducts, tc).grandTotalUSD;
  }

  return 0;
}
