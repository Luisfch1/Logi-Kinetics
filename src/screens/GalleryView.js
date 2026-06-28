/**
 * GalleryView.js
 * Orquestador de la Pantalla de Galería
 * - Portrait Only (según requerimiento).
 * - Cero mezcla física de archivos.
 */
import { GalleryScaffold } from './gallery/GalleryScaffold.js';
import { GalleryModule } from '../controllers/GalleryController.js';

export const GalleryView = {
    id: 'gallery',

    getLayout(isLandscape = false) {
        // Ignoramos isLandscape para forzar diseño vertical en Galería
        return GalleryScaffold.render();
    },

    async init() {
        console.log('[GalleryView] Inicializando módulo...');
        
        // Control de visibilidad del BottomNav Global
        const globalNav = document.getElementById('bottom-nav');
        if (globalNav) globalNav.style.display = 'flex';

        // Iniciamos el controlador
        await GalleryModule.init();
    },

    updateLayout(isLandscape) {
        // En Galería forzamos vertical, por lo que no re-renderizamos para horizontal
        this.init();
    },

    destroy() {
        console.log('[GalleryView] Unmounted.');
    }
};
