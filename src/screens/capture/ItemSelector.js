/**
 * ItemSelector.js
 * Logi Kinetic | Item Selection Overlay/Modal
 */
import { State } from '../../core/state.js';

export const ItemSelector = {
    overlay: null,

    show(currentSelection, onSelect) {
        this.hide();
        const items = State.catalog || [];
        
        this.overlay = document.createElement('div');
        this.overlay.id = 'item-selector-overlay';
        this.overlay.className = 'fixed inset-0 z-[200] flex items-end justify-center bg-black/60 backdrop-blur-sm sm:items-center p-0 sm:p-6';
        
        let listHtml = '';
        if (items.length === 0) {
            listHtml = `
                <div class="py-20 text-center space-y-3 opacity-20">
                    <span class="material-symbols-outlined text-4xl">inventory_2</span>
                    <p class="text-[10px] font-black uppercase tracking-widest">No hay ítems cargados</p>
                </div>`;
        } else {
            listHtml = items.map(it => {
                const isSel = (it.item === currentSelection);
                return `
                    <div class="item-option group flex items-center gap-4 p-4 rounded-2xl border border-white/5 bg-white/[0.02] active:bg-primary/10 active:border-primary/30 transition-all cursor-pointer ${isSel ? 'border-primary/40 bg-primary/5' : ''}" 
                         data-item="${it.item}">
                        <div class="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center text-white/30 group-hover:text-primary transition-colors">
                            <span class="material-symbols-outlined text-[20px]">${isSel ? 'check_circle' : 'list'}</span>
                        </div>
                        <div class="flex-1 min-w-0 space-y-0.5">
                            <p class="font-headline text-[11px] font-black uppercase tracking-tight text-white/90 truncate">${it.item}</p>
                            <p class="text-[9px] text-white/30 font-medium uppercase truncate leading-none">${it.descripcion}</p>
                        </div>
                        <div class="text-[8px] font-black text-on-surface-variant group-active:text-primary/60 transition-colors uppercase tracking-tighter">${it.unidad}</div>
                    </div>`;
            }).join('');
        }

        this.overlay.innerHTML = `
            <div class="bg-[#0f0f0f] border-t sm:border border-white/10 rounded-t-[2.5rem] sm:rounded-[2.5rem] w-full max-w-md h-[70vh] sm:h-auto sm:max-h-[80vh] flex flex-col shadow-2xl animate-in slide-in-from-bottom duration-300 overflow-hidden">
                <div class="px-8 py-6 border-b border-white/5 flex justify-between items-center bg-black/20">
                    <div class="space-y-1">
                        <span class="text-[8px] text-primary/60 font-black uppercase tracking-[0.3em]">Catalogo Técnico</span>
                        <h3 class="font-headline text-lg font-bold uppercase tracking-tight text-white/90">Seleccionar Ítem</h3>
                    </div>
                    <button id="btn-close-selector" class="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center text-white/40 active:scale-95 transition-all">
                        <span class="material-symbols-outlined text-lg">close</span>
                    </button>
                </div>
                <div class="px-6 py-4">
                    <div class="relative">
                        <span class="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-white/20 text-sm">search</span>
                        <input id="selector-search" type="text" placeholder="BUSCAR ÍTEM..." 
                               class="w-full bg-white/5 border border-white/5 h-11 rounded-xl pl-10 pr-4 text-[10px] font-bold text-white placeholder:text-white/20 uppercase transition-all focus:border-primary/30 outline-none">
                    </div>
                </div>
                <div id="selector-list" class="flex-1 overflow-y-auto px-6 pb-12 space-y-2 scrollbar-hide">
                    ${listHtml}
                </div>
            </div>`;

        document.body.appendChild(this.overlay);

        const btnClose = this.overlay.querySelector('#btn-close-selector');
        if (btnClose) btnClose.onclick = () => this.hide();

        const options = this.overlay.querySelectorAll('.item-option');
        options.forEach(opt => {
            opt.onclick = () => {
                if (onSelect) onSelect(opt.dataset.item);
                this.hide();
            };
        });

        const searchInput = this.overlay.querySelector('#selector-search');
        if (searchInput) {
            searchInput.oninput = (e) => {
                const term = e.target.value.toLowerCase();
                options.forEach(opt => {
                    const text = opt.innerText.toLowerCase();
                    opt.style.display = text.includes(term) ? 'flex' : 'none';
                });
            };
        }

        this.overlay.onclick = (e) => {
            if (e.target.id === 'item-selector-overlay' && window.innerWidth >= 640) this.hide();
        };
    },

    hide() {
        const existing = document.getElementById('item-selector-overlay');
        if (existing) existing.remove();
        this.overlay = null;
    }
};
