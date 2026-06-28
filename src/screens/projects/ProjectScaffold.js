/**
 * ProjectScaffold.js
 * Marco de la Pantalla de Proyectos (Paquete Autónomo)
 * - Header: Botón +, Título "PROYECTOS", Botón X.
 * - Lista: Contenedor para inyectar ProjectItem.js
 */
export const ProjectScaffold = {
    render() {
        return `
            <div class="relative w-full h-full overflow-hidden bg-black flex flex-col pt-safe">
                
                <!-- Header de Proyectos (Según Captura) -->
                <header class="w-full px-6 py-6 flex justify-between items-center bg-black transition-colors">
                    <button id="btn-add-project" class="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center text-primary active:scale-95 transition-all">
                        <span class="material-symbols-outlined text-[26px]">add</span>
                    </button>
                    
                    <h1 class="font-headline font-black tracking-widest uppercase text-xs text-primary drop-shadow-[0_0_8px_var(--primary-glow)]">
                        PROYECTOS
                    </h1>
                    
                    <button id="btn-close-projects" class="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center text-white/30 active:scale-95 transition-all">
                        <span class="material-symbols-outlined text-xl">close</span>
                    </button>
                </header>

                <!-- Listado Scrollable -->
                <div id="projects-list" class="flex-1 overflow-y-auto px-6 pb-24 space-y-3 scroll-smooth">
                    <!-- Inyectado por controlador (ProjectItem) -->
                </div>
                
                <!-- Efecto de Gradient Inferior para Scroll Elegante -->
                <div class="absolute bottom-0 left-0 w-full h-24 bg-gradient-to-t from-black to-transparent pointer-events-none z-10"></div>
            </div>
        `;
    }
};
