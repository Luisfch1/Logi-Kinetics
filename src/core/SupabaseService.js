/**
 * SupabaseService.js
 * Integración de LOGI con Supabase para sincronización en tiempo real con CONTROL.
 */
import { createClient } from '@supabase/supabase-js';
import { LogiNative } from './capacitor-bridge.js';

class SupabaseService {
    constructor() {
        this.clients = new Map();
    }

    /**
     * Obtiene o crea un cliente de Supabase para un proyecto específico.
     */
    getClient(url, key) {
        if (!url || !key) return null;
        const cacheKey = `${url}_${key}`;
        if (!this.clients.has(cacheKey)) {
            this.clients.set(cacheKey, createClient(url, key));
        }
        return this.clients.get(cacheKey);
    }

    /**
     * Sube una imagen al storage de Supabase.
     * @param {string} localPath - Ruta o URI local de la imagen (Capacitor).
     * @param {Object} config - Configuración { supabaseUrl, supabaseKey }.
     * @returns {Promise<string>} - URL pública de la imagen.
     */
    async uploadImage(localPath, config) {
        try {
            const supabase = this.getClient(config.supabaseUrl, config.supabaseKey);
            if (!supabase) throw new Error('Supabase client not initialized');

            // 1. Obtener el archivo real desde el sistema de archivos de Capacitor
            const base64Data = await LogiNative.readBlobAsBase64(localPath);
            if (!base64Data) throw new Error('Could not read local file');

            // Convertir base64 a Blob (Remover prefijo data:image/jpeg;base64, si existe)
            const base64Content = base64Data.includes(',') ? base64Data.split(',')[1] : base64Data;
            const byteCharacters = atob(base64Content);
            const byteNumbers = new Array(byteCharacters.length);
            for (let i = 0; i < byteCharacters.length; i++) {
                byteNumbers[i] = byteCharacters.charCodeAt(i);
            }
            const byteArray = new Uint8Array(byteNumbers);
            const blob = new Blob([byteArray], { type: 'image/jpeg' });

            const fileName = `logi_${Date.now()}_${Math.random().toString(36).substring(7)}.jpg`;
            const filePath = `evidences/${fileName}`;

            // 2. Subir al Bucket 'evidences' (debe existir en Supabase)
            const { data, error } = await supabase.storage
                .from('evidences')
                .upload(filePath, blob, {
                    contentType: 'image/jpeg',
                    upsert: true
                });

            if (error) throw error;

            // 3. Obtener URL Pública
            const { data: publicUrlData } = supabase.storage
                .from('evidences')
                .getPublicUrl(filePath);

            return publicUrlData.publicUrl;
        } catch (err) {
            console.error('[SupabaseService] Upload Error:', err);
            throw err;
        }
    }

    /**
     * Inserta la metadata de la evidencia en la tabla logi_evidences.
     * @param {Object} item - Item de la metadata de Logi.
     * @param {string} publicUrl - URL pública de la imagen.
     * @param {Object} config - Configuración { supabaseUrl, supabaseKey, controlProjectId }.
     */
    async syncMetadata(item, publicUrl, config) {
        try {
            const supabase = this.getClient(config.supabaseUrl, config.supabaseKey);
            if (!supabase) throw new Error('Supabase client not initialized');

            const { error } = await supabase
                .from('logi_evidences')
                .insert([{
                    project_id: config.controlProjectId,
                    fecha: new Date(item.date || item.createdAt || Date.now()).toISOString().split('T')[0],
                    item_code: item.actividad || '',
                    description: item.descripcion || '',
                    image_url: publicUrl,
                    sync_id: item.id // Usamos el ID interno de Logi para evitar duplicados
                }]);

            if (error) {
                // Si es un error de duplicado (23505), lo ignoramos ya que significa que ya se sincronizó
                if (error.code === '23505') {
                    console.log('[SupabaseService] Item already synced.');
                    return;
                }
                throw error;
            }

            console.log('[SupabaseService] Sync Success:', item.id);
        } catch (err) {
            console.error('[SupabaseService] Metadata Sync Error:', err);
            throw err;
        }
    }

    /**
     * Sincroniza todas las evidencias de un proyecto específico.
     * includeOrphans: Si es true, también sube fotos que no tengan proyecto asignado
     * o que tengan IDs antiguos, vinculándolas al proyecto actual.
     */
    async syncEntireProject(projectId, config, includeOrphans = false) {
        if (!config || !config.supabaseUrl) return;

        const { State } = await import('./state.js');

        // Filtramos: las del proyecto + (opcionalmente) las huérfanas o de otros proyectos
        // v2026-05-02: Usar _allItems y NORMALIZAR para garantizar que vemos todas las fotos
        const nid = State._norm(projectId);
        const projectItems = State._allItems.filter(it => {
            const itemNid = it._pnid || State._norm(it.projectId);
            if (itemNid === nid) return true;
            if (includeOrphans && (!itemNid || itemNid !== nid)) return true;
            return false;
        });

        console.log(`[SupabaseService] Sincronizando: ${projectItems.length} evidencias (Migración: ${includeOrphans})`);

        let successCount = 0;
        for (const item of projectItems) {
            // v2026-05-02: Si ya está sincronizado y no estamos en modo migración, saltamos para ahorrar ancho de banda
            if (item.synced && !includeOrphans) continue;

            // Si incluimos huérfanos, actualizamos su projectId localmente
            if (includeOrphans && item.projectId !== projectId) {
                item.projectId = projectId;
                // v2026-05-02: Persistir el cambio de proyecto localmente
                await LogiNative.dbPut('items_meta', { ...item, _tempImageSrc: undefined });
            }

            const success = await this.processFullSync(item, config);
            if (success) successCount++;
        }

        // v2026-05-02: Notificar cambios globales si hubo migración
        if (includeOrphans && successCount > 0) {
            State.notify('items');
        }

        return successCount;
    }

    /**
     * Proceso completo: Subir imagen y sincronizar metadata.
     */
    async processFullSync(item, config) {
        if (!config || !config.supabaseUrl || !config.supabaseKey || !config.controlProjectId) {
            console.warn('[SupabaseService] Missing cloud configuration. Skipping sync.');
            return;
        }

        try {
            console.log('[SupabaseService] Starting full sync for:', item.id);
            const publicUrl = await this.uploadImage(item.filename, config);
            await this.syncMetadata(item, publicUrl, config);

            // v2026-05-02: Marcar como sincronizado en el estado global
            const { State } = await import('./state.js');
            await State.updateItemSyncStatus(item.id, true);

            return true;
        } catch (err) {
            console.error('[SupabaseService] Full Sync Failed:', err);
            return false;
        }
    }
}

export const SupabaseSvc = new SupabaseService();
