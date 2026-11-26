import test from 'node:test';
import assert from 'node:assert/strict';
import {
  isSpecialAgreementItem,
  resolveSpecialDiscountPct,
} from '../src/features/quotes/utils/discountBreakdown.js';
import {
  calculateQuoteTotals,
  getItemMaxDiscountCeiling,
} from '../src/shared/utils/quoteCalculator.js';

test('Explicit non-convenio promo item with leaked >55% discount is NEVER hijacked as Convenio Cliente (-0%)', () => {
  const item = {
    code: '660100S85B60L',
    price: 168.24,
    unitPrice: 168.24,
    discount: 59.35,
    sapDiscount: 59.35,
    isSpecialPrice: false,
    specialDiscount: 0,
    promoPriceConIGV: 88.5,
    U_US_PROMO: 88.5,
    promoDiscount: 12.12,
    campaignName: 'Oferta del Mes',
    quantity: 1,
    stock: 415,
    stockChecked: true,
  };

  assert.equal(isSpecialAgreementItem(item), false);
  assert.equal(resolveSpecialDiscountPct(item), 0);

  const totals = calculateQuoteTotals([item], 3.45);
  assert.equal(totals.grandTotalUSD, 88.5);
  assert.equal(totals.subtotalUSD, 75);
  assert.equal(totals.igvUSD, 13.5);
});

test('Regular catalog item with isSpecialPrice: false and 43.3% allows additional discount up to 55.0%', () => {
  const item = {
    code: '660100S85B60L',
    price: 168.24,
    discount: 43.3,
    sapDiscount: 43.3,
    isSpecialPrice: false,
    specialDiscount: 0,
    quantity: 1,
    stock: 415,
    stockChecked: true,
  };

  assert.equal(isSpecialAgreementItem(item), false);
  assert.equal(getItemMaxDiscountCeiling(item), 55);

  const totals = calculateQuoteTotals([item], 3.45);
  assert.equal(totals.subtotalUSD, 95.39);
});

test('Real client OSPP Convenio continues applying agreed 59.35% ($80.70 c/IGV) without regression', () => {
  const spItem = {
    itemCode: '660100S85B60L',
    discountPercent: 59.35,
    specialPrice: 68.39,
    specialPriceConIGV: 80.7,
    listPrice: 168.24,
  };
  const item = {
    code: '660100S85B60L',
    price: 168.24,
    discount: 59.35,
    isSpecialPrice: true,
    specialDiscount: 59.35,
    specialPrice: 68.39,
    specialPriceConIGV: 80.7,
    campaignName: 'Convenio Cliente',
    quantity: 1,
    stock: 415,
    stockChecked: true,
  };

  assert.equal(isSpecialAgreementItem(item, spItem), true);
  assert.equal(resolveSpecialDiscountPct(item, spItem), 59.35);

  const totals = calculateQuoteTotals([item], 3.45);
  assert.equal(totals.grandTotalUSD, 80.7);
});

test('resolveSpecialDiscountPct never returns 0 via 0 ?? fallback when convenio discount lives on spItem or item.discount', () => {
  const item = {
    isSpecialPrice: true,
    specialDiscount: 0,
    discount: 59.35,
  };
  assert.equal(resolveSpecialDiscountPct(item), 59.35);
  assert.equal(resolveSpecialDiscountPct(item, { discountPercent: 61.2 }), 61.2);
});
