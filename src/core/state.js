/**
 * State.js — Logi Kinetic (Nexus Shield v177)
 * Gestor de Estado Global con Sanitización y Actualización Atómica.
 */
import { LogiNative } from './capacitor-bridge.js';

class StateManager {
    constructor() {
        this.currentProject = null;
        this.projects = [];
        this._allItems = [];
        this.items = [];
        this.catalog = [];
        this.currentTab = 'capture';
        this.accentColor = localStorage.getItem('accent_color') || '#cafd00';
        this.galleryCols = parseInt(localStorage.getItem('gallery_cols')) || 2;
        this.theme = localStorage.getItem('app_theme') || 'dark';
        this.listeners = [];
        this.isLoaded = false;

        // Intentar aplicar inmediatamente si el DOM está disponible
        if (typeof document !== 'undefined') {
            this.applyAccentColor();
            this.applyTheme();
        }
    }

    subscribe(listener) {
        // Evitar duplicar suscripciones
        if (!this.listeners.includes(listener)) {
            this.listeners.push(listener);
        }
    }

    unsubscribe(listener) {
        this.listeners = this.listeners.filter(l => l !== listener);
    }

    notify(changeType = 'general') {
        this.listeners.forEach(listener => {
            try {
                listener(this, changeType);
            } catch (e) {
                console.error(`[State] Notification Error (${changeType}):`, e);
            }
        });
    }

    _sanitize(item) {
        if (!item) return null;
        const clean = (val) => {
            if (typeof val !== 'string') return val;
            if (val.length < 3) return val;

            // FAST PATH: Si no tiene caracteres de HTML, saltar regex
            if (!val.includes('<') && !val.includes('class=') && !val.includes('style=')) {
                return val.trim();
            }

            return val.replace(/<[^>]*>?/gm, '')
                .replace(/["']\s+class=["'][^"']*["']/gi, '')
                .replace(/["']\s+style=["'][^"']*["']/gi, '')
                .replace(/["']\s+id=["'][^"']*["']/gi, '')
                .trim();
        };

        item.id = clean(item.id);
        if (item.name) item.name = clean(item.name);
        if (item.descripcion) item.descripcion = clean(item.descripcion);
        if (item.actividad) item.actividad = clean(item.actividad);
        if (item.filename) item.filename = clean(item.filename);
        if (item.projectId) item.projectId = clean(item.projectId);

        // Supabase Cloud Config Fields
        if (item.supabaseUrl) item.supabaseUrl = clean(item.supabaseUrl);
        if (item.supabaseKey) item.supabaseKey = clean(item.supabaseKey);
        if (item.controlProjectId) item.controlProjectId = clean(item.controlProjectId);

        // --- REPARACIÓN DE EMERGENCIA LEGACY ---
        // Si el projectId es 'p_default' (el fallback anterior) pero tiene un 'proyecto' real, lo re-vinculamos.
        const legacyProj = clean(item.proyecto || item.proyecto_id);
        if ((!item.projectId || item.projectId === 'p_default') && legacyProj && legacyProj !== 'p_default') {
            item.projectId = legacyProj;
            // No persistimos aquí para evitar loops masivos de escritura en cada carga,
            // pero el State en memoria ahora estará correcto.
        }

        // --- REPARACIÓN DE FECHAS Y METADATOS (v192.2-OMEGA) ---
        let ts = item.createdAt;

        // Si createdAt es string, intentar convertirlo a número
        if (typeof ts === 'string') {
            const num = Number(ts);
            if (!isNaN(num)) ts = num;
        }

        // Si no hay timestamp válido pero hay campo 'fecha', intentar usarlo
        if ((!ts || isNaN(Number(ts))) && item.fecha) {
            ts = item.fecha;
        }

        // Si es un string de fecha (ej. "2026-04-09"), convertir a timestamp local para estabilidad
        if (typeof ts === 'string' && ts.includes('-')) {
            const d = new Date(ts + 'T12:00:00'); // Forzar mediodía para evitar saltos de día por zona horaria
            if (!isNaN(d.getTime())) ts = d.getTime();
        }

        item.createdAt = Number(ts) || Date.now();
        item.synced = !!item.synced; // v2026-05-02: Soporte para estado de nube

        return item;
    }

    async loadFromDisk() {
        try {
            const meta = await LogiNative.dbGetAll('meta');
            this.projects = meta.map(p => this._sanitize(p)).filter(Boolean);

            if (this.projects.length === 0) {
                // v191.7: GIGA-RECONCILER (Nexus Shield)
                // Si no hay proyectos en DB, intentamos crear el default para estabilizar
                const def = this._createDefaultProject();
                this.projects = [def];
                await LogiNative.dbPut('meta', def);
            }

            // AUTO-RECONCILIACIÓN DE PROYECTOS HUÉRFANOS
            // Si hay fotos que pertenecen a proyectos que no existen en 'meta', 
            // creamos un proyecto virtual para recolectarlas.
            const lastId = localStorage.getItem('last_project_id');
            this.currentProject = this.projects.find(p => p.id === lastId) || this.projects[0];

            // Carga secuencial del catálogo (v192.3-TITAN)
            if (this.currentProject) {
                console.log(`[State] Programando carga de catálogo para: ${this.currentProject.id}`);
                setTimeout(async () => {
                    await this.loadCatalog();
                    this.notify('catalog_ready');
                }, 500); // Aumentado a 500ms para dejar que el bridge respire tras leer Proyectos
            }

            // Cargar Preferencias de Usuario (Persistent & Robust)
            this.galleryCols = parseInt(localStorage.getItem('gallery_cols')) || 2;
            this.theme = localStorage.getItem('app_theme') || 'dark';

            // Priorizar DB Nativa (Preferences) para el color de acento (v191.9-OAK)
            const savedCfg = await LogiNative.dbGet('config', 'main');
            if (savedCfg && savedCfg.accentColor) {
                this.accentColor = savedCfg.accentColor;
                localStorage.setItem('accent_color', this.accentColor);
            } else {
                this.accentColor = localStorage.getItem('accent_color') || '#cafd00';
            }

            this.applyAccentColor();
            this.applyTheme();

            // v191.9-ULTRA: Carga Fragmentada (Pulse Load) No-Destructiva
            setTimeout(async () => {
                const allRaw = await LogiNative.dbGetAll('items_meta');
                if (!allRaw || allRaw.length === 0) {
                    this.isLoaded = true;
                    this.notify('projects');
                    return;
                }

                // Preservar items ya añadidos (ej. capturas durante el arranque)
                const existingIds = new Set(this._allItems.map(it => it.id));
                const processedItems = [];
                const CHUNK_SIZE = 100;

                for (let i = 0; i < allRaw.length; i += CHUNK_SIZE) {
                    const chunk = allRaw.slice(i, i + CHUNK_SIZE);
                    chunk.forEach(item => {
                        if (existingIds.has(item.id)) return; // No duplicar si ya se añadió manualmente

                        const sanitized = this._sanitize(item);
                        if (sanitized) {
                            sanitized._pnid = sanitized._pnid || this._norm(sanitized.projectId || '');
                            sanitized._pnname = sanitized._pnname || this._norm(sanitized.projectName || sanitized.proyecto_name || sanitized.proyecto || '');
                            sanitized._pnlegacy = sanitized._pnlegacy || this._norm(sanitized.legacy_name || sanitized.proyecto || '');
                            if (sanitized.createdAt && !sanitized._pndate) {
                                sanitized._pndate = new Date(sanitized.createdAt).toDateString();
                            }
                            processedItems.push(sanitized);
                        }
                    });

                    // Ceder el control a la UI cada 100 items
                    await new Promise(r => setTimeout(r, 0));
                }

                this._allItems.push(...processedItems);
                this._filterItems();
                this._discoverOrphans();
                this.isLoaded = true;
                this.notify('items');
                this.notify('projects');
                console.log(`[State] Global Pulse Load OK (v192.3-TITAN): ${processedItems.length} loaded, total ${this._allItems.length}`);
            }, 100);

            this.isLoaded = true;
            this.notify('projects');

        } catch (error) {
            console.error('State Error:', error);
        }
    }

    _norm(val) {
        return String(val || "").toLowerCase().replace(/[^a-z0-9]/g, "");
    }

    _discoverOrphans() {
        const existingIds = new Set(this.projects.map(p => this._norm(p.id)));
        const existingNames = new Set(this.projects.map(p => this._norm(p.name)));
        const orphanIds = new Set();

        this._allItems.forEach(item => {
            const nid = item._pnid || this._norm(item.projectId || "");
            if (nid && nid !== 'pdefault' && !existingIds.has(nid)) {
                // v190.5: Si no existe el ID pero el NOMBRE coincide, auto-vincular
                const nname = item._pnname || this._norm(item.proyecto_name || "");
                if (nname && existingNames.has(nname)) {
                    const match = this.projects.find(p => this._norm(p.name) === nname);
                    if (match) {
                        item.projectId = match.id;
                        item._pnid = this._norm(match.id);
                        return;
                    }
                }
                orphanIds.add(nid);
            }
        });

        if (orphanIds.size > 0) {
            orphanIds.forEach(oid => {
                this.projects.push({
                    id: 'p_' + oid,
                    name: `PROYECTO RECUPERADO (${oid.toUpperCase()})`,
                    isOrphan: true
                });
            });
        }
    }

    _createDefaultProject() {
        return { id: 'p_default', name: 'PROYECTO PRINCIPAL', created: Date.now() };
    }

    _filterItems() {
        if (!this.currentProject) return;

        // El ID del proyecto actual también se normaliza una sola vez
        const pid = this._norm(this.currentProject.id);
        const targetName = this._norm(this.currentProject.name);

        console.log(`[State] Filtrando items (v192.3-TITAN): pid=${pid}, name=${targetName}`);

        if (this._allItems.length > 0) {
            console.log(`[Diag] Muestra _allItems[0]: id=${this._allItems[0].id}, pnid=${this._allItems[0]._pnid}, rawProj=${this._allItems[0].projectId}`);
        }

        this.items = this._allItems
            .filter(item => {
                // v191.4: MODO RESCATE (Si no hay items, intentar buscar huérfanos por nombre de nuevo)
                const match = item._pnid === pid ||
                    (item._pnname === targetName && targetName !== '') ||
                    (item._pnlegacy === targetName && targetName !== '');

                return match;
            });

        console.log(`[State] Filtered items: ${this.items.length} of ${this._allItems.length} for ${targetName} (${pid})`);
        if (this.items.length === 0 && this._allItems.length > 0) {
            console.warn(`[State] RESCATE: Tenemos ${this._allItems.length} items totales pero NINGUNO coincide con ${pid}`);
        }

        this.items.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));

        console.log(`[State] Items encontrados: ${this.items.length} de ${this._allItems.length}`);
    }

    // --- ACCIONES ---

    async updateItemDescription(id, text) {
        const item = this._allItems.find(i => i.id === id);
        if (item) {
            item.descripcion = text;
            await LogiNative.dbPut('items_meta', { ...item, _tempImageSrc: undefined });
            this.notify('item_update');
        }
    }

    async updateItemSyncStatus(id, synced) {
        const item = this._allItems.find(i => i.id === id);
        if (item) {
            item.synced = !!synced;
            await LogiNative.dbPut('items_meta', { ...item, _tempImageSrc: undefined });
            this.notify('item_update');
        }
    }

    async updateItemActivity(id, activity) {
        const item = this._allItems.find(i => i.id === id);
        if (item) {
            item.actividad = activity;
            await LogiNative.dbPut('items_meta', { ...item, _tempImageSrc: undefined });
            this.notify('item_update');
        }
    }

    setTab(tab) {
        if (this.currentTab !== tab) {
            this.currentTab = tab;
            this.notify('tab');
        }
    }

    async addProject(name) {
        const id = 'p_' + Date.now();
        const newProject = { id: id, name: name, created: Date.now() };
        this.projects.push(newProject);
        await LogiNative.dbPut('meta', newProject);
        await this.setProject(id);
        return newProject;
    }

    async setProject(id) {
        const p = this.projects.find(p => this._norm(p.id) === this._norm(id) || this._norm(p.name) === this._norm(id));
        if (p) {
            this.currentProject = p;
            localStorage.setItem('last_project_id', p.id);
            this._filterItems();

            // Carga no bloqueante para evitar congelar el hilo principal si el bridge está ocupado
            this.loadCatalog().then(() => {
                this.notify('catalog_ready');
            });

            this.notify('project');
        }
    }

    _norm(id) {
        if (!id) return '';
        // Normalización agresiva: minúsculas y solo caracteres alfanuméricos
        return String(id).toLowerCase().replace(/[^a-z0-9]/g, '').replace(/^p/, '');
    }

    addItem(item) {
        const sanitized = this._sanitize(item);
        if (sanitized && this.currentProject) {
            // v191.9-ULTRA: Garantizar campos de filtrado para visibilidad inmediata
            sanitized._pnid = sanitized._pnid || this._norm(this.currentProject.id);
            sanitized._pnname = sanitized._pnname || this._norm(this.currentProject.name);
            if (!sanitized._pndate) {
                sanitized._pndate = new Date(sanitized.createdAt || Date.now()).toDateString();
            }
        }
        this._allItems.unshift(sanitized);
        this._filterItems();
        this.notify('items');
    }

    async deleteProject(id) {
        // 1. ELIMINACIÓN DE METADATOS DEL PROYECTO
        await LogiNative.dbDelete('meta', id);

        // 2. ELIMINACIÓN DEL CATÁLOGO
        await LogiNative.dbDeleteCatalog(id);

        // 3. LIMPIEZA DE ITEMS (OPCIONAL PERO RECOMENDADA)
        // Buscamos ítems del proyecto y los borramos de la base de datos
        const itemsToDelete = this._allItems.filter(it => this._norm(it.projectId) === this._norm(id));
        for (const it of itemsToDelete) {
            await LogiNative.dbDelete('items_meta', it.id);
            // También deberíamos borrar el blob físico, pero es una operación pesada
            // await LogiNative.deleteBlob(it.filename);
        }

        // 4. ACTUALIZAR ESTADO EN MEMORIA
        this.projects = this.projects.filter(p => this._norm(p.id) !== this._norm(id));
        this._allItems = this._allItems.filter(it => this._norm(it.projectId) !== this._norm(id));

        // 5. NAVEGACIÓN SI ERA EL ACTUAL
        if (this.currentProject && this._norm(this.currentProject.id) === this._norm(id)) {
            this.currentProject = this.projects[0] || null;
            if (this.currentProject) {
                localStorage.setItem('last_project_id', this.currentProject.id);
                this._filterItems();
                await this.loadCatalog();
            }
        }

        this.notify('project_deleted');
        this.notify('project');
    }

    async updateProjectName(id, newName) {
        const p = this.projects.find(p => this._norm(p.id) === this._norm(id));
        if (p) {
            p.name = newName;
            await LogiNative.dbPut('meta', p);
            this.notify('project');
        }
    }

    async updateProjectCloudConfig(id, config) {
        const p = this.projects.find(p => this._norm(p.id) === this._norm(id));
        if (p) {
            p.supabaseUrl = config.supabaseUrl;
            p.supabaseKey = config.supabaseKey;
            p.controlProjectId = config.controlProjectId;
            await LogiNative.dbPut('meta', p);
            this.notify('project');
        }
    }

    removeItem(id) {
        this._allItems = this._allItems.filter(i => i.id !== id);
        this._filterItems();
        this.notify('items');
    }

    async setAccentColor(color) {
        this.accentColor = color;
        localStorage.setItem('accent_color', color);
        this.applyAccentColor();
        await LogiNative.dbPut('config', { id: 'main', accentColor: color });
        this.notify('color');
    }

    async setTheme(theme) {
        this.theme = theme;
        localStorage.setItem('app_theme', theme);
        this.applyTheme();
        await LogiNative.dbPut('config', { id: 'theme', value: theme });
        this.notify('theme');
    }

    setGalleryCols(cols) {
        this.galleryCols = cols;
        localStorage.setItem('gallery_cols', cols);
        this.notify('gallery_cols');
    }

    // --- CATALOG ACTIONS ---

    async loadCatalog() {
        if (!this.currentProject) {
            console.warn("[State] loadCatalog abortado: No hay proyecto activo");
            this.catalog = [];
            return;
        }
        console.log(`[State] loadCatalog iniciado para ID: ${this.currentProject.id}`);
        this.catalog = await LogiNative.dbGetCatalog(this.currentProject.id);
        console.log(`[State] loadCatalog finalizado: ${this.catalog.length} ítems cargados.`);
        this.notify('catalog');
    }

    async importCatalog(file) {
        if (!file || !window.XLSX) return { success: false };
        if (!this.currentProject) return { success: false };

        try {
            const buf = await file.arrayBuffer();
            const wb = XLSX.read(buf, { type: 'array' });
            const sheetName = wb.SheetNames.includes("ITEMS") ? "ITEMS" : wb.SheetNames[0];
            const ws = wb.Sheets[sheetName];
            const rows = XLSX.utils.sheet_to_json(ws, { header: 1, raw: false, defval: "" });

            if (!rows.length) return { success: false, msg: "Archivo vacío" };

            // Normalización similar a la versión legacy
            const normalize = (s) => String(s || "").trim().toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/\s+/g, "_");
            const header = rows[0].map(normalize);

            const idxItem = header.findIndex(h => h === "item" || h === "codigo" || h === "codigo_item");
            const idxDesc = header.findIndex(h => h === "descripcion" || h === "descripción" || h === "descripcion_item");
            const idxUnit = header.findIndex(h => h === "unidad" || h === "und" || h === "unit" || h === "unidad_item");

            if (idxItem === -1 || idxDesc === -1 || idxUnit === -1) {
                return { success: false, msg: "Columnas ITEM, DESCRIPCION, UNIDAD no encontradas." };
            }

            const newCatalog = [];
            for (let i = 1; i < rows.length; i++) {
                const r = rows[i] || [];
                const item = String(r[idxItem] || "").trim();
                if (!item) continue;
                newCatalog.push({
                    item,
                    descripcion: String(r[idxDesc] || "").trim(),
                    unidad: String(r[idxUnit] || "").trim()
                });
            }

            if (newCatalog.length > 0) {
                await LogiNative.dbPutCatalog(this.currentProject.id, newCatalog);
                this.catalog = newCatalog;
                this.notify('catalog');
                return { success: true, count: newCatalog.length };
            }
            return { success: false, msg: "No se encontraron ítems válidos." };

        } catch (e) {
            console.error("Import Error:", e);
            return { success: false, msg: String(e.message || e) };
        }
    }

    async deleteCatalog() {
        if (!this.currentProject) return;
        await LogiNative.dbDeleteCatalog(this.currentProject.id);
        this.catalog = [];
        this.notify('catalog');
    }

    applyAccentColor() {
        const color = this.accentColor || '#cafd00';
        document.documentElement.style.setProperty('--primary', color);

        // Calcular glows (versión simple: 40% y 60% opacidad)
        const hexToRgb = (hex) => {
            const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
            return result ? `${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)}` : '202, 253, 0';
        };
        const rgb = hexToRgb(color);
        document.documentElement.style.setProperty('--primary-glow', `rgba(${rgb}, 0.4)`);
        document.documentElement.style.setProperty('--primary-glow-c', `rgba(${rgb}, 0.6)`);
        document.documentElement.style.setProperty('--primary-bg', `rgba(${rgb}, 0.08)`);
        document.documentElement.style.setProperty('--primary-border', `rgba(${rgb}, 0.2)`);
    }

    applyTheme() {
        if (typeof document === 'undefined') return;
        const isDark = this.theme === 'dark';
        document.body.classList.toggle('dark', isDark);
        document.body.classList.toggle('light-mode', !isDark);
        document.documentElement.classList.toggle('dark', isDark);
        document.documentElement.classList.toggle('light-mode', !isDark);

        // Sincronizar con el atributo de color-scheme para el sistema
        document.documentElement.style.colorScheme = isDark ? 'dark' : 'light';
    }
}

export const State = new StateManager();
