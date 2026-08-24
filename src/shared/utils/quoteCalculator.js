// Calculadora matemática unificada de totales de cotización/pedido para Grupo León / SAP B1
export const MAX_DISCOUNT_CEILING = 55.0; // Tope máximo comercial configurable (55.0%)

export function calculateQuoteTotals(products = [], exchangeRate = 3.76) {
  const tc = Number(exchangeRate) || 3.76;

  let grossSubtotalUSD = 0;   // Suma de (qty × precio de lista) antes de descuentos
  let totalDiscountUSD = 0;  // Suma de montos descontados
  let netSubtotalUSD = 0;    // Base imponible neta (Suma de líneas con descuento)
  let hasAdditionalDiscount = false;
  let hasExceededDiscountCeiling = false;

  const normalizedProducts = (products || []).map((p) => {
    const qty = Math.max(0, Number(p.quantity ?? p.Quantity ?? 1));
    const listPrice = Math.max(0, Number(p.price ?? p.Price ?? p.unitPrice ?? p.UnitPrice ?? p.importe ?? p.itemPrice ?? 0));

    // Descuento base de SAP (%)
    const sapDisc = Math.max(0, Math.min(100, Number(p.discount ?? p.discountPercent ?? p.DiscountPercent ?? 0)));
    // Descuento adicional de línea (%)
    const addDisc = Math.max(0, Math.min(100, Number(p.lineDiscount ?? p.LineDiscount ?? 0)));

    if (addDisc > 0) {
      hasAdditionalDiscount = true;
    }

    const grossLine = qty * listPrice;
    
    // Cálculo en cascada / compuesto:
    // 1. Precio con descuento SAP base
    const priceAfterSap = listPrice * (1 - sapDisc / 100);
    // 2. Descuento adicional aplicado sobre el precio ya descontado de SAP
    const discountedUnitPrice = priceAfterSap * (1 - addDisc / 100);
    const netLine = qty * discountedUnitPrice;
    const discAmount = Math.max(0, grossLine - netLine);
    const effectiveDiscPct = grossLine > 0 ? (discAmount / grossLine) * 100 : 0;

    if (effectiveDiscPct > MAX_DISCOUNT_CEILING + 0.01) {
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
      lineDiscount: addDisc,
      discountPercent: Number(effectiveDiscPct.toFixed(2)),
      discount: sapDisc,
      discountAmount: Number(discAmount.toFixed(2)),
      discountedUnitPrice: Number(discountedUnitPrice.toFixed(4)),
      lineTotal: Number(netLine.toFixed(2)),
      requiresApproval: addDisc > 0,
      isExceedingCeiling: effectiveDiscPct > MAX_DISCOUNT_CEILING + 0.01,
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
    hasExceededDiscountCeiling,
    requiresDiscountApproval: hasAdditionalDiscount,
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
