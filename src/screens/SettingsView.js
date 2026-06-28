/**
 * SettingsView.js
 * Logi Kinetic | Configuration Controller
 */
import { Architect } from '../core/Architect.js';
import { State } from '../core/state.js';
import { SettingsScaffold } from './settings/SettingsScaffold.js';
import { BackupModule } from '../core/BackupModule.js';

export const SettingsView = {
    getLayout(isLandscape) {
        return SettingsScaffold.render();
    },

    async init() {
        console.log('>>> CONFIGURACIÓN ACTIVADA <<<');
        this.rebind();
    },
    rebind() {
        console.log('[Settings] Rebinding events...');

        // Color de Acento
        const colorButtons = document.querySelectorAll('.glass-card button[class*="rounded-full"]');
        colorButtons.forEach(btn => {
            btn.onclick = () => {
                const color = window.getComputedStyle(btn).backgroundColor;
                const rgb = color.match(/\d+/g);
                const hex = "#" + ((1 << 24) + (+rgb[0] << 16) + (+rgb[1] << 8) + +rgb[2]).toString(16).slice(1);

                State.setAccentColor(hex);
                this.updateColorSelectionUI(hex);
            };
        });

        this.updateColorSelectionUI(State.accentColor);

        // --- Gestión de Ítems ---
        const btnLoad = document.getElementById('btn-load-items');
        const btnView = document.getElementById('btn-view-items');
        const btnDel = document.getElementById('btn-del-items');

        if (btnLoad) {
            btnLoad.onclick = () => {
                const input = document.createElement('input');
                input.type = 'file';
                input.accept = '.xlsx, .xls, .csv';
                input.onchange = async (e) => {
                    const file = e.target.files[0];
                    if (file) {
                        const res = await State.importCatalog(file);
                        if (res.success) {
                            alert(`Catálogo cargado: ${res.count} ítems.`);
                        } else {
                            alert(`Error: ${res.msg}`);
                        }
                    }
                };
                input.click();
            };
        }

        if (btnView) {
            btnView.onclick = () => {
                if (State.catalog.length === 0) {
                    alert("No hay ítems cargados en este proyecto.");
                    return;
                }
                Architect.render('items_view');
            };
        }

        if (btnDel) {
            btnDel.onclick = async () => {
                if (confirm("¿Estás seguro de eliminar el listado de ítems de este proyecto?")) {
                    await State.deleteCatalog();
                    alert("Listado eliminado.");
                }
            };
        }

        // --- GESTIÓN DE RESPALDOS (BACKUP/RESTORE) ---
        const btnBackupProjDown = document.getElementById('btn-backup-project-download');
        const btnBackupProjUp = document.getElementById('btn-backup-project-restore');
        const btnBackupTotalDown = document.getElementById('btn-backup-total-download');
        const btnBackupTotalUp = document.getElementById('btn-backup-total-restore');

        if (btnBackupProjDown) {
            btnBackupProjDown.onclick = () => {
                if (!State.currentProject) return alert("No hay un proyecto activo seleccionado.");
                BackupModule.exportProject(State.currentProject.id, (p) => this.updateProgress(p));
            };
        }

        if (btnBackupProjUp || btnBackupTotalUp) {
            const handleRestore = (e) => {
                const file = e.target.files[0];
                if (file) {
                    BackupModule.importBackup(file, (p) => this.updateProgress(p));
                }
            };

            [btnBackupProjUp, btnBackupTotalUp].forEach(btn => {
                if (!btn) return;
                btn.onclick = () => {
                    const input = document.createElement('input');
                    input.type = 'file';
                    input.accept = '.zip';
                    input.onchange = handleRestore;
                    input.click();
                };
            });
        }

        if (btnBackupTotalDown) {
            btnBackupTotalDown.onclick = () => {
                BackupModule.exportTotal((p) => this.updateProgress(p));
            };
        }
    },

    updateProgress(p) {
        let overlay = document.getElementById('backup-progress-overlay');
        if (!overlay) {
            overlay = document.createElement('div');
            overlay.id = 'backup-progress-overlay';
            overlay.className = 'fixed inset-0 z-[999] flex items-center justify-center bg-black/80 backdrop-blur-md animate-in fade-in duration-300';
            overlay.innerHTML = `
                <div class="w-64 space-y-6 text-center">
                    <div class="h-1 shadow-neon bg-primary w-0 transition-all duration-300" id="backup-progress-bar"></div>
                    <div class="space-y-2">
                        <p id="backup-progress-msg" class="font-headline text-[10px] font-bold uppercase tracking-widest text-primary">Iniciando...</p>
                        <p id="backup-progress-counter" class="font-headline text-xs text-white/50">0%</p>
                    </div>
                </div>
            `;
            document.body.appendChild(overlay);
        }

        const bar = document.getElementById('backup-progress-bar');
        const msg = document.getElementById('backup-progress-msg');
        const count = document.getElementById('backup-progress-counter');

        if (bar) bar.style.width = p.percent + '%';
        if (msg) msg.innerText = p.message;
        if (count) count.innerText = p.percent + '%';

        if (p.percent >= 100 && p.message === 'Completado') {
            setTimeout(() => overlay.remove(), 1500);
        }
    },

    updateColorSelectionUI(activeColor) {
        const colorButtons = document.querySelectorAll('.glass-card button[class*="rounded-full"]');
        colorButtons.forEach(btn => {
            const btnColorRaw = window.getComputedStyle(btn).backgroundColor;
            const rgb = btnColorRaw.match(/\d+/g);
            const btnHex = "#" + ((1 << 24) + (+rgb[0] << 16) + (+rgb[1] << 8) + +rgb[2]).toString(16).slice(1);

            if (btnHex.toLowerCase() === activeColor.toLowerCase()) {
                btn.classList.add('ring-2', 'ring-primary', 'ring-offset-4', 'ring-offset-surface-container');
                btn.classList.remove('opacity-40');
                btn.style.boxShadow = `0 0 12px ${activeColor}66`;

                // Actualizar texto label
                const label = btn.parentElement.nextElementSibling;
                if (label) {
                    label.textContent = this.getColorName(btnHex);
                }
            } else {
                btn.classList.remove('ring-2', 'ring-primary', 'ring-offset-4', 'ring-offset-surface-container');
                btn.classList.add('opacity-40');
                btn.style.boxShadow = 'none';
            }
        });
    },

    getColorName(hex) {
        const names = {
            '#1e90ff': 'Dodger Blue',
            '#00ffff': 'Electric Cyan',
            '#cafd00': 'Electric Lime',
            '#8a2be2': 'Royal Purple',
            '#ff6d00': 'Neon Orange',
            '#ff1493': 'Deep Pink'
        };
        return names[hex.toLowerCase()] || 'Custom Color';
    }
};
