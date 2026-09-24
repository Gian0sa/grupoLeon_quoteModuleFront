// Calculadora matemática unificada de totales de cotización/pedido para Grupo León / SAP B1
export const APPROVAL_DISCOUNT_THRESHOLD = 50.0; // Umbral a partir del cual requiere aprobación comercial (50.0%)
export const STANDARD_DISCOUNT_CEILING = 55.0;   // Tope comercial estándar ordinario (55.0%)
export const MAX_DISCOUNT_CEILING = 65.0;        // Tope máximo absoluto para volumen / mayoreo (65.0%)

export function calculateQuoteTotals(products = [], exchangeRate = 3.76, options = {}) {
  const tc = Number(exchangeRate) || 3.76;
  const isSapDoc = Boolean(options.isSapDoc || options.isSapDirect);

  let grossSubtotalUSD = 0;   // Suma de (qty × precio de lista) antes de descuentos
  let totalDiscountUSD = 0;  // Suma de montos descontados
  let netSubtotalUSD = 0;    // Base imponible neta (Suma de líneas con descuento)
  let hasAdditionalDiscount = false;
  let hasVolumeDiscount = false; // Descuentos mayores a 55% hasta 65% por volumen (>100 uds)
  let hasDiscountAboveThreshold = false; // Descuentos mayores o iguales a 50%
  let hasExceededDiscountCeiling = false;

  const normalizedProducts = (products || []).map((p) => {
    const qty = Math.max(0, Number(p.quantity ?? p.Quantity ?? 1));
    const listPrice = Math.max(0, Number(p.price ?? p.Price ?? p.unitPrice ?? p.UnitPrice ?? p.importe ?? p.itemPrice ?? 0));

    // Descuento base de SAP (%) - Priorizar siempre sapDiscount si existe
    const sapDisc = Math.max(0, Math.min(100, Number(p.sapDiscount ?? p.discount ?? 0)));
    // Descuento por Promoción / Oferta del Mes (%)
    const promoDisc = Math.max(0, Math.min(100, Number(p.promoDiscount ?? p.PromoDiscount ?? 0)));
    // Descuento adicional o ajuste de margen (%)
    // NOTA: addDisc puede ser negativo cuando se vende más caro (menor descuento / mayor margen)
    let addDisc = Number(p.lineDiscount ?? p.LineDiscount ?? 0);
    if (isNaN(addDisc)) addDisc = 0;

    const grossLine = qty * listPrice;
    
    // Si la línea proviene directamente de un documento emitido/registrado en SAP:
    // Respetar el total de descuento y montos oficiales aprobados en SAP sin recortarlos
    const isLineFromSap = isSapDoc || Boolean(p.isSapDirect || p.fromSap);
    let totalDisc;
    if (isLineFromSap && p.discountPercent !== undefined && p.discountPercent !== null) {
      totalDisc = Math.max(0, Math.min(100, Number(p.discountPercent)));
      // Si en SAP el descuento total difiere del descuento base y no había addDisc registrado
      if (addDisc === 0 && (sapDisc + promoDisc) > 0 && Math.abs(totalDisc - (sapDisc + promoDisc)) > 0.01) {
        addDisc = Number((totalDisc - (sapDisc + promoDisc)).toFixed(2));
      }
    } else {
      const rawTotalDisc = sapDisc + promoDisc + addDisc;
      const applicableCeiling = qty > 100 ? MAX_DISCOUNT_CEILING : STANDARD_DISCOUNT_CEILING;
      totalDisc = Math.min(applicableCeiling, Math.max(0, rawTotalDisc));
      if (rawTotalDisc > applicableCeiling + 0.01) {
        hasExceededDiscountCeiling = true;
      }
    }

    if (addDisc > 0) {
      hasAdditionalDiscount = true;
    }

    const discountedUnitPrice = isLineFromSap && p.finalPrice
      ? Number(p.finalPrice)
      : listPrice * (1 - totalDisc / 100);
    const netLine = isLineFromSap && (p.subtotal || p.lineTotal)
      ? Number(p.subtotal || p.lineTotal)
      : qty * discountedUnitPrice;
    const discAmount = Math.max(0, grossLine - netLine);

    const isVolumeLine = qty > 100 && totalDisc > STANDARD_DISCOUNT_CEILING + 0.01;
    if (isVolumeLine) {
      hasVolumeDiscount = true;
    }
    if (totalDisc > APPROVAL_DISCOUNT_THRESHOLD + 0.009) {
      hasDiscountAboveThreshold = true;
    }

    grossSubtotalUSD += grossLine;
    totalDiscountUSD += discAmount;
    netSubtotalUSD += netLine;

    const requiresApproval = totalDisc > APPROVAL_DISCOUNT_THRESHOLD + 0.009 || isVolumeLine;

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
      requiresApproval,
      isHigherMargin: addDisc < 0,
      isVolumeDiscount: isVolumeLine,
      isExceedingCeiling: !isLineFromSap && (sapDisc + promoDisc + addDisc > (qty > 100 ? MAX_DISCOUNT_CEILING : STANDARD_DISCOUNT_CEILING) + 0.01),
    };
  });
  
  // 1. Total General con IGV: suma matemática de las líneas (lineTotal) redondeadas a 2 decimales
  const sumOfLineTotals = normalizedProducts.reduce((acc, it) => acc + (it.lineTotal || 0), 0);
  const grandTotalUSD = Number((sumOfLineTotals > 0 ? sumOfLineTotals : netSubtotalUSD).toFixed(2));

  // 2. Base imponible neta (desagregando el 18% de IGV): Total / 1.18
  const subtotalUSD = Number((grandTotalUSD / 1.18).toFixed(2));

  // 3. IGV 18% desagregado exacto: Total - Base Imponible (garantiza coincidencia exacta al centavo)
  const igvUSD = Number((grandTotalUSD - subtotalUSD).toFixed(2));

  // 4. Valores equivalentes en Soles (PEN) con coherencia matemática exacta
  const grandTotalSOL = Number((grandTotalUSD * tc).toFixed(2));
  const subtotalSOL = Number((grandTotalSOL / 1.18).toFixed(2));
  const igvSOL = Number((grandTotalSOL - subtotalSOL).toFixed(2));
  const discPct = grossSubtotalUSD > 0 ? (totalDiscountUSD / grossSubtotalUSD) * 100 : 0;

  return {
    normalizedProducts,
    grossSubtotalUSD: Number(grossSubtotalUSD.toFixed(2)),
    totalDiscountUSD: Number(totalDiscountUSD.toFixed(2)),
    subtotalUSD, // Subtotal neto afectado
    netBaseUSD: subtotalUSD,
    igvUSD,      // IGV 18% exacto sobre la base neta
    grandTotalUSD, // Total general exacto (Subtotal + IGV)
    subtotalSOL,
    igvSOL,
    grandTotalSOL,
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
