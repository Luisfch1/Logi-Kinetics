/**
 * BackupModule.js
 * Logi Kinetic | Sincronización de Respaldos y Compatibilidad Legacy
 */
import JSZip from 'jszip';
import { State } from './state.js';
import { LogiNative } from './capacitor-bridge.js';

export const BackupModule = {
    isProcessing: false,
    progressCallback: null,

    /**
     * Sensor Nexus: Detecta si existe un backup.json legado para reconciliar
     */
    async reconcile() {
        if (this.isProcessing) return;
        if (!LogiNative.isNative()) return;
        
        try {
            // 1. Verificar si ya se reconcilió en esta sesión o si hay datos
            if (State._allItems.length > 0) return;

            console.log("[Backup] Sensor Nexus: Buscando archivos de reconciliación...");
            const vPath = '_LOGI_VAULT_/backup.json';
            const lPath = 'Logi/backup.json';

            // Intentar primero en Vault (lo nuevo) y luego en Logi (lo viejo)
            let targetPath = vPath;
            let targetDir = 'data'; // bridge usa PRIMARY_DIR (Data) por defecto para Vault

            const existsVault = await LogiNative.fileExists(vPath);
            if (!existsVault) {
                const existsLegacy = await LogiNative.fileExists(lPath, 'documents');
                if (existsLegacy) {
                    targetPath = lPath;
                    targetDir = 'documents';
                } else {
                    return; // Nada que reconciliar
                }
            }

            console.log(`[Backup] Reconciliación detectada en: ${targetPath}. Disparando importación...`);
            await this.importFromLocalJson(targetPath, targetDir);

        } catch (e) {
            console.warn("[Backup] Reconcile Error Silencioso:", e);
        }
    },

    /**
     * Importación directa desde archivo local (sin ZIP)
     */
    async importFromLocalJson(path, directory = 'data') {
        if (this.isProcessing) return;
        this.isProcessing = true;
        this._showOverlay();

        try {
            this._notifyProgress(0, 1, "Leyendo base de datos legada...");
            const raw = await LogiNative.readLocalFile(path, directory);
            if (!raw) throw new Error("No se pudo leer el archivo de respaldo");

            const data = JSON.parse(raw);
            await this._processBackupData(data); // Extraer lógica común
            
        } catch (e) {
            console.error("Local Import Error:", e);
            alert("Error de reconciliación: " + e.message);
        } finally {
            this.isProcessing = false;
            this._hideOverlay();
        }
    },

    async exportProject(projectId, onProgress) {
        if (this.isProcessing) return;
        this.isProcessing = true;
        this.progressCallback = onProgress;

        try {
            const zip = new JSZip();
            const project = State.projects.find(p => p.id === projectId);
            if (!project) throw new Error("Proyecto no encontrado");

            this._notifyProgress(0, 1, "Preparando metadatos...");

            // 1. Recopilar datos del proyecto
            const items = State._allItems.filter(it => it.projectId === projectId);
            const catalog = await LogiNative.dbGetCatalog(projectId);

            const backupData = {
                schemaVersion: 2,
                type: 'project',
                app: 'Logi Kinetic',
                createdAt: new Date().toISOString(),
                projects: [project],
                catalog: catalog.filter(c => c.projectId === projectId || !c.projectId),
                items: items
            };

            zip.file("backup.json", JSON.stringify(backupData, null, 2));

            // 2. Agregar Fotos (Ruta Legacy: photos/[projectId]/[itemId].jpg)
            const photoFolder = zip.folder(`photos/${projectId}`);
            let count = 0;
            const total = items.length;

            for (const it of items) {
                this._notifyProgress(count, total, `Empacando fotos... (${count}/${total})`);
                const base64 = await LogiNative.readBlobAsBase64(it.filename);
                if (base64) {
                    const rawData = base64.split(',')[1];
                    photoFolder.file(`${it.id}.jpg`, rawData, { base64: true });
                }
                count++;
            }

            this._notifyProgress(total, total, "Generando archivo ZIP...");
            const blob = await zip.generateAsync({ type: "blob" });
            
            // 3. Guardar/Compartir
            const filename = `Backup_${project.name.replace(/\s+/g, '_')}_${Date.now()}.zip`;
            await this._saveAndShareZip(blob, filename);

        } catch (e) {
            console.error("Export Error:", e);
            alert("Error en exportación: " + e.message);
        } finally {
            this.isProcessing = false;
            this._notifyProgress(100, 100, "Completado");
        }
    },

    /**
     * Exporta TODOS los proyectos a ZIP (Respaldo Total)
     */
    async exportTotal(onProgress) {
        if (this.isProcessing) return;
        this.isProcessing = true;
        this.progressCallback = onProgress;

        try {
            const zip = new JSZip();
            this._notifyProgress(0, 1, "Iniciando respaldo total...");

            // 1. Metadatos Globales
            const backupData = {
                schemaVersion: 2,
                type: 'all',
                app: 'Logi Kinetic',
                createdAt: new Date().toISOString(),
                projects: State.projects,
                items: State._allItems,
                catalog: await this._getFullCatalog(),
                settings: {
                    accentColor: State.accentColor
                }
            };

            zip.file("backup.json", JSON.stringify(backupData, null, 2));

            // 2. Fotos organizadas por proyecto
            let count = 0;
            const total = State._allItems.length;

            for (const it of State._allItems) {
                this._notifyProgress(count, total, `Procesando fotos totales... (${count}/${total})`);
                const pid = it.projectId || 'unknown';
                const base64 = await LogiNative.readBlobAsBase64(it.filename);
                if (base64) {
                    const rawData = base64.split(',')[1];
                    zip.file(`photos/${pid}/${it.id}.jpg`, rawData, { base64: true });
                }
                count++;
            }

            this._notifyProgress(total, total, "Generando archivo final...");
            const blob = await zip.generateAsync({ type: "blob" });
            const filename = `Respaldo_TOTAL_Logi_${new Date().toISOString().split('T')[0]}.zip`;
            await this._saveAndShareZip(blob, filename);

        } catch (e) {
            console.error("Export Total Error:", e);
            alert("Error: " + e.message);
        } finally {
            this.isProcessing = false;
        }
    },

    /**
     * Importación con Transición de Arquitectura (Legacy -> Kinetic)
     */
    async importBackup(file, onProgress) {
        if (this.isProcessing) return;
        this.isProcessing = true;
        this.progressCallback = onProgress;
        this._showOverlay();

        setTimeout(async () => {
            try {
                this._notifyProgress(0, 1, "Analizando archivo...");
                const zip = await JSZip.loadAsync(file);
            
            // Búsqueda recursiva de backup.json en caso de carpetas anidadas
            let jsonFile = zip.file("backup.json");
            if (!jsonFile) {
                const foundKey = Object.keys(zip.files).find(k => k.endsWith("backup.json") && !k.includes("__MACOSX"));
                if (foundKey) jsonFile = zip.file(foundKey);
            }
            
            if (!jsonFile) throw new Error("No se encontró backup.json en el archivo ZIP");

            const rawJson = await jsonFile.async("string");
            const data = JSON.parse(rawJson);

            await this._processBackupData(data, zip);

        } catch (e) {
            console.error("Import Error:", e);
            alert("Error cargando respaldo: " + e.message);
        } finally {
            this.isProcessing = false;
            this._hideOverlay();
        }
    }, 100);
},

    /**
     * Motor de procesamiento central v191.9-OAK
     */
    async _processBackupData(data, zip = null) {
        // 1. Mapeo y Migración de Datos (v190.8)
        let itemsToImport = data.items || data.capturas || [];
        const projectsToImport = data.projects || [];
        
        // v2026-06-28: Compatibilidad con Backups de Proyecto Único (Legacy)
        if (projectsToImport.length === 0 && data.projectId && data.projectName) {
            projectsToImport.push({
                id: data.projectId,
                name: data.projectName,
                createdAt: data.createdAt || data.created || Date.now()
            });
        }
        
        const catalogToImport = data.catalog || [];

        const total = itemsToImport.length;
        this._notifyProgress(0, total, `Se detectaron ${total} ítems. Procesando...`);

        // Migrar Proyectos
        const projNameMap = {};
        for (const p of projectsToImport) {
            projNameMap[p.id] = p.name;
            await LogiNative.dbPut('meta', {
                id: p.id,
                name: p.name,
                created: p.createdAt || p.created || Date.now()
            });
        }
        if (projectsToImport.length > 0) {
            await LogiNative.dbCommitBatch('meta', projectsToImport);
        }

        // Migrar Catálogo (v192.7 - Optimización Nuclear)
        if (catalogToImport.length > 0) {
            this._notifyProgress(0, 1, "Restaurando catálogos de proyectos...");
            const catalogsByProject = {};

            for (const c of catalogToImport) {
                // Soportar formato plano (legacy) o anidado
                if (c.projectId && c.items) {
                    catalogsByProject[c.projectId] = c.items;
                } else if (c.projectId) {
                    if (!catalogsByProject[c.projectId]) catalogsByProject[c.projectId] = [];
                    catalogsByProject[c.projectId].push({ item: c.item, descripcion: c.descripcion, unidad: c.unidad });
                }
            }

            for (const pid in catalogsByProject) {
                await LogiNative.dbPutCatalog(pid, catalogsByProject[pid]);
            }
        }

        // v190.0: Indexación Relámpago del ZIP (Solo si hay ZIP)
        const filesIndex = {};
        if (zip) {
            this._notifyProgress(0, 100, "Indexando fotos del respaldo...");
            const allZipKeys = Object.keys(zip.files);
            for (const key of allZipKeys) {
                if (key.includes("__MACOSX") || key.endsWith("/")) continue;
                const baseName = key.split('/').pop().toLowerCase();
                filesIndex[baseName] = key;
            }
        }

        let count = 0;
        const importedItemsChunk = [];
        console.log(`[Backup] Restauración de ${total} ítems...`);

        for (const it of itemsToImport) {
            const currentCount = ++count;
            if (currentCount % 50 === 0) {
               this._notifyProgress(currentCount, total, `Restaurando: ${currentCount}/${total}`);
               await new Promise(r => setTimeout(r, 5)); 
            }
            
            try {
                const cleanItem = {
                    id: String(it.id || Date.now() + Math.random()),
                    descripcion: String(it.descripcion || ''),
                    actividad: String(it.actividad || it.itemCode || 'GENERAL'),
                    createdAt: Number(it.createdAt || it.id || Date.now()),
                    projectId: String(it.projectId || it.proyecto_id || it.proyecto || 'p_default'),
                    projectName: String(projNameMap[it.projectId || it.proyecto_id || it.proyecto] || it.projectName || it.proyecto || 'Sin Proyecto'),
                    filename: String(it.filename || `${it.id}.jpg`)
                };

                if (zip) {
                    const targetFile = cleanItem.filename.toLowerCase();
                    const zipKey = filesIndex[targetFile];
                    const photoFile = zipKey ? zip.file(zipKey) : null;
                    if (photoFile) {
                        const base64 = await photoFile.async("base64");
                        await LogiNative.storeBlob(cleanItem.filename, base64);
                    }
                }

                importedItemsChunk.push(cleanItem);
            } catch (loopErr) {
                console.error(`[Backup] Error item ${currentCount}:`, loopErr);
            }
        }

        this._notifyProgress(total, total, "Consolidando registros (ULTRA)...");
        await LogiNative.dbCommitBatch('items_meta', importedItemsChunk);
        
        // v2026-06-28: Guardar el proyecto restaurado como el último activo para abrirlo al reiniciar
        if (projectsToImport.length > 0) {
            localStorage.setItem('last_project_id', projectsToImport[0].id);
        }
        
        alert(`Reconciliación completada: ${importedItemsChunk.length} ítems restaurados.\nLa aplicación se reiniciará.`);
        window.location.reload();
    },

    // --- UI HELPERS ---

    _showOverlay() {
        let overlay = document.getElementById('backup-overlay');
        if (!overlay) {
            overlay = document.createElement('div');
            overlay.id = 'backup-overlay';
            overlay.innerHTML = `
                <div class="backup-content">
                    <div class="loader"></div>
                    <h2>RESTAURANDO BASE DE DATOS</h2>
                    <div class="progress-container">
                        <div id="backup-bar" class="progress-bar"></div>
                    </div>
                    <small>Por favor, no cierres la aplicación</small>
                    <div id="backup-errors" class="error-log"></div>
                </div>
                <style>
                    .error-log { margin-top: 15px; max-height: 80px; overflow-y: auto; color: #ff5555; font-size: 9px; text-align: left; background: rgba(0,0,0,0.5); padding: 5px; border-radius: 4px; display: none; }
                    #backup-overlay {
                        position: fixed; top:0; left:0; width:100%; height:100%;
                        background: rgba(0,0,0,0.9); z-index: 9999;
                        display: flex; align-items: center; justify-content: center;
                        color: white; text-align: center; font-family: sans-serif;
                    }
                    .backup-content { width: 80%; max-width: 400px; }
                    .progress-container { background: #333; height: 10px; border-radius: 5px; margin: 20px 0; overflow: hidden; }
                    .progress-bar { background: ${State.accentColor}; height: 100%; width: 0%; transition: width 0.3s; }
                    .loader { border: 4px solid #333; border-top: 4px solid ${State.accentColor}; border-radius: 50%; width: 40px; height: 40px; animation: spin 1s linear infinite; margin: 0 auto 20px; }
                    @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
                </style>
            `;
            document.body.appendChild(overlay);
        }
    },

    _hideOverlay() {
        const overlay = document.getElementById('backup-overlay');
        if (overlay) overlay.remove();
    },

    // --- HELPERS ---

    _notifyProgress(current, total, msg) {
        const bar = document.getElementById('backup-bar');
        const text = document.getElementById('backup-msg');
        const percent = total > 0 ? Math.round((current / total) * 100) : 0;
        
        if (bar) bar.style.width = `${percent}%`;
        if (text) text.innerText = msg;

        if (this.progressCallback) {
            this.progressCallback({
                percent,
                current,
                total,
                message: msg
            });
        }
    },

    async _saveAndShareZip(blob, filename) {
        const reader = new FileReader();
        return new Promise((resolve, reject) => {
            reader.onload = async () => {
                const base64 = reader.result.split(',')[1];
                const res = await LogiNative.saveToDocuments(filename, base64);
                if (res) resolve(true);
                else reject(new Error("No se pudo guardar el archivo"));
            };
            reader.readAsDataURL(blob);
        });
    },

    async _getFullCatalog() {
        return await LogiNative.dbGetAllCatalogs();
    },

    async _getProjectCatalog(pid) {
        return await LogiNative.dbGetCatalog(pid) || [];
    },

    async importFromLegacyIndexedDB(onProgress) {
        if (this.isProcessing) return;
        this.isProcessing = true;
        this.progressCallback = onProgress;
        this._showOverlay();

        try {
            this._notifyProgress(0, 100, "Conectando con base de datos de Logi Legacy...");
            
            // 1. Abrir base de datos antigua "logi2_db_v1"
            const legacyDb = await new Promise((resolve) => {
                const req = indexedDB.open("logi2_db_v1");
                req.onsuccess = () => resolve(req.result);
                req.onerror = () => resolve(null);
            });

            if (!legacyDb) {
                throw new Error("No se encontró la base de datos de Logi Legacy en este navegador/dispositivo.");
            }

            // 2. Cargar proyectos de localStorage "logi2_projects"
            let legacyProjects = [];
            try {
                legacyProjects = JSON.parse(localStorage.getItem("logi2_projects") || "[]") || [];
            } catch (e) {
                console.error("Error al leer proyectos de legacy:", e);
            }

            if (legacyProjects.length === 0) {
                // Generar un proyecto por defecto si hay metas
                legacyProjects = [{ id: 'p_default', name: 'Proyecto Importado', createdAt: Date.now() }];
            }

            this._notifyProgress(10, 100, "Importando proyectos...");

            // 3. Importar proyectos a la base de datos de Kinetics
            for (const p of legacyProjects) {
                await LogiNative.dbPut('meta', {
                    id: p.id,
                    name: p.name,
                    created: p.createdAt || p.created || Date.now()
                });
            }

            // 4. Leer ítems de la base de datos antigua (metas)
            this._notifyProgress(30, 100, "Leyendo registros antiguos...");
            const legacyItems = await new Promise((resolve, reject) => {
                try {
                    const tx = legacyDb.transaction("items_meta", "readonly");
                    const store = tx.objectStore("items_meta");
                    const req = store.getAll();
                    req.onsuccess = () => resolve(req.result || []);
                    req.onerror = () => reject(req.error || new Error("Error leyendo items_meta"));
                } catch(e) {
                    reject(e);
                }
            });

            if (legacyItems.length === 0) {
                throw new Error("No se encontraron registros de fotos en Logi Legacy.");
            }

            const total = legacyItems.length;
            this._notifyProgress(40, 100, `Se encontraron ${total} fotos. Transfiriendo...`);

            // 5. Transferir ítems y blobs
            const importedItemsChunk = [];
            let count = 0;

            for (const it of legacyItems) {
                count++;
                const progressPct = 40 + Math.round((count / total) * 50); // Mapeado de 40% a 90%
                
                if (count % 10 === 0 || count === total) {
                    this._notifyProgress(progressPct, 100, `Transfiriendo foto ${count} de ${total}...`);
                    await new Promise(r => setTimeout(r, 0));
                }

                try {
                    // Obtener el blob de la base de datos antigua
                    const blobData = await new Promise((resolve) => {
                        try {
                            const tx = legacyDb.transaction("blobs", "readonly");
                            const req = tx.objectStore("blobs").get(it.id);
                            req.onsuccess = () => resolve(req.result ? req.result.blob : null);
                            req.onerror = () => resolve(null);
                        } catch(e) {
                            resolve(null);
                        }
                    });

                    const cleanItem = {
                        id: String(it.id || Date.now() + Math.random()),
                        descripcion: String(it.descripcion || ''),
                        actividad: String(it.actividad || it.itemCode || 'GENERAL'),
                        createdAt: Number(it.createdAt || it.id || Date.now()),
                        projectId: String(it.projectId || it.proyecto_id || it.proyecto || 'p_default'),
                        projectName: String(it.projectName || it.proyecto || 'Sin Proyecto'),
                        filename: String(it.filename || `${it.id}.jpg`)
                    };

                    if (blobData) {
                        // Convertir Blob a Base64
                        const base64 = await new Promise((res) => {
                            const reader = new FileReader();
                            reader.onloadend = () => res(reader.result);
                            reader.readAsDataURL(blobData);
                        });
                        await LogiNative.storeBlob(cleanItem.filename, base64);
                    }

                    importedItemsChunk.push(cleanItem);
                } catch (loopErr) {
                    console.error(`[LegacyMigrate] Error en ítem ${count}:`, loopErr);
                }
            }

            // 6. Consolidar registros en la base de datos de Kinetics
            this._notifyProgress(95, 100, "Guardando base de datos...");
            await LogiNative.dbCommitBatch('items_meta', importedItemsChunk);

            // Auto-seleccionar el primer proyecto importado
            if (legacyProjects.length > 0) {
                localStorage.setItem('last_project_id', legacyProjects[0].id);
            }

            this._notifyProgress(100, 100, "Completado");
            await new Promise(r => setTimeout(r, 500));

            alert(`Migración completada con éxito: ${importedItemsChunk.length} fotos transferidas directamente.\nLa aplicación se reiniciará.`);
            window.location.reload();

        } catch (e) {
            console.error("Legacy Migration Error:", e);
            alert("Error en migración: " + e.message);
        } finally {
            this.isProcessing = false;
            this._hideOverlay();
        }
    }
};
