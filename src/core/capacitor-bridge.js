import { Filesystem, Directory } from '@capacitor/filesystem';
import { Camera } from '@capacitor/camera';
import { Share } from '@capacitor/share';
import { Preferences } from '@capacitor/preferences';
import { Capacitor } from '@capacitor/core';
import { State } from './state.js';

const PRIMARY_DIR = Directory.Data; // Nexus Shield: Switch to Data for maximum speed (v189)
const DATA_DIR = 'Logi';
const LEGACY_DIR = Directory.Documents; // For migration/fallback

// Helper para evitar que una llamada nativa bloquee la app para siempre
const withTimeout = (promise, ms = 3000) => {
    return Promise.race([
        promise,
        new Promise((_, reject) => setTimeout(() => reject(new Error("Timeout")), ms))
    ]);
};

// --- GESTIÓN WEB (INDEXED DB) PARA FOTOS EN PC ---
const DB_NAME = 'LogiKineticDB';
const STORE_NAME = 'blobs';
let _dbPromise = null;

function getDB() {
    if (_dbPromise) return _dbPromise;
    _dbPromise = new Promise((resolve) => {
        const req = indexedDB.open(DB_NAME, 1);
        req.onupgradeneeded = () => req.result.createObjectStore(STORE_NAME);
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => resolve(null);
    });
    return _dbPromise;
}

const _webMeta = {
    meta: JSON.parse(localStorage.getItem('logi_web_meta') || '[]'),
    items_meta: JSON.parse(localStorage.getItem('logi_web_items_meta') || '[]'),
    config: JSON.parse(localStorage.getItem('logi_web_config') || '[]'),
    catalog: JSON.parse(localStorage.getItem('logi_web_catalog') || '{}')
};

function saveWebMeta(store) {
    localStorage.setItem(`logi_web_${store}`, JSON.stringify(_webMeta[store]));
}

let _dynamicBlobsUri = "";

export const LogiNative = {
    isNative: () => !!Capacitor && Capacitor.isNativePlatform(),

    pickImage: async () => {
        try {
            const p = Camera || window.Capacitor?.Plugins?.Camera;
            if (!p) throw new Error("Cámara no disponible");

            const gallery = await p.pickImages({
                quality: 60,
                limit: 1
            });

            if (gallery.photos.length > 0) {
                const photo = gallery.photos[0];
                return await LogiNative.readAsBase64(photo.webPath);
            }
            return null;
        } catch (e) {
            console.warn("PickImage Error:", e);
            return null;
        }
    },

    readAsBase64: async (webPath) => {
        try {
            const response = await fetch(webPath);
            const blob = await response.blob();
            return new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = () => resolve(reader.result);
                reader.onerror = reject;
                reader.readAsDataURL(blob);
            });
        } catch (e) { return null; }
    },

    init: async () => {
        console.log(`LogiNative: Nexus Shield ${LogiNative.isNative() ? 'NATIVO' : 'WEB/PC'}`);
        if (LogiNative.isNative()) {
            try {
                // Notificar migración si es necesario
                await LogiNative.migrateLegacyData();

                // Asegurar estructura en PRIMARY_DIR (Data)
                const folders = ['meta', 'items_meta', 'config', 'catalog', 'blobs'];
                for (const f of folders) {
                    await withTimeout(Filesystem.mkdir({ path: DATA_DIR + '/' + f, directory: PRIMARY_DIR, recursive: true }), 1000).catch(() => { });
                }
                await withTimeout(Filesystem.mkdir({ path: '_LOGI_VAULT_/Reports', directory: PRIMARY_DIR, recursive: true }), 1000).catch(() => { });

                const res = await Filesystem.getUri({ path: DATA_DIR + '/blobs', directory: PRIMARY_DIR });
                _dynamicBlobsUri = Capacitor.convertFileSrc(res.uri).replace(/\/+$/, '') + '/';

                // Sondeo de diagnóstico (v189.3) - Se ejecuta discretamente
                setTimeout(() => LogiNative._runPathProbe(), 3000);
            } catch (e) {
                console.error("Init FS Error:", e);
            }
        } else {
            await getDB();
        }
    },

    migrateLegacyData: async () => {
        try {
            const hasMigrated = localStorage.getItem('logi_migrated_v189');
            if (hasMigrated) return;

            console.log("[Bridge] Iniciando Migración Nexus Shield (Documents -> Data)...");
            const res = await Filesystem.readdir({ path: DATA_DIR, directory: LEGACY_DIR }).catch(() => null);
            if (!res || !res.files || res.files.length === 0) {
                console.log("[Bridge] No se detectaron datos legacy en Documents.");
                localStorage.setItem('logi_migrated_v189', 'true');
                return;
            }

            // Migración de metadatos (rápida)
            const stores = ['meta', 'items_meta', 'config', 'catalog'];
            for (const store of stores) {
                const sPath = `${DATA_DIR}/${store}`;
                const sFiles = await Filesystem.readdir({ path: sPath, directory: LEGACY_DIR }).catch(() => null);
                if (sFiles && sFiles.files) {
                    await Filesystem.mkdir({ path: sPath, directory: PRIMARY_DIR, recursive: true }).catch(() => { });
                    for (const f of sFiles.files) {
                        const name = typeof f === 'string' ? f : f.name;
                        await Filesystem.copy({
                            from: `${sPath}/${name}`,
                            to: `${sPath}/${name}`,
                            directory: LEGACY_DIR,
                            toDirectory: PRIMARY_DIR
                        }).catch(() => { });
                    }
                }
            }

            // Fotos (se migran bajo demanda o progresivamente en v172, 
            // pero para evitar pérdida en v189 movemos la carpeta principal)
            await Filesystem.copy({
                from: `${DATA_DIR}/blobs`,
                to: `${DATA_DIR}/blobs`,
                directory: LEGACY_DIR,
                toDirectory: PRIMARY_DIR
            }).catch(() => { });

            localStorage.setItem('logi_migrated_v189', 'true');
            console.log("[Bridge] Migración Completada.");
        } catch (e) {
            console.error("[Bridge] Error en Migración:", e);
        }
    },

    fileExists: async (path, directory = 'data') => {
        if (!LogiNative.isNative()) return false;
        try {
            const dir = directory === 'documents' ? Directory.Documents : PRIMARY_DIR;
            await withTimeout(Filesystem.stat({ path, directory: dir }));
            return true;
        } catch (e) { return false; }
    },

    readLocalFile: async (path, directory = 'data') => {
        if (!LogiNative.isNative()) return null;
        try {
            const dir = directory === 'documents' ? Directory.Documents : PRIMARY_DIR;
            const res = await withTimeout(Filesystem.readFile({ path, directory: dir, encoding: 'utf8' }));
            return res.data;
        } catch (e) { return null; }
    },

    getDebugInfo: () => {
        return {
            platform: LogiNative.isNative() ? 'NATIVE' : 'WEB',
            primary: PRIMARY_DIR,
            data_dir: DATA_DIR,
            base_uri: _dynamicBlobsUri,
            migrated: localStorage.getItem('logi_migrated_v189'),
            version: '189.3-TITAN'
        };
    },

    forceMigrate: async () => {
        localStorage.removeItem('logi_migrated_v189');
        await LogiNative.migrateLegacyData();
        window.location.reload();
    },

    /**
     * _runPathProbe: SONDA DE DIAGNÓSTICO (v189.3)
     * Verifica si el WebView puede RESOLVER una URI de foto.
     */
    _runPathProbe: async () => {
        if (!LogiNative.isNative()) return;
        try {
            const res = await Filesystem.readdir({ path: DATA_DIR + '/blobs', directory: PRIMARY_DIR }).catch(() => null);
            if (res && res.files && res.files.length > 0) {
                const first = typeof res.files[0] === 'string' ? res.files[0] : res.files[0].name;
                const uri = await LogiNative.getBlobUri(first);
                console.log(`[Probe] ARCHIVO DETECTADO: ${first}`);
                console.log(`[Probe] URI GENERADA: ${uri}`);

                // Prueba de accesibilidad real
                const test = await fetch(uri).then(r => r.ok).catch(e => false);
                console.log(`[Probe] ¿ACCESIBLE DESDE WEBVIEW?: ${test ? 'SÍ ✅' : 'NO ❌'}`);
            } else {
                console.warn("[Probe] No se encontraron blobs para probar.");
            }
        } catch (e) {
            console.error("[Probe] Error en sonda:", e);
        }
    },

    getBlobBaseUrlSync: () => _dynamicBlobsUri,

    dbPut: async (store, item) => {
        // v2026-05-04: Soporte para Sincronización Delta
        if (item && store === 'items_meta') {
            item.updated_at = Date.now();
        }

        if (!LogiNative.isNative()) {
            const idx = _webMeta[store].findIndex(i => i.id === item.id);
            if (idx !== -1) _webMeta[store][idx] = item;
            else _webMeta[store].unshift(item);
            saveWebMeta(store);
            return true;
        }

        // --- EXCEPCIÓN: Configuración usa PREFERENCES ---
        if (store === 'config') {
            try {
                await Preferences.set({ key: `logi_cfg_${item.id}`, value: JSON.stringify(item) });
                return true;
            } catch (e) { return false; }
        }

        try {
            const path = `${DATA_DIR}/${store}/${item.id}.json`;
            await withTimeout(Filesystem.writeFile({ path, data: JSON.stringify(item), directory: PRIMARY_DIR, encoding: 'utf8', recursive: true }));

            // v191.9-OMNIVERSO: YA NO BORRAMOS LAS PARTES.
            // Los baches se mantienen como base de velocidad, y dbGetAll se encarga de mezclarlos.
            return true;
        } catch (e) { return false; }
    },

    /**
     * dbCommitBatch: CONSOLIDACIÓN NUCLEAR (v189)
     * Une miles de archivos individuales en un solo Master JSON para carga instantánea.
     */
    dbCommitBatch: async (store, items) => {
        if (!LogiNative.isNative()) return;
        try {
            if (!items || items.length === 0) return;

            console.log(`[Bridge] Consolidando ${items.length} items (FRAGMENTACIÓN ULTRA)...`);

            // v191.9-ULTRA: Fragmentar en baches de 300 para no romper el bridge nativo
            const batchSize = 300;
            for (let i = 0; i < 10; i++) { // Max 3000 items (seguro para 1457)
                const start = i * batchSize;
                const part = items.slice(start, start + batchSize);
                const path = `${DATA_DIR}/master_${store}_p${i}.json`;

                if (part.length > 0) {
                    await Filesystem.writeFile({
                        path,
                        data: JSON.stringify(part),
                        directory: PRIMARY_DIR,
                        encoding: 'utf8'
                    });
                } else {
                    // Limpiar partes sobrantes si el dataset encogió
                    await Filesystem.deleteFile({ path, directory: PRIMARY_DIR }).catch(() => { });
                }
            }
            console.log(`[Bridge] Master fragmentado persistido.`);
        } catch (e) { console.error("[Bridge] Commit Error:", e); }
    },

    dbGet: async (store, id) => {
        if (!LogiNative.isNative()) return _webMeta[store].find(i => i.id === id) || null;

        if (store === 'config') {
            try {
                const { value } = await Preferences.get({ key: `logi_cfg_${id}` });
                return value ? JSON.parse(value) : null;
            } catch (e) { return null; }
        }

        try {
            const path = `${DATA_DIR}/${store}/${id}.json`;
            // Intento 1: Primario (Data)
            const r = await withTimeout(Filesystem.readFile({ path, directory: PRIMARY_DIR, encoding: 'utf8' }), 2000).catch(() => null);
            if (r) return JSON.parse(r.data);

            // Intento 2: Scavenger (Documents)
            const r2 = await withTimeout(Filesystem.readFile({ path, directory: LEGACY_DIR, encoding: 'utf8' }), 2000).catch(() => null);
            if (r2) {
                console.log(`[Scavenger] Recuperado de Legacy: ${path}`);
                return JSON.parse(r2.data);
            }
            return null;
        } catch (e) { return null; }
    },

    // --- MÉTODOS PARA DATOS PESADOS (LOGO) CON PREFERENCES ---
    saveToDocuments: async (filename, base64) => {
        if (!LogiNative.isNative()) {
            // En web, simplemente disparamos una descarga
            const link = document.createElement('a');
            link.href = `data:application/zip;base64,${base64}`;
            link.download = filename;
            link.click();
            return true;
        }
        try {
            const path = `Descargas_Logi/${filename}`;
            await Filesystem.writeFile({
                path,
                data: base64,
                directory: PRIMARY_DIR,
                recursive: true
            });

            // Compartir para que el usuario pueda guardarlo donde quiera
            const res = await Filesystem.getUri({ path, directory: PRIMARY_DIR });
            await Share.share({
                title: 'Respaldo Logi',
                text: `Se ha generado el respaldo: ${filename}`,
                files: [res.uri]
            });
            return true;
        } catch (e) {
            console.error("Error guardando respaldo:", e);
            return false;
        }
    },

    saveLogo: async (base64) => {
        console.log("LogiNative: Intentando guardar logo... tamaño:", base64 ? base64.length : 0);
        if (!LogiNative.isNative()) {
            localStorage.setItem('logi_export_logo_raw', base64);
            return true;
        }
        try {
            await Preferences.set({ key: 'logi_logo_bin', value: base64 });
            console.log("LogiNative: Logo guardado exitosamente en Preferences.");
            return true;
        } catch (e) {
            console.error("LogiNative: Error guardando logo:", e);
            return false;
        }
    },

    getLogo: async () => {
        console.log("LogiNative: Solicitando logo de Preferences...");
        if (!LogiNative.isNative()) return localStorage.getItem('logi_export_logo_raw');
        try {
            const { value } = await Preferences.get({ key: 'logi_logo_bin' });
            console.log("LogiNative: Logo recuperado. Tamaño:", value ? value.length : "NULL");
            return value;
        } catch (e) {
            console.error("LogiNative: Error recuperando logo:", e);
            return null;
        }
    },

    deleteLogo: async () => {
        if (!LogiNative.isNative()) {
            localStorage.removeItem('logi_export_logo_raw');
            return true;
        }
        try {
            await Preferences.remove({ key: 'logi_logo_bin' });
            return true;
        } catch (e) { return false; }
    },

    // --- CATALOG STORAGE (Listado de Ítems) ---
    dbPutCatalog: async (projectId, items) => {
        const id = projectId;
        if (!LogiNative.isNative()) {
            _webMeta.catalog[id] = items;
            saveWebMeta('catalog');
            return true;
        }
        try {
            // v192.4: Estandarización de nombre (prefijo proj_)
            const path = `${DATA_DIR}/catalog/proj_${id}.json`;
            const data = JSON.stringify(items);
            console.log(`[Bridge] dbPutCatalog guardando: ${path} (${data.length} bytes)`);
            await withTimeout(Filesystem.writeFile({
                path,
                data,
                directory: PRIMARY_DIR,
                encoding: 'utf8',
                recursive: true
            }), 10000);
            return true;
        } catch (e) {
            console.error(`[Bridge] Error guardando catálogo: ${e.message}`);
            return false;
        }
    },

    dbGetCatalog: async (projectId) => {
        const id = projectId;
        if (!LogiNative.isNative()) return _webMeta.catalog[id] || [];

        try {
            const normalizedId = String(id).toLowerCase().replace(/[^a-z0-9]/g, '').replace(/^p/, '');
            const paths = [
                `${DATA_DIR}/catalog/proj_${id}.json`,          // Intento 1: Prefijo + ID Original
                `${DATA_DIR}/catalog/proj_${normalizedId}.json`,// Intento 2: Prefijo + ID Normalizado
                `${DATA_DIR}/catalog/${id}.json`,               // Intento 3: Sin prefijo (Legacy)
                `${DATA_DIR}/catalog/${normalizedId}.json`      // Intento 4: Sin prefijo + Normalizado
            ];

            console.log(`[Bridge] dbGetCatalog iniciado para: ${id}`);

            for (const path of paths) {
                // Intento en PRIMARY_DIR (Data)
                let r = await withTimeout(Filesystem.readFile({ path, directory: PRIMARY_DIR, encoding: 'utf8' }), 10000).catch(() => null);
                if (r) {
                    console.log(`[Bridge] Catálogo encontrado en DATA: ${path}`);
                    return JSON.parse(r.data);
                }

                // Intento en LEGACY_DIR (Documents) - Scavenger Mode
                let r2 = await withTimeout(Filesystem.readFile({ path, directory: LEGACY_DIR, encoding: 'utf8' }), 10000).catch(() => null);
                if (r2) {
                    console.log(`[Scavenger] Catálogo recuperado de DOCUMENTS: ${path}`);
                    // Opcional: Migrar a DATA para la próxima vez
                    Filesystem.writeFile({ path, data: r2.data, directory: PRIMARY_DIR, encoding: 'utf8', recursive: true }).catch(() => { });
                    return JSON.parse(r2.data);
                }
            }

            console.warn(`[Bridge] Catálogo NO encontrado en ninguna ruta para ID: ${id}`);

            // Diagnóstico: Listar qué hay en la carpeta
            const debugFiles = await Filesystem.readdir({ path: `${DATA_DIR}/catalog`, directory: PRIMARY_DIR }).catch(() => ({ files: [] }));
            const names = (debugFiles.files || []).map(f => (typeof f === 'string' ? f : f.name));
            console.log(`[Bridge] Archivos presentes en catalog/: ${JSON.stringify(names)}`);

            return [];
        } catch (e) {
            console.error(`[Bridge] Error fatal en dbGetCatalog: ${e.message}`);
            return [];
        }
    },

    dbDeleteCatalog: async (projectId) => {
        const id = projectId;
        if (!LogiNative.isNative()) {
            delete _webMeta.catalog[id];
            saveWebMeta('catalog');
            return true;
        }
        try {
            await withTimeout(Filesystem.deleteFile({ path: `${DATA_DIR}/catalog/${id}.json`, directory: PRIMARY_DIR }));
            return true;
        } catch (e) { return false; }
    },

    dbGetAllCatalogs: async () => {
        if (!LogiNative.isNative()) {
            const catalogs = [];
            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                if (key.startsWith('logi_catalog_proj_')) {
                    const projectId = key.replace('logi_catalog_proj_', '');
                    catalogs.push({
                        projectId,
                        items: JSON.parse(localStorage.getItem(key))
                    });
                }
            }
            return catalogs;
        }
        try {
            const path = `${DATA_DIR}/catalog`;
            const res = await withTimeout(Filesystem.readdir({ path, directory: PRIMARY_DIR }), 5000).catch(() => ({ files: [] }));
            const files = (res.files || []).map(f => (typeof f === 'string' ? f : f.name)).filter(n => n.endsWith('.json'));

            const allCatalogs = [];
            for (const f of files) {
                try {
                    const r = await Filesystem.readFile({ path: `${path}/${f}`, directory: PRIMARY_DIR, encoding: 'utf8' });
                    const projectId = f.replace('.json', '').replace('proj_', '');
                    allCatalogs.push({
                        projectId,
                        items: JSON.parse(r.data)
                    });
                } catch (e) { continue; }
            }
            return allCatalogs;
        } catch (e) { return []; }
    },

    dbGetAll: async (store) => {
        if (!LogiNative.isNative()) return _webMeta[store] || [];

        try {
            // 1. Carga Multi-Parte (Backup)
            const allMasterItems = [];
            let foundAnyPart = false;
            for (let i = 0; i < 10; i++) {
                const partPath = `${DATA_DIR}/master_${store}_p${i}.json`;
                const hasPart = await Filesystem.stat({ path: partPath, directory: PRIMARY_DIR }).catch(() => null);
                if (hasPart) {
                    const content = await Filesystem.readFile({ path: partPath, directory: PRIMARY_DIR, encoding: 'utf8' });
                    allMasterItems.push(...JSON.parse(content.data));
                    foundAnyPart = true;
                }
            }

            // 2. Escaneo Híbrido (Data + Documents)
            const path = `${DATA_DIR}/${store}`;
            const resPrimary = await Filesystem.readdir({ path, directory: PRIMARY_DIR }).catch(() => ({ files: [] }));
            const resLegacy = await Filesystem.readdir({ path, directory: LEGACY_DIR }).catch(() => ({ files: [] }));

            const allFiles = new Set([
                ...(resPrimary.files || []).map(f => (typeof f === 'string' ? f : f.name)),
                ...(resLegacy.files || []).map(f => (typeof f === 'string' ? f : f.name))
            ]);

            const jsonFiles = Array.from(allFiles).filter(n => n.endsWith('.json'));
            if (jsonFiles.length === 0 && !foundAnyPart) return [];

            // v192.5-TITAN: PRIORIDAD TOTAL A ARCHIVOS INDIVIDUALES
            // Si un archivo existe en disco, es una captura nueva o una ACTUALIZACIÓN.
            // Debe cargarse siempre para sobreescribir lo que haya en el bloque maestro (master_*.json).
            const newFiles = jsonFiles;

            const newItems = [];
            for (let i = 0; i < newFiles.length; i += 10) {
                const batch = newFiles.slice(i, i + 10);
                const results = await Promise.all(batch.map(async (name) => {
                    return await LogiNative.dbGet(store, name.replace('.json', ''));
                }));
                newItems.push(...results.filter(Boolean));
                await new Promise(r => setTimeout(r, 5));
            }

            const uniqueResults = [];
            const seen = new Set();
            for (const it of [...newItems, ...allMasterItems]) {
                if (!it.id || seen.has(it.id)) continue;
                uniqueResults.push(it);
                seen.add(it.id);
            }
            return uniqueResults;
        } catch (e) { return []; }
    },

    dbDelete: async (store, id) => {
        if (!LogiNative.isNative()) {
            _webMeta[store] = _webMeta[store].filter(i => i.id !== id);
            saveWebMeta(store);
            return true;
        }
        try {
            await withTimeout(Filesystem.deleteFile({ path: `${DATA_DIR}/${store}/${id}.json`, directory: PRIMARY_DIR }));
            return true;
        } catch (e) { return false; }
    },

    storeBlob: async (filename, base64) => {
        const fullBase64 = base64.includes('data:image') ? base64 : `data:image/jpeg;base64,${base64}`;
        if (!LogiNative.isNative()) {
            const db = await getDB();
            if (!db) return false;
            return new Promise(r => {
                const tx = db.transaction(STORE_NAME, 'readwrite');
                tx.objectStore(STORE_NAME).put(fullBase64, filename);
                tx.oncomplete = () => r(true);
                tx.onerror = () => r(false);
            });
        }
        try {
            await withTimeout(Filesystem.writeFile({
                path: `${DATA_DIR}/blobs/${filename}`,
                data: base64.replace(/^data:image\/jpeg;base64,/, ''),
                directory: PRIMARY_DIR,
                recursive: true
            }));
            return true;
        } catch (e) { return false; }
    },

    getBlobUri: async (filename) => {
        if (!LogiNative.isNative()) {
            const db = await getDB();
            if (!db) return null;
            return new Promise(r => {
                const tx = db.transaction(STORE_NAME, 'readonly');
                const req = tx.objectStore(STORE_NAME).get(filename);
                req.onsuccess = () => r(req.result);
                req.onerror = () => r(null);
            });
        }
        try {
            const path = `${DATA_DIR}/blobs/${filename}`;

            // INTENTO 1: Ubicación Primaria (Data)
            const res = await Filesystem.getUri({ path, directory: PRIMARY_DIR }).catch(() => null);
            if (res) return Capacitor.convertFileSrc(res.uri);

            // INTENTO 2: Scavenger Fallback (Documents - v189.2)
            // Si no está en Data, buscamos en Documents por si la migración falló
            const legacyRes = await Filesystem.getUri({ path, directory: LEGACY_DIR }).catch(() => null);
            if (legacyRes) {
                console.warn(`[Bridge] Scavenger encontró blob en LEGACY: ${filename}`);
                return Capacitor.convertFileSrc(legacyRes.uri);
            }

            return null;
        } catch (e) {
            console.error(`[Bridge] getBlobUri Error (${filename}):`, e);
            return null;
        }
    },

    getBlobBytes: async (filename) => {
        try {
            if (!LogiNative.isNative()) {
                const dataUrl = await LogiNative.getBlobUri(filename);
                if (!dataUrl) return null;
                const base64 = dataUrl.split(',')[1];
                return Uint8Array.from(atob(base64), c => c.charCodeAt(0));
            }
            const path = `${DATA_DIR}/blobs/${filename}`;
            const res = await withTimeout(Filesystem.readFile({ path, directory: PRIMARY_DIR }));
            return Uint8Array.from(atob(res.data), c => c.charCodeAt(0));
        } catch (e) { return null; }
    },

    deleteBlob: async (filename) => {
        if (!LogiNative.isNative()) {
            const db = await getDB();
            if (!db) return false;
            return new Promise(r => {
                const tx = db.transaction(STORE_NAME, 'readwrite');
                tx.objectStore(STORE_NAME).delete(filename);
                tx.oncomplete = () => r(true);
            });
        }
        try {
            await withTimeout(Filesystem.deleteFile({ path: `${DATA_DIR}/blobs/${filename}`, directory: PRIMARY_DIR }));
            return true;
        } catch (e) { return false; }
    },

    share: async (items) => {
        if (!LogiNative.isNative()) return;
        const files = Array.isArray(items) ? items : [items];
        const uris = [];
        for (const it of files) {
            try {
                const res = await withTimeout(Filesystem.getUri({ path: `${DATA_DIR}/blobs/${it.filename}`, directory: PRIMARY_DIR }));
                uris.push(res.uri);
            } catch (e) { }
        }
        if (uris.length > 0) await Share.share({ files: uris });
    },

    readBlobAsBase64: async (filename) => {
        if (!LogiNative.isNative()) return LogiNative.getBlobUri(filename);
        try {
            const path = `${DATA_DIR}/blobs/${filename}`;
            const res = await withTimeout(Filesystem.readFile({ path, directory: PRIMARY_DIR }));
            return `data:image/jpeg;base64,${res.data}`;
        } catch (e) { return null; }
    },

    shareProcessed: async (processedItems) => {
        if (!LogiNative.isNative()) {
            console.log("Web Share (Simulado):", processedItems.length, "fotos.");
            return;
        }
        const uris = [];
        for (const it of processedItems) {
            try {
                // Guardamos en una carpeta temporal para compartir
                const path = `${DATA_DIR}/temp_share/${it.filename}`;
                await withTimeout(Filesystem.writeFile({
                    path,
                    data: it.base64.replace(/^data:image\/jpeg;base64,/, '').replace(/^data:image\/png;base64,/, ''),
                    directory: PRIMARY_DIR,
                    recursive: true
                }));
                const res = await withTimeout(Filesystem.getUri({ path, directory: PRIMARY_DIR }));
                uris.push(res.uri);
            } catch (e) {
                console.error("Error al preparar archivo para compartir:", e);
            }
        }
        if (uris.length > 0) {
            await Share.share({ files: uris });
            // Opcional: limpieza de archivos temporales (no implementado para evitar borrar mientras se comparte)
        }
    },

    // --- HELPERS INTERNOS ---
    _getReportsPath: (pid) => `_LOGI_VAULT_/Reports/_proj_${pid || 'p_default'}`,

    shareBlob: async (blob, filename, projectId) => {
        if (!LogiNative.isNative()) {
            const url = URL.createObjectURL(blob);
            const a = document.getElementById("hidden-download-link") || document.createElement("a");
            a.href = url;
            a.download = filename;
            a.click();
            setTimeout(() => URL.revokeObjectURL(url), 1000);
            return;
        }

        try {
            // v191.9-ULTRA: Pausa para liberar memoria antes de la conversión masiva
            await new Promise(r => setTimeout(r, 200));

            const reader = new FileReader();
            const base64 = await new Promise((resolve, reject) => {
                reader.onloadend = () => resolve(reader.result.split(',')[1]);
                reader.onerror = reject;
                reader.readAsDataURL(blob);
            });

            const pid = projectId || State.currentProject?.id || 'p_default';
            const normPid = (typeof State._norm === 'function') ? State._norm(pid) : pid;
            const dirPath = LogiNative._getReportsPath(normPid);
            const path = `${dirPath}/${filename}`;

            console.log(`[Bridge] SHARE_BLOB: pid=${pid} | path=${path}`);

            await withTimeout(Filesystem.mkdir({ path: dirPath, directory: PRIMARY_DIR, recursive: true }), 5000).catch(() => { });
            await withTimeout(Filesystem.writeFile({ path, data: base64, directory: PRIMARY_DIR, recursive: true }), 30000);

            const res = await withTimeout(Filesystem.getUri({ path, directory: PRIMARY_DIR }));
            await Share.share({ title: 'Reporte Logi', files: [res.uri] });
        } catch (e) {
            console.error("ShareBlob Error:", e);
            throw e;
        }
    },

    saveReportMeta: async (filename, metaObj, projectId) => {
        const pid = projectId || State.currentProject?.id || 'p_default';
        const normPid = (typeof State._norm === 'function') ? State._norm(pid) : pid;
        const dirPath = LogiNative._getReportsPath(normPid);
        const path = `${dirPath}/${filename}`;

        if (!LogiNative.isNative()) {
            const all = JSON.parse(localStorage.getItem('logi_reports_meta_web') || '[]');
            all.push({ filename, meta: metaObj, projectId: pid });
            localStorage.setItem('logi_reports_meta_web', JSON.stringify(all));
            return;
        }

        try {
            const data = btoa(JSON.stringify(metaObj));
            await withTimeout(Filesystem.mkdir({ path: dirPath, directory: PRIMARY_DIR, recursive: true }), 1000).catch(() => { });
            await withTimeout(Filesystem.writeFile({ path, data, directory: PRIMARY_DIR, recursive: true }));
        } catch (e) {
            console.error("[Bridge] SaveMeta Error:", e);
        }
    },

    getReportMeta: async (filename, projectId) => {
        const pid = projectId || State.currentProject?.id || 'p_default';
        const normPid = (typeof State._norm === 'function') ? State._norm(pid) : pid;
        const dirPath = LogiNative._getReportsPath(normPid);
        const path = `${dirPath}/${filename}`;

        if (!LogiNative.isNative()) {
            const all = JSON.parse(localStorage.getItem('logi_reports_meta_web') || '[]');
            const entry = all.find(f => f.filename === filename && f.projectId === pid);
            return entry ? entry.meta : null;
        }

        try {
            const res = await withTimeout(Filesystem.readFile({ path, directory: PRIMARY_DIR }));
            return JSON.parse(atob(res.data));
        } catch (e) { return null; }
    },

    listReports: async () => {
        const pid = State.currentProject?.id || 'p_default';
        if (!LogiNative.isNative()) {
            const all = JSON.parse(localStorage.getItem('logi_reports_web') || '[]');
            return all.filter(f => f.projectId === pid);
        }
        try {
            const pid = State.currentProject?.id || 'p_default';
            const normPid = (typeof State._norm === 'function') ? State._norm(pid) : pid;
            const path = LogiNative._getReportsPath(normPid);
            const res = await withTimeout(Filesystem.readdir({ path, directory: PRIMARY_DIR }), 5000);
            return (res.files || []).map(f => {
                const name = typeof f === 'string' ? f : f.name;
                const mtime = (typeof f === 'object' && f.mtime) ? f.mtime : Date.now();
                const size = (typeof f === 'object' && f.size) ? f.size : 0;
                return { name, mtime, size };
            }).sort((a, b) => b.mtime - a.mtime);
        } catch (e) {
            console.warn("[Bridge] ListReports Error:", e);
            return [];
        }
    },

    deleteReport: async (filename) => {
        const pid = State.currentProject?.id || 'p_default';
        const normPid = (typeof State._norm === 'function') ? State._norm(pid) : pid;
        if (!LogiNative.isNative()) {
            const list = JSON.parse(localStorage.getItem('logi_reports_web') || '[]');
            const newList = list.filter(f => f.name !== filename || f.projectId === pid);
            localStorage.setItem('logi_reports_web', JSON.stringify(newList));
            return true;
        }
        try {
            const dirPath = LogiNative._getReportsPath(normPid);
            const path = `${dirPath}/${filename}`;
            await withTimeout(Filesystem.deleteFile({ path, directory: PRIMARY_DIR }));
            return true;
        } catch (e) { return false; }
    },

    getReportUri: async (filename) => {
        const pid = State.currentProject?.id || 'p_default';
        const normPid = (typeof State._norm === 'function') ? State._norm(pid) : pid;
        if (!LogiNative.isNative()) return null;
        try {
            const dirPath = LogiNative._getReportsPath(normPid);
            const path = `${dirPath}/${filename}`;
            const res = await withTimeout(Filesystem.getUri({ path, directory: PRIMARY_DIR }));
            return Capacitor.convertFileSrc(res.uri);
        } catch (e) { return null; }
    },

    shareReport: async (filename) => {
        const pid = State.currentProject?.id || 'p_default';
        const normPid = (typeof State._norm === 'function') ? State._norm(pid) : pid;
        if (!LogiNative.isNative()) return;
        try {
            const dirPath = LogiNative._getReportsPath(normPid);
            const path = `${dirPath}/${filename}`;
            const res = await withTimeout(Filesystem.getUri({ path, directory: PRIMARY_DIR }));
            await Share.share({ files: [res.uri] });
        } catch (e) { }
    },

    viewReport: async (filename) => {
        const pid = State.currentProject?.id || 'p_default';
        const normPid = (typeof State._norm === 'function') ? State._norm(pid) : pid;
        if (!LogiNative.isNative()) return;
        try {
            const dirPath = LogiNative._getReportsPath(normPid);
            const path = `${dirPath}/${filename}`;
            const res = await withTimeout(Filesystem.getUri({ path, directory: PRIMARY_DIR }));
            const opener = window.Capacitor?.Plugins?.FileOpener;
            if (opener) {
                await opener.open({
                    filePath: res.uri,
                    contentType: filename.toLowerCase().endsWith('.pdf') ? 'application/pdf' : 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
                }).catch(async e => {
                    // Fallback a compartir si no hay app para abrir
                    await Share.share({ files: [res.uri] });
                });
            } else {
                await Share.share({ files: [res.uri] });
            }
        } catch (e) { console.error("ViewReport Error:", e); }
    },

    renameReport: async (oldName, newName) => {
        const pid = State.currentProject?.id || 'p_default';
        const normPid = (typeof State._norm === 'function') ? State._norm(pid) : pid;
        if (!LogiNative.isNative()) {
            const list = JSON.parse(localStorage.getItem('logi_reports_web') || '[]');
            const item = list.find(f => f.name === oldName && f.projectId === pid);
            if (item) item.name = newName;
            localStorage.setItem('logi_reports_web', JSON.stringify(list));
            return true;
        }
        try {
            const dirPath = LogiNative._getReportsPath(normPid);
            await withTimeout(Filesystem.rename({
                from: `${dirPath}/${oldName}`,
                to: `${dirPath}/${newName}`,
                directory: PRIMARY_DIR
            }));
            return true;
        } catch (e) {
            console.error("RenameReport Error:", e);
            return false;
        }
    }
};
