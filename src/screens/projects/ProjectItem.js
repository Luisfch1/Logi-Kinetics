/**
 * ProjectItem.js
 * Molde de Tarjeta de Proyecto
 * - Incluye Barra Neón de Estado Activo.
 * - Incluye Botones Editar y Borrar.
 */
export const ProjectItem = {
    render(project, isActive = false) {
        const activeBarClass = isActive ? 'bg-primary shadow-[0_0_12px_var(--primary-glow-c)] h-12' : 'bg-white/10 h-6 opacity-30';
        const cardBgClass = isActive ? 'bg-white/10' : 'bg-white/5';
        const textColorClass = isActive ? 'text-primary font-black' : 'text-white/80 font-bold';
        
        return `
            <div data-id="${project.id}" 
                 class="project-item flex items-center gap-4 p-5 rounded-[1.8rem] ${cardBgClass} border border-white/5 hover:bg-white/10 transition-all cursor-pointer active:scale-[0.98]">
                
                <!-- Barra de Estatus Neón (Vértical) -->
                <div class="status-bar w-1.5 ${activeBarClass} rounded-full transition-all duration-300"></div>
                
                <!-- Info del Proyecto -->
                <div class="flex-1 flex flex-col justify-center min-w-0" onclick="window.ProjectModule.selectProject('${project.id}')">
                    <h3 class="font-headline uppercase text-[11px] tracking-widest ${textColorClass} truncate">
                        ${project.name}
                    </h3>
                </div>

                <!-- Controles CRUD -->
                <div class="flex items-center gap-2 pr-1">
                    <button class="btn-cloud-project w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center ${project.supabaseUrl ? 'text-primary' : 'text-white/40'} hover:text-primary transition-colors" 
                            onclick="event.stopPropagation(); window.ProjectModule.promptCloudConfig('${project.id}')">
                        <span class="material-symbols-outlined text-[18px]">cloud_sync</span>
                    </button>
                    <button class="btn-edit-project w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center text-white/40 hover:text-white transition-colors" 
                            onclick="event.stopPropagation(); window.ProjectModule.promptRename('${project.id}', '${project.name}')">
                        <span class="material-symbols-outlined text-[18px]">edit</span>
                    </button>
                    <button class="btn-delete-project w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center text-white/40 hover:text-red-400 transition-colors" 
                            onclick="event.stopPropagation(); window.ProjectModule.promptDelete('${project.id}', '${project.name}')">
                        <span class="material-symbols-outlined text-[18px]">delete</span>
                    </button>
                </div>
            </div>
        `;
    }
};
