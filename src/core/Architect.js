/**
 * Architect.js
 * Master Screen Controller for Logi Kinetic
 * Ensures total isolation between screens (Capture, Projects, Gallery, etc.)
 */
export const Architect = {
    screens: {},
    currentScreen: null,

    register(id, screenModule) {
        this.screens[id] = screenModule;
        console.log(`[Architect] Screen Registered: ${id}`);
    },

    async render(id, containerId = 'view-container') {
        const container = document.getElementById(containerId);
        if (!container) {
            console.error(`[Architect] Container #${containerId} not found.`);
            return;
        }

        // 1. Cleanup current screen
        if (this.currentScreen && this.currentScreen.destroy) {
            this.currentScreen.destroy();
        }
        container.innerHTML = '';

        // 2. Load and Inject Layout
        const screen = this.screens[id];
        if (!screen) {
            console.error(`[Architect] Screen ${id} not registered.`);
            return;
        }

        this.currentScreen = screen;
        
        // Sincronizar Nav Inferior (Halo Activo)
        this.updateBottomNav(id);

        // Determinar orientación inicial
        const isLandscape = window.innerWidth > window.innerHeight;
        container.innerHTML = screen.getLayout(isLandscape);

        // 3. Initialize Controller Logic
        if (screen.init) {
            await screen.init();
        }

        console.log(`[Architect] Rendered: ${id} (${isLandscape ? 'Landscape' : 'Portrait'})`);
    },

    updateBottomNav(id) {
        const tabs = ['capture', 'gallery', 'reports', 'export'];
        tabs.forEach(tabId => {
            const el = document.getElementById(`nav-${tabId}`);
            if (el) {
                if (tabId === id) {
                    el.classList.add('active-nav');
                } else {
                    el.classList.remove('active-nav');
                }
            }
        });
    },

    async handleResize() {
        if (!this.currentScreen) return;
        const container = document.getElementById('view-container');
        const isLandscape = window.innerWidth > window.innerHeight;
        
        // Actualizar layout si el módulo soporta re-renderizado reactivo
        if (this.currentScreen.updateLayout) {
            this.currentScreen.updateLayout(isLandscape);
        } else {
            // Re-render térmico (fallback)
            container.innerHTML = this.currentScreen.getLayout(isLandscape);
            if (this.currentScreen.init) await this.currentScreen.init();
        }
    }
};

// Listener global de Redimensionamiento/Orientación
window.addEventListener('resize', () => Architect.handleResize());
window.addEventListener('orientationchange', () => Architect.handleResize());
