# Prueba Logi 0.0.15 — Google Drive + CONTROL

## 1. Instalar sin borrar datos

Instale `Logi-0.0.15-pruebas.apk` encima de la versión actual. No desinstale la
aplicación y no pulse **Borrar datos**, porque Android eliminaría la base local.

## 2. Verificar las miniaturas

1. Abra un proyecto que ya tenga fotos y confirme que las miniaturas aparecen.
2. Tome una fotografía nueva.
3. Cierre Logi desde aplicaciones recientes y vuelva a abrirlo.
4. Repita después de 10 a 15 minutos y reinicie el teléfono una vez.

La versión 0.0.15 ya no usa las verificaciones paralelas que estaban venciendo
por tiempo en Android. Si una URL visual del WebView falla, Logi reconstruye la
miniatura desde la fotografía guardada en el almacenamiento privado.

## 3. Preparación única de Google

En un mismo proyecto de Google Cloud:

- habilite **Google Drive API** y **Gmail API**;
- cree el cliente OAuth de escritorio que usa CONTROL;
- cree un cliente OAuth Android con paquete `com.antigravity.logi`;
- para este APK de prueba registre la huella SHA-1
  `BE:B4:4B:16:68:48:42:FA:88:1B:51:58:81:60:7C:88:89:D5:7C:BA`;
- agregue la cuenta del proyecto como usuario de prueba mientras la aplicación
  OAuth siga en modo de pruebas.

El JSON del cliente de escritorio debe guardarse como
`Control/electron/google-oauth-client.json`. Logi no necesita guardar secretos
ni archivos JSON: Android recibe el permiso mediante Google Play Services.

## 4. Probar el recorrido completo

1. En CONTROL, abra **Editar proyecto → Cuenta Google del proyecto**.
2. Use **Copiar ID** y luego **Conectar cuenta Google**.
3. En Logi, abra **Proyectos**, pulse el icono de nube del proyecto, pegue ese ID
   y pulse **Conectar cuenta Google** usando la misma cuenta.
4. Tome una foto en Logi. Si hay internet, se envía automáticamente. Las fotos
   anteriores se envían con **Sincronizar todo ahora**.
5. En CONTROL, abra **Registro fotográfico** y pulse **Recibir de Drive**.
6. Confirme que la foto, fecha, ítem, descripción e ID llegaron correctamente.
7. Use **Respaldar Drive** únicamente después de confirmar que CONTROL ya guardó
   las imágenes en el proyecto `.lch`.

Una foto conserva el mismo ID durante todo el recorrido. Logi consulta ese ID
antes de subir; CONTROL también mantiene un registro de recepción. Por eso un
reintento no debe crear duplicados ni reiniciar la numeración.
