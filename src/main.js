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

// Exponer módulos para acceso global (v191.9-PREMIUM)
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
        btn.onclick = () => Architect.render('settings');
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
    
    const p = State.currentProject || { id: 'N/A', name: 'N/A' };
    const items = State._allItems || [];
    const sample = items.slice(0, 15);

    let html = `
        <div class="bg-primary/20 p-2 text-center rounded-lg mb-4">
            <p class="text-[9px] font-black text-primary tracking-[0.3em]">ULTIMATE DEBUG CONSOLE (v191.9-ULTRA-PATCH)</p>
        </div>
        <div class="bg-white/5 p-4 rounded-xl space-y-1">
            <p class="text-white font-bold uppercase tracking-widest text-[10px] mb-2">ESTADÍSTICAS GLOBALES</p>
            <div class="flex justify-between text-[11px]">
                <span class="text-white/40">TOTAL DB:</span>
                <span class="text-white font-mono">${State._allItems?.length || 0}</span>
            </div>
            <div class="flex justify-between text-[11px]">
                <span class="text-white/40">VISIBLES:</span>
                <span class="text-white font-mono">${State.items?.length || 0}</span>
            </div>
            <div class="flex justify-between text-[11px]">
                <span class="text-white/40 text-primary">FANTASMAS:</span>
                <span class="text-primary font-mono">${(State._allItems?.length || 0) - (State.items?.length || 0)}</span>
            </div>
        </div>
        <div class="space-y-4 mt-6">
            <p class="text-white font-bold uppercase tracking-widest text-[10px] mb-2">BASE DE DATOS (Items: ${items.length})</p>
            ${sample.map((it, idx) => `
                <div class="border-l-2 border-primary/30 pl-4 py-2 space-y-1 bg-white/5 rounded-r-lg">
                    <p class="text-[8px] text-white/40">ITEM #${idx + 1}</p>
                    <p>ID: <span class="text-white">${it.id}</span></p>
                    <p>PROJ_ID (RAW): <span class="text-white">${it.projectId}</span></p>
                    <p>_PNID: <span class="text-white">${it._pnid}</span></p>
                    <p>_PNNAME: <span class="text-white">${it._pnname}</span></p>
                    <p>FILE: <span class="text-white">${it.filename}</span></p>
                </div>
            `).join('')}
            ${items.length > 15 ? `<p class="text-center opacity-40 py-4 italic">... Y ${items.length - 15} MÁS ...</p>` : ''}
        </div>
    `;

    content.innerHTML = html;
}
