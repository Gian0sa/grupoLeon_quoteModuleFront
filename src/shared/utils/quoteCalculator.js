// Calculadora matemática unificada de totales de cotización/pedido para Grupo León / SAP B1
export function calculateQuoteTotals(products = [], exchangeRate = 3.76) {
  const tc = Number(exchangeRate) || 3.76;

  let grossSubtotalUSD = 0;   // Suma de (qty × precio de lista) antes de descuentos
  let totalDiscountUSD = 0;  // Suma de montos descontados
  let netSubtotalUSD = 0;    // Base imponible neta (Suma de líneas con descuento)

  const normalizedProducts = (products || []).map((p) => {
    const qty = Math.max(0, Number(p.quantity ?? p.Quantity ?? 1));
    const listPrice = Math.max(0, Number(p.price ?? p.Price ?? p.unitPrice ?? p.UnitPrice ?? p.importe ?? p.itemPrice ?? 0));

    // Combinar todas las fuentes de descuento (%)
    const sapDisc = Number(p.discount ?? p.discountPercent ?? p.DiscountPercent ?? 0);
    const addDisc = Number(p.lineDiscount ?? p.LineDiscount ?? 0);
    const totalDiscPct = Math.min(100, Math.max(0, sapDisc + addDisc));

    const grossLine = qty * listPrice;
    const discAmount = grossLine * (totalDiscPct / 100);
    const netLine = grossLine - discAmount;
    const discountedUnitPrice = qty > 0 ? netLine / qty : 0;

    grossSubtotalUSD += grossLine;
    totalDiscountUSD += discAmount;
    netSubtotalUSD += netLine;

    return {
      ...p,
      quantity: qty,
      price: listPrice,
      unitPrice: listPrice,
      discountPercent: totalDiscPct,
      discount: totalDiscPct,
      discountAmount: discAmount,
      discountedUnitPrice,
      lineTotal: netLine,
    };
  });
  
  const igvUSD = netSubtotalUSD * 0.18;
  const grandTotalUSD = netSubtotalUSD + igvUSD;

  const subtotalSOL = netSubtotalUSD * tc;
  const igvSOL = igvUSD * tc;
  const grandTotalSOL = grandTotalUSD * tc;

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
    tc,
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
