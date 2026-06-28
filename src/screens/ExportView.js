import { ExportScaffold } from './export/ExportScaffold.js';
import { ExportModule } from '../controllers/ExportController.js';

/**
 * ExportView.js (Nexus Shield v182)
 * Módulo Screen para la pantalla de Exportación.
 */
export const ExportView = {
    getLayout(isLandscape = false) {
        // En esta fase, solo renderizamos la versión Portrait 
        // optimizada ya que Export es una pantalla de formularios.
        return `
            <div id="export-content" class="w-full h-full">
                ${ExportScaffold.render(ExportModule.config)}
            </div>
        `;
    },

    async init() {
        if (ExportModule.init) {
            await ExportModule.init();
            // Una vez cargado el logo/config, re-renderizamos el contenido interno
            const container = document.getElementById('export-content');
            if (container) {
                container.innerHTML = ExportScaffold.render(ExportModule.config);
                // IMPORTANTE: Tras cambiar el HTML, hay que volver a vincular los eventos
                ExportModule.rebind();
            }
        }
    },

    destroy() {
        // Limpieza de estados si es necesario
    }
};
