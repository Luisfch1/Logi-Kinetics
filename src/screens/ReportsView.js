/**
 * ReportsView.js (Nexus Shield v184)
 * Orquestador de la Pantalla de Informes.
 */
import { ReportsScaffold } from './reports/ReportsScaffold.js';
import { ReportsModule } from '../controllers/ReportsController.js';

export const ReportsView = {
    id: 'reports',

    getLayout(isLandscape = false) {
        // Por ahora, el diseño de informes es agnóstico o vertical-first
        return ReportsScaffold.render();
    },

    async init() {
        console.log('[ReportsView] Iniciando Subsistema de Informes...');
        await ReportsModule.init();
    }
};
