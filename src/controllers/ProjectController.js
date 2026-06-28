import { State } from '../core/state.js';
import { LogiNative } from '../core/capacitor-bridge.js';

export class ProjectController {
    constructor() {
        this.overlay = null;
        this.listContainer = null;
        this.btnOpen = null;
        this.btnClose = null;
        this.btnAdd = null;
    }

    init() {
        if (this.isInitialized) return;
        this.overlay = document.getElementById('projects-overlay') || document.body;
        this.listContainer = document.getElementById('projects-list');

        // Modal logic mapping
        this.dialog = document.getElementById('custom-dialog-overlay');
        this.dialogTitle = document.getElementById('dialog-title');
        this.dialogMsg = document.getElementById('dialog-message');
        this.dialogInputCont = document.getElementById('dialog-input-container');
        this.dialogInput = document.getElementById('dialog-input');
        this.btnDialogCancel = document.getElementById('dialog-btn-cancel');
        this.btnDialogConfirm = document.getElementById('dialog-btn-confirm');

        // Cloud Dialog mapping
        this.cloudDialog = document.getElementById('cloud-dialog-overlay');
        this.cloudInputUrl = document.getElementById('cloud-input-url');
        this.cloudInputKey = document.getElementById('cloud-input-key');
        this.cloudInputProject = document.getElementById('cloud-input-project');
        this.btnCloudCancel = document.getElementById('cloud-btn-cancel');
        this.btnCloudSave = document.getElementById('cloud-btn-save');
        this.btnCloudSyncAll = document.getElementById('cloud-btn-sync-all');

        State.subscribe((state, change) => {
            if (change === 'projects' || change === 'items' || !change) {
                this.renderList();
            }
        });

        this.renderList();
        this.isInitialized = true;
    }

    async openManager() {
        const { Architect } = await import('../core/Architect.js');
        await Architect.render('projects');
    }

    async selectProject(id) {
        await State.setProject(id);
        const { Architect } = await import('../core/Architect.js');
        // V189.6: Respetar el tab actual en lugar de forzar 'capture'
        Architect.render(State.currentTab || 'capture');
    }

    renderList() {
        if (!this.listContainer) return;
        let html = '';

        const projects = State.projects || [];
        projects.forEach(p => {
            const isActive = State.currentProject && State.currentProject.id === p.id;
            const activeClass = isActive ? 'active' : '';
            const isCloudSynced = !!p.supabaseUrl;

            html += `
            <div class="project-card ${activeClass} rounded-[2rem] p-6 flex items-center gap-4 cursor-pointer" onclick="ProjectModule.selectProject('${p.id}')">
                <div class="active-bar ${isActive ? '' : 'opacity-20 bg-white/20 shadow-none'}"></div>
                <div class="flex-1">
                    <h3 class="font-headline font-bold text-sm tracking-widest text-white uppercase">${p.name}</h3>
                </div>
                <div class="flex gap-2">
                    <button class="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center ${isCloudSynced ? 'text-[var(--primary)]' : 'text-white/20'} hover:text-[var(--primary)] transition-colors" 
                            onclick="event.stopPropagation(); ProjectModule.promptCloudConfig('${p.id}')">
                        <span class="material-symbols-outlined text-lg">cloud_sync</span>
                    </button>
                    <button class="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center text-white/50 hover:text-[var(--accent)] transition-colors" 
                            onclick="event.stopPropagation(); ProjectModule.promptRename('${p.id}', '${p.name}')">
                        <span class="material-symbols-outlined text-lg">edit</span>
                    </button>
                    <button class="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center text-white/50 hover:text-red-400 transition-colors" 
                            onclick="event.stopPropagation(); ProjectModule.promptDelete('${p.id}', '${p.name}')">
                        <span class="material-symbols-outlined text-lg">delete</span>
                    </button>
                </div>
            </div>`;
        });

        this.listContainer.innerHTML = html;
    }

    async selectProject(id) {
        await State.setProject(id);
        const { Architect } = await import('../core/Architect.js');
        await Architect.render('capture');
    }

    // === DIÁLOGOS PERSONALIZADOS ===

    async showDialog({ title, message, showInput = false, confirmText = 'ACEPTAR', cancelText = 'CANCELAR', icon = 'info' }) {
        return new Promise((resolve) => {
            this.dialogTitle.innerText = title;
            this.dialogMsg.innerText = message;
            this.btnDialogConfirm.innerText = confirmText;
            this.btnDialogCancel.innerText = cancelText;

            if (showInput) {
                this.dialogInputCont.classList.remove('hidden');
                this.dialogInput.value = '';
                this.dialogInput.focus();
            } else {
                this.dialogInputCont.classList.add('hidden');
            }

            this.dialog.classList.remove('hidden');
            this.dialog.classList.add('flex', 'active');

            const cleanup = (val) => {
                this.dialog.classList.remove('active');
                // IMPORTANTE: Esperamos a que la animación de salida termine antes de ocultar
                // Pero si hay otro diálogo esperando, podemos saltarnos esto para encadenarlos
                setTimeout(() => {
                    if (!this.dialog.classList.contains('active')) {
                        this.dialog.classList.add('hidden');
                    }
                    resolve(val);
                }, 300);
            };

            this.btnDialogCancel.onclick = () => cleanup(null);
            this.btnDialogConfirm.onclick = () => {
                const val = showInput ? this.dialogInput.value : true;
                cleanup(val);
            };
        });
    }

    async promptCreate() {
        const name = await this.showDialog({
            title: 'Nuevo Proyecto',
            message: 'Ingresa el nombre del frente de obra:',
            showInput: true,
            confirmText: 'Crear',
            icon: 'add'
        });
        if (name && name.trim()) {
            await State.addProject(name.trim());
        }
    }

    async promptRename(id, oldName) {
        const name = await this.showDialog({
            title: 'Renombrar',
            message: `Nuevo nombre para "${oldName}":`,
            showInput: true,
            confirmText: 'Guardar',
            icon: 'edit'
        });
        if (name && name.trim()) {
            await State.updateProjectName(id, name.trim());
        }
    }

    async promptDelete(id, name) {
        // Paso 1: Confirmación de Seguridad
        const confirmDelete = await this.showDialog({
            title: 'ELIMINAR PROYECTO',
            message: `¿Estás seguro de eliminar definitivamente "${name.toUpperCase()}"? Esta acción no se puede deshacer.`,
            confirmText: 'ELIMINAR',
            icon: 'warning'
        });

        if (confirmDelete) {
            // Paso 2: Opción de Backup (Segunda confirmación según lógica solicitada)
            const wantBackup = await this.showDialog({
                title: 'COPIA DE SEGURIDAD',
                message: '¿Deseas generar un backup en tu carpeta de "Documentos" antes de proceder con el borrado?',
                confirmText: 'SÍ',
                cancelText: 'NO',
                icon: 'backup'
            });

            if (wantBackup) {
                // Notificar y Backup
                console.log('KINETIC: Generando Backup...');
                await LogiNative.copyProjectData(id, name);
            }

            // En ambos casos (SÍ o NO al backup), el borrado se ejecuta
            await State.deleteProject(id);
            console.log('KINETIC: Proyecto Eliminado.');
        }
    }

    async promptCloudConfig(projectId) {
        const project = State.projects.find(p => p.id === projectId);
        if (!project) return;

        this.cloudInputUrl.value = project.supabaseUrl || '';
        this.cloudInputKey.value = project.supabaseKey || '';
        this.cloudInputProject.value = project.controlProjectId || '';

        // Mostrar botón de Sincronización Masiva solo si ya está configurado
        if (project.supabaseUrl) {
            this.btnCloudSyncAll.classList.remove('hidden');
        } else {
            this.btnCloudSyncAll.classList.add('hidden');
        }

        this.cloudDialog.classList.remove('hidden');
        this.cloudDialog.classList.add('flex', 'active');

        return new Promise((resolve) => {
            const cleanup = () => {
                this.cloudDialog.classList.remove('active');
                setTimeout(() => {
                    this.cloudDialog.classList.add('hidden');
                    resolve();
                }, 300);
            };

            this.btnCloudCancel.onclick = () => cleanup();

            this.btnCloudSyncAll.onclick = async () => {
                const nid = State._norm(projectId);
                const projectItems = State._allItems.filter(it => (it._pnid || State._norm(it.projectId)) === nid);
                const otherItems = State._allItems.filter(it => (it._pnid || State._norm(it.projectId)) !== nid);

                let includeOrphans = false;
                if (otherItems.length > 0) {
                    const confirmMigrate = await this.showDialog({
                        title: 'MIGRAR EVIDENCIAS',
                        message: `Tienes ${otherItems.length} fotos que pertenecen a otros proyectos o backups. ¿Deseas vincularlas a "${project.name.toUpperCase()}" y subirlas a la nube?`,
                        confirmText: 'SÍ, MIGRAR TODO',
                        cancelText: 'SOLO ESTE PROYECTO',
                        icon: 'sync_alt'
                    });
                    includeOrphans = !!confirmMigrate;
                }

                this.btnCloudSyncAll.innerText = 'Sincronizando...';
                this.btnCloudSyncAll.disabled = true;

                const { SupabaseSvc } = await import('../core/SupabaseService.js');
                const count = await SupabaseSvc.syncEntireProject(projectId, {
                    supabaseUrl: this.cloudInputUrl.value.trim(),
                    supabaseKey: this.cloudInputKey.value.trim(),
                    controlProjectId: this.cloudInputProject.value.trim()
                }, includeOrphans);

                this.btnCloudSyncAll.innerText = 'Sincronizar todo ahora';
                this.btnCloudSyncAll.disabled = false;

                alert(`¡Sincronización terminada! Se procesaron ${count} evidencias.`);
                cleanup();
            };

            this.btnCloudSave.onclick = async () => {
                const config = {
                    supabaseUrl: this.cloudInputUrl.value.trim(),
                    supabaseKey: this.cloudInputKey.value.trim(),
                    controlProjectId: this.cloudInputProject.value.trim()
                };

                if (config.supabaseUrl && !config.supabaseUrl.startsWith('http')) {
                    alert('La URL de Supabase debe ser válida.');
                    return;
                }

                await State.updateProjectCloudConfig(projectId, config);
                cleanup();

                // Notificar éxito con un efecto visual si es posible
                console.log('[ProjectController] Cloud Config Updated');
            };
        });
    }
}

export const ProjectModule = new ProjectController();
window.ProjectModule = ProjectModule;
