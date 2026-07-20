/**
 * DebugLogger.js — Logi Kinetic (v2.0 - Expert Diagnostic Engine)
 * Centralized, Persistent Event Logger, Storage Benchmark & Health Check Suite.
 */

const MAX_LOGS = 500;
const STORAGE_KEY = 'logi_debug_timeline';

class DebugLoggerService {
    constructor() {
        this.logs = [];
        this.isInitialized = false;
        this.init();
    }

    init() {
        if (this.isInitialized) return;
        
        // Cargar logs guardados previamente
        try {
            const saved = localStorage.getItem(STORAGE_KEY);
            if (saved) {
                this.logs = JSON.parse(saved);
                if (!Array.isArray(this.logs)) this.logs = [];
            }
        } catch (e) {
            this.logs = [];
        }

        // Listener global de errores Javascript no capturados
        if (typeof window !== 'undefined') {
            window.addEventListener('error', (event) => {
                this.error('SYSTEM', `Uncaught Exception: ${event.message}`, {
                    filename: event.filename,
                    lineno: event.lineno,
                    colno: event.colno,
                    stack: event.error?.stack
                });
            });

            window.addEventListener('unhandledrejection', (event) => {
                const reason = event.reason;
                this.error('SYSTEM', `Unhandled Rejection: ${reason?.message || reason}`, {
                    stack: reason?.stack || String(reason)
                });
            });
        }

        this.isInitialized = true;
        this.info('BOOT', 'DebugLogger inicializado correctamente.');
    }

    log(level, category, message, meta = null) {
        const entry = {
            id: Date.now() + '_' + Math.random().toString(36).substr(2, 4),
            timestamp: new Date().toISOString(),
            timeStr: new Date().toLocaleTimeString('es-ES', { hour12: false }),
            level,       // 'INFO', 'WARN', 'ERROR', 'EVENT'
            category,    // 'CAMERA', 'STORAGE', 'BRIDGE', 'SYSTEM', 'STATE', etc.
            message,
            meta: meta ? (typeof meta === 'object' ? JSON.parse(JSON.stringify(meta)) : meta) : null
        };

        // Imprimir en consola de desarrollo con formato
        const prefix = `[${entry.timeStr}] [${entry.category}]`;
        if (level === 'ERROR') console.error(prefix, message, meta || '');
        else if (level === 'WARN') console.warn(prefix, message, meta || '');
        else console.log(prefix, message, meta || '');

        // Agregar a la cola en memoria
        this.logs.unshift(entry);
        if (this.logs.length > MAX_LOGS) {
            this.logs = this.logs.slice(0, MAX_LOGS);
        }

        // Persistencia asíncrona no bloqueante
        this.persist();
    }

    info(category, message, meta = null) {
        this.log('INFO', category, message, meta);
    }

    warn(category, message, meta = null) {
        this.log('WARN', category, message, meta);
    }

    error(category, message, meta = null) {
        this.log('ERROR', category, message, meta);
    }

    event(category, message, meta = null) {
        this.log('EVENT', category, message, meta);
    }

    persist() {
        if (this._persistTimer) clearTimeout(this._persistTimer);
        this._persistTimer = setTimeout(() => {
            try {
                // Guardar los últimos 200 logs sin metadatos excesivos para no saturar LocalStorage
                const safeLogs = this.logs.slice(0, 200).map(l => ({
                    ...l,
                    meta: l.meta && JSON.stringify(l.meta).length > 500 ? '[Payload Truncated]' : l.meta
                }));
                localStorage.setItem(STORAGE_KEY, JSON.stringify(safeLogs));
            } catch (e) {
                console.warn("[DebugLogger] Error guardando timeline:", e);
            }
        }, 300);
    }

    clear() {
        this.logs = [];
        try {
            localStorage.removeItem(STORAGE_KEY);
        } catch (e) {}
        this.info('SYSTEM', 'Línea de tiempo de depuración limpiada.');
    }

    getLogs(filterCategory = null, filterLevel = null) {
        return this.logs.filter(l => {
            if (filterCategory && l.category !== filterCategory) return false;
            if (filterLevel && l.level !== filterLevel) return false;
            return true;
        });
    }

    // --- DIAGNÓSTICOS DE ALMACENAMIENTO Y MEMORIA ---

    getStorageStats() {
        let localStorageBytes = 0;
        try {
            for (let i = 0; i < localStorage.length; i++) {
                const k = localStorage.key(i);
                const v = localStorage.getItem(k);
                localStorageBytes += (k.length + (v ? v.length : 0)) * 2;
            }
        } catch (e) {}

        const heap = (performance && performance.memory) ? {
            usedMB: (performance.memory.usedJSHeapSize / 1024 / 1024).toFixed(2),
            totalMB: (performance.memory.totalJSHeapSize / 1024 / 1024).toFixed(2),
            limitMB: (performance.memory.jsHeapSizeLimit / 1024 / 1024).toFixed(2)
        } : null;

        return {
            localStorageKB: (localStorageBytes / 1024).toFixed(2),
            localStorageMB: (localStorageBytes / 1024 / 1024).toFixed(3),
            heap
        };
    }

    getCaptureStats() {
        let cameraOpened = 0;
        let photoCaptured = 0;
        let compressionSuccess = 0;
        let totalOriginalKB = 0;
        let totalCompressedKB = 0;
        let maxCompressedKB = 0;
        let errorsCount = 0;

        this.logs.forEach(l => {
            if (l.level === 'ERROR') errorsCount++;
            if (l.message.includes('Cámara abierta')) cameraOpened++;
            if (l.message.includes('Foto capturada') || l.message.includes('Foto seleccionada')) photoCaptured++;
            if (l.meta && l.meta.compressedKB) {
                compressionSuccess++;
                const orig = Number(l.meta.originalKB || 0);
                const comp = Number(l.meta.compressedKB || 0);
                totalOriginalKB += orig;
                totalCompressedKB += comp;
                if (comp > maxCompressedKB) maxCompressedKB = comp;
            }
        });

        const avgCompressedKB = compressionSuccess > 0 ? (totalCompressedKB / compressionSuccess).toFixed(1) : 0;
        const avgOriginalKB = compressionSuccess > 0 ? (totalOriginalKB / compressionSuccess).toFixed(1) : 0;

        return {
            cameraOpened,
            photoCaptured,
            compressionSuccess,
            avgOriginalKB,
            avgCompressedKB,
            maxCompressedKB: maxCompressedKB.toFixed(1),
            totalErrors: errorsCount
        };
    }

    // --- HEALTH CHECK SUITE ---

    async runHealthCheck() {
        this.info('HEALTH_CHECK', 'Iniciando suite de prueba de salud de la aplicación...');
        const checks = [];
        const startTotal = performance.now();

        // 1. Prueba LocalStorage
        try {
            const t0 = performance.now();
            const testKey = '_logi_health_test';
            const testVal = 'LOGI_HEALTH_' + Date.now();
            localStorage.setItem(testKey, testVal);
            const readVal = localStorage.getItem(testKey);
            localStorage.removeItem(testKey);
            const dt = Math.round(performance.now() - t0);

            if (readVal === testVal) {
                checks.push({ name: 'LocalStorage Read/Write', pass: true, detail: `OK (${dt}ms)`, durationMs: dt });
            } else {
                checks.push({ name: 'LocalStorage Read/Write', pass: false, detail: 'Lectura no coincide', durationMs: dt });
            }
        } catch (lsErr) {
            checks.push({ name: 'LocalStorage Read/Write', pass: false, detail: lsErr.message, durationMs: 0 });
        }

        // 2. Prueba IndexedDB
        try {
            const t0 = performance.now();
            const idbRes = await new Promise((resolve) => {
                const req = indexedDB.open('LogiHealthTestDB', 1);
                req.onupgradeneeded = () => req.result.createObjectStore('test_store');
                req.onsuccess = () => {
                    const db = req.result;
                    const tx = db.transaction('test_store', 'readwrite');
                    tx.objectStore('test_store').put('health_ok', 'ping');
                    tx.oncomplete = () => {
                        db.close();
                        indexedDB.deleteDatabase('LogiHealthTestDB');
                        resolve(true);
                    };
                    tx.onerror = () => resolve(false);
                };
                req.onerror = () => resolve(false);
            });
            const dt = Math.round(performance.now() - t0);
            checks.push({
                name: 'IndexedDB Engine',
                pass: idbRes,
                detail: idbRes ? `Escritura/Lectura OK (${dt}ms)` : 'Falló transacción',
                durationMs: dt
            });
        } catch (idbErr) {
            checks.push({ name: 'IndexedDB Engine', pass: false, detail: idbErr.message, durationMs: 0 });
        }

        // 3. Prueba Cuota de Almacenamiento
        try {
            if (navigator.storage && navigator.storage.estimate) {
                const estimate = await navigator.storage.estimate();
                const usedMB = ((estimate.usage || 0) / 1024 / 1024).toFixed(2);
                const quotaMB = ((estimate.quota || 0) / 1024 / 1024).toFixed(2);
                checks.push({
                    name: 'Storage Quota Estimate',
                    pass: true,
                    detail: `Usado: ${usedMB} MB / Disponible: ${quotaMB} MB`,
                    durationMs: 0
                });
            } else {
                checks.push({ name: 'Storage Quota Estimate', pass: true, detail: 'API de cuota no disponible en navegador', durationMs: 0 });
            }
        } catch (quotaErr) {
            checks.push({ name: 'Storage Quota Estimate', pass: false, detail: quotaErr.message, durationMs: 0 });
        }

        // 4. API de Cámara y Soporte Web
        try {
            const hasMediaDevices = !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);
            checks.push({
                name: 'Camera Web API Support',
                pass: hasMediaDevices,
                detail: hasMediaDevices ? 'getUserMedia/MediaDevices Disponible' : 'Soporte nativo/PWA no detectado',
                durationMs: 0
            });
        } catch (camErr) {
            checks.push({ name: 'Camera Web API Support', pass: false, detail: camErr.message, durationMs: 0 });
        }

        const totalTime = Math.round(performance.now() - startTotal);
        const allPassed = checks.every(c => c.pass);

        this.info('HEALTH_CHECK', `Prueba completada (${totalTime}ms). Estado: ${allPassed ? 'TODAS EXITOSAS ✅' : 'ALERTAS DETECTADAS ⚠️'}`, checks);

        return {
            ok: allPassed,
            totalTimeMs: totalTime,
            checks
        };
    }

    // --- REPORTE DE EXPORTACIÓN EN TEXTO ENRIQUECIDO ---

    generateReportText() {
        const stats = this.getStorageStats();
        const capStats = this.getCaptureStats();
        const logs = this.logs.slice(0, 100);

        let report = `==================================================\n`;
        report += ` LOGI KINETICS - ULTIMATE DIAGNOSTIC REPORT\n`;
        report += ` Fecha Generación: ${new Date().toLocaleString('es-ES')}\n`;
        report += ` User Agent: ${typeof navigator !== 'undefined' ? navigator.userAgent : 'Unknown'}\n`;
        report += `==================================================\n\n`;

        report += `--- ESTADÍSTICAS DE ALMACENAMIENTO ---\n`;
        report += `LocalStorage Usado: ${stats.localStorageKB} KB (${stats.localStorageMB} MB)\n`;
        if (stats.heap) {
            report += `JS Heap Usado: ${stats.heap.usedMB} MB / ${stats.heap.totalMB} MB (Límite: ${stats.heap.limitMB} MB)\n`;
        }
        report += `\n`;

        report += `--- ESTADÍSTICAS DE CAPTURA Y COMPRESIÓN ---\n`;
        report += `Aperturas Cámara: ${capStats.cameraOpened}\n`;
        report += `Fotos Procesadas: ${capStats.photoCaptured}\n`;
        report += `Compresiones Exitosas: ${capStats.compressionSuccess}\n`;
        report += `Tamaño Promedio Original: ${capStats.avgOriginalKB} KB\n`;
        report += `Tamaño Promedio Comprimido: ${capStats.avgCompressedKB} KB\n`;
        report += `Foto Más Grande Comprimida: ${capStats.maxCompressedKB} KB\n`;
        report += `Errores Totales Registrados: ${capStats.totalErrors}\n`;
        report += `\n`;

        report += `--- LÍNEA DE TIEMPO DE EVENTOS (Últimos ${logs.length}) ---\n`;
        logs.forEach(l => {
            const metaStr = l.meta ? ` | Meta: ${JSON.stringify(l.meta)}` : '';
            report += `[${l.timeStr}] [${l.level}] [${l.category}] ${l.message}${metaStr}\n`;
        });

        report += `\n==================================================\n`;
        report += ` FIN DEL REPORTE DE DIAGNÓSTICO\n`;
        report += `==================================================\n`;

        return report;
    }
}

export const DebugLogger = new DebugLoggerService();
