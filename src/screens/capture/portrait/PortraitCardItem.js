/**
 * PortraitCardItem.js
 */
export const PortraitCardItem = {
    render(item, isSelectionMode = false, isSelected = false) {
        const imgPath = item._tempImageSrc || 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';
        
        const selectionClass = isSelected ? 'bg-primary border-transparent' : 'bg-transparent border-white/20';
        const selectionIconVisibility = isSelected ? 'opacity-100' : 'opacity-0';
        const containerVisibility = isSelectionMode ? 'opacity-100' : 'opacity-0 scale-0 pointer-events-none';
        
        const timeStr = new Date(item.createdAt || Date.now()).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit', hour12: false});

        return `
            <div id="card-${item.id}" data-id="${item.id}" class="capture-card-item relative bg-[#0a0a0a] rounded-[2.2rem] p-5 flex items-center gap-6 border ${isSelected ? 'border-primary shadow-neon' : 'border-white/5'} transition-all active:scale-[0.98] duration-200 w-full min-h-[160px] overflow-hidden">
                <div class="selection-circle absolute top-4 left-4 w-6 h-6 rounded-full border-2 ${selectionClass} z-[60] transition-all flex items-center justify-center ${containerVisibility}">
                    <span class="material-symbols-outlined text-black text-[14px] font-black ${selectionIconVisibility}">check</span>
                </div>
                <button class="btn-delete-card absolute top-2 right-2 w-7 h-7 bg-white/10 text-white rounded-full flex items-center justify-center z-50 active:scale-90 transition-all shadow-lg" data-id="${item.id}" data-filename="${item.filename}">
                    <span class="material-symbols-outlined text-[12px] font-bold pointer-events-none">close</span>
                </button>
                <div class="relative w-28 h-28 rounded-[1.5rem] overflow-hidden border border-white/5 shrink-0 bg-[#050505]">
                    <img id="img-${item.id}" src="${imgPath}" 
                         onerror="this.style.border='2px solid red'; console.error('Load fail:', this.src)"
                         class="w-full h-full object-cover transition-opacity duration-500" />
                    <div class="absolute bottom-1.5 right-1.5 px-2 py-0.5 bg-black/80 rounded-lg flex items-center gap-1 text-[8px] font-black tracking-tight">
                        <span class="material-symbols-outlined text-[10px] ${item.synced ? 'text-primary' : 'text-white/20'}">${item.synced ? 'cloud_done' : 'cloud_off'}</span>
                        <span class="text-white/30">${timeStr}</span>
                    </div>
                </div>
                <div class="flex-1 flex flex-col justify-center gap-2.5 overflow-hidden">
                    <div>
                        <span class="text-[8px] text-white/20 font-black uppercase tracking-[0.2em] pl-1">DESCRIPCIÓN TÉCNICA</span>
                        <div id="desc-${item.id}" class="mt-1 bg-white/5 rounded-xl border border-white/5 px-4 h-10 text-[11px] text-white/80 font-medium uppercase truncate flex items-center">
                            ${item.descripcion || 'SIN COMENTARIOS'}
                        </div>
                    </div>
                    <div>
                        <span class="text-[8px] text-white/20 font-black uppercase tracking-[0.2em] pl-1">ITEM / ACTIVIDAD</span>
                        <div class="mt-1 bg-primary/5 rounded-xl border border-primary/10 px-4 h-10 text-[10px] text-primary font-black uppercase truncate flex items-center justify-between shadow-inner">
                            <span class="item-activity-label truncate">${item.actividad || 'GENERAL'}</span>
                            <span class="material-symbols-outlined text-[12px] opacity-30">chevron_right</span>
                        </div>
                    </div>
                </div>
            </div>`;
    }
};
