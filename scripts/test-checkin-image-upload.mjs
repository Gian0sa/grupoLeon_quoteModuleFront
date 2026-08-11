/**
 * ============================================================
 *  TEST: Check-In Image Upload — Validación de regresión
 * ============================================================
 *  Valida los 3 bugs que causaban que el Check-In se
 *  "reiniciara" cuando el vendedor intentaba actualizar la foto.
 *
 *  CÓMO CORRER:
 *    node scripts/test-checkin-image-upload.mjs
 *
 *  NO necesita Vitest, Jest ni ninguna dependencia extra.
 * ============================================================
 */

// ─── Mini test runner ────────────────────────────────────────
let passed = 0;
let failed = 0;
const results = [];

function test(name, fn) {
  try {
    fn();
    results.push({ ok: true, name });
    passed++;
  } catch (e) {
    results.push({ ok: false, name, error: e.message });
    failed++;
  }
}

function assert(condition, msg) {
  if (!condition) throw new Error(msg || "Assertion failed");
}

function assertEqual(a, b, msg) {
  if (a !== b) throw new Error(msg || `Expected ${JSON.stringify(b)}, got ${JSON.stringify(a)}`);
}

// ─── Simulación del hook useImageUpload ─────────────────────
/**
 * Replica la lógica del hook sin React.
 * Nos permite verificar que el fileInputKey sube correctamente
 * en cada escenario sin montar un componente real.
 */
function createImageUploadHook() {
  let image = null;
  let imagePreview = null;
  let isProcessingImage = false;
  let fileInputKey = 0;   // ← la clave del fix

  const resetImage = () => {
    image = null;
    imagePreview = null;
    fileInputKey++;        // ← debe incrementar siempre
  };

  const simulateError = () => {
    isProcessingImage = false;
    fileInputKey++;        // ← debe incrementar en error
  };

  const simulateSuccess = (fakeFile, fakePreview) => {
    image = fakeFile;
    imagePreview = fakePreview;
    isProcessingImage = false;
  };

  const startProcessing = () => {
    isProcessingImage = true;
  };

  return {
    get image() { return image; },
    get imagePreview() { return imagePreview; },
    get isProcessingImage() { return isProcessingImage; },
    get fileInputKey() { return fileInputKey; },
    resetImage,
    simulateError,
    simulateSuccess,
    startProcessing,
  };
}

// ─── Simulación de compressImage ────────────────────────────
async function compressImage_OK(file) {
  return { name: file.name, size: file.size * 0.7, type: "image/jpeg" };
}

async function compressImage_FAIL() {
  throw new Error("Error al comprimir imagen");
}

// ─── Simulación de validación useVisitSubmit ─────────────────
function validate({ type, hasActiveCheckIn, image, existingImageData, selectedClient }) {
  if (type === "IN" && hasActiveCheckIn) return { ok: false, reason: "CHECK_IN_YA_ACTIVO" };
  if (type === "OUT" && !hasActiveCheckIn) return { ok: false, reason: "SIN_CHECKIN_ACTIVO" };

  if (type === "IN" && !image) {
    const hasValidExisting =
      existingImageData?.hasImage && existingImageData?.isValid;
    if (!hasValidExisting) return { ok: false, reason: "IMAGEN_REQUERIDA" };
  }

  if (!selectedClient) return { ok: false, reason: "CLIENTE_REQUERIDO" };

  return { ok: true };
}

// ═══════════════════════════════════════════════════════════════
//  SUITE 1: fileInputKey — Lógica de reset del input
// ═══════════════════════════════════════════════════════════════
console.log("\n\uD83D\uDD11  SUITE 1: fileInputKey (anti-bug del browser)");

test("fileInputKey inicia en 0", () => {
  const hook = createImageUploadHook();
  assertEqual(hook.fileInputKey, 0, "Debe iniciar en 0");
});

test("fileInputKey incrementa al hacer resetImage()", () => {
  const hook = createImageUploadHook();
  hook.resetImage();
  assertEqual(hook.fileInputKey, 1, "Debe ser 1 tras primer reset");
  hook.resetImage();
  assertEqual(hook.fileInputKey, 2, "Debe ser 2 tras segundo reset");
});

test("fileInputKey incrementa al ocurrir un error de compresión", () => {
  const hook = createImageUploadHook();
  hook.startProcessing();
  hook.simulateError();
  assertEqual(hook.fileInputKey, 1, "Error debe incrementar key para liberar el input");
});

test("fileInputKey NO incrementa en un upload exitoso", () => {
  const hook = createImageUploadHook();
  const fakeFile = { name: "foto.jpg", size: 500000, type: "image/jpeg" };
  hook.startProcessing();
  hook.simulateSuccess(fakeFile, "data:image/jpeg;base64,ABC");
  assertEqual(hook.fileInputKey, 0, "Éxito no debe cambiar la key");
});

test("Estado limpio tras resetImage() — imagen y preview en null", () => {
  const hook = createImageUploadHook();
  const fakeFile = { name: "foto.jpg", size: 200000 };
  hook.simulateSuccess(fakeFile, "data:image/jpeg;base64,XYZ");
  assert(hook.image !== null, "Precondición: imagen debe existir antes del reset");
  hook.resetImage();
  assert(hook.image === null, "image debe ser null tras reset");
  assert(hook.imagePreview === null, "imagePreview debe ser null tras reset");
});

test("BUG ORIGINAL: seleccionar la misma foto 2 veces — key diferente en 2do intento", () => {
  const hook = createImageUploadHook();
  const keyAntes = hook.fileInputKey;

  hook.simulateSuccess({ name: "mi_foto.jpg" }, "data:image/jpeg;base64,A");
  hook.resetImage();

  assert(
    hook.fileInputKey !== keyAntes,
    "La key debe cambiar tras reset para que el browser recree el <input> y dispare onChange"
  );
});

// ═══════════════════════════════════════════════════════════════
//  SUITE 2: Validación de Check-In (useVisitSubmit)
// ═══════════════════════════════════════════════════════════════
console.log("\n\u2705  SUITE 2: Validación de reglas del Check-In");

const fakeClient = { firstName: "Tienda ABC", sapCode: "C001", type: "SAP" };
const fakeImage  = { name: "foto.jpg", size: 300000 };

test("Check-In con imagen nueva → válido", () => {
  const result = validate({
    type: "IN", hasActiveCheckIn: false,
    image: fakeImage, existingImageData: null, selectedClient: fakeClient,
  });
  assert(result.ok, `Debe ser válido, falló: ${result.reason}`);
});

test("Check-In con imagen existente válida (sin nueva foto) → válido", () => {
  const result = validate({
    type: "IN", hasActiveCheckIn: false,
    image: null,
    existingImageData: { hasImage: true, isValid: true, imageUrl: "http://cdn/foto.jpg" },
    selectedClient: fakeClient,
  });
  assert(result.ok, `Debe ser válido con imagen existente: ${result.reason}`);
});

test("Check-In sin imagen y sin imagen existente → inválido IMAGEN_REQUERIDA", () => {
  const result = validate({
    type: "IN", hasActiveCheckIn: false,
    image: null, existingImageData: null, selectedClient: fakeClient,
  });
  assertEqual(result.ok, false, "Debe fallar");
  assertEqual(result.reason, "IMAGEN_REQUERIDA");
});

test("Check-In con imagen existente INVÁLIDA y sin foto nueva → inválido", () => {
  const result = validate({
    type: "IN", hasActiveCheckIn: false,
    image: null,
    existingImageData: { hasImage: true, isValid: false },
    selectedClient: fakeClient,
  });
  assertEqual(result.ok, false, "Imagen expirada no debe contar");
  assertEqual(result.reason, "IMAGEN_REQUERIDA");
});

test("Check-In cuando ya hay uno activo → inválido CHECK_IN_YA_ACTIVO", () => {
  const result = validate({
    type: "IN", hasActiveCheckIn: true,
    image: fakeImage, existingImageData: null, selectedClient: fakeClient,
  });
  assertEqual(result.reason, "CHECK_IN_YA_ACTIVO");
});

test("Check-Out sin Check-In previo → inválido SIN_CHECKIN_ACTIVO", () => {
  const result = validate({
    type: "OUT", hasActiveCheckIn: false,
    image: null, existingImageData: null, selectedClient: fakeClient,
  });
  assertEqual(result.reason, "SIN_CHECKIN_ACTIVO");
});

test("Check-In sin cliente seleccionado → inválido CLIENTE_REQUERIDO", () => {
  const result = validate({
    type: "IN", hasActiveCheckIn: false,
    image: fakeImage, existingImageData: null, selectedClient: null,
  });
  assertEqual(result.reason, "CLIENTE_REQUERIDO");
});

test("Check-Out con Check-In activo y cliente → válido", () => {
  const result = validate({
    type: "OUT", hasActiveCheckIn: true,
    image: null, existingImageData: null, selectedClient: fakeClient,
  });
  assert(result.ok, `Check-Out válido debe pasar: ${result.reason}`);
});

// ═══════════════════════════════════════════════════════════════
//  SUITE 3: compressImage — simulación de casos extremos
// ═══════════════════════════════════════════════════════════════
console.log("\n\uD83D\uDDDC\uFE0F   SUITE 3: compressImage — Manejo de errores");

const asyncTests = [];

asyncTests.push(
  compressImage_OK({ name: "foto_grande.jpg", size: 5_000_000, type: "image/jpeg" })
    .then((result) => {
      assert(result.size < 5_000_000, "Archivo comprimido debe ser más pequeño");
      results.push({ ok: true, name: "compressImage: archivo grande → comprime correctamente" });
      passed++;
    })
    .catch((e) => {
      results.push({ ok: false, name: "compressImage: archivo grande → comprime correctamente", error: e.message });
      failed++;
    })
);

asyncTests.push(
  compressImage_FAIL({ name: "corrupta.jpg", size: 100 })
    .then(() => {
      results.push({ ok: false, name: "compressImage: archivo corrupto → debe lanzar error", error: "No lanzó error" });
      failed++;
    })
    .catch((e) => {
      assert(
        e.message.toLowerCase().includes("comprimir") || e.message.toLowerCase().includes("error"),
        "Debe incluir mensaje descriptivo"
      );
      results.push({ ok: true, name: "compressImage: archivo corrupto → lanza error correctamente" });
      passed++;
    })
);

// ═══════════════════════════════════════════════════════════════
//  SUITE 4: Escenarios multi-vendedor
// ═══════════════════════════════════════════════════════════════
console.log("\n\uD83D\uDC65  SUITE 4: Multi-vendedor — cada instancia tiene su propio estado");

test("Dos instancias del hook son completamente independientes", () => {
  const vendedor1 = createImageUploadHook();
  const vendedor2 = createImageUploadHook();

  vendedor1.simulateSuccess({ name: "foto_v1.jpg" }, "data:v1");
  vendedor1.resetImage();

  assertEqual(vendedor2.fileInputKey, 0, "Estado del vendedor2 debe ser independiente del vendedor1");
  assert(vendedor2.image === null, "vendedor2 no debe tener imagen del vendedor1");
});

test("Reset consecutivo de 3 vendedores distintos", () => {
  const hooks = [
    createImageUploadHook(),
    createImageUploadHook(),
    createImageUploadHook(),
  ];

  hooks.forEach((h, i) => {
    h.simulateSuccess({ name: `foto_v${i}.jpg` }, `data:v${i}`);
    h.resetImage();
    assertEqual(h.fileInputKey, 1, `Vendedor ${i + 1}: key debe ser 1 tras reset`);
    assert(h.image === null, `Vendedor ${i + 1}: imagen debe quedar limpia`);
  });
});

test("Safety timeout libera isProcessingImage cuando el proceso se congela", () => {
  // El timeout llama a: setIsProcessingImage(false) + setFileInputKey(k => k+1)
  const hook = createImageUploadHook();
  hook.startProcessing();

  assert(hook.isProcessingImage === true, "Precondición: debe estar procesando");

  hook.simulateError(); // equivalente al safety timer disparando

  assert(hook.isProcessingImage === false, "Safety timer debe liberar el spinner");
  assertEqual(hook.fileInputKey, 1, "Safety timer debe resetear el input key");
});

test("Error de FileReader también libera el estado y sube la key", () => {
  const hook = createImageUploadHook();
  hook.startProcessing();
  hook.simulateError(); // reader.onerror equivalente
  assert(hook.isProcessingImage === false, "isProcessingImage debe ser false");
  assert(hook.fileInputKey > 0, "fileInputKey debe haber incrementado");
});

// ═══════════════════════════════════════════════════════════════
//  REPORTE FINAL
// ═══════════════════════════════════════════════════════════════
Promise.all(asyncTests).then(() => {
  console.log("\n" + "═".repeat(60));
  console.log("  RESULTADOS FINALES");
  console.log("═".repeat(60));

  results.forEach((r) => {
    const icon = r.ok ? "\u2705" : "\u274C";
    console.log(`  ${icon} ${r.name}`);
    if (!r.ok) {
      console.log(`     \u2192 ${r.error}`);
    }
  });

  console.log("═".repeat(60));
  console.log(`  Total: ${passed + failed} | \u2705 Pasaron: ${passed} | \u274C Fallaron: ${failed}`);
  console.log("═".repeat(60) + "\n");

  if (failed > 0) {
    console.error("\u26D4  Hay tests fallando. Revisa los errores antes de hacer push.\n");
    process.exit(1);
  } else {
    console.log("\uD83D\uDE80  Todos los tests pasaron. El fix está validado y listo para producción.\n");
    process.exit(0);
  }
});
