import { State } from '../core/state.js';
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';
import { LogiNative } from '../core/capacitor-bridge.js';
import { PortraitCardItem } from '../screens/capture/portrait/PortraitCardItem.js';
import { LandscapeCardItem } from '../screens/capture/landscape/LandscapeCardItem.js';
import { CaptureDialog } from '../screens/capture/CaptureDialog.js';
import { ItemSelector } from '../screens/capture/ItemSelector.js';
import { SpeechRecognition } from '@capacitor-community/speech-recognition';

export const CaptureCtrl = {
    selectedCardId: null,
    localItems: [],
    isInitialized: false,
    isLandscape: false,
    isSelectionMode: false,
    selectedIds: new Set(),
    captureDate: new Date(),
    isLongPress: false,
    syncTimer: null,
    renderBatchId: 0,

    async init(isLandscape = false) {
        this.isLandscape = isLandscape;
        this.rebind();
        
        if (!this.isInitialized) {
            // v191.9-ULTRA: Suscripción reactiva para mostrar fotos nuevas inmediatamente
            State.subscribe((state, changeType) => {
                console.log(`[CaptureModule] State Change: ${changeType} | Tab: ${State.currentTab}`);
                if (changeType === 'items' || changeType === 'item_added' || changeType === 'item_removed' || changeType === 'project') {
                    this.syncWithState();
                }
            });

            State.subscribe((state, type) => {
                if (type === 'color') return;
                // v191.9-FIX: Usar State.currentTab directamente
                if (State.currentTab === 'capture') {
                    this.syncWithState();
                }
            });
            this.isInitialized = true;
        }

        console.log(">>> CAPTURE MODULE v191.9-ULTRA AKTIVADO <<<");

        await this.syncWithState();
        this.updateActionCardUI();
    },

    async syncWithState() {
        if (this.syncTimer) clearTimeout(this.syncTimer);
        this.syncTimer = setTimeout(async () => {
            const day = this.captureDate.toDateString();
            
            // OPTIMIZACIÓN TITÁN (v189.3): Comparación robusta por fecha (v191.9-TITAN-X)
            this.localItems = (State.items || []).filter(it => {
                try {
                    return new Date(it.createdAt).toDateString() === day;
                } catch(e) { return false; }
            });
            
            // Actualizar UI de Fecha
            const displayDate = document.getElementById('display-capture-date');
            const inputDate = document.getElementById('input-capture-date');
            if (displayDate) {
                const today = new Date().toDateString();
                let label = this.captureDate.toLocaleDateString('es-ES', { day: 'numeric', month: 'long' });
                if (day === today) label = 'HOY, ' + label;
                displayDate.innerText = label.toUpperCase();
            }
            if (inputDate) inputDate.value = this.captureDate.toISOString().split('T')[0];

            // Renderizado Incremental para máxima fluidez
            this.renderMemoryGridIncremental();
        }, 150); // DEBOUNCE DE 150ms
    },

    async renderMemoryGridIncremental() {
        this.grid = document.getElementById('recent-captures'); // v191.9-FIX (STALE-DOM-KILLER)
        if (!this.grid) return;

        this.grid.innerHTML = '';
        const visible = this.localItems.slice(0, 40);
        
        // Fase 1: Los primeros 10 items inmediatamente
        const firstBatch = visible.slice(0, 10);
        this._renderBatchToDOM(firstBatch);
        this.loadThumbnailsBatch(firstBatch);

        // Fase 2: El resto en el siguiente frame libre
        if (visible.length > 10) {
            setTimeout(() => {
                const secondBatch = visible.slice(10);
                this._renderBatchToDOM(secondBatch);
                this.loadThumbnailsBatch(secondBatch);
            }, 300);
        }
    },

    _renderBatchToDOM(batch) {
        batch.forEach(item => {
            const isSelected = this.isSelectionMode ? this.selectedIds.has(item.id) : this.selectedCardId === item.id;
            const card = this.isLandscape ? 
                LandscapeCardItem.render(item, this.isSelectionMode, isSelected) :
                PortraitCardItem.render(item, this.isSelectionMode, isSelected);
            this.grid.insertAdjacentHTML('beforeend', card);
        });
    },

    async loadThumbnailsBatch(items) {
        const currentBatchId = ++this.renderBatchId;
        const batchSize = 6;
        for (let i = 0; i < items.length; i += batchSize) {
            if (currentBatchId !== this.renderBatchId) break;
            const batch = items.slice(i, i + batchSize);
            await Promise.all(batch.map(item => this.loadThumbnailAsinc(item)));
            await new Promise(r => setTimeout(r, 60));
        }
    },

    async loadThumbnailAsinc(item) {
        if (!item.filename) return;
        if (item._tempImageSrc && item._tempImageSrc.startsWith('data:')) return;
        const uri = await LogiNative.getBlobUri(item.filename);
        if (uri) {
            item._tempImageSrc = uri;
            const imgEl = document.getElementById(`img-${item.id}`);
            if (imgEl) {
                imgEl.src = uri;
                imgEl.style.opacity = '1';
            }
        }
    },

    rebind() {
        this.btnCapture = document.getElementById('btn-capture');
        this.btnGallery = document.getElementById('btn-gallery');
        this.inputDesc = document.getElementById('input-desc');
        this.btnMic = document.getElementById('btn-mic');
        this.btnActivity = document.getElementById('btn-activity-selector');
        this.btnGlobalShare = document.getElementById('btn-global-share');
        const inputDate = document.getElementById('input-capture-date');

        if (this.btnCapture) this.btnCapture.onclick = () => this.capture();
        if (this.btnGallery) this.btnGallery.onclick = () => this.pickFromGallery();
        if (this.btnMic) this.btnMic.onclick = () => this.startVoiceDictation();
        if (this.btnActivity) this.btnActivity.onclick = () => this.openItemSelector();
        if (this.btnGlobalShare) this.btnGlobalShare.onclick = () => this.shareActions();
        
        if (inputDate) {
            inputDate.onchange = (e) => {
                this.captureDate = new Date(e.target.value + 'T12:00:00');
                this.syncWithState();
            };
        }

        if (this.inputDesc) {
            this.inputDesc.oninput = (e) => {
                if(this.selectedCardId) this.updateDescription(e.target.value.toUpperCase());
            };
        }

        this.bindCardEvents();
    },

    bindCardEvents() {
        const grid = document.getElementById('recent-captures');
        if (!grid) return;

        // Limpiar listeners previos para evitar fugas/duplicados
        grid.onpointerdown = null;
        grid.onpointermove = null;
        grid.onpointerup = null;
        grid.onpointercancel = null;
        grid.oncontextmenu = (e) => e.preventDefault();

        let timer = null;
        let isLong = false;
        let hasMoved = false;
        let startX = 0, startY = 0;
        let currentId = null;

        grid.onpointerdown = (e) => {
            const card = e.target.closest('.capture-card-item');
            if (!card) return;
            
            // Si es el botón de borrar, no iniciamos el timer de selección
            if (e.target.closest('.btn-delete-card')) return;

            currentId = card.dataset.id;
            isLong = false;
            hasMoved = false;
            startX = e.clientX;
            startY = e.clientY;

            timer = setTimeout(() => {
                if (hasMoved) return;
                isLong = true;
                this.activateSelectionMode(currentId);
            }, 450); 
        };

        grid.onpointermove = (e) => {
            if (!currentId || hasMoved) return;
            const dx = Math.abs(e.clientX - startX);
            const dy = Math.abs(e.clientY - startY);
            if (dx > 15 || dy > 15) {
                hasMoved = true;
                clearTimeout(timer);
            }
        };

        grid.onpointerup = (e) => {
            clearTimeout(timer);
            if (currentId && !isLong && !hasMoved) {
                const btnDel = e.target.closest('.btn-delete-card');
                if (btnDel) {
                    this.deleteCapture(btnDel.dataset.id, btnDel.dataset.filename);
                } else {
                    this.handleCardClick(currentId);
                }
            }
            currentId = null;
        };

        grid.onpointercancel = () => {
            clearTimeout(timer);
            currentId = null;
        };
    },

    async capture() {
        try {
            const photo = await Camera.getPhoto({
                quality: 60,
                resultType: CameraResultType.Base64,
                source: CameraSource.Camera
            });
            await this.processImage(photo.base64String);
        } catch (e) {}
    },

    async pickFromGallery() {
        try {
            const res = await Camera.pickImages({ quality: 60, limit: 20 });
            for (const p of res.photos) {
                const base64 = await this.readAsBase64(p.webPath);
                await this.processImage(base64);
            }
        } catch (e) {}
    },

    async readAsBase64(path) {
        const res = await fetch(path);
        const b = await res.blob();
        return new Promise(r => {
            const reader = new FileReader();
            reader.onload = () => r(reader.result.split(',')[1]);
            reader.readAsDataURL(b);
        });
    },

    async processImage(base64) {
        const id = 'cap_' + Date.now();
        const filename = id + '.jpg';
        let act = (document.getElementById('current-activity')?.innerText || 'GENERAL').trim().toUpperCase();
        if (act === 'SELECCIONAR...') act = 'GENERAL';

        const data = {
            id,
            descripcion: '',
            actividad: act,
            createdAt: Date.now(),
            projectId: State.currentProject?.id || 'p_default',
            filename,
            _pndate: new Date().toDateString(), // v191.9-OMNIVERSO: Visibilidad inmediata
            _pnid: State._norm(State.currentProject?.id || 'p_default'), // v191.9-ULTRA: Fix filtrado
            _pnname: State._norm(State.currentProject?.name || '') // v191.9-ULTRA: Fix filtrado
        };

        // Guardado persistente
        await LogiNative.storeBlob(filename, base64);
        await LogiNative.dbPut('items_meta', data);
        
        // Actualización de estado (el suscriptor llamará a syncWithState)
        data._tempImageSrc = "data:image/jpeg;base64," + base64;
        console.log(`[CaptureModule] Processing Captured Image: ${id} for Project: ${data.projectId}`);
        State.addItem(data);
        this.selectedCardId = id;

        // --- CLOUD SYNC BRIDGE (v2026-05-02) ---
        if (State.currentProject?.supabaseUrl) {
            import('../core/SupabaseService.js').then(({ SupabaseSvc }) => {
                SupabaseSvc.processFullSync(data, {
                    supabaseUrl: State.currentProject.supabaseUrl,
                    supabaseKey: State.currentProject.supabaseKey,
                    controlProjectId: State.currentProject.controlProjectId
                }).then(success => {
                    if (success) {
                        console.log(`[CaptureModule] Cloud Sync Completed for ${id}`);
                    } else {
                        console.error(`[CaptureModule] Cloud Sync Failed for ${id}`);
                    }
                }).catch(err => {
                    console.error(`[CaptureModule] Cloud Sync Exception for ${id}:`, err);
                });
            }).catch(err => {
                console.error(`[CaptureModule] Failed to load SupabaseService:`, err);
            });
        }
    },

    async deleteCapture(id, filename) {
        CaptureDialog.show("¿Eliminar fotografía técnica?", async () => {
            State.removeItem(id);
            await LogiNative.dbDelete('items_meta', id);
            await LogiNative.deleteBlob(filename);
        });
    },

    handleCardClick(id) {
        if(this.isSelectionMode) {
            if(this.selectedIds.has(id)) {
                this.selectedIds.delete(id);
                if(this.selectedIds.size === 0) this.isSelectionMode = false;
            } else {
                this.selectedIds.add(id);
            }
            this.renderMemoryGrid();
            this.updateActionCardUI();
        } else {
            this.selectCard(id);
        }
    },

    selectCard(id) {
        this.selectedCardId = id;
        const item = this.localItems.find(i => i.id === id);
        if(this.inputDesc && item) this.inputDesc.value = item.descripcion || '';
        this.renderMemoryGrid();
        this.updateActionCardUI();
    },

    activateSelectionMode(id) {
        if (this.isSelectionMode) return;
        if (navigator.vibrate) navigator.vibrate([100, 50, 100]);
        this.isSelectionMode = true;
        this.selectedIds.clear();
        this.selectedIds.add(id);
        this.renderMemoryGrid();
        this.updateActionCardUI();
    },

    openItemSelector() {
        if (!this.selectedCardId) return alert("Selecciona una foto para asignarle un ítem.");
        const cur = this.localItems.find(i => i.id === this.selectedCardId);
        ItemSelector.show(cur?.actividad, (sel) => this.handleItemSelection(sel));
    },

    async handleItemSelection(selCode) {
        if (!this.selectedCardId) return;
        await State.updateItemActivity(this.selectedCardId, selCode);
        
        // Actualización local para feedback inmediato
        const item = this.localItems.find(i => i.id === this.selectedCardId);
        if (item) item.actividad = selCode;
        
        this.updateActionCardUI();
        this.renderMemoryGrid();
    },

    async updateDescription(text) {
        if (!this.selectedCardId) return;
        const item = this.localItems.find(i => i.id === this.selectedCardId);
        if (item) item.descripcion = text;
        await State.updateItemDescription(this.selectedCardId, text);
    },

    async startVoiceDictation() {
        if (!this.selectedCardId) return;
        try {
            // v191.9-ULTRA: Asegurar permisos antes de verificar disponibilidad
            const perms = await SpeechRecognition.checkPermissions();
            if (perms.speechRecognition !== 'granted') {
                await SpeechRecognition.requestPermissions();
            }

            const avail = await SpeechRecognition.available();
            if(!avail) {
                const m = prompt("DICTADO MANUAL (Motor de voz no disponible):", "");
                if(m) this.updateDescription(m.toUpperCase());
                return;
            }
            await SpeechRecognition.start({ language: 'es-CO', partialResults: true });
            SpeechRecognition.addListener('partialResults', (data) => {
                if (data.matches?.length > 0) {
                    const text = data.matches[0].toUpperCase();
                    if(this.inputDesc) this.inputDesc.value = text;
                    this.updateDescription(text);
                }
            });
        } catch(e) {
            const m = prompt("DICTADO MANUAL:", "");
            if(m) this.updateDescription(m.toUpperCase());
        }
    },

    async shareActions() {
        const items = this.isSelectionMode 
            ? this.localItems.filter(it => this.selectedIds.has(it.id))
            : (this.selectedCardId ? [this.localItems.find(i => i.id === this.selectedCardId)].filter(Boolean) : []);

        if (items.length > 0) {
            // v191.9-TURBO: Procesar fotos con marca de agua antes de compartir
            const processed = [];
            for (const item of items) {
                const res = await window.ExportModule.processForShare(item);
                if (res) processed.push(res);
            }
            if (processed.length > 0) {
                await LogiNative.shareProcessed(processed);
            }
        }

        if (this.isSelectionMode) {
            this.isSelectionMode = false;
            this.renderBatchId = 0;
            this.selectedIds.clear();
        }
        this.syncWithState();
    },

    updateActionCardUI() {
        const label = document.getElementById('current-activity');
        if (label) {
            const item = this.localItems.find(i => i.id === this.selectedCardId);
            label.innerText = (item ? item.actividad : 'SELECCIONAR...').toUpperCase();
            label.classList.toggle('text-white/20', !item);
            label.classList.toggle('text-white/90', !!item);
        }

        // --- RESTAURAR ICONO DE CÁMARA (NO SECUESTRAR) ---
        if (this.btnCapture) {
            const icon = this.btnCapture.querySelector('.material-symbols-outlined');
            if (icon) icon.innerText = 'photo_camera';
        }

        // --- RESALTAR COMPARTIR SI HAY SELECCIÓN (HYPER-HIGHLIGHT) ---
        if (this.btnGlobalShare) {
            if (this.isSelectionMode && this.selectedIds.size > 0) {
                this.btnGlobalShare.style.backgroundColor = 'var(--primary)';
                this.btnGlobalShare.style.color = '#000';
                this.btnGlobalShare.style.boxShadow = '0 0 20px var(--primary)';
                this.btnGlobalShare.style.opacity = '1';
                this.btnGlobalShare.classList.remove('text-white/30');
            } else {
                this.btnGlobalShare.style.backgroundColor = '';
                this.btnGlobalShare.style.color = '';
                this.btnGlobalShare.style.boxShadow = '';
                this.btnGlobalShare.style.opacity = '';
                this.btnGlobalShare.classList.add('text-white/30');
            }
        }
    },

    renderMemoryGrid() {
        const grid = document.getElementById('recent-captures');
        if (!grid) return;
        const renderer = this.isLandscape ? LandscapeCardItem : PortraitCardItem;
        // Limitación de renderizado inicial (Anti-Freeze)
        const gridItems = this.localItems.slice(0, 40);
        console.log(`[CaptureModule] Rendering ${gridItems.length} of ${this.localItems.length} items`);
        
        grid.innerHTML = gridItems.length > 0 
            ? gridItems.map(item => {
                const isSelected = this.isSelectionMode ? this.selectedIds.has(item.id) : this.selectedCardId === item.id;
                return renderer.render(item, this.isSelectionMode, isSelected);
              }).join('')
            : `<div class="col-span-full py-20 text-center text-white/20 uppercase font-headline font-bold text-[8px] tracking-[0.3em]">Sin capturas recientes</div>`;

        if (gridItems.length > 0) {
            this.loadThumbnailsBatch(gridItems);
        }
    }
};
