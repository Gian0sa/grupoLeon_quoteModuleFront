const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const approvalPagePath = path.resolve(
  __dirname,
  "../src/features/quotes/pages/QuoteApprovalPage.jsx"
);
const permissionsPath = path.resolve(
  __dirname,
  "../src/shared/utils/permissions.js"
);

const approvalSrc = fs.readFileSync(approvalPagePath, "utf8");
const permissionsSrc = fs.readFileSync(permissionsPath, "utf8");

test("QuoteApprovalPage permite a Administradores Maestros (Enrique/Misael) ver borradores de terceros en serverQuotes, localQuotesUpdated y búsqueda profunda", () => {
  // 1. validServerQuotes en syncQuotes debe respetar !isMasterAdminUser
  assert.ok(
    approvalSrc.includes(
      "if (isDraftState(qSt) && !isMasterAdminUser && !isDraftOwnedByUser(q, { userId: activeCurrentUserId, username: activeCurrentUsername }))"
    ),
    "validServerQuotes en syncQuotes debe permitir borradores de terceros cuando isMasterAdminUser es true"
  );

  // 2. activeServerQuotes en handleLocalUpdate debe respetar !isMasterAdminUser
  assert.ok(
    approvalSrc.includes(
      "if (isDraftState(sqSt) && !isMasterAdminUser && !isDraftOwnedByUser(sq, { userId: activeCurrentUserId, username: activeCurrentUsername }))"
    ),
    "activeServerQuotes en handleLocalUpdate debe permitir borradores de terceros cuando isMasterAdminUser es true"
  );

  // 3. Búsqueda profunda debe permitir borradores de terceros cuando isMasterAdminUser es true
  assert.ok(
    approvalSrc.includes(
      "return isMasterAdminUser || isDraftOwnedByUser(r, { userId: activeCurrentUserId, username: activeCurrentUsername });"
    ),
    "Búsqueda profunda debe permitir borradores de terceros para Master Admin"
  );

  // 4. Ningún filtro de serverQuotes debe descartar borradores solo con isDraftOwnedByUser sin isMasterAdminUser
  assert.equal(
    approvalSrc.includes(
      "if (isDraftState(qSt) && !isDraftOwnedByUser("
    ),
    false,
    "No debe existir filtro de serverQuotes que descarte borradores de Master Admin"
  );
  assert.equal(
    approvalSrc.includes(
      "if (isDraftState(sqSt) && !isDraftOwnedByUser("
    ),
    false,
    "No debe existir filtro de activeServerQuotes que descarte borradores de Master Admin"
  );

  // 5. Los useEffect de syncQuotes y handleLocalUpdate deben depender de isMasterAdminUser
  assert.ok(
    approvalSrc.includes(
      "[serverQuotes, mySapSellerPrefix, isMasterAdminUser, activeCurrentUserId, activeCurrentUsername, isAdminUser]"
    ),
    "syncQuotes useEffect debe incluir isMasterAdminUser en sus dependencias"
  );
  assert.ok(
    approvalSrc.includes(
      "[serverQuotes, activeCurrentUsername, activeCurrentUserId, authSalesCode, mySapSellerPrefix, isAdminUser, isMasterAdminUser]"
    ),
    "handleLocalUpdate useEffect debe incluir isMasterAdminUser en sus dependencias"
  );
});

test("permissions.js define DRAFT_MASTER_ADMIN_IDS = [10, 12] y canUserViewDraft", () => {
  assert.ok(
    permissionsSrc.includes("export const DRAFT_MASTER_ADMIN_IDS = [10, 12];"),
    "Solo Enrique (10) y Misael (12) deben estar en DRAFT_MASTER_ADMIN_IDS"
  );
  assert.ok(
    permissionsSrc.includes("export function canUserViewDraft("),
    "permissions.js debe exportar canUserViewDraft"
  );

  // Ejecutar lógica real de isDraftMasterAdmin, isDraftOwnedByUser y canUserViewDraft en aislamiento
  const vm = require("node:vm");
  const pureCode = permissionsSrc
    .replace(/^import .*$/gm, "")
    .replace(/export const /g, "const ")
    .replace(/export function /g, "function ")
    .split("export function useIsAdmin")[0]
    .replace(/function useIsDraftMasterAdmin[\s\S]*?\n\}/, "")
    .replace(/function useCanEmitTaxOnlyToSap[\s\S]*?\n\}/, "");

  const sandbox = {};
  vm.runInNewContext(
    `${pureCode}\nthis.exports = { DRAFT_MASTER_ADMIN_IDS, isDraftMasterAdmin, isDraftOwnedByUser, canUserViewDraft };`,
    sandbox
  );
  const { isDraftMasterAdmin, canUserViewDraft } = sandbox.exports;

  const draftByManuel = {
    id: 391,
    docNumber: "COT-WEB-000391",
    state: "BORRADOR",
    userId: 61,
    createdByUsername: "Manuel Zapata",
    sellerName: "541.Manuel Zapata",
  };

  assert.equal(isDraftMasterAdmin({ userId: 10, username: "Enrique" }), true);
  assert.equal(isDraftMasterAdmin({ userId: "12", username: "Misael Cumapa" }), true);
  assert.equal(isDraftMasterAdmin({ userId: 2, username: "Juan" }), false);
  assert.equal(isDraftMasterAdmin({ userId: 49, username: "Angela Rocha" }), false);
  assert.equal(isDraftMasterAdmin({ userId: 61, username: "Manuel Zapata" }), false);

  assert.equal(canUserViewDraft(draftByManuel, { userId: 10, username: "Enrique" }), true);
  assert.equal(canUserViewDraft(draftByManuel, { userId: 12, username: "Misael Cumapa" }), true);
  assert.equal(canUserViewDraft(draftByManuel, { userId: 61, username: "Manuel Zapata" }), true);
  assert.equal(canUserViewDraft(draftByManuel, { userId: 49, username: "Angela Rocha" }), false);
  assert.equal(canUserViewDraft(draftByManuel, { userId: 52, username: "Celia" }), false);
  assert.equal(canUserViewDraft(draftByManuel, { userId: 2, username: "Juan" }), false);
});

test("SapQuotationForm conserva creador original al editar un borrador existente (evita robo de autoría por Enrique/Misael)", () => {
  const formSrc = fs.readFileSync(
    path.resolve(__dirname, "../src/features/quotes/components/SapQuotationForm.jsx"),
    "utf8"
  );
  assert.ok(
    formSrc.includes("const isEditingExistingDraft = Boolean("),
    "SapQuotationForm debe detectar edición de borrador existente"
  );
  assert.ok(
    formSrc.includes("const finalCreatedByUsername = isSavingDraftStatus && !isEditingExistingDraft"),
    "SapQuotationForm solo debe sobrescribir createdByUsername en borradores nuevos"
  );
  assert.ok(
    formSrc.includes("const finalCreatedByUserId = isSavingDraftStatus && !isEditingExistingDraft"),
    "SapQuotationForm solo debe sobrescribir userId en borradores nuevos"
  );
});
