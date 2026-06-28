/**
 * GalleryController.js (Nexus Shield v179)
 * Definitive High-Performance Gallery Engine.
 * Optimized for 500+ items with incremental rendering and debouncing.
 */
import { State } from '../core/state.js';
import { LogiNative } from '../core/capacitor-bridge.js';
import { GalleryCardItem } from '../screens/gallery/GalleryCardItem.js';
import { GalleryEditOverlay } from '../screens/gallery/GalleryEditOverlay.js';
import { ItemSelector } from '../screens/capture/ItemSelector.js';
import { CaptureDialog } from '../screens/capture/CaptureDialog.js';
import { ExportModule } from './ExportController.js';
class GalleryController {
    constructor() {
        this.filterText = '';
        this.container = null;
        this.dateRangeEl = null;
        this.selectionBar = null;
        this.selectionCountEl = null;
        this.isInitialized = false;
        this.isSelectionMode = false;
        this.selectedIds = new Set();
        this.renderBatchId = 0;
        this.renderTimer = null;
        this.lastDate = null; // Trackeo de Sticky Headers
    }

    async init() {
        this.container = document.getElementById('gallery-content');
        this.dateRangeEl = document.getElementById('gallery-date-range');
        this.selectionBar = document.getElementById('gallery-selection-bar');
        this.selectionCountEl = document.getElementById('selection-count');

        // v193.2-OAK: Gestión de Botón de Cuadrícula (Header)
        const btnToggle = document.getElementById('btn-gallery-grid-toggle');
        if (btnToggle) {
            btnToggle.classList.remove('hidden');
            btnToggle.onclick = () => {
                const newCols = State.galleryCols === 2 ? 3 : 2;
                State.setGalleryCols(newCols);
            };
            this.updateToggleIcon();
        }

        if (!this.isInitialized) {
            State.subscribe((state, changeType) => {
                if (changeType === 'color') return;
                if (changeType === 'gallery_cols') {
                    this.updateToggleIcon();
                    this.render();
                    return;
                }
                if (State.currentTab === 'gallery') this.render();
            });
            this.isInitialized = true;
        }

        const searchInput = document.getElementById('gallery-search');
        if (searchInput) {
            searchInput.value = this.filterText;
            searchInput.oninput = (e) => {
                this.filterText = e.target.value.toUpperCase();
                this.render();
            };
        }

        this.render();
        this.updateSelectionUI();
    }

    destroy() {
        // v193.2-OAK: Limpiar botón global al salir de la pantalla
        const btnToggle = document.getElementById('btn-gallery-grid-toggle');
        if (btnToggle) btnToggle.classList.add('hidden');
    }

    updateToggleIcon() {
        const icon = document.getElementById('grid-toggle-icon');
        if (icon) {
            icon.innerText = State.galleryCols === 2 ? 'grid_view' : 'apps';
        }
    }

    async render() {
        if (!this.container) return;
        if (this.renderTimer) clearTimeout(this.renderTimer);

        // DEBOUNCE: Evita re-renders masivos al arrancar el App
        this.renderTimer = setTimeout(() => {
            this._executeIncrementalRender();
        }, 150);
    }

    _executeIncrementalRender() {
        if (!this.container) return;
        
        // v193.3-OAK: Aplicar clases de cuadrícula dinámica y gap
        const cols = State.galleryCols || 2;
        this.container.classList.remove('grid-cols-2', 'grid-cols-3', 'gap-4', 'gap-2');
        this.container.classList.add(`grid-cols-${cols}`, cols === 3 ? 'gap-2' : 'gap-4');
        this.container.style.gridTemplateColumns = `repeat(${cols}, 1fr)`;

        this.container.innerHTML = '';
        this.renderBatchId++;
        this.lastDate = null; // Reset de fecha al iniciar render completo
        const currentBatch = this.renderBatchId;

        let filtered = State.items || [];
        
        // v193.4: Ordenado descendente crítico por fecha para Sticky Headers
        filtered.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));

        if (this.filterText) {
            filtered = filtered.filter(it => 
                (it.descripcion || '').toUpperCase().includes(this.filterText) ||
                (it.actividad || '').toUpperCase().includes(this.filterText)
            );
        }

        if (filtered.length === 0) {
            this.container.innerHTML = `
                <div class="empty-state" style="opacity: 0.2; text-align: center; padding-top: 100px;">
                    <span class="material-symbols-outlined" style="font-size: 48px;">search_off</span>
                    <p>SIN CAPTURAS REGISTRADAS</p>
                </div>
            `;
            return;
        }

        this.updateDateRange(filtered);
        this.bindCardEvents();

        // Fase 1: Los primeros 12 items (Instantáneo)
        const batch1 = filtered.slice(0, 12);
        this._renderBatchToDOM(batch1);

        // Fase 2: El resto en lotes de 50 para no congelar el UI (v191.9-OMEGA)
        if (filtered.length > 12) {
            setTimeout(() => {
                if (currentBatch !== this.renderBatchId) return;
                const rest = filtered.slice(12);
                this._renderLargeBatch(rest, currentBatch);
            }, 300);
        }
    }

    _renderLargeBatch(items, batchId) {
        const size = 50;
        let pos = 0;

        const next = () => {
            if (batchId !== this.renderBatchId) return;
            if (pos >= items.length) return;

            const chunk = items.slice(pos, pos + size);
            this._renderBatchToDOM(chunk);
            pos += size;

            if (pos < items.length) {
                setTimeout(next, 50); // Pausa para el thread principal
            }
        };
        next();
    }

    _renderBatchToDOM(items) {
        const cols = State.galleryCols || 2;
        items.forEach(item => {
            // Lógica de Títulos de Fecha (Sticky)
            const dateObj = new Date(item.createdAt || Date.now());
            const dateStr = dateObj.toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' }).toUpperCase();
            
            if (dateStr !== this.lastDate) {
                this._renderDateHeader(dateStr);
                this.lastDate = dateStr;
            }

            const card = GalleryCardItem.render(item, this.isSelectionMode, this.selectedIds.has(item.id), cols);
            if (this.container) this.container.insertAdjacentHTML('beforeend', card);
            this.loadThumbnail(item);
        });
    }

    _renderDateHeader(date) {
        if (!this.container) return;
        const headerHtml = `
            <div class="gallery-date-header sticky top-0 z-40 col-span-full py-3 px-2 -mx-2 mb-2 backdrop-blur-xl transition-all duration-300">
                <div class="flex items-center gap-3">
                    <div class="h-px flex-1 bg-white/5"></div>
                    <span class="font-headline font-black text-[10px] text-white/40 tracking-[0.3em] italic uppercase">
                        ${date}
                    </span>
                    <div class="h-px flex-1 bg-white/5"></div>
                </div>
            </div>
        `;
        this.container.insertAdjacentHTML('beforeend', headerHtml);
    }

    async loadThumbnail(item) {
        if (!item.filename) return;
        const uri = await LogiNative.getBlobUri(item.filename);
        if (uri) {
            const img = document.getElementById(`gal-img-${item.id}`);
            if (img) img.src = uri;
        }
    }

    bindCardEvents() {
        if (!this.container) return;
        
        let startX, startY;
        let pressTimer;
        let isLongPress = false;

        this.container.onpointerdown = (e) => {
            const card = e.target.closest('.gallery-card-item');
            if (!card) return;

            startX = e.clientX;
            startY = e.clientY;
            isLongPress = false;

            pressTimer = setTimeout(() => {
                isLongPress = true;
                if (navigator.vibrate) navigator.vibrate(50);
                this.isSelectionMode = true;
                this.toggleSelection(card.dataset.id);
            }, 500);
        };

        this.container.onpointermove = (e) => {
            if (Math.abs(e.clientX - startX) > 10 || Math.abs(e.clientY - startY) > 10) {
                clearTimeout(pressTimer);
            }
        };

        this.container.onpointerup = (e) => {
            clearTimeout(pressTimer);
            if (isLongPress) return;

            const diffX = Math.abs(e.clientX - startX);
            const diffY = Math.abs(e.clientY - startY);
            
            // Si se movió más de 25px, es un scroll, no un click (Refinamiento PREMIUM)
            if (diffX > 25 || diffY > 25) return;

            // Ignorar clics en botones de acción
            if (e.target.closest('.action-btn')) return;

            const card = e.target.closest('.gallery-card-item');
            if (!card) {
                if (this.isSelectionMode) {
                    this.cancelSelection();
                }
                return;
            }
            const id = card.dataset.id;
            
            if (this.isSelectionMode) {
                this.toggleSelection(id);
            } else {
                this.openEditOverlay(id);
            }
        };
    }

    async openEditOverlay(id) {
        const item = State.items.find(i => String(i.id) === String(id));
        if (!item) return;

        GalleryEditOverlay.show(item, {
            onClose: async (newDesc) => {
                if (newDesc !== item.descripcion) {
                    await State.updateItemDescription(item.id, newDesc);
                    this.refreshCard(id);
                }
            },
            onShare: () => this.shareItem(id),
            onSelectItem: () => {
                ItemSelector.show(item.actividad, async (newAct) => {
                    await State.updateItemActivity(item.id, newAct);
                    GalleryEditOverlay.updateActivity(newAct);
                    this.refreshCard(id);
                });
            }
        });
    }

    toggleSelection(id) {
        if (this.selectedIds.has(id)) this.selectedIds.delete(id);
        else this.selectedIds.add(id);

        if (this.selectedIds.size === 0) this.isSelectionMode = false;
        this.updateSelectionUI();
        this.render();
    }

    updateSelectionUI() {
        if (!this.selectionBar) return;
        if (this.isSelectionMode) {
            this.selectionBar.classList.add('active');
            if (this.selectionCountEl) this.selectionCountEl.innerText = `${this.selectedIds.size} SELECCIONADAS`;
        } else {
            this.selectionBar.classList.remove('active');
            // NO limpiamos los IDs aquí preventivamente si queremos que la animación termine, 
            // pero el usuario pidió que se desseleccione todo al tocar fuera.
        }
    }

    cancelSelection() {
        this.isSelectionMode = false;
        this.selectedIds.clear();
        this.updateSelectionUI();
        this.render();
    }

    updateDateRange(items) {
        if (!this.dateRangeEl) return;
        const dates = items.map(i => i.createdAt).filter(d => !!d);
        if (dates.length === 0) {
            this.dateRangeEl.textContent = 'PROYECTO VACÍO';
            return;
        }
        const min = new Date(Math.min(...dates));
        const max = new Date(Math.max(...dates));
        const fmt = (d) => d.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' }).toUpperCase();
        this.dateRangeEl.textContent = min.toDateString() === max.toDateString() ? fmt(min) : `${fmt(min)} — ${fmt(max)}`;
    }

    async shareItem(id) {
        const item = State.items.find(i => i.id === id);
        if (!item) return;
        
        // v191.9-TURBO: Procesar con marca de agua antes de enviar a WhatsApp
        const res = await window.ExportModule.processForShare(item);
        if (res) {
            await LogiNative.shareProcessed([res]);
        }
    }

    cancelSelection() {
        this.isSelectionMode = false;
        this.selectedIds.clear();
        this.updateSelectionUI();
        this.render();
    }

    async bulkShare() {
        if (this.selectedIds.size === 0) return;
        const items = State.items.filter(it => this.selectedIds.has(String(it.id)));
        
        // v191.9-TURBO: Procesar lote con marca de agua
        const processed = [];
        for (const item of items) {
            const res = await window.ExportModule.processForShare(item);
            if (res) processed.push(res);
        }
        
        if (processed.length > 0) {
            await LogiNative.shareProcessed(processed);
        }
    }

    async bulkDelete() {
        if (this.selectedIds.size === 0) return;
        const count = this.selectedIds.size;
        CaptureDialog.show(`¿ELIMINAR ${count} CAPTURAS DEFINITIVAMENTE?`, async () => {
            for (const id of this.selectedIds) {
                const item = State.items.find(i => String(i.id) === String(id));
                if (item) {
                    await LogiNative.dbDelete('items_meta', id);
                    await LogiNative.deleteBlob(item.filename);
                    State.removeItem(id);
                }
            }
            this.cancelSelection();
        });
    }

    refreshCard(id) {
        if (!this.container) return;
        const cardEl = this.container.querySelector(`.gallery-card-item[data-id="${id}"]`);
        if (!cardEl) return;
        
        const item = State.items.find(it => String(it.id) === String(id));
        if (!item) return;

        // Re-renderizado atómico de la pieza
        const temp = document.createElement('div');
        temp.innerHTML = GalleryCardItem.render(item, this.isSelectionMode, this.selectedIds.has(id), State.galleryCols);
        const newCard = temp.firstElementChild;
        
        if (newCard) {
            cardEl.replaceWith(newCard);
            // Sincronizar thumbnail si ya existe el blob URI
            if (item._tempImageSrc) {
                const img = newCard.querySelector(`#gal-img-${id}`);
                if (img) img.src = item._tempImageSrc;
            }
        }
    }
}

export const GalleryModule = new GalleryController();
window.GalleryController = GalleryModule;
