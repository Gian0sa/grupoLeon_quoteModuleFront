const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

// Extract isItemTaxOnly from quoteCalculator.js and checkHasTaxOnly / checkHasAdditionalDiscount from QuoteApprovalPage.jsx
const calcSrc = fs.readFileSync(
  path.resolve(__dirname, '../src/shared/utils/quoteCalculator.js'),
  'utf8'
);
const approvalSrc = fs.readFileSync(
  path.resolve(__dirname, '../src/features/quotes/pages/QuoteApprovalPage.jsx'),
  'utf8'
);

const isItemTaxOnlyMatch = calcSrc.match(/export const isItemTaxOnly = [\s\S]*?\n\);/);
assert.ok(isItemTaxOnlyMatch, 'isItemTaxOnly must exist in quoteCalculator.js');

const checkHasTaxOnlyMatch = approvalSrc.match(/export const checkHasTaxOnly = [\s\S]*?\n\};/);
assert.ok(checkHasTaxOnlyMatch, 'checkHasTaxOnly must exist in QuoteApprovalPage.jsx');

const checkHasAddMatch = approvalSrc.match(/export const checkHasAdditionalDiscount = [\s\S]*?\n\};/);
assert.ok(checkHasAddMatch, 'checkHasAdditionalDiscount must exist in QuoteApprovalPage.jsx');

const sandbox = {
  isSpecialAgreementItem: (it) => Boolean(it?.isSpecialAgreement || it?.hasSpecialPrice),
};
vm.createContext(sandbox);
vm.runInContext(
  [
    isItemTaxOnlyMatch[0].replace(/^export const /, 'var '),
    checkHasTaxOnlyMatch[0].replace(/^export const /, 'var '),
    checkHasAddMatch[0].replace(/^export const /, 'var '),
  ].join('\n'),
  sandbox
);

const { checkHasTaxOnly, checkHasAdditionalDiscount } = sandbox;

test('Pure Transferencia Gratuita (TaxOnly) triggers TaxOnly badge only, not Descuento Adicional', () => {
  const quote = {
    id: 373,
    docNumber: 'COT-WEB-000373',
    items: [
      { itemCode: 'PROD-1', quantity: 1, TaxOnly: 'tYES', isTaxOnly: true, lineDiscount: 0, discountPercent: 0 },
    ],
    totals: {
      hasTaxOnlyItems: true,
      taxOnlyCount: 1,
      requiresDiscountApproval: true,
      grandTotalUSD: 0.51,
    },
  };
  assert.equal(checkHasTaxOnly(quote), true);
  assert.equal(checkHasAdditionalDiscount(quote), false);
});

test('Summary-only Transferencia Gratuita (without items array) triggers TaxOnly badge only', () => {
  const quote = {
    id: 374,
    totals: {
      hasTaxOnlyItems: true,
      taxOnlyCount: 2,
      requiresDiscountApproval: true,
    },
  };
  assert.equal(checkHasTaxOnly(quote), true);
  assert.equal(checkHasAdditionalDiscount(quote), false);
});

test('Mixed quote (TaxOnly + item with additional discount) triggers BOTH badges', () => {
  const quote = {
    items: [
      { itemCode: 'GIFT-1', TaxOnly: 'tYES', lineDiscount: 100 },
      { itemCode: 'PAID-1', TaxOnly: 'tNO', lineDiscount: 5 },
    ],
  };
  assert.equal(checkHasTaxOnly(quote), true);
  assert.equal(checkHasAdditionalDiscount(quote), true);
});

test('Normal additional discount quote triggers Descuento Adicional only', () => {
  const quote = {
    items: [
      { itemCode: 'PAID-1', sapDiscount: 10, lineDiscount: 8, discountPercent: 18 },
    ],
  };
  assert.equal(checkHasTaxOnly(quote), false);
  assert.equal(checkHasAdditionalDiscount(quote), true);
});

test('Plain quote without TaxOnly or additional discount triggers neither badge', () => {
  const quote = {
    items: [
      { itemCode: 'PAID-1', sapDiscount: 10, lineDiscount: 0, discountPercent: 10 },
    ],
  };
  assert.equal(checkHasTaxOnly(quote), false);
  assert.equal(checkHasAdditionalDiscount(quote), false);
});

test('Null/empty quote handles safely without throwing', () => {
  assert.equal(checkHasTaxOnly(null), false);
  assert.equal(checkHasTaxOnly({}), false);
  assert.equal(checkHasAdditionalDiscount(null), false);
  assert.equal(checkHasAdditionalDiscount({}), false);
});

test('TaxOnly with Y flag and totals.hasDiscount does not falsely trigger Descuento Adicional', () => {
  const quote = {
    items: [{ itemCode: 'GIFT-Y', TaxOnly: 'Y', lineDiscount: 0 }],
    totals: { hasTaxOnlyItems: true, hasDiscount: true, requiresDiscountApproval: true },
  };
  assert.equal(checkHasTaxOnly(quote), true);
  assert.equal(checkHasAdditionalDiscount(quote), false);
});

test('QuoteDetailDrawer guards totals.hasDiscount with !hasTaxOnlyItems and uses isItemTaxOnly + #be185d', () => {
  const drawerSrc = fs.readFileSync(
    path.resolve(__dirname, '../src/features/quotes/components/QuoteDetailDrawer.jsx'),
    'utf8'
  );
  assert.match(drawerSrc, /targetDoc\?\.totals\?\.hasDiscount\s*&&\s*!hasTaxOnlyItems/);
  assert.match(drawerSrc, /targetDoc\?\.totals\?\.requiresDiscountApproval\s*&&\s*!hasTaxOnlyItems/);
  assert.ok(drawerSrc.includes('isItemTaxOnly(item)'), 'QuoteDetailDrawer item badges should use isItemTaxOnly(item)');
  assert.ok(!drawerSrc.includes('bg="purple.600" color="white" fontSize="8.5px"'), 'Item TaxOnly badge should not use purple.600');
  // Verify handleToggleItemTaxOnly preserves tc (not hardcoding fallback 1) and handleSyncToSap scales customPriceConIGV
  assert.ok(!drawerSrc.includes('targetDoc?.totals?.exchangeRate || 1) || 1'), 'handleToggleItemTaxOnly must not fall back to tcVal=1');
  assert.ok(!drawerSrc.includes('customPriceConIGV: p.customPriceConIGV || p.unitPriceConIGV'), 'handleSyncToSap must not pass unscaled unitPriceConIGV as customPriceConIGV');
});

test('SapQuotationForm preserves TaxOnly and PaymentGroupCode=96 in handleAdminApproveQuote and handleSaveAction', () => {
  const formSrc = fs.readFileSync(
    path.resolve(__dirname, '../src/features/quotes/components/SapQuotationForm.jsx'),
    'utf8'
  );
  assert.ok(formSrc.includes('isItemTaxOnly'), 'SapQuotationForm must import and use isItemTaxOnly');
  assert.ok(formSrc.includes("TaxOnly: \"tYES\""), 'SapQuotationForm itemClean must preserve TaxOnly: tYES');
  assert.ok(formSrc.includes('allInStockTaxOnly ? freeTransferPaymentType : selectedPaymentType'), 'handleAdminApproveQuote must force PaymentGroupCode 96 for pure TaxOnly');
  assert.ok(formSrc.includes('paymentMethod: allInStockTaxOnly ? null'), 'handleAdminApproveQuote must null paymentMethod for pure TaxOnly');
});

test('sapPayloadGuide buildCanonicalSapPayload aligns pure TaxOnly preview even above S/700 detraction threshold', async () => {
  const guideUrl = new URL('../src/features/quotes/utils/sapPayloadGuide.js', `file://${__filename.replace(/\\/g, '/')}`).href;
  const { buildCanonicalSapPayload } = await import(guideUrl);
  const payload = buildCanonicalSapPayload({
    clientDocument: 'CL20602264531',
    clientName: 'CLIENTE TEST S.A.C.',
    currency: 'SOL',
    headerDiscount: 5,
    totals: { grandTotalUSD: 1500 },
    paymentType: { GroupNum: -1 },
    products: [
      { productCode: '2080044180003', quantity: 1, unitPrice: 1196.84, isTaxOnly: true },
    ],
  });
  assert.equal(payload.PaymentGroupCode, 96);
  assert.equal(payload.U_VS_AFEDET, 'N');
  assert.equal(payload.DiscountPercent, 0);
  assert.equal(payload.Comments, '10) TRANSFERENCIA GRATUITA');
  assert.equal(payload.DocumentLines[0].TaxOnly, 'tYES');
  assert.equal(payload.DocumentLines[0].U_VS_ONEROSO, '1');
  assert.equal(payload.DocumentLines[0].U_tipoOpT12, '99');
});

test('isFreeTransferPaymentType and formatPaymentTerms handle code 96 and 10) TRANSFERENCIA GRATUITA safely', async () => {
  const fmtUrl = new URL('../src/shared/utils/quoteLogisticsFormatters.js', `file://${__filename.replace(/\\/g, '/')}`).href;
  const { isFreeTransferPaymentType, formatPaymentTerms, FREE_TRANSFER_PAYMENT_TYPE } = await import(fmtUrl);

  assert.equal(isFreeTransferPaymentType(96), true);
  assert.equal(isFreeTransferPaymentType('96'), true);
  assert.equal(isFreeTransferPaymentType({ GroupNum: 96 }), true);
  assert.equal(isFreeTransferPaymentType({ GroupNumber: 96, PaymentTermsGroupName: '10) TRANSFERENCIA GRATUITA' }), true);
  assert.equal(isFreeTransferPaymentType(JSON.stringify(FREE_TRANSFER_PAYMENT_TYPE)), true);
  assert.equal(isFreeTransferPaymentType('10) TRANSFERENCIA GRATUITA'), true);
  assert.equal(isFreeTransferPaymentType(-1), false);
  assert.equal(isFreeTransferPaymentType({ GroupNum: 2, PymntGroup: 'Crédito 30 Días' }), false);
  assert.equal(isFreeTransferPaymentType(null), false);

  assert.equal(formatPaymentTerms(96), '10) TRANSFERENCIA GRATUITA');
  assert.equal(formatPaymentTerms('96'), '10) TRANSFERENCIA GRATUITA');
  assert.equal(formatPaymentTerms(FREE_TRANSFER_PAYMENT_TYPE), '10) TRANSFERENCIA GRATUITA');
});

test('NewSellTerms and SapQuotationForm do not classify 10) TRANSFERENCIA GRATUITA as CREDITO', () => {
  const termsSrc = fs.readFileSync(
    path.resolve(__dirname, '../src/features/quotes/components/NewSellTerms.jsx'),
    'utf8'
  );
  const formSrc = fs.readFileSync(
    path.resolve(__dirname, '../src/features/quotes/components/SapQuotationForm.jsx'),
    'utf8'
  );
  assert.ok(termsSrc.includes('isFreeTransferPaymentType(selectedObj)'), 'handlePaymentTypeChange must handle Transferencia Gratuita explicitly');
  assert.ok(termsSrc.includes('const isFreeTransfer = Boolean(isPureFreeTransfer || isFreeTransferPaymentType(selectedPaymentType))'), 'NewSellTerms render must distinguish free transfer from CREDITO');
  assert.ok(formSrc.includes('if (isAllInStockTaxOnly || isFreeTransferPaymentType(selectedPaymentType)) return false;'), 'isCreditSale must return false for pure free transfers');
});

test('2-step Transferencia Gratuita approval: Facturación escalates to PENDIENTE_GERENCIA (Juan) and only Admin/Gerencia emits to SAP', () => {
  const permSrc = fs.readFileSync(
    path.resolve(__dirname, '../src/shared/utils/permissions.js'),
    'utf8'
  );
  const drawerSrc = fs.readFileSync(
    path.resolve(__dirname, '../src/features/quotes/components/QuoteDetailDrawer.jsx'),
    'utf8'
  );
  const formSrc = fs.readFileSync(
    path.resolve(__dirname, '../src/features/quotes/components/SapQuotationForm.jsx'),
    'utf8'
  );

  // Extract pure canEmitTaxOnlyToSap + checkIsAdmin + MASTER_ADMIN_IDS into VM sandbox
  const masterMatch = permSrc.match(/export const MASTER_ADMIN_IDS = \[[\s\S]*?\];/);
  const checkAdminMatch = permSrc.match(/export function checkIsAdmin[\s\S]*?\n\}/);
  const canEmitMatch = permSrc.match(/export function canEmitTaxOnlyToSap[\s\S]*?\n\}/);
  assert.ok(masterMatch && checkAdminMatch && canEmitMatch, 'permissions.js must export MASTER_ADMIN_IDS, checkIsAdmin and canEmitTaxOnlyToSap');

  const permSandbox = {};
  vm.createContext(permSandbox);
  vm.runInContext(
    [
      masterMatch[0].replace(/^export const /, 'var '),
      checkAdminMatch[0].replace(/^export /, ''),
      canEmitMatch[0].replace(/^export /, ''),
    ].join('\n'),
    permSandbox
  );

  assert.equal(permSandbox.canEmitTaxOnlyToSap({ userId: 2, role: 'ADMINISTRADOR', username: 'Juan Punkay' }), true);
  assert.equal(permSandbox.canEmitTaxOnlyToSap({ userId: 42, role: 'ADMINISTRADOR', username: 'Juan' }), true);
  assert.equal(permSandbox.canEmitTaxOnlyToSap({ userId: 49, role: 'FACTURACION', username: 'Angela Rocha', endpoints: ['POST:/quotes/sap/order'] }), false);
  assert.equal(permSandbox.canEmitTaxOnlyToSap({ userId: 99, role: 'FACTURACION', username: 'Nueva Facturadora', endpoints: ['*'] }), false);
  assert.equal(permSandbox.canEmitTaxOnlyToSap({ userId: 50, role: 'VENDEDOR', username: 'Vendedor' }), false);

  assert.ok(drawerSrc.includes('handleEscalateTaxOnlyToGerencia'), 'QuoteDetailDrawer must support escalating TaxOnly to Gerencia (Juan)');
  assert.ok(drawerSrc.includes('PENDIENTE_GERENCIA'), 'QuoteDetailDrawer must handle PENDIENTE_GERENCIA state');
  assert.ok(formSrc.includes('handleEscalateTaxOnlyToGerencia'), 'SapQuotationForm must support escalating TaxOnly to Gerencia (Juan)');
  assert.ok(approvalSrc.includes('👑 Pend. Gerencia (Juan)'), 'QuoteApprovalPage must render PENDIENTE_GERENCIA badge');
});

test('Draft isolation: Angela and Celia only see and manage their own drafts even when sellerName is 001.Ofic Administración', () => {
  const permSrc = fs.readFileSync(
    path.resolve(__dirname, '../src/shared/utils/permissions.js'),
    'utf8'
  );
  const draftOwnerMatch = permSrc.match(/export function isDraftOwnedByUser[\s\S]*?\n\}/);
  assert.ok(draftOwnerMatch, 'permissions.js must export isDraftOwnedByUser');

  const sandboxDraft = {};
  vm.createContext(sandboxDraft);
  vm.runInContext(draftOwnerMatch[0].replace(/^export /, ''), sandboxDraft);

  const draftAngela = { id: 79, state: 'BORRADOR', userId: 49, createdByUsername: 'Angela Rocha', sellerName: '001.Ofic Administración' };
  const draftCelia = { id: 78, state: 'BORRADOR', userId: 52, createdByUsername: 'Celia', sellerName: '001.Ofic Administración' };
  const draftSeller = { id: 74, state: 'BORRADOR', userId: 60, createdByUsername: 'Richard Talavera', sellerName: '552.Richard Talavera' };
  const draftEnrique = { id: 388, state: 'BORRADOR', userId: 10, createdByUsername: 'Enrique', sellerName: '001.Ofic Administración' };

  assert.equal(sandboxDraft.isDraftOwnedByUser(draftAngela, { userId: 49, username: 'Angela Rocha' }), true);
  assert.equal(sandboxDraft.isDraftOwnedByUser(draftCelia, { userId: 49, username: 'Angela Rocha' }), false);
  assert.equal(sandboxDraft.isDraftOwnedByUser(draftSeller, { userId: 49, username: 'Angela Rocha' }), false);
  assert.equal(sandboxDraft.isDraftOwnedByUser(draftCelia, { userId: 52, username: 'Celia' }), true);
  assert.equal(sandboxDraft.isDraftOwnedByUser(draftAngela, { userId: 52, username: 'Celia' }), false);
  // Caso crítico: cuando quote.userId existe (10) pero en el frontend userId viene null y solo hay username: "Enrique"
  assert.equal(sandboxDraft.isDraftOwnedByUser(draftEnrique, { userId: null, username: 'Enrique' }), true);
  assert.equal(sandboxDraft.isDraftOwnedByUser(draftEnrique, { userId: '', username: 'enrique' }), true);
  assert.equal(sandboxDraft.isDraftOwnedByUser(draftEnrique, { userId: null, username: 'Angela Rocha' }), false);

  assert.ok(approvalSrc.includes('isDraftState(qStatus)'), 'QuoteApprovalPage must isolate drafts strictly by creator user');
  assert.ok(approvalSrc.includes('isDraftOwnedByUser(targetQuote, { userId: activeCurrentUserId, username: activeCurrentUsername })'), 'QuoteApprovalPage handleDeleteQuote must verify draft ownership');
  assert.ok(approvalSrc.includes('👤 Creado por:'), 'QuoteApprovalPage must show creator badge on drafts');
});
