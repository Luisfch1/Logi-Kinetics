import { Capacitor, registerPlugin } from '@capacitor/core';
import { State } from './state.js';
import { LogiNative } from './capacitor-bridge.js';
import { DebugLogger } from '../utils/DebugLogger.js';

const DRIVE_API = 'https://www.googleapis.com/drive/v3';
const DRIVE_UPLOAD_API = 'https://www.googleapis.com/upload/drive/v3';
const FOLDER_MIME = 'application/vnd.google-apps.folder';
const GoogleAuthorization = registerPlugin('GoogleAuthorization');
const GOOGLE_IDENTITY_SRC = 'https://accounts.google.com/gsi/client';
const GOOGLE_SCOPES = 'openid email profile https://www.googleapis.com/auth/drive.file';
const WEB_CLIENT_ID_KEY = 'logi_google_web_client_id';
const DEFAULT_WEB_CLIENT_ID = '973027208876-roknun3juq30pu8h0johmq5cj0ga9gv4.apps.googleusercontent.com';

let webAuthorization = null;
let googleIdentityPromise = null;
const photoUploads = new Map();

const escapeDriveQuery = value => String(value || '').replace(/\\/g, '\\\\').replace(/'/g, "\\'");
const localDate = value => {
    const date = value ? new Date(value) : new Date();
    const pad = n => String(n).padStart(2, '0');
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
};

const dataUrlToBlob = dataUrl => {
    const [header, encoded] = String(dataUrl || '').split(',');
    const mime = header.match(/data:([^;]+)/)?.[1] || 'image/jpeg';
    const binary = atob(encoded || '');
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    return new Blob([bytes], { type: mime });
};

const loadGoogleIdentity = () => {
    if (window.google?.accounts?.oauth2) return Promise.resolve(window.google);
    if (googleIdentityPromise) return googleIdentityPromise;
    googleIdentityPromise = new Promise((resolve, reject) => {
        const existing = document.querySelector(`script[src="${GOOGLE_IDENTITY_SRC}"]`);
        const script = existing || document.createElement('script');
        const onReady = () => window.google?.accounts?.oauth2
            ? resolve(window.google)
            : reject(new Error('Google Identity Services no quedó disponible.'));
        script.addEventListener('load', onReady, { once: true });
        script.addEventListener('error', () => reject(new Error('No fue posible cargar el acceso seguro de Google. Verifique la conexión a internet.')), { once: true });
        if (!existing) {
            script.src = GOOGLE_IDENTITY_SRC;
            script.async = true;
            script.defer = true;
            document.head.appendChild(script);
        }
    }).catch(error => {
        googleIdentityPromise = null;
        throw error;
    });
    return googleIdentityPromise;
};

const fetchGoogleProfile = async accessToken => {
    try {
        const response = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
            headers: { Authorization: `Bearer ${accessToken}` }
        });
        if (!response.ok) return {};
        return await response.json();
    } catch (_) {
        return {};
    }
};

export const GoogleDriveSvc = {
    isWeb: () => !Capacitor.isNativePlatform(),

    getWebClientId() {
        return String(import.meta.env.VITE_GOOGLE_CLIENT_ID || localStorage.getItem(WEB_CLIENT_ID_KEY) || DEFAULT_WEB_CLIENT_ID).trim();
    },

    setWebClientId(clientId) {
        const value = String(clientId || '').trim();
        if (value) localStorage.setItem(WEB_CLIENT_ID_KEY, value);
        else localStorage.removeItem(WEB_CLIENT_ID_KEY);
        webAuthorization = null;
        return value;
    },

    async _authorizeWeb({ selectAccount = false, loginHint = '' } = {}) {
        const now = Date.now();
        if (!selectAccount && webAuthorization?.accessToken && webAuthorization.expiresAt > now + 60000) {
            return webAuthorization;
        }

        const clientId = this.getWebClientId();
        if (!clientId) {
            throw new Error('Falta el ID de cliente web de Google. Escríbalo en esta ventana para realizar la configuración única.');
        }
        await loadGoogleIdentity();

        const tokenResponse = await new Promise((resolve, reject) => {
            const tokenClient = window.google.accounts.oauth2.initTokenClient({
                client_id: clientId,
                scope: GOOGLE_SCOPES,
                hint: String(loginHint || '').trim() || undefined,
                callback: response => {
                    if (response?.error) reject(new Error(response.error_description || response.error));
                    else resolve(response);
                },
                error_callback: error => reject(new Error(error?.message || 'Google cerró o bloqueó la autorización.'))
            });
            tokenClient.requestAccessToken({
                prompt: selectAccount ? 'select_account consent' : '',
                hint: String(loginHint || '').trim() || undefined
            });
        });

        if (!tokenResponse?.access_token) throw new Error('Google no entregó autorización para Drive.');
        const profile = await fetchGoogleProfile(tokenResponse.access_token);
        webAuthorization = {
            accessToken: tokenResponse.access_token,
            expiresAt: Date.now() + (Number(tokenResponse.expires_in || 3600) * 1000),
            email: profile.email || '',
            displayName: profile.name || ''
        };
        return webAuthorization;
    },

    async authorize({ selectAccount = false, loginHint = State.currentProject?.googleEmail || '' } = {}) {
        if (!Capacitor.isNativePlatform()) return this._authorizeWeb({ selectAccount, loginHint });
        if (Capacitor.getPlatform() !== 'android') throw new Error('La conexión nativa con Google Drive requiere Android.');
        const result = await GoogleAuthorization.authorize({ selectAccount });
        if (!result?.accessToken) throw new Error('Google no entregó autorización para Drive.');
        return result;
    },

    async _authorizedFetch(url, options = {}, allowRetry = true) {
        const auth = await this.authorize();
        const response = await fetch(url, {
            ...options,
            headers: { ...(options.headers || {}), Authorization: `Bearer ${auth.accessToken}` }
        });
        if (response.status === 401 && allowRetry && this.isWeb()) {
            webAuthorization = null;
            await this.authorize();
            return this._authorizedFetch(url, options, false);
        }
        if (!response.ok) {
            const body = await response.text();
            let reason = body;
            try { reason = JSON.parse(body)?.error?.message || body; } catch (_) { }
            throw new Error(reason || `Google Drive respondió ${response.status}`);
        }
        return { response, auth };
    },

    async _listFiles(query) {
        const params = new URLSearchParams({
            q: query,
            spaces: 'drive',
            pageSize: '1000',
            fields: 'files(id,name,mimeType,appProperties,parents,md5Checksum,size)'
        });
        const { response } = await this._authorizedFetch(`${DRIVE_API}/files?${params}`);
        return (await response.json()).files || [];
    },

    async findInbox(controlProjectId) {
        const projectId = String(controlProjectId || '').trim();
        if (!projectId) throw new Error('Falta el ID del proyecto de CONTROL.');
        const escaped = escapeDriveQuery(projectId);
        const folders = await this._listFiles(
            `mimeType='${FOLDER_MIME}' and trashed=false and appProperties has { key='controlProjectId' and value='${escaped}' }`
        );
        return folders.find(file => file.appProperties?.controlRole === 'inbox') || null;
    },

    async connectProject(project, { selectAccount = true } = {}) {
        if (!project?.controlProjectId) throw new Error('Escriba primero el ID que tiene el proyecto en CONTROL.');
        const auth = await this.authorize({ selectAccount });
        const inbox = await this.findInbox(project.controlProjectId);
        if (!inbox) {
            throw new Error('No encontré la carpeta “Entrada Logi”. Conecte primero esta misma cuenta en CONTROL y confirme que el ID del proyecto sea correcto.');
        }
        await State.updateProjectGoogleConfig(project.id, {
            controlProjectId: project.controlProjectId,
            googleConnected: true,
            googleEmail: auth.email || project.googleEmail || '',
            driveInboxId: inbox.id
        });
        return { email: auth.email || '', inboxId: inbox.id };
    },

    async _alreadyUploaded(photoId) {
        const escaped = escapeDriveQuery(photoId);
        const files = await this._listFiles(
            `trashed=false and appProperties has { key='controlPhotoId' and value='${escaped}' }`
        );
        return files[0] || null;
    },

    async uploadPhoto(item, project = State.currentProject) {
        const key = `${project?.id}:${item?.id}`;
        const previous = photoUploads.get(key) || Promise.resolve();
        const task = previous.catch(() => undefined).then(() => this._uploadPhoto(item, project));
        photoUploads.set(key, task);
        try { return await task; }
        finally { if (photoUploads.get(key) === task) photoUploads.delete(key); }
    },

    async _uploadPhoto(item, project = State.currentProject) {
        if (!item?.id || !item?.filename || !project?.googleConnected || !project?.controlProjectId) return false;
        const sentDescription = item.descripcion || '';
        const sentActivity = item.actividad || '';
        const description = JSON.stringify({
            id: item.id,
            date: localDate(item.createdAt),
            itemCode: sentActivity,
            description: sentDescription,
            originalFileName: item.filename
        });
        const existing = await this._alreadyUploaded(item.id);
        if (existing) {
            await this._authorizedFetch(`${DRIVE_API}/files/${encodeURIComponent(existing.id)}?fields=id`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ description, appProperties: { itemCode: String(sentActivity).slice(0, 120) } })
            });
            await State.updateItemSyncStatus(item.id, item.descripcion === sentDescription && item.actividad === sentActivity);
            return true;
        }

        let inboxId = project.driveInboxId;
        if (!inboxId) {
            const inbox = await this.findInbox(project.controlProjectId);
            inboxId = inbox?.id;
        }
        if (!inboxId) throw new Error('No se encontró la carpeta de entrada del proyecto en Drive.');

        const dataUrl = await LogiNative.readBlobAsBase64(item.filename);
        if (!dataUrl) throw new Error(`La fotografía ${item.filename} no está disponible en el dispositivo.`);
        const blob = dataUrlToBlob(dataUrl);
        const metadata = {
            name: `${item.id}.jpg`,
            parents: [inboxId],
            description,
            appProperties: {
                controlProjectId: String(project.controlProjectId),
                controlPhotoId: String(item.id),
                photoDate: localDate(item.createdAt),
                itemCode: String(sentActivity).slice(0, 120)
            }
        };
        const form = new FormData();
        form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
        form.append('file', blob, `${item.id}.jpg`);
        await this._authorizedFetch(`${DRIVE_UPLOAD_API}/files?uploadType=multipart&fields=id,md5Checksum,size`, {
            method: 'POST',
            body: form
        });
        await State.updateItemSyncStatus(item.id, (item.descripcion || '') === sentDescription && (item.actividad || '') === sentActivity);
        DebugLogger.event('CLOUD', `Foto enviada a Google Drive: ${item.id}`);
        return true;
    },

    async syncProject(projectId, onProgress = null) {
        const project = State.projects.find(entry => entry.id === projectId);
        if (!project) throw new Error('Proyecto no encontrado.');
        if (!project.googleConnected) await this.connectProject(project);
        const normalizedId = State._norm(projectId);
        const items = State._allItems.filter(item => (item._pnid || State._norm(item.projectId)) === normalizedId);
        let uploaded = 0;
        let skipped = 0;
        const failures = [];
        for (let index = 0; index < items.length; index++) {
            const item = items[index];
            try {
                // Revisar también metadatos de fotos enviadas por versiones anteriores.
                const wasSynced = item.synced;
                if (await this.uploadPhoto(item, project)) {
                    if (wasSynced) skipped++;
                    else uploaded++;
                }
            } catch (error) {
                failures.push({ id: item.id, error: error.message || String(error) });
                DebugLogger.error('CLOUD', `No se pudo enviar ${item.id}: ${error.message}`, { error });
            }
            onProgress?.({ current: index + 1, total: items.length, uploaded, skipped, failures: failures.length });
        }
        await State.updateProjectGoogleConfig(projectId, {
            ...project,
            googleConnected: true,
            lastDriveSyncAt: new Date().toISOString()
        });
        return { total: items.length, uploaded, skipped, failures };
    },

    async queuePhoto(item) {
        const project = State.projects.find(entry => entry.id === item.projectId) || State.currentProject;
        if (!project?.googleConnected) return;
        try {
            await this.uploadPhoto(item, project);
        } catch (error) {
            DebugLogger.warn('CLOUD', `Foto ${item.id} quedó pendiente para Drive: ${error.message}`);
        }
    }
};
