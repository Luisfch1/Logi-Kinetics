/**
 * GalleryEditOverlay.js (Nexus Shield v180)
 * Overlay de Edición Rápida para la Galería.
 * - Diseño Premium con Glassmorphism.
 * - Integración con State y ItemSelector.
 */
import { LogiNative } from '../../core/capacitor-bridge.js';

export const GalleryEditOverlay = {
    overlay: null,
    activeItem: null,
    onSave: null,

    show(item, callbacks) {
        this.activeItem = item;
        this.onSave = callbacks.onSave;
        
        this.hide(); // Limpiar si existe (sin esperar al timeout de remoción)
        const old = document.getElementById('gallery-edit-overlay');
        if (old) old.remove();

        this.overlay = document.createElement('div');
        this.overlay.id = 'gallery-edit-overlay';
        this.overlay.className = 'fixed inset-0 z-[150] flex flex-col bg-black/90 backdrop-blur-xl animate-in fade-in duration-300';
        
        this.overlay.innerHTML = `
            <!-- HEADER: FECHA Y BOTÓN CERRAR -->
            <div class="px-8 pt-10 flex justify-between items-start z-20">
                <div class="flex flex-col">
                    <span class="text-[7px] text-white/40 font-black uppercase tracking-[0.3em] mb-1">FECHA CAPTURA</span>
                    <span class="font-headline font-black text-[11px] text-white/90 uppercase tracking-widest italic">
                        ${new Date(item.createdAt || Date.now()).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </span>
                </div>
                <button id="edit-btn-close" class="w-12 h-12 rounded-2xl bg-primary flex items-center justify-center text-black active:scale-95 transition-all shadow-neon">
                    <span class="material-symbols-outlined text-2xl font-black">done</span>
                </button>
            </div>

            <!-- CENTRAL: IMAGEN Y DESCRIPCIÓN -->
            <div class="flex-1 flex flex-col items-center justify-center p-6 space-y-6 overflow-hidden">
                <div class="relative w-full max-h-[50vh] flex items-center justify-center animate-in zoom-in-95 duration-500 ease-out">
                    <div id="edit-img-loader" class="absolute inset-0 flex items-center justify-center">
                        <span class="material-symbols-outlined text-white/10 text-6xl animate-pulse">image</span>
                    </div>
                    <img id="edit-preview-img"
                         src="" 
                         class="max-w-full max-h-full rounded-[2.5rem] shadow-[0_0_80px_rgba(var(--primary-rgb),0.15)] border border-white/5 object-contain mx-auto opacity-0 transition-opacity duration-500" 
                         alt="Previsualización">
                </div>

                <!-- CAJA DE DESCRIPCIÓN COMPLETA -->
                <div class="w-full max-w-md bg-white/5 border border-white/5 rounded-3xl p-4 animate-in slide-in-from-bottom duration-500">
                    <textarea id="edit-input-desc" 
                              class="w-full bg-transparent border-none text-[10px] font-body text-white/90 placeholder:text-white/20 uppercase appearance-none outline-none resize-none scrollbar-hide min-h-[60px]" 
                              placeholder="DESCRIPCIÓN COMPLETA..."
                              rows="3">${item.descripcion || ''}</textarea>
                </div>
            </div>

            <!-- FOOTER: BOTONES DE ACCIÓN (UNA SOLA FILA) -->
            <div class="w-full px-8 pb-12 pt-2">
                <div class="max-w-md mx-auto grid grid-cols-[auto_1fr_auto] items-center gap-4 bg-black/40 border border-white/5 p-4 rounded-[2.5rem] shadow-2xl pointer-events-auto backdrop-blur-md animate-in slide-in-from-bottom duration-700">
                    
                    <!-- 1. COMPARTIR -->
                    <button id="edit-btn-share" class="w-14 h-14 rounded-2xl bg-white/5 border border-white/5 flex items-center justify-center text-white/30 active:bg-primary/10 transition-colors">
                        <span class="material-symbols-outlined text-xl">share</span>
                    </button>

                    <!-- 2. SELECTOR DE ÍTEM -->
                    <div id="edit-btn-item" class="bg-white/5 h-14 rounded-2xl border border-white/5 flex items-center justify-between px-4 cursor-pointer hover:bg-white/10 transition-colors overflow-hidden">
                        <div class="flex items-center gap-3 overflow-hidden">
                            <span class="material-symbols-outlined text-primary text-[18px]">list</span>
                            <div class="flex flex-col min-w-0">
                                <span class="text-[6px] text-white/20 font-black uppercase tracking-widest leading-tight">ÍTEM ASIGNADO</span>
                                <span id="edit-activity-label" class="font-headline font-black text-[9px] uppercase text-white/90 truncate">
                                    ${item.actividad || 'SELECCIONAR...'}
                                </span>
                            </div>
                        </div>
                        <span class="material-symbols-outlined text-white/20 text-[14px]">expand_more</span>
                    </div>

                    <!-- 3. MICRÓFONO -->
                    <button id="edit-btn-mic" class="w-14 h-14 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary active:scale-90 transition-transform">
                        <span class="material-symbols-outlined text-xl" style="font-variation-settings: 'FILL' 1;">mic</span>
                    </button>
                </div>
            </div>
        `;

        document.body.appendChild(this.overlay);
        this.bindEvents(callbacks);

        // Carga asíncrona de la imagen
        this.loadImage(item.filename);
    },

    async loadImage(filename) {
        const imageUri = await LogiNative.getBlobUri(filename);
        const img = document.getElementById('edit-preview-img');
        const loader = document.getElementById('edit-img-loader');
        if (img) {
            img.src = imageUri || '';
            img.onload = () => {
                img.classList.remove('opacity-0');
                if (loader) loader.remove();
            };
        }
    },

    bindEvents(callbacks) {
        const btnClose = this.overlay.querySelector('#edit-btn-close');
        const btnShare = this.overlay.querySelector('#edit-btn-share');
        const btnItem = this.overlay.querySelector('#edit-btn-item');
        const btnMic = this.overlay.querySelector('#edit-btn-mic');
        const inputDesc = this.overlay.querySelector('#edit-input-desc');

        btnClose.onclick = () => {
            const finalDesc = inputDesc.value.trim();
            if (callbacks.onClose) callbacks.onClose(finalDesc);
            this.hide();
        };

        btnShare.onclick = () => {
            if (callbacks.onShare) callbacks.onShare(this.activeItem.id);
        };

        btnItem.onclick = () => {
            if (callbacks.onSelectItem) callbacks.onSelectItem();
        };

        inputDesc.oninput = (e) => {
            if (callbacks.onDescChange) callbacks.onDescChange(e.target.value);
        };

        // Dictado Simple (Web Speech API Fallback)
        btnMic.onclick = () => {
            const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
            if (!SpeechRecognition) {
                alert("El dictado no es compatible con este navegador.");
                return;
            }

            const recognition = new SpeechRecognition();
            recognition.lang = 'es-ES';
            recognition.interimResults = false;
            
            btnMic.classList.add('text-red-500', 'animate-pulse');
            
            recognition.onresult = (event) => {
                const text = event.results[0][0].transcript;
                inputDesc.value = (inputDesc.value + " " + text).toUpperCase().trim();
                inputDesc.dispatchEvent(new Event('input'));
            };

            recognition.onend = () => {
                btnMic.classList.remove('text-red-500', 'animate-pulse');
            };

            recognition.start();
        };
    },

    updateActivity(activity) {
        const label = document.getElementById('edit-activity-label');
        if (label) label.innerText = activity.toUpperCase();
    },

    hide() {
        const existing = document.getElementById('gallery-edit-overlay');
        if (existing) {
            existing.classList.add('fade-out');
            setTimeout(() => existing.remove(), 300);
        }
        this.overlay = null;
        this.activeItem = null;
    }
};
