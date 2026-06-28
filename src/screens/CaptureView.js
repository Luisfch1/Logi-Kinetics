/**
 * CaptureView.js
 * Orquestador de la Pantalla de Captura (Dual-Package)
 * - Conmuta dinámicamente entre el paquete Portrait y Landscape.
 * - Cero mezcla física de archivos.
 */
import { PortraitScaffold } from './capture/portrait/PortraitScaffold.js';
import { PortraitActionCard } from './capture/portrait/PortraitActionCard.js';
import { LandscapeScaffold } from './capture/landscape/LandscapeScaffold.js';
import { LandscapeActionCard } from './capture/landscape/LandscapeActionCard.js';
import { CaptureCtrl } from '../controllers/CaptureModule.js';

export const CaptureView = {
    id: 'capture',
    isLandscapeMode: false,

    getLayout(isLandscape = false) {
        this.isLandscapeMode = isLandscape;
        // Inyectamos el Scaffold correspondiente según la orientación
        return isLandscape ? LandscapeScaffold.render() : PortraitScaffold.render();
    },

    async init() {
        console.log(`[CaptureView] Ensamblando Paquete ${this.isLandscapeMode ? 'HORIZONTAL' : 'VERTICAL'}...`);
        
        // Control de visibilidad del BottomNav Global
        const globalNav = document.getElementById('bottom-nav');

        if (this.isLandscapeMode) {
            console.log("KINETIC: Modo Horizontal Detectado");
            if(globalNav) globalNav.style.display = 'none';
        } else {
            console.log("KINETIC: Modo Vertical Detectado");
            if(globalNav) globalNav.style.display = 'flex';
        }

        // Inyectamos el ActionCard correspondiente
        const actionContainer = document.getElementById('action-card-container');
        if (actionContainer) {
            actionContainer.innerHTML = this.isLandscapeMode ? LandscapeActionCard.render() : PortraitActionCard.render();
        }

        // Iniciamos la lógica del controlador (que ahora soporta ambos renderers)
        await CaptureCtrl.init(this.isLandscapeMode); 
        CaptureCtrl.rebind();
    },

    updateLayout(isLandscape) {
        const container = document.getElementById('view-container');
        if(container) {
            container.innerHTML = this.getLayout(isLandscape);
            this.init();
        }
    },

    destroy() {
        console.log('[CaptureView] Unmounted.');
    }
};
