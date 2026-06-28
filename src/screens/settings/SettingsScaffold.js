/**
 * SettingsScaffold.js
 * Logi Kinetic | Stitch Design Configuration UI
 */

export const SettingsScaffold = {
    render() {
        return `
        <main class="flex-1 w-full overflow-y-auto pb-32 animate-in fade-in duration-500">
            <div class="max-w-xl mx-auto px-6 py-12 space-y-12">
                <!-- Sección Apariencia -->
                <section class="space-y-6">
                    <div class="flex items-center gap-3 px-1">
                        <span class="material-symbols-outlined text-primary text-lg">palette</span>
                        <h3 class="font-headline text-xs font-bold uppercase tracking-[0.2em] text-on-surface-variant">Apariencia</h3>
                    </div>
                    
                    <div class="glass-card rounded-xl p-8 space-y-10">
                        <!-- Selector de Acento -->
                        <div class="space-y-5">
                            <label class="font-headline text-sm font-medium text-on-surface/80 block">Color de Acento</label>
                            <div class="flex items-center justify-between bg-surface-container-low/50 p-4 rounded-lg border border-outline-variant/50">
                                <div class="flex gap-3">
                                    <button class="w-6 h-6 rounded-full bg-[#1e90ff] opacity-40 hover:opacity-100 transition-all active:scale-90"></button>
                                    <button class="w-6 h-6 rounded-full bg-[#00ffff] opacity-40 hover:opacity-100 transition-all active:scale-90"></button>
                                    <button class="w-6 h-6 rounded-full bg-[#cafd00] opacity-40 hover:opacity-100 transition-all active:scale-90"></button>
                                    <button class="w-6 h-6 rounded-full bg-[#8a2be2] opacity-40 hover:opacity-100 transition-all active:scale-90"></button>
                                    <button class="w-6 h-6 rounded-full bg-[#ff6d00] opacity-40 hover:opacity-100 transition-all active:scale-90"></button>
                                    <button class="w-6 h-6 rounded-full bg-[#ff1493] opacity-40 hover:opacity-100 transition-all active:scale-90"></button>
                                </div>
                                <span class="text-[10px] font-bold font-headline text-primary tracking-widest uppercase">Electric Lime</span>
                            </div>
                        </div>

                        <!-- Selector de Modo -->
                        <div class="space-y-5">
                            <label class="font-headline text-sm font-medium text-on-surface/80 block">Modo de Interfaz</label>
                            <div class="grid grid-cols-2 gap-4">
                                <button class="flex items-center justify-center gap-2 py-3 rounded-lg border border-primary/30 bg-primary/5 text-primary transition-all active:scale-[0.98] glow-border">
                                    <span class="material-symbols-outlined text-base" style="font-variation-settings: 'FILL' 1;">auto_awesome</span>
                                    <span class="font-headline text-xs font-bold uppercase tracking-widest">Light</span>
                                </button>
                                <button class="flex items-center justify-center gap-2 py-3 rounded-lg border border-outline-variant bg-surface-container-high text-on-surface-variant transition-all active:scale-[0.98]">
                                    <span class="material-symbols-outlined text-base">blur_on</span>
                                    <span class="font-headline text-xs font-bold uppercase tracking-widest">Dark</span>
                                </button>
                            </div>
                        </div>
                    </div>
                </section>

                <!-- Sección Gestión de Datos -->
                <section class="space-y-6">
                    <div class="flex items-center gap-3 px-1">
                        <span class="material-symbols-outlined text-primary text-lg">inventory_2</span>
                        <h3 class="font-headline text-xs font-bold uppercase tracking-[0.2em] text-on-surface-variant">Gestión de Datos</h3>
                    </div>
                    
                    <div class="space-y-4">
                        <!-- Ítems del Proyecto -->
                        <div class="glass-card rounded-xl p-6 space-y-6 border-l-2 border-l-primary/20">
                            <div class="flex items-center gap-4">
                                <div class="w-10 h-10 rounded-lg bg-surface-container flex items-center justify-center text-primary/80">
                                    <span class="material-symbols-outlined">account_tree</span>
                                </div>
                                <div>
                                    <p class="font-headline text-sm font-bold tracking-tight">Ítems del proyecto</p>
                                    <p class="text-[11px] text-on-surface-variant uppercase tracking-tighter">Organizar jerarquía de carpetas</p>
                                </div>
                            </div>
                            <div class="grid grid-cols-3 gap-2">
                                <button id="btn-load-items" class="py-2.5 rounded border border-outline-variant text-[10px] font-bold font-headline tracking-widest text-on-surface-variant hover:border-primary hover:text-primary transition-colors uppercase">Cargar</button>
                                <button id="btn-view-items" class="py-2.5 rounded border border-outline-variant text-[10px] font-bold font-headline tracking-widest text-on-surface-variant hover:border-primary hover:text-primary transition-colors uppercase">Visualizar</button>
                                <button id="btn-del-items" class="py-2.5 rounded border border-error/20 text-[10px] font-bold font-headline tracking-widest text-error/60 hover:bg-error/10 hover:text-error transition-colors uppercase">Eliminar</button>
                            </div>
                        </div>

                        <!-- Formato del Proyecto -->
                        <div class="glass-card rounded-xl p-6 space-y-6 border-l-2 border-l-primary/20">
                            <div class="flex items-center gap-4">
                                <div class="w-10 h-10 rounded-lg bg-surface-container flex items-center justify-center text-primary/80">
                                    <span class="material-symbols-outlined">data_object</span>
                                </div>
                                <div>
                                    <p class="font-headline text-sm font-bold tracking-tight">Formato del proyecto</p>
                                    <p class="text-[11px] text-on-surface-variant uppercase tracking-tighter">Definir metadatos y etiquetas</p>
                                </div>
                            </div>
                            <div class="grid grid-cols-3 gap-2">
                                <button id="btn-load-format" class="py-2.5 rounded border border-outline-variant text-[10px] font-bold font-headline tracking-widest text-on-surface-variant hover:border-primary hover:text-primary transition-colors uppercase">Cargar</button>
                                <button id="btn-view-format" class="py-2.5 rounded border border-outline-variant text-[10px] font-bold font-headline tracking-widest text-on-surface-variant hover:border-primary hover:text-primary transition-colors uppercase">Previsualizar</button>
                                <button id="btn-del-format" class="py-2.5 rounded border border-error/20 text-[10px] font-bold font-headline tracking-widest text-error/60 hover:bg-error/10 hover:text-error transition-colors uppercase">Eliminar</button>
                            </div>
                        </div>
                    </div>
                </section>

                <!-- Sección Respaldos -->
                <section class="space-y-6">
                    <div class="flex items-center gap-3 px-1">
                        <span class="material-symbols-outlined text-primary text-lg">cloud_sync</span>
                        <h3 class="font-headline text-xs font-bold uppercase tracking-[0.2em] text-on-surface-variant">Respaldos</h3>
                    </div>
                    
                    <div class="grid grid-cols-1 gap-4">
                        <!-- Respaldo de Proyecto -->
                        <div class="glass-card rounded-xl p-6 flex items-center justify-between border-l-2 border-l-tertiary/30">
                            <div class="flex items-center gap-4">
                                <div class="text-tertiary">
                                    <span class="material-symbols-outlined text-2xl" style="font-variation-settings: 'FILL' 1;">cloud_queue</span>
                                </div>
                                <div class="flex-1">
                                    <p class="font-headline text-sm font-bold">Respaldo de proyecto</p>
                                    <p class="text-[10px] text-on-surface-variant font-bold uppercase tracking-widest mt-0.5">Zip individual</p>
                                </div>
                            </div>
                            <div class="flex gap-2">
                                <button id="btn-backup-project-restore" title="Restaurar Proyecto" class="w-10 h-10 rounded-lg bg-surface-container-high border border-outline-variant flex items-center justify-center hover:text-tertiary hover:border-tertiary/40 transition-all active:scale-90">
                                    <span class="material-symbols-outlined text-xl">upload</span>
                                </button>
                                <button id="btn-backup-project-download" title="Descargar Proyecto" class="w-10 h-10 rounded-lg bg-surface-container-high border border-outline-variant flex items-center justify-center hover:text-tertiary hover:border-tertiary/40 transition-all active:scale-90">
                                    <span class="material-symbols-outlined text-xl">download</span>
                                </button>
                            </div>
                        </div>
                        
                        <!-- Respaldo Total -->
                        <div class="glass-card rounded-xl p-6 flex items-center justify-between border-l-2 border-l-primary/30">
                            <div class="flex items-center gap-4">
                                <div class="text-primary">
                                    <span class="material-symbols-outlined text-2xl" style="font-variation-settings: 'FILL' 1;">backup</span>
                                </div>
                                <div class="flex-1">
                                    <p class="font-headline text-sm font-bold">Respaldo TOTAL</p>
                                    <p class="text-[10px] text-on-surface-variant font-bold uppercase tracking-widest mt-0.5">Base de datos + Fotos</p>
                                </div>
                            </div>
                            <div class="flex gap-2">
                                <button id="btn-backup-total-restore" title="Restaurar Todo" class="w-10 h-10 rounded-lg bg-surface-container-high border border-outline-variant flex items-center justify-center hover:text-primary hover:border-primary/40 transition-all active:scale-90">
                                    <span class="material-symbols-outlined text-xl">upload_file</span>
                                </button>
                                <button id="btn-backup-total-download" title="Descargar Todo" class="w-10 h-10 rounded-lg bg-surface-container-high border border-outline-variant flex items-center justify-center hover:text-primary hover:border-primary/40 transition-all active:scale-90">
                                    <span class="material-symbols-outlined text-xl">download_for_offline</span>
                                </button>
                            </div>
                        </div>

                        <!-- Importar de Legacy (Local Shared Storage) -->
                        <div class="glass-card rounded-xl p-6 flex items-center justify-between border-l-2 border-l-primary/30">
                            <div class="flex items-center gap-4">
                                <div class="text-primary">
                                    <span class="material-symbols-outlined text-2xl">move_down</span>
                                </div>
                                <div class="flex-1">
                                    <p class="font-headline text-sm font-bold">Importar de Logi Legacy</p>
                                    <p class="text-[10px] text-on-surface-variant font-bold uppercase tracking-widest mt-0.5">Transferir fotos y proyectos locales</p>
                                </div>
                            </div>
                            <div class="flex gap-2">
                                <button id="btn-import-legacy-local" title="Importar desde Legacy" class="px-4 h-10 rounded-lg bg-surface-container-high border border-outline-variant flex items-center gap-2 hover:text-primary hover:border-primary/40 transition-all active:scale-90 text-[10px] font-black uppercase font-headline">
                                    <span class="material-symbols-outlined text-base">swap_calls</span> MIGRAR
                                </button>
                            </div>
                        </div>
                    </div>
                </section>

                <!-- Danger Zone Footer -->
                <div class="pt-8 flex flex-col items-center gap-6">
                    <p class="text-[9px] text-on-surface-variant/40 font-medium tracking-widest uppercase">Logi Pro v4.2.0 • Build 2026.04.01</p>
                </div>
            </div>
        </main>
        `;
    }
};
