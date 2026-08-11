import { State } from '../core/state.js';
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { Capacitor } from '@capacitor/core';
import { LogiNative } from '../core/capacitor-bridge.js';
import { PortraitCardItem } from '../screens/capture/portrait/PortraitCardItem.js';
import { LandscapeCardItem } from '../screens/capture/landscape/LandscapeCardItem.js';
import { CaptureDialog } from '../screens/capture/CaptureDialog.js';
import { ItemSelector } from '../screens/capture/ItemSelector.js';
import { SpeechRecognition } from '@capacitor-community/speech-recognition';
import { ImageCompressor } from '../utils/ImageCompressor.js';
import { DebugLogger } from '../utils/DebugLogger.js';

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
        grid.oncontextmenu = (e) => {
            if (e.target.closest('.capture-card-item')) e.preventDefault();
        };

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
            }, 600); 
        };

        grid.onpointermove = (e) => {
            if (!currentId || hasMoved) return;
            const dx = Math.abs(e.clientX - startX);
            const dy = Math.abs(e.clientY - startY);
            if (dx > 10 || dy > 10) {
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
        DebugLogger.event('CAMERA', 'Iniciando captura de cámara...');
        try {
            if (!LogiNative.isNative()) {
                // PWA/Web: Usar input file nativo con capture (abre cámara del SO directamente)
                return this._pickFileNative('camera');
            }
            // Capacitor Nativo: API directa
            const photo = await Camera.getPhoto({
                quality: 75,
                resultType: CameraResultType.Base64,
                source: CameraSource.Camera
            });
            DebugLogger.info('CAMERA', `Camera.getPhoto completado. Longitud base64: ${photo.base64String?.length}`);
            if (photo.base64String) {
                await this.processImage(photo.base64String);
            } else {
                DebugLogger.warn('CAMERA', 'Camera.getPhoto retornó respuesta sin base64String');
            }
        } catch (e) {
            if (e.message && (e.message.includes('cancelled') || e.message.includes('User cancelled'))) {
                DebugLogger.info('CAMERA', 'Captura cancelada por el usuario');
            } else {
                DebugLogger.error('CAMERA', `Error en capture(): ${e.message}`, { error: e });
            }
        }
    },

    async pickFromGallery() {
        DebugLogger.event('CAMERA', 'Iniciando selección desde galería...');
        try {
            if (!LogiNative.isNative()) {
                // PWA/Web: Usar input file nativo multi-selección
                return this._pickFileNative('gallery');
            }
            // Capacitor Nativo: API directa
            const res = await Camera.pickImages({ quality: 75, limit: 20 });
            DebugLogger.info('CAMERA', `Camera.pickImages completado. Fotos seleccionadas: ${res.photos?.length || 0}`);
            if (!res.photos || res.photos.length === 0) return;

            for (const p of res.photos) {
                try {
                    const base64 = await this._readCapacitorPhoto(p);
                    if (base64) await this.processImage(base64);
                } catch (photoErr) {
                    DebugLogger.error('CAMERA', `Error procesando foto individual de galería: ${photoErr.message}`, { photoErr });
                }
            }
        } catch (e) {
            if (e.message && (e.message.includes('cancelled') || e.message.includes('User cancelled'))) {
                DebugLogger.info('CAMERA', 'Selección de galería cancelada por el usuario');
            } else {
                DebugLogger.error('CAMERA', `Error en pickFromGallery(): ${e.message}`, { error: e });
            }
        }
    },

    /**
     * Abre el selector de archivos nativo del SO (sin PWA overlay).
     * 'camera' = abre cámara directa, 'gallery' = abre galería multi-select.
     */
    _pickFileNative(mode) {
        return new Promise((resolve) => {
            const input = document.createElement('input');
            input.type = 'file';
            // image/* cubre formatos habituales; las extensiones explícitas
            // permiten seleccionar HEIC/HEIF aunque el navegador no informe MIME.
            input.accept = 'image/*,.jpg,.jpeg,.png,.webp,.gif,.avif,.heic,.heif';
            if (mode === 'camera') {
                input.capture = 'environment'; // Cámara trasera
            } else {
                input.multiple = true; // Multi-selección para galería
            }

            input.onchange = async (e) => {
                const files = Array.from(e.target.files || []);
                DebugLogger.info('CAMERA', `_pickFileNative: ${files.length} archivo(s) seleccionado(s)`);
                for (const file of files) {
                    try {
                        const compressed = await ImageCompressor.compress(file, 1400, 0.75);
                        if (compressed.base64) await this.processImage(compressed.base64, true);
                    } catch (err) {
                        DebugLogger.error('CAMERA', `Error procesando archivo nativo: ${err.message}`, { err });
                        if (ImageCompressor.isHeic(file)) {
                            alert(`No se pudo leer ${file.name}. Este HEIC usa una variante que el navegador no pudo decodificar. Exporta la foto como JPG desde Fotos/Archivos del iPhone e inténtalo de nuevo.`);
                        }
                    }
                }
                resolve();
            };
            input.oncancel = () => {
                DebugLogger.info('CAMERA', 'Selector de archivos nativo cancelado');
                resolve();
            };
            input.click();
        });
    },

    /**
     * Convierte un File/Blob a base64 puro (sin prefijo data:...).
     */
    _fileToBase64(file) {
        return new Promise((resolve) => {
            const reader = new FileReader();
            reader.onload = () => {
                const result = reader.result;
                const base64 = typeof result === 'string' ? result.split(',')[1] : null;
                resolve(base64 || null);
            };
            reader.onerror = (err) => {
                DebugLogger.error('CAMERA', `_fileToBase64 Error: ${err.message}`);
                resolve(null);
            };
            reader.readAsDataURL(file);
        });
    },

    /**
     * Lee una foto de Capacitor nativo a base64 puro.
     * Android API 33+ ya no permite fetch() sobre paths nativos.
     */
    async _readCapacitorPhoto(photo) {
        // Intento 1: path nativo via Filesystem
        if (photo.path) {
            try {
                const file = await Filesystem.readFile({ path: photo.path });
                return typeof file.data === 'string' ? file.data : null;
            } catch (nativeErr) {
                DebugLogger.warn('CAMERA', `Filesystem.readFile falló para photo.path, intentando webPath: ${nativeErr.message}`);
            }
        }

        // Intento 2: webPath con fetch
        if (photo.webPath) {
            try {
                const response = await fetch(photo.webPath);
                const blob = await response.blob();
                return this._fileToBase64(blob);
            } catch (fetchErr) {
                DebugLogger.warn('CAMERA', `fetch falló para webPath: ${fetchErr.message}`);
            }
        }

        DebugLogger.error('CAMERA', '_readCapacitorPhoto: No se pudo leer foto.', photo);
        return null;
    },

    async processImage(rawBase64, isAlreadyCompressed = false) {
        if (!rawBase64) return;
        const id = 'cap_' + Date.now() + '_' + Math.floor(Math.random() * 1000);
        const filename = id + '.jpg';
        let act = (document.getElementById('current-activity')?.innerText || 'GENERAL').trim().toUpperCase();
        if (act === 'SELECCIONAR...') act = 'GENERAL';

        DebugLogger.info('CAPTURE', `Procesando imagen ${id} para proyecto ${State.currentProject?.id || 'p_default'}...`);

        // Compresión Inteligente (maxDim = 1400px, JPEG quality = 0.75)
        let finalBase64 = rawBase64;
        let compressedSizeKB = (rawBase64.length / 1024).toFixed(1);

        if (!isAlreadyCompressed) {
            const compressed = await ImageCompressor.compress(rawBase64, 1400, 0.75);
            if (compressed.base64) {
                finalBase64 = compressed.base64;
                compressedSizeKB = compressed.compressedKB;
            }
        }

        const data = {
            id,
            descripcion: '',
            actividad: act,
            createdAt: Date.now(),
            projectId: State.currentProject?.id || 'p_default',
            filename,
            _pndate: new Date().toDateString(),
            _pnid: State._norm(State.currentProject?.id || 'p_default'),
            _pnname: State._norm(State.currentProject?.name || '')
        };

        // En PWA pedimos protección persistente desde el gesto de captura. Si
        // Chrome la rechaza, la foto se conserva pero queda una alerta visible.
        const storageProtection = await LogiNative.getStorageProtectionStatus({ request: true });
        if (!storageProtection.persistent && !LogiNative.isNative()) {
            const warned = localStorage.getItem('logi_storage_protection_warned');
            if (!warned) {
                localStorage.setItem('logi_storage_protection_warned', 'true');
                alert('Chrome no confirmó almacenamiento persistente. La foto se guardará, pero activa un respaldo en nube antes de depender de estas evidencias.');
            }
            DebugLogger.warn('STORAGE', 'Captura guardada sin protección persistente de Chrome.');
        }

        // Guardado persistente y verificado antes de crear el registro.
        const savedBlob = await LogiNative.storeBlob(filename, finalBase64);
        if (!savedBlob) {
            alert('La foto no se pudo guardar de forma segura. No se creó el registro para evitar una miniatura vacía. Inténtalo de nuevo.');
            DebugLogger.error('CAPTURE', `Fallo crítico al guardar blob ${filename}`);
            return;
        }

        const savedMeta = await LogiNative.dbPut('items_meta', data);
        if (!savedMeta) {
            await LogiNative.deleteBlob(filename);
            alert('No se pudo registrar la foto. Inténtalo de nuevo.');
            DebugLogger.error('CAPTURE', `Fallo crítico al guardar metadatos de ${id}`);
            return;
        }
        
        // Actualización de estado
        data._tempImageSrc = "data:image/jpeg;base64," + finalBase64;
        DebugLogger.event('CAPTURE', `Foto procesada y registrada: ${id} (${compressedSizeKB} KB)`);
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
                        DebugLogger.info('CLOUD', `Sincronización en nube OK para ${id}`);
                    } else {
                        DebugLogger.error('CLOUD', `Sincronización en nube falló para ${id}`);
                    }
                }).catch(err => {
                    DebugLogger.error('CLOUD', `Excepción en sincronización nube para ${id}: ${err.message}`);
                });
            }).catch(err => {
                DebugLogger.error('CLOUD', `Error al cargar SupabaseService: ${err.message}`);
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
        
        // Función interna para manejar el fallback web
        const startWebSpeech = () => {
            const SpeechRec = window.SpeechRecognition || window.webkitSpeechRecognition;
            if (!SpeechRec) {
                alert("El motor de voz no está disponible en este dispositivo o navegador.");
                return;
            }
            
            const recognition = new SpeechRec();
            recognition.lang = 'es-CO';
            recognition.interimResults = true;
            recognition.continuous = false;
            
            // Efecto visual básico en el botón de micrófono
            const micBtn = document.getElementById('btn-global-mic');
            if (micBtn) {
                micBtn.classList.add('animate-pulse', 'text-red-500');
                micBtn.classList.remove('text-primary');
            }
            
            recognition.onresult = (event) => {
                let text = "";
                for (let i = 0; i < event.results.length; i++) {
                    text += event.results[i][0].transcript;
                }
                const finalText = text.toUpperCase();
                if (this.inputDesc) this.inputDesc.value = finalText;
                this.updateDescription(finalText);
            };
            
            recognition.onerror = (e) => {
                console.error("Web Speech Error:", e);
                if (micBtn) {
                    micBtn.classList.remove('animate-pulse', 'text-red-500');
                    micBtn.classList.add('text-primary');
                }
            };
            
            recognition.onend = () => {
                if (micBtn) {
                    micBtn.classList.remove('animate-pulse', 'text-red-500');
                    micBtn.classList.add('text-primary');
                }
            };
            
            recognition.start();
        };

        try {
            if (!LogiNative.isNative()) {
                startWebSpeech();
                return;
            }

            // Capacitor nativo
            const perms = await SpeechRecognition.checkPermissions();
            if (perms.speechRecognition !== 'granted') {
                await SpeechRecognition.requestPermissions();
            }

            const avail = await SpeechRecognition.available();
            if (!avail) {
                startWebSpeech();
                return;
            }
            
            const micBtn = document.getElementById('btn-global-mic');
            if (micBtn) {
                micBtn.classList.add('animate-pulse', 'text-red-500');
                micBtn.classList.remove('text-primary');
            }

            await SpeechRecognition.start({ 
                language: 'es-CO', 
                partialResults: true,
                popup: false 
            });
            
            // Detener el pulse nativo después de 5 segundos
            setTimeout(() => {
                if (micBtn) {
                    micBtn.classList.remove('animate-pulse', 'text-red-500');
                    micBtn.classList.add('text-primary');
                }
            }, 5000);

            SpeechRecognition.addListener('partialResults', (data) => {
                if (data.matches?.length > 0) {
                    const text = data.matches[0].toUpperCase();
                    if(this.inputDesc) this.inputDesc.value = text;
                    this.updateDescription(text);
                }
            });
        } catch(e) {
            console.error("Speech Recognition error:", e);
            startWebSpeech();
        }
    },

    async shareActions() {
        const items = this.isSelectionMode 
            ? this.localItems.filter(it => this.selectedIds.has(String(it.id)))
            : (this.selectedCardId ? [this.localItems.find(i => String(i.id) === String(this.selectedCardId))].filter(Boolean) : []);

        if (items.length > 0) {
            // Loading UI feedback
            if (this.btnGlobalShare) {
                this.btnGlobalShare.innerHTML = '<span class="material-symbols-outlined text-xl animate-spin">sync</span>';
                this.btnGlobalShare.style.pointerEvents = 'none';
            }

            try {
                // v191.9-TURBO: Procesar fotos con marca de agua antes de compartir
                const processed = [];
                for (const item of items) {
                    const res = await window.ExportModule.processForShare(item);
                    if (res) processed.push(res);
                }
                if (processed.length > 0) {
                    await LogiNative.shareProcessed(processed);
                }
            } finally {
                // Restore UI
                if (this.btnGlobalShare) {
                    this.btnGlobalShare.innerHTML = '<span class="material-symbols-outlined text-xl">share</span>';
                    this.btnGlobalShare.style.pointerEvents = 'auto';
                }
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
            const item = this.localItems.find(i => String(i.id) === String(this.selectedCardId));
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
            if ((this.isSelectionMode && this.selectedIds.size > 0) || this.selectedCardId) {
                // Activo
                this.btnGlobalShare.classList.remove('text-white/30', 'bg-white/5', 'border', 'border-white/5');
                this.btnGlobalShare.classList.add('text-primary', 'bg-primary/10');
                
                // Limpiar estilos en línea en caso de que vinieran de una selección múltiple previa
                this.btnGlobalShare.style.backgroundColor = '';
                this.btnGlobalShare.style.color = '';
                this.btnGlobalShare.style.boxShadow = '';
                
                if (this.isSelectionMode) {
                    // Modo Múltiple: Fondo neón brillante completo
                    this.btnGlobalShare.style.backgroundColor = 'var(--primary)';
                    this.btnGlobalShare.style.color = '#000';
                    this.btnGlobalShare.style.boxShadow = '0 0 20px var(--primary)';
                }
            } else {
                // Apagado
                this.btnGlobalShare.style.backgroundColor = '';
                this.btnGlobalShare.style.color = '';
                this.btnGlobalShare.style.boxShadow = '';
                this.btnGlobalShare.classList.remove('text-primary', 'bg-primary/10');
                this.btnGlobalShare.classList.add('text-white/30', 'bg-white/5', 'border', 'border-white/5');
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
