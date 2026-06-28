/**
 * PortraitScaffold.js (v180)
 * Marco de Pantalla Vertical de Captura.
 * - Inserción de Selector de Fecha Dinámico en el encabezado interno.
 */
export const PortraitScaffold = {
    render() {
        return `
            <div class="relative w-full h-full overflow-hidden bg-black flex flex-col">
                
                <!-- 1. Selector de Fecha (Encabezado de Pantalla) -->
                <div class="w-full px-4 pt-4 pb-2 z-30">
                    <div class="relative group bg-white/5 border border-white/5 rounded-2xl h-14 flex items-center px-4 gap-4 active:bg-white/10 transition-all overflow-hidden">
                        <div class="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                            <span class="material-symbols-outlined text-xl">calendar_today</span>
                        </div>
                        <div class="flex flex-col min-w-0">
                            <span class="text-[7px] text-white/30 font-black uppercase tracking-[0.2em] leading-tight">Fecha de Trabajo</span>
                            <span id="display-capture-date" class="font-headline font-black text-xs text-white/90 uppercase truncate tracking-tight italic">Cargando...</span>
                        </div>
                        
                        <!-- Input Invisible — Dispara el selector nativo -->
                        <input id="input-capture-date" 
                               type="date" 
                               class="absolute inset-0 opacity-0 cursor-pointer z-10">
                    </div>
                </div>

                <!-- 2. Área de Contenido (Scroll de Capturas Recientes) -->
                <div id="recent-captures" class="flex-1 px-4 pb-64 overflow-y-auto grid grid-cols-1 gap-4 z-10 scroll-smooth content-start">
                    <!-- Inyectado por controlador (PortraitCardItem) -->
                </div>
                
                <!-- 3. Panel de Control Inferior (Action Card) -->
                <div id="action-card-container" class="absolute bottom-6 left-0 w-full bg-transparent px-4 z-40 pointer-events-none">
                    <!-- Inyectado por View (PortraitActionCard) -->
                </div>
            </div>
        `;
    }
};
