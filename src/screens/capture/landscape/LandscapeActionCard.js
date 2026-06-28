/**
 * LandscapeActionCard.js (Nexus Shield v179)
 * Panel Lateral Minimalista con 4 Iconos.
 * - [Mic] [Cámara] [Galería] [Share]
 */
export const LandscapeActionCard = {
    render() {
        return `
            <div class="h-full flex flex-col items-center justify-between py-12 px-2 bg-transparent">
                
                <!-- 1. Micrófono (Superior) -->
                <button id="btn-mic" class="w-14 h-14 rounded-full flex items-center justify-center text-primary/70 active:text-[#ff3b30] hover:text-primary transition-colors">
                    <span class="material-symbols-outlined text-3xl" style="font-variation-settings: 'FILL' 1;">mic</span>
                </button>

                <!-- 2. Disparador Central -->
                <button id="btn-capture" 
                        style="box-shadow: 0 0 15px 2px var(--primary-glow) !important;"
                        class="shrink-0 w-16 h-16 rounded-full bg-primary active:scale-90 flex items-center justify-center border-none outline-none">
                    <span class="material-symbols-outlined text-black text-2xl font-black">photo_camera</span>
                </button>

                <!-- 3. Galería (NUEVO) -->
                <button id="btn-gallery" class="w-14 h-14 rounded-full flex items-center justify-center text-white/30 active:text-primary hover:text-white transition-colors">
                    <span class="material-symbols-outlined text-3xl">photo_library</span>
                </button>

                <!-- 4. Compartir (Inferior) -->
                <button id="btn-global-share" class="w-14 h-14 rounded-full flex items-center justify-center text-white/30 active:text-primary hover:text-white transition-colors">
                    <span class="material-symbols-outlined text-3xl">share</span>
                </button>

                <!-- Invisible Input para compatibilidad -->
                <input id="input-desc" type="hidden" value=""/>
            </div>
        `;
    }
}
