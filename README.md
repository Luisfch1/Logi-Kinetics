# Logi Kinetics

Este es el repositorio independiente y modular de **Logi Kinetics**, extraído y desacoplado completamente de la versión Legacy.

## Tecnologías
* **Frontend:** Vanilla JS (Modular Architecture)
* **Build Tool:** Vite + Tailwind CSS
* **Native Bridge:** Capacitor (Android / iOS)

---

## Estructura del Proyecto
* `src/` - Código fuente de la aplicación (vistas modulares y controladores).
* `public/` - Activos estáticos y librerías externas (`xlsx`, `pdf-lib`).
* `android/` - Proyecto nativo de Android.
* `capacitor.config.json` - Configuración de Capacitor.

---

## Instrucciones de Desarrollo y Compilación

### 1. Instalar dependencias
Instala los paquetes necesarios de npm para desarrollo y compilación:
```bash
npm install
```

### 2. Ejecutar Servidor de Desarrollo (Web)
Para probar e iterar rápidamente la interfaz en el navegador:
```bash
npm run dev
```

### 3. Compilar para Producción
Genera los archivos estáticos en la carpeta `dist/`:
```bash
npm run build
```

### 4. Sincronizar con el celular (Capacitor)
Copia la compilación web actual al proyecto nativo de Android:
```bash
npx cap sync
```

### 5. Abrir en Android Studio
Abre el entorno nativo para compilar e instalar en tu celular por cable USB:
```bash
npx cap open android
```

---

## Cómo subir este proyecto a un nuevo repositorio en GitHub

Si deseas publicar este código en un repositorio independiente en tu cuenta de GitHub, ejecuta los siguientes comandos en la terminal de esta carpeta:

1. **Inicializar Git local:**
   ```bash
   git init
   ```
2. **Agregar todos los archivos:**
   ```bash
   git add .
   ```
3. **Crear el primer commit:**
   ```bash
   git commit -m "feat: initial commit of standalone Logi Kinetics"
   ```
4. **Renombrar la rama principal a `main`:**
   ```bash
   git branch -M main
   ```
5. **Crear tu nuevo repositorio en la web de GitHub** (sin README, gitignore ni licencia para evitar conflictos).
6. **Vincular el repositorio remoto (reemplaza con tu URL real):**
   ```bash
   git remote add origin https://github.com/Luisfch1/LogiKinetics.git
   ```
7. **Subir los cambios:**
   ```bash
   git push -u origin main
   ```
