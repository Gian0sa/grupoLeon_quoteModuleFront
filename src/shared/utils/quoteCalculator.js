// Calculadora matemática unificada de totales de cotización/pedido para Grupo León / SAP B1
export const APPROVAL_DISCOUNT_THRESHOLD = 50.0; // Umbral a partir del cual requiere aprobación comercial (50.0%)
export const STANDARD_DISCOUNT_CEILING = 55.0;   // Tope comercial estándar ordinario (55.0%)
export const MAX_DISCOUNT_CEILING = 65.0;        // Tope máximo absoluto para volumen / mayoreo (65.0%)

export const isItemWithoutStock = (p) => Boolean(
  p && (
    p.isAgotado === true ||
    (p.stockChecked && typeof p.stock === "number" && p.stock <= 0) ||
    (p.stock !== undefined && p.stock !== null && Number(p.stock) === 0)
  )
);

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
    const isOutOfStock = isItemWithoutStock(p);

    // Si no tiene stock, no tiene precio ni descuento en el cálculo comercial (Demanda Back Order)
    const listPrice = isOutOfStock
      ? 0
      : Math.max(0, Number(p.price ?? p.Price ?? p.unitPrice ?? p.UnitPrice ?? p.importe ?? p.itemPrice ?? 0));

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
      : Number(p.lineDiscount ?? p.LineDiscount ?? 0);
    if (isNaN(addDisc)) addDisc = 0;

    const grossLine = qty * listPrice;
    
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
    } else {
      const rawTotalDisc = sapDisc + promoDisc + addDisc;
      const applicableCeiling = qty > 100 ? MAX_DISCOUNT_CEILING : STANDARD_DISCOUNT_CEILING;
      totalDisc = Math.min(applicableCeiling, Math.max(0, rawTotalDisc));
      if (rawTotalDisc > applicableCeiling + 0.01) {
        hasExceededDiscountCeiling = true;
      }
    }

    if (!isOutOfStock && addDisc > 0) {
      hasAdditionalDiscount = true;
    }

    const discountedUnitPrice = isOutOfStock
      ? 0
      : (isLineFromSap && p.finalPrice
        ? Number(p.finalPrice)
        : listPrice * (1 - totalDisc / 100));
    const netLine = isOutOfStock
      ? 0
      : (isLineFromSap && (p.subtotal || p.lineTotal)
        ? Number(p.subtotal || p.lineTotal)
        : qty * discountedUnitPrice);
    const discAmount = isOutOfStock ? 0 : Math.max(0, grossLine - netLine);

    const isVolumeLine = !isOutOfStock && qty > 100 && totalDisc > STANDARD_DISCOUNT_CEILING + 0.01;
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
      discountedUnitPrice: Number(discountedUnitPrice.toFixed(4)),
      lineTotal: Number(netLine.toFixed(2)),
      requiresApproval,
      isHigherMargin: !isOutOfStock && addDisc < 0,
      isVolumeDiscount: isVolumeLine,
      isExceedingCeiling: !isOutOfStock && !isLineFromSap && (sapDisc + promoDisc + addDisc > (qty > 100 ? MAX_DISCOUNT_CEILING : STANDARD_DISCOUNT_CEILING) + 0.01),
      isOutOfStock,
      isBackOrder: isOutOfStock,
    };
  });
  
  // 1. Base imponible neta (Suma de líneas con stock tras descuentos, idéntico a SAP B1):
  const sumOfLineTotals = normalizedProducts.reduce((acc, it) => acc + (it.lineTotal || 0), 0);
  const subtotalUSD = Number((sumOfLineTotals > 0 ? sumOfLineTotals : netSubtotalUSD).toFixed(2));

  // 2. I.G.V. Oficial (18%) sumado al final sobre el subtotal neto, tal como lo hace SAP B1:
  const igvUSD = Number((subtotalUSD * 0.18).toFixed(2));

  // 3. Total General Oficial (Subtotal Neto + I.G.V.):
  const grandTotalUSD = Number((subtotalUSD + igvUSD).toFixed(2));

  // 4. Valores equivalentes en Soles (PEN) con coherencia matemática exacta:
  const subtotalSOL = Number((subtotalUSD * tc).toFixed(2));
  const igvSOL = Number((igvUSD * tc).toFixed(2));
  const grandTotalSOL = Number((grandTotalUSD * tc).toFixed(2));
  const discPct = grossSubtotalUSD > 0 ? (totalDiscountUSD / grossSubtotalUSD) * 100 : 0;

  const inStockProducts = normalizedProducts.filter((p) => !p.isOutOfStock);
  const backOrderProducts = normalizedProducts.filter((p) => p.isOutOfStock);

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
