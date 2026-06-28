/**
 * ReportsController.js (Nexus Shield v184)
 * Gestión de archivos de informes y lógica de negocio.
 */
import { LogiNative } from '../core/capacitor-bridge.js';
import { State } from '../core/state.js';
import { CaptureDialog } from '../screens/capture/CaptureDialog.js';
import { Architect } from '../core/Architect.js';

class ReportsController {
    constructor() {
        this.reports = [];
        this.container = null;
        this.isInitialized = false;
    }

    async init() {
        this.container = document.getElementById('reports-content');
        
        const btnRefresh = document.getElementById('btn-refresh-reports');
        if (btnRefresh) {
            btnRefresh.onclick = () => {
                btnRefresh.classList.add('animate-spin');
                this.loadAndRender().finally(() => {
                    setTimeout(() => btnRefresh.classList.remove('animate-spin'), 600);
                });
            };
        }
        
        if (!this.isInitialized) {
            State.subscribe((state, changeType) => {
                if (changeType === 'color') return;
                if (State.currentTab === 'reports') this.loadAndRender();
            });
            this.isInitialized = true;
        }

        await this.loadAndRender();
    }

    async loadAndRender() {
        try {
            this.reports = await LogiNative.listReports();
            this.render();
        } catch (e) {
            console.error("Error in loadAndRender:", e);
        }
    }

    async openReport(filename) {
        if (!LogiNative.isNative()) {
            console.log("Web: Abriendo simulado", filename);
            return;
        }

        // Si es un Word, intentamos abrir su versión PDF para previsualización
        if (filename.toLowerCase().endsWith('.docx')) {
            const baseName = filename.substring(0, filename.lastIndexOf('.'));
            const pdfName = baseName + '.pdf';
            const metaName = baseName + '.meta';
            const allFiles = await LogiNative.listReports();
            
            if (allFiles.find(f => f.name === pdfName)) {
                console.log(`[Reports] Word detectado. Abriendo PDF de previsualización: ${pdfName}`);
                await LogiNative.viewReport(pdfName);
                return;
            } else if (allFiles.find(f => f.name === metaName)) {
                // v191.9-TURBO: Opción B - Preguntar para regenerar
                CaptureDialog.show(`Este informe Word no tiene vista previa. ¿Deseas generar el PDF ahora?`, async () => {
                    const ok = await window.ExportModule.regeneratePdfFromMeta(metaName, State.currentProject?.id);
                    if (ok) this.loadAndRender();
                });
                return;
            }
        }
        
        await LogiNative.viewReport(filename);
    }

    async shareReport(filename) {
        await LogiNative.shareReport(filename);
    }

    async deleteReport(filename) {
        CaptureDialog.show(`¿Eliminar el informe "${filename}" definitivamente?`, async () => {
            const ok = await LogiNative.deleteReport(filename);
            if (ok) {
                // Si es un Word, intentar borrar archivos compañeros
                if (filename.toLowerCase().endsWith('.docx')) {
                    const base = filename.substring(0, filename.lastIndexOf('.'));
                    await LogiNative.deleteReport(base + '.pdf');
                    await LogiNative.deleteReport(base + '.meta');
                }
                await this.loadAndRender();
            }
        });
    }

    async renameReport(filename) {
        const ext = filename.split('.').pop();
        const baseName = filename.substring(0, filename.lastIndexOf('.'));
        
        CaptureDialog.showPrompt(`Renombrar informe "${filename}"`, "NUEVO NOMBRE", async (newName) => {
            if (!newName) return;
            const finalName = newName.endsWith(`.${ext}`) ? newName : `${newName}.${ext}`;
            const ok = await LogiNative.renameReport(filename, finalName);
            
            if (ok) {
                // Si es un Word, intentar renombrar archivos compañeros
                if (filename.toLowerCase().endsWith('.docx')) {
                    const oldBase = baseName;
                    const newBase = newName.endsWith(`.${ext}`) ? newName.substring(0, newName.lastIndexOf('.')) : newName;
                    await LogiNative.renameReport(oldBase + '.pdf', newBase + '.pdf');
                    await LogiNative.renameReport(oldBase + '.meta', newBase + '.meta');
                }
                await this.loadAndRender();
            }
        });
    }

    goToExport() {
        State.setTab('export'); 
    }

    render() {
        if (!this.container) return;

        if (this.reports.length === 0) {
            this.container.innerHTML = `
                <div class="flex flex-col items-center justify-center py-12 px-4 border border-dashed border-white/10 rounded-2xl bg-white/[0.02] animate-in">
                    <span class="material-symbols-outlined text-white/20 text-4xl mb-4">analytics</span>
                    <p class="text-on-surface-variant font-headline text-sm text-center mb-6 uppercase tracking-widest font-bold">No hay más reportes archivados.</p>
                    <button id="btn-generate-report-empty" class="flex items-center gap-2 bg-primary text-black px-6 py-3 rounded-xl font-headline font-black text-[10px] tracking-widest uppercase hover:opacity-90 transition-all active:scale-95 shadow-neon">
                        <span class="material-symbols-outlined text-lg">add</span>
                        Generar Nuevo Reporte
                    </button>
                </div>
            `;
            const btn = document.getElementById('btn-generate-report-empty');
            if (btn) btn.onclick = () => this.goToExport();
            return;
        }

        // Filtrar PDFs que tienen un Word equivalente (para no duplicar en la lista)
        const docxFiles = this.reports.filter(f => f.name.toLowerCase().endsWith('.docx'));
        const visibleReports = this.reports.filter(f => {
            if (f.name.toLowerCase().endsWith('.pdf')) {
                const baseName = f.name.substring(0, f.name.lastIndexOf('.'));
                return !docxFiles.find(d => d.name.substring(0, d.name.lastIndexOf('.')) === baseName);
            }
            return true;
        });

        const html = visibleReports.map(report => this.renderListItem(report)).join('');
        this.container.innerHTML = `<div class="space-y-3 animate-in">${html}</div>`;
        
        // --- BINDING DIRECTO DE CARTAS ---
        visibleReports.forEach(report => {
            const el = document.getElementById(`report-card-${report.name}`);
            if (el) {
                el.onclick = () => this.openReport(report.name);
            }
        });

        this.container.insertAdjacentHTML('beforeend', `
             <div class="pt-6">
                <button id="btn-generate-report" class="w-full flex items-center justify-center gap-2 bg-white/5 border border-white/5 text-primary p-4 rounded-2xl font-headline font-black text-[10px] tracking-widest uppercase active:bg-white/10 transition-all">
                    <span class="material-symbols-outlined text-lg">add</span>
                    Generar Nuevo Reporte
                </button>
             </div>
        `);
        
        document.getElementById('btn-generate-report').onclick = () => this.goToExport();
    }

    renderListItem(report) {
        const isPdf = report.name.toLowerCase().endsWith('.pdf');
        const icon = isPdf ? 'picture_as_pdf' : 'description';
        const dateObj = new Date(report.mtime);
        const dateStr = dateObj.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' });
        const timeStr = dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

        return `
            <div id="report-card-${report.name}" class="group flex items-start justify-between p-4 rounded-2xl bg-[#0a0a0a] border border-white/5 transition-all duration-300 gap-4 hover:border-white/20 active:bg-white/5">
                <div class="flex items-start gap-4 flex-1 min-w-0">
                    <div class="w-11 h-11 flex-shrink-0 flex items-center justify-center rounded-xl bg-white/5 text-white/30">
                        <span class="material-symbols-outlined text-2xl">${icon}</span>
                    </div>
                    <div class="flex-1 min-w-0 py-1">
                        <h3 class="font-headline text-xs font-bold text-white/90 leading-tight truncate uppercase tracking-tight">${report.name}</h3>
                        <p class="text-[8px] font-label font-bold uppercase tracking-widest text-on-surface-variant/40 mt-1.5">${dateStr}, ${timeStr}</p>
                    </div>
                </div>
                <div class="flex items-center gap-1 flex-shrink-0" onclick="event.stopPropagation()">
                    <button onclick="window.ReportsModule.renameReport('${report.name}')" class="w-10 h-10 flex items-center justify-center rounded-full hover:bg-white/5 text-white/10 transition-all active:scale-90" title="Renombrar">
                        <span class="material-symbols-outlined text-[20px]">edit</span>
                    </button>
                    <button onclick="window.ReportsModule.shareReport('${report.name}')" class="w-10 h-10 flex items-center justify-center rounded-full hover:bg-white/5 text-white/30 transition-all active:scale-90" title="Compartir">
                        <span class="material-symbols-outlined text-[20px]">share</span>
                    </button>
                    <button onclick="window.ReportsModule.deleteReport('${report.name}')" class="w-10 h-10 flex items-center justify-center rounded-full hover:bg-white/5 text-white/10 hover:text-red-500 transition-all active:scale-90" title="Eliminar">
                        <span class="material-symbols-outlined text-[20px]">delete</span>
                    </button>
                </div>
            </div>
        `;
    }
}

export const ReportsModule = new ReportsController();
window.ReportsModule = ReportsModule;
