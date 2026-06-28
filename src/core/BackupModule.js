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
                projectId: projectId,
                projectName: project.name,
                app: 'Logi', // Compatible con legacy
                createdAt: new Date().toISOString(),
                settings: {
                    theme: 'dark',
                    accent: 'green',
                    project: project.name
                },
                catalog: (catalog || []).map(r => ({
                    projectId: projectId,
                    item: r.item || "",
                    descripcion: r.descripcion || "",
                    unidad: r.unidad || "",
                    createdAt: r.createdAt || Date.now()
                })),
                items: items.map(it => ({
                    id: it.id,
                    fecha: new Date(it.createdAt).toISOString().split('T')[0],
                    proyecto: it.projectName || project.name,
                    descripcion: it.descripcion || '',
                    done: false,
                    mime: 'image/jpeg',
                    createdAt: it.createdAt,
                    hasLogo: false,
                    itemCode: it.actividad || '',
                    itemDesc: '',
                    projectId: it.projectId || projectId,
                    projectName: it.projectName || project.name
                }))
            };

            zip.file("backup.json", JSON.stringify(backupData, null, 2));

            // 2. Agregar Fotos (Formato Plano Legacy: photos/[itemId].jpg)
            const photoFolder = zip.folder("photos");
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
            const filename = `logi-backup-${new Date().toISOString().replace(new RegExp('[-' + ':T.]', 'g'), '').slice(0, 14)}.zip`;
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

            const firstId = State.projects[0]?.id || 'p_default';
            const allCatalog = await this._getFullCatalog();

            // 1. Metadatos Globales (Esquema Legacy Total)
            const backupData = {
                schemaVersion: 2,
                type: 'all',
                app: 'Logi', // Compatible con legacy
                createdAt: new Date().toISOString(),
                settings: {
                    theme: 'dark',
                    accent: 'green'
                },
                projects: State.projects.map(p => ({
                    id: p.id,
                    name: p.name,
                    createdAt: p.created || Date.now()
                })),
                activeProjectId: State.currentProject?.id || firstId,
                catalog: (allCatalog || []).map(r => ({
                    projectId: r.projectId || firstId,
                    item: r.item || "",
                    descripcion: r.descripcion || "",
                    unidad: r.unidad || "",
                    createdAt: r.createdAt || Date.now()
                })),
                items: State._allItems.map(it => ({
                    id: it.id,
                    fecha: new Date(it.createdAt).toISOString().split('T')[0],
                    proyecto: it.projectName || '',
                    descripcion: it.descripcion || '',
                    done: false,
                    mime: 'image/jpeg',
                    createdAt: it.createdAt,
                    hasLogo: false,
                    itemCode: it.actividad || '',
                    itemDesc: '',
                    projectId: it.projectId || firstId,
                    projectName: it.projectName || ''
                }))
            };

            zip.file("backup.json", JSON.stringify(backupData, null, 2));

            // 2. Fotos organizadas por proyecto (photos/[projectId]/[itemId].jpg)
            const photosFolder = zip.folder("photos");
            let count = 0;
            const total = State._allItems.length;

            for (const it of State._allItems) {
                this._notifyProgress(count, total, `Procesando fotos totales... (${count}/${total})`);
                const pid = it.projectId || firstId;
                const projectFolder = photosFolder.folder(pid);
                const base64 = await LogiNative.readBlobAsBase64(it.filename);
                if (base64) {
                    const rawData = base64.split(',')[1];
                    projectFolder.file(`${it.id}.jpg`, rawData, { base64: true });
                }
                count++;
            }

            this._notifyProgress(total, total, "Generando archivo final...");
            const blob = await zip.generateAsync({ type: "blob" });
            const filename = `logi-backup-TOTAL-${new Date().toISOString().replace(new RegExp('[-' + ':T.]', 'g'), '').slice(0, 14)}.zip`;
            await this._saveAndShareZip(blob, filename);

        } catch (e) {
            console.error("Export Total Error:", e);
            alert("Error: " + e.message);
        } finally {
            this.isProcessing = false;
            this._notifyProgress(100, 100, "Completado");
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
                    let photoLoaded = false;

                    if (photoFile) {
                        // Rolldown / JSZip metadata check for uncompressed size
                        const isZeroByte = photoFile._data && photoFile._data.uncompressedSize === 0;
                        if (!isZeroByte) {
                            const base64 = await photoFile.async("base64");
                            if (base64 && base64.trim().length > 0) {
                                await LogiNative.storeBlob(cleanItem.filename, base64);
                                photoLoaded = true;
                            }
                        }
                    }

                    // Fallback adaptativo: Si la foto en el ZIP está vacía o no existe, intentamos buscarla en la DB Legacy local
                    if (!photoLoaded) {
                        try {
                            const legacyDb = await new Promise((resolve) => {
                                const req = indexedDB.open("logi2_db_v1");
                                req.onsuccess = () => resolve(req.result);
                                req.onerror = () => resolve(null);
                            });
                            if (legacyDb) {
                                const blobData = await new Promise((resolve) => {
                                    const tx = legacyDb.transaction("blobs", "readonly");
                                    const req = tx.objectStore("blobs").get(cleanItem.id);
                                    req.onsuccess = () => resolve(req.result ? req.result.blob : null);
                                    req.onerror = () => resolve(null);
                                });
                                if (blobData) {
                                    const base64 = await new Promise((res) => {
                                        const reader = new FileReader();
                                        reader.onloadend = () => res(reader.result);
                                        reader.readAsDataURL(blobData);
                                    });
                                    await LogiNative.storeBlob(cleanItem.filename, base64);
                                    photoLoaded = true;
                                    console.log(`[Backup Adaptativo] Foto ${cleanItem.id} rescatada localmente desde DB Legacy`);
                                }
                                legacyDb.close();
                            }
                        } catch (fallbackErr) {
                            console.warn(`[Backup Adaptativo] Error en fallback local para ${cleanItem.id}:`, fallbackErr);
                        }
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
    }
};
