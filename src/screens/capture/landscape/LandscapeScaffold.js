/**
 * LandscapeScaffold.js
 * Marco de Pantalla Horizontal (Paquete Autónomo)
 * - Incluye su propio Encabezado (Título Único, Sin Configuración).
 * - Side-Bar de Altura Total (Fixed).
 */
export const LandscapeScaffold = {
    render() {
        return `
            <div class="flex-1 w-full h-full overflow-hidden flex flex-col bg-black ring-1 ring-white/5">
                
                <!-- Cabecera Autónoma (Landscape - Sin Configuración) -->
                <!-- Se coloca con padding derecho para no ser tapada por la barra lateral fija -->
                <header class="w-full z-50 px-6 py-4 flex justify-between items-center bg-black/80 backdrop-blur-xl border-b border-white/5 pr-[120px]" onclick="ProjectModule.openManager()">
                    <div class="flex items-center gap-3 group">
                        <h1 class="font-headline font-black tracking-tighter uppercase text-base text-primary drop-shadow-[0_0_8px_var(--primary-glow)]">LOGI</h1>
                        <span class="material-symbols-outlined text-white/20 text-lg">chevron_right</span>
                        <span id="header-project-name" class="font-headline font-bold tracking-tight uppercase text-xs text-white/60">PROYECTO PRINCIPAL</span>
                    </div>
                    <!-- Botón de configuración eliminado en Horizontal por diseño -->
                </header>

                <!-- Zona de Galería Ajustada -->
                <div id="recent-captures" class="flex-1 h-full p-6 pr-[120px] overflow-y-auto grid grid-cols-2 gap-4 z-10 scroll-smooth content-start bg-black">
                    <!-- Inyectado por controlador (LandscapeCardItem) -->
                </div>
                
                <!-- Barra Lateral de 3 Iconos (Altura Total Fixed) -->
                <div id="action-card-container" class="fixed right-0 top-0 h-full w-[100px] bg-[#0a0a0a] border-l border-white/5 z-[100] flex flex-col justify-center items-center shadow-2xl">
                    <!-- Inyectado por View (LandscapeActionCard) -->
                </div>
            </div>
        `;
    }
};
