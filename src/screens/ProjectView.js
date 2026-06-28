/**
 * ProjectView.js
 * Orquestador de la Pantalla de Proyectos (Paquete Autónomo)
 * - Gestiona la transición y el ensamblado de la interfaz de proyectos.
 */
import { State } from '../core/state.js';
import { ProjectScaffold } from './projects/ProjectScaffold.js';
import { ProjectItem } from './projects/ProjectItem.js';
import { ProjectModule } from '../controllers/ProjectController.js';

export const ProjectView = {
    id: 'projects',

    getLayout() {
        return ProjectScaffold.render();
    },

    async init() {
        console.log('[ProjectView] Ensamblando Pantalla de Proyectos...');
        
        // Configuramos el Controlador para esta instancia
        await ProjectModule.init();

        // Ocultar Navegación Global (Opcional, pero se ve más limpio)
        const globalNav = document.getElementById('bottom-nav');
        if(globalNav) globalNav.style.display = 'none';

        // Renderizado del Listado Inicial
        this.renderList();

        // Evitar duplicar suscripciones al re-entrar a la pantalla
        this._onStateChange = this._onStateChange || (() => this.renderList());
        State.subscribe(this._onStateChange);

        // Binding específico para los botones del Scaffold (ya que se inyectan dinámicamente)
        this.bindEvents();
    },

    renderList() {
        const listContainer = document.getElementById('projects-list');
        if(!listContainer) return;

        const projects = State.projects || [];
        const currentId = State.currentProject?.id;

        const listContent = projects.map(p => {
            return ProjectItem.render(p, p.id === currentId);
        }).join('');

        listContainer.innerHTML = listContent;
    },

    bindEvents() {
        // Botón Cerrar (X)
        const btnClose = document.getElementById('btn-close-projects');
        if(btnClose) {
            btnClose.onclick = () => {
                import('../core/Architect.js').then(m => m.Architect.render('capture'));
            };
        }

        // Botón Añadir (+)
        const btnAdd = document.getElementById('btn-add-project');
        if(btnAdd) {
            btnAdd.onclick = () => {
                ProjectModule.promptCreate();
            };
        }
    },

    destroy() {
        console.log('[ProjectView] Unmounted.');
        // Restaurar Navegación Global
        const globalNav = document.getElementById('bottom-nav');
        if(globalNav) globalNav.style.display = 'flex';
    }
};
