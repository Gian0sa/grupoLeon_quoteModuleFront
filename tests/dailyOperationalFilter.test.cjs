const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { pathToFileURL } = require('node:url');

async function loadDailyFilter() {
  const full = path.resolve(__dirname, '../src/features/quotes/utils/dailyOperationalFilter.js');
  return import(pathToFileURL(full).href);
}

async function loadHistoryUtils() {
  const full = path.resolve(__dirname, '../src/features/quotes/utils/quoteHistoryUtils.js');
  return import(pathToFileURL(full).href);
}

test('isQuoteOperationalDaily muestra facturados el mismo día y los oculta automáticamente al día siguiente', async () => {
  const { isQuoteOperationalDaily } = await loadDailyFilter();

  const facturadoAyer = {
    id: 22253,
    docNumber: 'COT-022253',
    docDate: '2026-11-14',
    state: 'COMPLETADO',
    approvalStatus: 'COMPLETADO',
    sapDocNum: 22253,
    totals: {
      sapDocNum: 22253,
      invoicedAt: '2026-11-14T12:00:00.000-05:00',
    },
    historyLog: [
      { status: 'FACTURADO', timestamp: '2026-11-14T12:00:00.000-05:00', user: 'Sistema SAP B1' },
    ],
  };

  assert.equal(isQuoteOperationalDaily(facturadoAyer, '2026-11-14'), true);
  assert.equal(isQuoteOperationalDaily(facturadoAyer, '2026-11-20'), false);

  const emitidoAyerFacturadoHoy = {
    id: 22310,
    docNumber: 'COT-022310',
    docDate: '2026-11-19',
    state: 'COMPLETADO',
    approvalStatus: 'COMPLETADO',
    sapDocNum: 22310,
    approvedAt: '2026-11-19T17:00:00.000-05:00',
    totals: {
      sapDocNum: 22310,
      approvedAt: '2026-11-19T17:00:00.000-05:00',
      invoicedAt: '2026-11-20T09:15:00.000-05:00',
    },
  };

  // Hoy (día en que se facturó) SÍ debe mostrarse; mañana (2026-11-21) desaparece
  assert.equal(isQuoteOperationalDaily(emitidoAyerFacturadoHoy, '2026-11-20'), true);
  assert.equal(isQuoteOperationalDaily(emitidoAyerFacturadoHoy, '2026-11-21'), false);

  const pendienteAntiguo = {
    id: 901,
    docNumber: 'COT-WEB-000901',
    docDate: '2026-11-01',
    state: 'ENVIADO',
    approvalStatus: 'ENVIADO',
  };
  assert.equal(isQuoteOperationalDaily(pendienteAntiguo, '2026-11-20'), true);

  const borradorAntiguo = {
    id: 902,
    docNumber: 'COT-WEB-000902',
    docDate: '2026-11-01',
    state: 'BORRADOR',
    approvalStatus: 'BORRADOR',
  };
  assert.equal(isQuoteOperationalDaily(borradorAntiguo, '2026-11-20'), true);

  const anuladoAyer = {
    id: 903,
    docNumber: 'COT-WEB-000903',
    docDate: '2026-11-19',
    state: 'CANCELADO',
    approvalStatus: 'CANCELADO',
    totals: { cancelledAt: '2026-11-19T18:00:00.000-05:00' },
  };
  assert.equal(isQuoteOperationalDaily(anuladoAyer, '2026-11-19'), true);
  assert.equal(isQuoteOperationalDaily(anuladoAyer, '2026-11-20'), false);
});

test('extractQuoteApprovalAudit ignora Sistema SAP B1 como aprobador y respeta auditoría humana', async () => {
  const { extractQuoteApprovalAudit } = await loadHistoryUtils();

  const legacyAudit = extractQuoteApprovalAudit({
    state: 'COMPLETADO',
    sapDocNum: 21861,
    historyLog: [
      { status: 'FACTURADO', timestamp: '2026-11-20T07:40:00.000-05:00', user: 'Sistema SAP B1' },
    ],
  });
  assert.equal(legacyAudit.approvedBy, null);
  assert.equal(legacyAudit.emittedBy, null);
  assert.equal(legacyAudit.isLegacySapOnly, true);

  const realAudit = extractQuoteApprovalAudit({
    state: 'COMPLETADO',
    sapDocNum: 22310,
    totals: { approvedBy: 'Juan', emittedBy: 'Juan' },
    historyLog: [
      { status: 'EMITIDO', timestamp: '2026-11-20T08:00:00.000-05:00', user: 'Juan' },
      { status: 'FACTURADO', timestamp: '2026-11-20T09:15:00.000-05:00', user: 'Sistema SAP B1' },
    ],
  });
  assert.equal(realAudit.approvedBy, 'Juan');
  assert.equal(realAudit.emittedBy, 'Juan');
});
