/**
 * ItemsView.js
 * Logi Kinetic | Item Catalog Visualization
 */
import { Architect } from '../core/Architect.js';
import { State } from '../core/state.js';

export const ItemsView = {
    getLayout(isLandscape) {
        const items = State.catalog || [];
        
        return `
        <main class="flex-1 w-full overflow-hidden flex flex-col animate-in fade-in duration-500 bg-black">
            <!-- Header Sticky -->
            <div class="px-6 py-8 border-b border-white/5 bg-black/80 backdrop-blur-md z-10">
                <div class="max-w-4xl mx-auto flex justify-between items-end">
                    <div class="space-y-1">
                        <div class="flex items-center gap-2 text-primary/60">
                            <span class="material-symbols-outlined text-sm">inventory_2</span>
                            <span class="text-[10px] font-bold uppercase tracking-[0.2em]">Catalogo del Proyecto</span>
                        </div>
                        <h2 class="font-headline text-2xl font-black tracking-tighter uppercase">Listado de Ítems</h2>
                        <p class="text-[10px] text-white/30 uppercase font-medium tracking-widest">${items.length} elementos cargados</p>
                    </div>
                    
                    <button id="btn-back-settings" class="px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-[10px] font-bold uppercase tracking-[0.1em] hover:bg-white/10 active:scale-95 transition-all flex items-center gap-2">
                        <span class="material-symbols-outlined text-sm">arrow_back</span>
                        Volver
                    </button>
                </div>
            </div>

            <!-- Tabla de Datos -->
            <div class="flex-1 overflow-y-auto px-6 py-6 scrollbar-hide">
                <div class="max-w-4xl mx-auto">
                    <div class="glass-card rounded-2xl overflow-hidden border border-white/5">
                        <table class="w-full text-left border-collapse">
                            <thead class="bg-white/5 border-b border-white/5 sticky top-0 z-20">
                                <tr>
                                    <th class="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-primary/80">Código</th>
                                    <th class="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-primary/80">Descripción</th>
                                    <th class="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-primary/80 w-24">Unidad</th>
                                </tr>
                            </thead>
                            <tbody class="divide-y divide-white/5">
                                ${items.length > 0 ? items.map(it => `
                                    <tr class="hover:bg-white/[0.02] transition-colors group">
                                        <td class="px-6 py-5 align-top">
                                            <span class="font-headline text-xs font-bold text-white/90 group-hover:text-primary transition-colors">${it.item}</span>
                                        </td>
                                        <td class="px-6 py-5 align-top">
                                            <p class="text-[11px] leading-relaxed text-white/60 font-medium">${it.descripcion}</p>
                                        </td>
                                        <td class="px-6 py-5 align-top">
                                            <span class="inline-block px-2 py-1 rounded bg-white/5 text-[9px] font-bold text-white/40 uppercase tracking-tighter">${it.unidad}</span>
                                        </td>
                                    </tr>
                                `).join('') : `
                                    <tr>
                                        <td colspan="3" class="px-6 py-20 text-center">
                                            <span class="material-symbols-outlined text-4xl text-white/10 mb-2">inventory_2</span>
                                            <p class="text-[10px] text-white/20 font-bold uppercase tracking-widest">El catálogo está vacío</p>
                                        </td>
                                    </tr>
                                `}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
            
            <!-- Bottom Spacer for Overlays -->
            <div class="h-20 w-full"></div>
        </main>
        `;
    },

    async init() {
        console.log('>>> VISUALIZACIÓN DE ÍTEMS ACTIVADA <<<');
        const btnBack = document.getElementById('btn-back-settings');
        if (btnBack) {
            btnBack.onclick = () => Architect.render('export'); // El user asume que configuración está en export o tiene un back global. 
            // En Kinetic, Settings suele activarse desde un botón global o el Nav. 
            // Architect.render('export') es el fallback común si Settings se abrió desde ahí.
        }
    }
};
