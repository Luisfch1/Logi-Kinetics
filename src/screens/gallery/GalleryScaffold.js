/**
 * GalleryScaffold.js
 * Marco de Pantalla Vertical de Galería (Nexus Shield v178)
 * - BARRA DE SELECCIÓN: Corregido bloqueo de puntero (pointer-events-none).
 */
export const GalleryScaffold = {
    render() {
        return `
            <div class="relative w-full h-full overflow-hidden bg-black flex flex-col pt-safe px-4">
                
                <!-- 1. Header (Date Range + Filter) -->
                <div id="gallery-header" class="space-y-4 pt-4 pb-2 transition-all duration-300">
                    <div class="bg-[#0a0a0a] border border-white/5 rounded-2xl p-4 flex items-center gap-4">
                        <div class="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center">
                            <span class="material-symbols-outlined text-white/30 text-xl">calendar_today</span>
                        </div>
                        <div class="flex flex-col">
                            <span class="text-[8px] text-white/20 font-black uppercase tracking-widest">Rango de Fechas</span>
                            <span id="gallery-date-range" class="font-headline font-bold text-xs text-white/90 uppercase tracking-tight">Cargando fechas...</span>
                        </div>
                    </div>

                    <div class="relative flex items-center group">
                        <div class="absolute left-4 pointer-events-none">
                            <span class="material-symbols-outlined text-primary text-xl">search</span>
                        </div>
                        <input id="gallery-search" 
                               type="text" 
                               placeholder="FILTRAR ACTIVIDADES..." 
                               class="w-full bg-[#0a0a0a] border border-white/5 rounded-2xl h-14 pl-12 pr-4 text-[11px] font-headline font-bold text-white placeholder:text-white/20 uppercase focus:bg-white/5 outline-none transition-all duration-300">
                    </div>
                </div>

                <!-- 2. Contenido de Galería (Nexus Guardián: v191.9-OMEGA-Z) -->
                <div class="flex-1 relative overflow-hidden bg-black/20 rounded-t-[2.5rem] mt-2">
                    <div id="gallery-content" 
                         class="absolute inset-0 overflow-y-auto scroll-smooth p-4 content-start pb-40"
                         style="display: grid !important;">
                        
                        <div class="col-span-2 flex flex-col items-center justify-center h-64 opacity-20">
                            <span class="material-symbols-outlined text-4xl mb-2 animate-spin">sync</span>
                            <span class="text-[9px] font-black uppercase tracking-[0.2em]">Sincronizando Nexus...</span>
                        </div>
                    </div>
                </div>

                <!-- 3. BARRA DE SELECCIÓN FLOTANTE (Fix: pointer-events-none por defecto) -->
                <div id="gallery-selection-bar" 
                     class="fixed bottom-24 left-1/2 -translate-x-1/2 w-[94%] max-w-lg glass-panel rounded-[2.5rem] p-2 flex items-center justify-between gap-1 z-[100] translate-y-48 opacity-0 pointer-events-none transition-all duration-500 border border-primary/20">
                    
                    <button onclick="window.GalleryController?.cancelSelection()"
                            aria-label="Cancelar selección" class="w-11 h-11 shrink-0 flex items-center justify-center rounded-full bg-white/5 text-white/40 active:scale-90 transition-transform">
                        <span class="material-symbols-outlined text-xl">close</span>
                    </button>

                    <div class="flex-1 text-center">
                        <span id="selection-count" class="font-headline font-black text-primary text-[11px] italic">0 SELECCIONADAS</span>
                    </div>

                    <div class="flex gap-1 shrink-0">
                        <button onclick="window.GalleryController?.bulkShare()"
                                title="Compartir" aria-label="Compartir fotos" class="w-11 h-11 flex items-center justify-center rounded-full bg-white/5 text-primary shadow-neon active:scale-90 transition-transform">
                            <span class="material-symbols-outlined text-xl">share</span>
                        </button>
                        <button onclick="window.GalleryController?.bulkMove()" title="Mover a otro proyecto" aria-label="Mover a otro proyecto"
                                class="w-11 h-11 flex items-center justify-center rounded-full bg-white/5 text-primary active:scale-90 transition-transform">
                            <span class="material-symbols-outlined text-xl">drive_file_move</span>
                        </button>
                        <button onclick="window.GalleryController?.bulkDelete()"
                                title="Eliminar" aria-label="Eliminar fotos" class="w-11 h-11 flex items-center justify-center rounded-full bg-red-500/10 text-red-500 active:scale-90 transition-transform">
                            <span class="material-symbols-outlined text-xl">delete</span>
                        </button>
                    </div>
                </div>

            </div>
        `;
    }
};
