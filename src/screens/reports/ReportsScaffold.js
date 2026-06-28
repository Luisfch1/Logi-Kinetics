/**
 * ReportsScaffold.js (Nexus Shield v184)
 * Estructura de la pantalla de informes.
 */
import { State } from '../../core/state.js';

export const ReportsScaffold = {
    render() {
        return `
            <div class="relative w-full h-full overflow-hidden bg-black flex flex-col pt-safe px-4">
                
                <!-- 1. Header de Sección -->
                <div id="reports-header" class="pt-8 pb-6 animate-in flex items-center justify-between">
                    <div>
                        <h2 class="font-headline text-4xl font-black tracking-tighter text-white uppercase italic leading-none">Reports</h2>
                        <div class="flex items-center gap-3 mt-3">
                            <div class="w-1.5 h-1.5 rounded-full bg-primary shadow-neon"></div>
                            <p class="text-white/30 font-body text-[9px] uppercase tracking-[0.25em] font-bold">Bitácoras y Archivos Técnicos Exportados</p>
                        </div>
                    </div>
                    <button id="btn-refresh-reports" class="w-10 h-10 flex items-center justify-center rounded-xl bg-white/5 border border-white/10 text-primary active:scale-90 transition-all">
                        <span class="material-symbols-outlined text-xl">refresh</span>
                    </button>
                </div>

                <!-- 2. Contenedor de Lista (Scrollable) -->
                <div id="reports-content" class="flex-1 overflow-y-auto pb-40 scroll-smooth space-y-4 pt-4">
                    <div class="flex flex-col items-center justify-center py-20 opacity-10 animate-pulse">
                        <span class="material-symbols-outlined text-5xl mb-4 font-bold">analytics</span>
                        <span class="text-[10px] font-black uppercase tracking-[0.3em]">Cargando informes archivados...</span>
                    </div>
                </div>

            </div>
        `;
    }
};
