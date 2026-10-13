const test = require('node:test');
const assert = require('node:assert');

// Extraer lógica de detección de dispositivo para prueba unitaria pura
function testIsMobileOrPWA({ isStandalone, userAgent, innerWidth, maxTouchPoints, hasTouch }) {
  if (isStandalone) return true;
  const isMobileUA = /android|iphone|ipad|ipod|blackberry|iemobile|opera mini|mobile/i.test(userAgent || '');
  const isSmallScreen = (innerWidth || 1024) <= 768;
  const touch = hasTouch || (maxTouchPoints || 0) > 0;
  return isStandalone || (isMobileUA && (isSmallScreen || touch));
}

test('Detección de dispositivo: Desktop estándar debe ser FALSE', () => {
  const result = testIsMobileOrPWA({
    isStandalone: false,
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    innerWidth: 1920,
    maxTouchPoints: 0,
    hasTouch: false
  });
  assert.strictEqual(result, false, 'En escritorio Windows / Chrome no debe activarse el modal');
});

test('Detección de dispositivo: Mac de escritorio debe ser FALSE', () => {
  const result = testIsMobileOrPWA({
    isStandalone: false,
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    innerWidth: 1440,
    maxTouchPoints: 0,
    hasTouch: false
  });
  assert.strictEqual(result, false, 'En Mac de escritorio no debe activarse');
});

test('Detección de dispositivo: PWA Standalone (Instalada en inicio) debe ser TRUE', () => {
  const result = testIsMobileOrPWA({
    isStandalone: true,
    userAgent: 'Mozilla/5.0 (Linux; Android 13; SM-S918B)',
    innerWidth: 412,
    maxTouchPoints: 5,
    hasTouch: true
  });
  assert.strictEqual(result, true, 'En PWA standalone instalada debe activarse');
});

test('Detección de dispositivo: Celular Android en Chrome móvil debe ser TRUE', () => {
  const result = testIsMobileOrPWA({
    isStandalone: false,
    userAgent: 'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36',
    innerWidth: 393,
    maxTouchPoints: 5,
    hasTouch: true
  });
  assert.strictEqual(result, true, 'En Android móvil debe activarse');
});

test('Detección de dispositivo: iPhone Safari debe ser TRUE', () => {
  const result = testIsMobileOrPWA({
    isStandalone: false,
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
    innerWidth: 390,
    maxTouchPoints: 5,
    hasTouch: true
  });
  assert.strictEqual(result, true, 'En iPhone móvil debe activarse');
});
