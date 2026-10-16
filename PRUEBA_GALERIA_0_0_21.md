# Logi PWA 0.0.21 — compartir y trasladar fotos

## Cambios

- Compartir desde galería, tanto una foto como una selección: preparación con progreso, luego botón «Compartir ahora» que abre el panel directamente desde una pulsación nueva. La preparación ya no consume el gesto necesario para compartir.
- Fallo al preparar una foto: no envía silenciosamente un lote incompleto. Avisa y conserva la selección. Cancelación/rechazo también se muestran. Preparación acotada a 30 segundos por foto.
- Si el teléfono rechaza el conjunto, «Dividir en lotes» permite reducirlo y abrir cada lote manualmente. No se establece un supuesto límite universal de nueve fotos. La entrega al panel no acredita recepción en WhatsApp.
- «Mover a otro proyecto» junto a Compartir y Eliminar. Selector excluye proyecto actual y proyectos recuperados virtuales; confirmación muestra origen, destino y cantidad. No admite acciones simultáneas desde galería.
- Traslado PWA en una escritura atómica de metadatos: mismos originales, IDs locales, fecha, ubicación y descripción; sin copiar/borrar blobs. Reinicia ítem/actividad y sincronización. Si no puede guardar, no retira fotos del origen.
- Identidad nueva para el próximo envío Drive, evitando reutilizar el archivo del proyecto anterior. Se descartan actualizaciones de sincronización antiguas y temporizadores pendientes. Las copias ya enviadas a Drive o CONTROL no se mueven ni borran automáticamente: se advierte antes de confirmar. Revisarlas en el proyecto anterior sigue siendo una acción manual.
- Respaldo/restauración conserva la identidad de envío del traslado; la exportación `.lchp` usa esa misma identidad para no duplicar la foto al alternar con Drive.
- La asignación explícita de proyecto prevalece sobre rescates por nombre en la galería; dos proyectos homónimos no deben compartir fotos accidentalmente.
- Versión/caché 0.0.21; no se borra IndexedDB ni almacenamiento de proyectos. La limpieza de caché se limita al prefijo propio de Logi.

## Verificación

`npm run test:photos`: 12 fotos ficticias; guardado completo, error de cuota sin cambios, conservación de originales y metadatos, reapertura, aislamiento de proyectos, rechazo de envío obsoleto, nuevo envío Drive a destino con nueva identidad. Se usa State y servicio Drive reales con almacenamiento/transporte simulados, sin datos del usuario ni solicitudes Google.

`tests/gallery-qa.html`: escenario local aislado para revisión móvil de barra, progreso, doce archivos, rechazo/división, cancelación, foto ilegible y confirmación de traslado. El panel de compartir se simula: no abre WhatsApp ni transmite archivos. No se incluye como entrada del paquete de producción.

Pendiente de aceptación en el celular real: apertura del panel Android/WhatsApp y envío efectivo. La prueba de navegador de PC no lo sustituye.

## Actualizar sin perder datos

Con Internet, abrir Logi, esperar unos segundos, cerrarla completamente y volver a abrirla. Comprobar versión 0.0.21 en Configuración. Si aún muestra la anterior, repetir la apertura. No desinstalar la PWA ni borrar sus datos para actualizar.
