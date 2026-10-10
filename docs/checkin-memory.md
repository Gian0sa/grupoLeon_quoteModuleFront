# Check-In: recuperación y consumo de memoria

El borrador gl_checkin_draft conserva cliente, datos iniciales del cliente nuevo, texto de búsqueda,
tipo de visita y timestamp durante 30 minutos, asociado al vendedor actual. Se restaura antes del
auto-guardado y se guarda al cambiar campos, ocultar la página y abrir la cámara. El éxito del envío
al servidor o de su guardado en la cola local elimina el borrador. La vista actual no ofrece un
comentario editable; el borrador conserva ese atributo sin añadir controles a la UI.
Las coordenadas recientes se conservan durante cinco minutos, manteniendo la obtención de GPS al enviar.

El compresor lee hasta 64 KiB de cabeceras JPEG/PNG/WebP, considera orientación EXIF y solicita
createImageBitmap con un máximo de 768 px (640 px en el perfil LITE). No decodifica con Image,
no usa Base64 y no omite el redimensionamiento por el tamaño comprimido del archivo.
Un formato sin dimensiones verificables o un navegador sin redimensionamiento compatible
se rechaza con un mensaje para el vendedor. Esto también afecta al uso compartido en Entrada.

Bitmap y canvas se liberan en finally; los previews Blob pertenecientes al Check-In se revocan
al reemplazar, quitar, abrir la cámara y desmontar. Cancelar la cámara restaura el preview de
la foto optimizada previa. El candado de procesamiento evita decodificaciones superpuestas.
Reset y desmontaje invalidan el resultado; el trabajo nativo no se puede abortar directamente
y se libera cuando termina.

La purga elimina únicamente consultas inactivas. La telemetría usa el endpoint autenticado
POST /reportModule/visit-logs/telemetry, sin activar refresh/logout por un fallo de métricas.
Winston conserva evento, vendedor autenticado, métricas y señales de recuperación.
APP_KILLED_BY_OS_OOM incluye detection y oomConfirmed:false: una cámara pendiente tras recargar
es una inferencia, y document.wasDiscarded confirma descarte del navegador, no su causa exacta.
El envío de telemetría es de mejor esfuerzo y puede perderse sin conexión.

## Verificación automatizada

Desde grupoLeon_quoteModuleFront:
- npm run test:checkin-memory
- npm run build
- node node_modules/eslint/bin/eslint.js src/features/checkinout/components/ImageUploadCard.jsx src/features/checkinout/hooks/useClientSearch.js src/features/checkinout/hooks/useImageUpload.js src/features/checkinout/pages/VisitLogPage.jsx src/features/checkinout/utils/deviceUtils.js src/features/checkinout/utils/checkinSession.js src/features/checkinout/services/telemetryService.js

Desde grupoLeon_reportModule:
- node --test tests/deviceTelemetry.test.cjs

Las pruebas simulan cabeceras de 108 MP, fallos del decodificador/canvas, recursos liberados,
ciclo de vida del hook y almacenamiento. Las pruebas HTTP usan JWT y el router real con servicios
y logger aislados; no crean visitas ni consultan SAP.

## Verificación pendiente en Android físico

1. Seleccionar un cliente SAP, temporal o nuevo, abrir la cámara y forzar el cierre del proceso
   de Chrome/PWA con un dispositivo de prueba; volver a la misma pestaña dentro de 30 minutos.
   Comprobar cliente recuperado, aviso y evento en logs/combined.log cuando haya conexión.
2. Capturar en modo 48/108 MP y repetir varias veces, cancelar un reemplazo y quitar la foto.
   Comprobar proporciones, orientación, preview previo tras cancelar y envío del JPEG reducido.
3. Registrar con y sin conexión; comprobar borrador eliminado y flujo de cola e historial.
4. Probar caducidad, cambio de vendedor y navegador sin createImageBitmap.

No se garantiza “0 MB” ni ausencia total de cierres por Android. resizeWidth/resizeHeight definen
dimensiones de salida; el pico interno de memoria depende del navegador y del formato.
El bitmap/canvas reducido ocupa memoria, aunque se libere explícitamente.

Referencias:
- https://developer.mozilla.org/en-US/docs/Web/API/Window/createImageBitmap
- https://developer.chrome.com/docs/web-platform/page-lifecycle-api