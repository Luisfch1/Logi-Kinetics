/**
 * main.js
 * Logi Kinetic | Modular Architect Entry Point
 */
import './style.css';
import { State } from './core/state.js';
import { Architect } from './core/Architect.js';
import { CaptureView } from './screens/CaptureView.js';
import { ProjectView } from './screens/ProjectView.js';
import { GalleryView } from './screens/GalleryView.js';
import { ExportView } from './screens/ExportView.js';
import { ReportsView } from './screens/ReportsView.js';
import { SettingsView } from './screens/SettingsView.js';
import { ItemsView } from './screens/ItemsView.js';
import { ProjectModule } from './controllers/ProjectController.js';
import { GalleryModule } from './controllers/GalleryController.js';
import { CaptureCtrl } from './controllers/CaptureModule.js';
import { ExportModule } from './controllers/ExportController.js';
import { BackupModule } from './core/BackupModule.js';
import { LogiNative } from './core/capacitor-bridge.js';
import { DebugLogger } from './utils/DebugLogger.js';
import { defineCustomElements } from '@ionic/pwa-elements/loader';

// Inicializar elementos PWA para soporte de cámara/galería en Web
defineCustomElements(window);

// Exponer módulos para acceso global (v191.9-PREMIUM)
window.DebugLogger = DebugLogger;
window.ProjectModule = ProjectModule;
window.GalleryController = GalleryModule;
window.CaptureModule = CaptureCtrl;
window.ExportModule = ExportModule;
window.App = Architect; // Para compatibilidad con CaptureModule

// Registro de Pantallas
Architect.register('capture', CaptureView);
Architect.register('projects', ProjectView); 
Architect.register('gallery', GalleryView);
Architect.register('export', ExportView);
Architect.register('reports', ReportsView);
Architect.register('settings', SettingsView);
Architect.register('items_view', ItemsView);

document.addEventListener('DOMContentLoaded', async () => {
    console.log('[App] Kinetic Engine Initialized');
    try {
        await LogiNative.init();
        
        // Carga paralela: No bloqueamos el renderizado inicial
        State.loadFromDisk(); 
        ProjectModule.init();

        // v191.9-OAK: GIGA-RECONCILIER (Sensor Automático)
        setTimeout(() => BackupModule.reconcile(), 1000);

        // Renderizado inmediato del marco
        Architect.render('capture');
        updateHeaderProjectName();
        setupHeaderSettings();
        setupThemeToggle();
        setupNavigation();

        State.subscribe(() => {
            updateHeaderProjectName();
        });
    } catch (e) {
        console.error("Boot Error:", e);
    }
});

function setupHeaderSettings() {
    const btn = document.getElementById('btn-app-settings');
    if (btn) {
        btn.onclick = () => State.setTab('settings');
    }
}

function setupThemeToggle() {
    const btn = document.getElementById('btn-theme-toggle');
    const icon = document.getElementById('theme-toggle-icon');
    
    if (btn && icon) {
        const updateIcon = () => {
            const isDark = State.theme === 'dark';
            icon.innerText = isDark ? 'dark_mode' : 'light_mode';
        };

        // Estado inicial
        updateIcon();

        btn.onclick = () => {
            const newTheme = State.theme === 'dark' ? 'light' : 'dark';
            State.setTheme(newTheme);
            updateIcon();
        };

        // Suscribirse a cambios externos del tema (si los hay)
        State.subscribe((state, changeType) => {
            if (changeType === 'theme') updateIcon();
        });
    }
}

function setupNavigation() {
    const tabs = ['capture', 'gallery', 'export', 'reports', 'settings', 'projects'];
    
    // Listener reactivo central para navegación
    State.subscribe((state, changeType) => {
        if (changeType === 'tab') {
            const tabId = state.currentTab;
            console.log(`[Navigation] Tab changed to: ${tabId}. Rendering...`);
            Architect.render(tabId);
        }
    });

    tabs.forEach(tabId => {
        const el = document.getElementById(`nav-${tabId}`);
        if(el) {
            el.onclick = async () => {
                const implemented = ['capture', 'gallery', 'export', 'reports', 'settings'];
                if (implemented.includes(tabId)) {
                    State.setTab(tabId);
                }
            };
        }
    });
}

function updateHeaderProjectName() {
    const el = document.getElementById('header-project-name');
    if (el && State.currentProject) {
        const normId = State._norm(State.currentProject.id);
        const count = (State.items || []).length;
        const total = (State._allItems || []).length;
        
        // Diagnóstico v189.8 (Consola de Emergencia)
        let clickCount = 0;
        const logo = document.querySelector('h1.font-black');
        if (logo) {
            logo.onclick = (e) => {
                e.stopPropagation();
                clickCount++;
                if (clickCount >= 5) {
                    clickCount = 0;
                    showDebugConsole();
                }
                setTimeout(() => { clickCount = 0; }, 3000);
            };
        }

        const debug = LogiNative.getDebugInfo();
        const storageLabel = debug.platform === 'NATIVE' ? `(${debug.primary === 'DATA' ? 'PRIV' : 'PUB'})` : '(WEB)';
        
        el.innerHTML = `${State.currentProject.name}`;
        
        const trigger = document.getElementById('debug-trigger');
        if (trigger) {
            trigger.onclick = (e) => {
                e.stopPropagation();
                if (confirm("¿Forzar re-migración de datos legacy?")) {
                    LogiNative.forceMigrate();
                }
            };
        }
        
        // Si hay items cargados pero ninguno coincide con el proyecto actual (count=0),
        // mostramos una alerta de diagnóstico silenciosa en consola
        if (total > 0 && count === 0) {
            console.warn(`[Diag] Filtro fallido. Buscando por PID:${normId}. Sample item ID:${State._allItems[0]._pnid}`);
        }
    }
}

function showDebugConsole() {
    const overlay = document.getElementById('debug-console-overlay');
    const content = document.getElementById('debug-console-content');
    if (!overlay || !content) return;

    overlay.classList.remove('hidden');

    const renderConsoleBody = (activeTab = 'all') => {
        const stats = DebugLogger.getStorageStats();
        const capStats = DebugLogger.getCaptureStats();
        const items = State._allItems || [];
        const logs = DebugLogger.getLogs(
            activeTab === 'camera' ? 'CAMERA' : (activeTab === 'storage' ? 'STORAGE' : null),
            activeTab === 'error' ? 'ERROR' : null
        );

        let html = `
            <div class="bg-primary/20 p-3 text-center rounded-xl mb-4 border border-primary/30">
                <p class="text-[10px] font-black text-primary tracking-[0.3em] uppercase">LOGI KINETICS v0.0.6 · REPORT STUDIO</p>
                <p class="text-[8px] text-white/50 mt-1">ULTIMATE DEBUG CONSOLE · PLANTILLAS WORD Y PDF</p>
            </div>

            <!-- BOTONES DE ACCIÓN RÁPIDA -->
            <div class="grid grid-cols-2 gap-2 mb-4">
                <button id="btn-run-health-check" class="bg-primary text-black py-2.5 px-3 rounded-xl font-bold text-[9px] uppercase tracking-wider flex items-center justify-center gap-1 active:scale-95 transition-all shadow-lg">
                    <span class="material-symbols-outlined text-sm">health_and_safety</span>
                    <span>EJECUTAR DIAGNÓSTICO</span>
                </button>
                <button id="btn-copy-debug-report" class="bg-white/10 hover:bg-white/20 text-white py-2.5 px-3 rounded-xl font-bold text-[9px] uppercase tracking-wider flex items-center justify-center gap-1 active:scale-95 transition-all border border-white/10">
                    <span class="material-symbols-outlined text-sm">content_copy</span>
                    <span>COPIAR REPORTE</span>
                </button>
            </div>

            <!-- RESULTADO HEALTH CHECK (DINÁMICO) -->
            <div id="health-check-results" class="hidden mb-4 p-3 bg-white/5 border border-white/10 rounded-xl space-y-2">
                <p class="text-[9px] font-bold text-primary uppercase tracking-widest">RESULTADOS DE DIAGNÓSTICO DE SALUD</p>
                <div id="health-check-items" class="space-y-1.5 text-[10px]"></div>
            </div>

            <!-- MEDICIONES DE ALMACENAMIENTO Y MEMORIA -->
            <div class="bg-white/5 p-4 rounded-xl space-y-2 border border-white/5 mb-4">
                <p class="text-white font-bold uppercase tracking-widest text-[9px] text-primary/80 mb-2">MEDICIONES DE ALMACENAMIENTO Y SISTEMA</p>
                <div class="grid grid-cols-2 gap-2 text-[10px]">
                    <div class="bg-black/40 p-2 rounded-lg">
                        <span class="text-white/40 block text-[8px]">LOCALSTORAGE USADO</span>
                        <span class="text-white font-mono font-bold">${stats.localStorageKB} KB</span>
                    </div>
                    <div class="bg-black/40 p-2 rounded-lg">
                        <span class="text-white/40 block text-[8px]">TOTAL ITEMS / VISIBLES</span>
                        <span class="text-white font-mono font-bold">${State._allItems?.length || 0} / ${State.items?.length || 0}</span>
                    </div>
                    <div class="bg-black/40 p-2 rounded-lg">
                        <span class="text-white/40 block text-[8px]">FOTOS CAPTURADAS</span>
                        <span class="text-white font-mono font-bold">${capStats.photoCaptured} (${capStats.cameraOpened} câm.)</span>
                    </div>
                    <div class="bg-black/40 p-2 rounded-lg">
                        <span class="text-white/40 block text-[8px]">PROM. COMPRIMIDO</span>
                        <span class="text-primary font-mono font-bold">${capStats.avgCompressedKB} KB</span>
                    </div>
                    ${stats.heap ? `
                    <div class="col-span-2 bg-black/40 p-2 rounded-lg">
                        <span class="text-white/40 block text-[8px]">MEMORIA JS HEAP (USED / TOTAL)</span>
                        <span class="text-white font-mono font-bold">${stats.heap.usedMB} MB / ${stats.heap.totalMB} MB</span>
                    </div>
                    ` : ''}
                </div>
            </div>

            <!-- LÍNEA DE TIEMPO / CONSOLA DE EVENTOS -->
            <div class="bg-white/5 p-4 rounded-xl space-y-3 border border-white/5 mb-4">
                <div class="flex justify-between items-center">
                    <p class="text-white font-bold uppercase tracking-widest text-[9px]">LÍNEA DE TIEMPO DE EVENTOS (${logs.length})</p>
                    <button id="btn-clear-debug-logs" class="text-[8px] text-red-400 hover:text-red-300 font-bold uppercase tracking-wider underline">Limpiar Logs</button>
                </div>

                <!-- FILTROS DE TAB -->
                <div class="flex gap-1.5 text-[8px] uppercase font-bold overflow-x-auto pb-1">
                    <button class="btn-log-tab px-2.5 py-1 rounded-lg ${activeTab === 'all' ? 'bg-primary text-black' : 'bg-white/10 text-white/60'}" data-tab="all">Todos</button>
                    <button class="btn-log-tab px-2.5 py-1 rounded-lg ${activeTab === 'error' ? 'bg-red-500 text-white' : 'bg-white/10 text-white/60'}" data-tab="error">Errores (${capStats.totalErrors})</button>
                    <button class="btn-log-tab px-2.5 py-1 rounded-lg ${activeTab === 'camera' ? 'bg-primary text-black' : 'bg-white/10 text-white/60'}" data-tab="camera">Cámara</button>
                    <button class="btn-log-tab px-2.5 py-1 rounded-lg ${activeTab === 'storage' ? 'bg-primary text-black' : 'bg-white/10 text-white/60'}" data-tab="storage">Storage</button>
                </div>

                <!-- LISTADO DE LOGS -->
                <div class="max-h-60 overflow-y-auto space-y-1.5 pr-1 font-mono text-[9px]">
                    ${logs.length === 0 ? '<p class="text-white/30 italic py-4 text-center">No hay eventos registrados en este filtro.</p>' : ''}
                    ${logs.map(l => {
                        let colorClass = 'border-white/10 bg-white/5 text-white/80';
                        if (l.level === 'ERROR') colorClass = 'border-red-500/50 bg-red-500/10 text-red-300';
                        else if (l.level === 'WARN') colorClass = 'border-amber-500/50 bg-amber-500/10 text-amber-300';
                        else if (l.level === 'EVENT') colorClass = 'border-primary/50 bg-primary/10 text-primary';

                        return `
                            <div class="p-2 border-l-2 rounded-r-lg ${colorClass} space-y-0.5">
                                <div class="flex justify-between text-[8px] opacity-60">
                                    <span>[${l.timeStr}] [${l.category}]</span>
                                    <span>${l.level}</span>
                                </div>
                                <div class="font-bold break-all">${l.message}</div>
                                ${l.meta ? `<pre class="text-[7.5px] opacity-70 overflow-x-auto mt-1 bg-black/40 p-1 rounded">${JSON.stringify(l.meta, null, 1)}</pre>` : ''}
                            </div>
                        `;
                    }).join('')}
                </div>
            </div>

            <!-- REGISTROS INDIVIDUALES BASE DE DATOS -->
            <div class="space-y-3">
                <p class="text-white font-bold uppercase tracking-widest text-[9px]">REGISTROS BASE DE DATOS (${items.length})</p>
                ${items.slice(0, 10).map((it, idx) => `
                    <div class="border-l-2 border-primary/30 pl-3 py-1.5 space-y-0.5 bg-white/5 rounded-r-lg text-[9px]">
                        <p class="text-[8px] text-white/40">ITEM #${idx + 1}</p>
                        <p>ID: <span class="text-white font-mono">${it.id}</span></p>
                        <p>PROJ_ID: <span class="text-white font-mono">${it.projectId}</span></p>
                        <p>FILE: <span class="text-white font-mono">${it.filename}</span></p>
                    </div>
                `).join('')}
                ${items.length > 10 ? `<p class="text-center opacity-40 py-2 italic text-[9px]">... Y ${items.length - 10} REGISTROS MÁS ...</p>` : ''}
            </div>
        `;

        content.innerHTML = html;

        // Re-vincular eventos interactivos
        const btnHealth = document.getElementById('btn-run-health-check');
        if (btnHealth) {
            btnHealth.onclick = async () => {
                btnHealth.disabled = true;
                btnHealth.innerHTML = '<span class="animate-spin text-sm">sync</span> EJECUTANDO...';
                const healthRes = await DebugLogger.runHealthCheck();
                btnHealth.disabled = false;
                btnHealth.innerHTML = '<span class="material-symbols-outlined text-sm">health_and_safety</span> EJECUTAR DIAGNÓSTICO';

                const resBox = document.getElementById('health-check-results');
                const resItems = document.getElementById('health-check-items');
                if (resBox && resItems) {
                    resBox.classList.remove('hidden');
                    resItems.innerHTML = healthRes.checks.map(c => `
                        <div class="flex justify-between items-center p-1.5 bg-black/40 rounded">
                            <span class="text-white font-bold">${c.name}</span>
                            <span class="${c.pass ? 'text-primary' : 'text-red-400'} font-mono font-bold">${c.pass ? 'PASÓ ✅' : 'FALLÓ ❌'} (${c.detail})</span>
                        </div>
                    `).join('');
                }
            };
        }

        const btnCopy = document.getElementById('btn-copy-debug-report');
        if (btnCopy) {
            btnCopy.onclick = () => {
                const report = DebugLogger.generateReportText();
                if (navigator.clipboard && navigator.clipboard.writeText) {
                    navigator.clipboard.writeText(report).then(() => {
                        alert("¡Reporte completo copiado al portapapeles con éxito!");
                    }).catch(err => {
                        prompt("Copia el reporte manualmente:", report);
                    });
                } else {
                    prompt("Copia el reporte manualmente:", report);
                }
            };
        }

        const btnClear = document.getElementById('btn-clear-debug-logs');
        if (btnClear) {
            btnClear.onclick = () => {
                if (confirm("¿Limpiar la línea de tiempo de depuración?")) {
                    DebugLogger.clear();
                    renderConsoleBody(activeTab);
                }
            };
        }

        document.querySelectorAll('.btn-log-tab').forEach(btn => {
            btn.onclick = () => {
                const tab = btn.dataset.tab;
                renderConsoleBody(tab);
            };
        });
    };

    renderConsoleBody('all');
}
