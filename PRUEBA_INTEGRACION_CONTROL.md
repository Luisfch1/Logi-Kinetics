# Prueba Logi 0.0.18 — PWA + Google Drive + CONTROL

## 1. Actualizar la PWA sin borrar datos

Abra Logi con internet, espere unos segundos, ciérrela completamente y vuelva a
abrirla. En Configuración debe aparecer `Logi Kinetics v0.0.18`. No use
**Borrar datos** ni elimine la PWA: allí están los proyectos y fotos locales.

Después de abrir, Logi compacta en segundo plano el almacenamiento antiguo sin
bloquear la interfaz.
Las instalaciones anteriores podían guardar varias copias Base64 de una misma
foto. La migración conserva una sola copia Blob canónica y elimina sus alias.

## 2. Verificar las miniaturas

1. Abra un proyecto que ya tenga fotos y confirme que las miniaturas aparecen.
2. Tome una fotografía nueva.
3. Cierre Logi desde aplicaciones recientes y vuelva a abrirlo.
4. Repita después de 10 a 15 minutos y reinicie el teléfono una vez.

La versión 0.0.18 muestra las fotos de la PWA mediante URLs Blob ligeras y ya no
carga múltiples cadenas Base64 completas en la galería. Después de actualizar,
restaure una sola vez el respaldo si Logi informa que faltan archivos.

## 3. Preparación única de Google

En un mismo proyecto de Google Cloud:

- habilite **Google Drive API** y **Gmail API**;
- cree el cliente OAuth de escritorio que usa CONTROL;
- cree un cliente OAuth de tipo **Aplicación web** para la PWA;
- agregue `https://luisfch1.github.io` como origen JavaScript autorizado;
- cree un cliente OAuth Android con paquete `com.antigravity.logi`;
- para este APK de prueba registre la huella SHA-1
  `BE:B4:4B:16:68:48:42:FA:88:1B:51:58:81:60:7C:88:89:D5:7C:BA`;
- agregue la cuenta del proyecto como usuario de prueba mientras la aplicación
  OAuth siga en modo de pruebas.

El JSON del cliente de escritorio debe guardarse como
`Control/electron/google-oauth-client.json`. Logi no necesita guardar secretos
ni archivos JSON. En la PWA se pega una sola vez el ID público del cliente web
terminado en `.apps.googleusercontent.com`; el token de acceso solo vive en
memoria y se descarta al cerrar la aplicación.

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
