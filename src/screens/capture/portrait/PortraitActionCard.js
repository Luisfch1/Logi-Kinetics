/**
 * PortraitActionCard.js (Nexus Shield v179)
 * Centro de Control Reorganizado en 2 Niveles.
 * - Nivel 1: [Cámara] [Galería] [Compartir]
 * - Nivel 2: [Actividad] [Descripción/Voz]
 */
export const PortraitActionCard = {
    render() {
        return `
            <div class="max-w-md mx-auto bg-[#0a0a0a] border border-white/10 p-5 rounded-[2.5rem] space-y-4 shadow-2xl pointer-events-auto">
                
                <!-- NIVEL 1: CAPTURA Y GALERÍA -->
                <div class="flex items-center justify-between gap-4">
                    
                    <!-- 1.1 Botón de Galería (NUEVO) -->
                    <button id="btn-gallery" class="shrink-0 w-14 h-14 rounded-2xl bg-white/5 border border-white/5 flex items-center justify-center text-white/30 active:bg-primary/10 transition-colors">
                        <span class="material-symbols-outlined text-2xl">photo_library</span>
                    </button>

                    <!-- 1.2 Disparador Central (Con Halo Neon controlado) -->
                    <button id="btn-capture" 
                            style="box-shadow: 0 0 15px 2px var(--primary-glow) !important;"
                            class="shrink-0 w-16 h-16 rounded-full bg-primary active:scale-95 flex items-center justify-center border-none outline-none">
                        <span class="material-symbols-outlined text-black text-2xl font-black">photo_camera</span>
                    </button>

                    <!-- 1.3 Botón de Compartir (Global) -->
                    <button id="btn-global-share" class="shrink-0 w-14 h-14 rounded-2xl bg-white/5 border border-white/5 flex items-center justify-center text-white/30 active:bg-primary/10 transition-colors">
                        <span class="material-symbols-outlined text-xl">share</span>
                    </button>

                </div>

                <!-- NIVEL 2: METADATOS (Dividido 50/50) -->
                <div class="grid grid-cols-2 gap-3">
                    
                    <!-- 2.1 Selector de Actividad / Ítem -->
                    <div id="btn-activity-selector" class="bg-white/5 h-12 rounded-2xl border border-white/5 flex items-center justify-between px-3 cursor-pointer hover:bg-white/10 transition-colors overflow-hidden">
                        <div class="flex items-center gap-2 overflow-hidden">
                            <span class="material-symbols-outlined text-primary text-[16px]">list</span>
                            <div class="flex flex-col min-w-0">
                                <span class="text-[6px] text-white/20 font-black uppercase tracking-widest leading-tight">ÍTEM</span>
                                <span id="current-activity" class="font-headline font-bold text-[8px] uppercase text-white/90 truncate max-w-[60px]">SELECCIONAR...</span>
                            </div>
                        </div>
                        <span class="material-symbols-outlined text-white/20 text-[12px]">expand_more</span>
                    </div>

                    <!-- 2.2 Botón de Voz / Descripción -->
                    <div class="relative flex items-center">
                        <input id="input-desc" 
                               type="text"
                               class="w-full bg-white/5 border border-white/5 rounded-2xl h-12 pl-3 pr-10 text-[9px] font-body text-white placeholder:text-white/20 uppercase focus:bg-white/10 outline-none transition-all" 
                               placeholder="DESCRIPCIÓN..."/>
                        
                        <button id="btn-mic" class="absolute right-0 top-0 w-10 h-12 flex items-center justify-center text-primary/70 active:scale-90 transition-transform">
                            <span class="material-symbols-outlined text-lg" style="font-variation-settings: 'FILL' 1;">mic</span>
                        </button>
                    </div>

                </div>

            </div>
        `;
    }
};
