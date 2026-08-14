// Calculadora matemática unificada de totales de cotización/pedido para Grupo León / SAP B1
export function calculateQuoteTotals(products = [], exchangeRate = 3.76) {
  const tc = Number(exchangeRate) || 3.76;

  let grossSubtotalUSD = 0;   // Suma de (qty × precio de lista) antes de descuentos
  let totalDiscountUSD = 0;  // Suma de montos descontados
  let netSubtotalUSD = 0;    // Base imponible neta (Suma de líneas con descuento)

  const normalizedProducts = (products || []).map((p) => {
    const qty = Math.max(0, Number(p.quantity ?? p.Quantity ?? 1));
    const listPrice = Math.max(0, Number(p.price ?? p.Price ?? p.unitPrice ?? 0));

    // Combinar todas las fuentes de descuento (%)
    const sapDisc = Number(p.discount ?? p.discountPercent ?? p.DiscountPercent ?? 0);
    const addDisc = Number(p.lineDiscount ?? 0);
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
