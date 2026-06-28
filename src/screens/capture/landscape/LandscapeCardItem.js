/**
 * LandscapeCardItem.js
 */
export const LandscapeCardItem = {
    render(item, isSelectionMode = false, isSelected = false) {
        const imgPath = item._tempImageSrc || 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';

        const selectionClass = isSelected ? 'bg-primary border-transparent' : 'bg-transparent border-white/20';
        const selectionIconVisibility = isSelected ? 'opacity-100' : 'opacity-0';
        const containerVisibility = isSelectionMode ? 'opacity-100' : 'opacity-0 scale-0 pointer-events-none';

        const timeStr = new Date(item.createdAt || Date.now()).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit', hour12: false});

        return `
            <div id="card-${item.id}" data-id="${item.id}" class="capture-card-item relative bg-[#0a0a0a] rounded-[2rem] p-[12px] flex items-center gap-6 border ${isSelected ? 'border-primary shadow-neon' : 'border-white/5'} hover:border-white/10 transition-all w-full h-[140px] overflow-hidden group shadow-xl">
                <div class="selection-circle absolute top-6 left-6 w-7 h-7 rounded-full border-2 ${selectionClass} z-[60] transition-all flex items-center justify-center ${containerVisibility}">
                    <span class="material-symbols-outlined text-black text-[16px] font-black ${selectionIconVisibility}">check</span>
                </div>
                <button class="btn-delete-card absolute top-4 right-4 w-9 h-9 bg-white/10 text-white rounded-full flex items-center justify-center z-50 active:scale-95 transition-all opacity-0 group-hover:opacity-100" data-id="${item.id}" data-filename="${item.filename}">
                    <span class="material-symbols-outlined text-[16px] font-bold pointer-events-none">close</span>
                </button>
                <div class="relative w-[116px] h-[116px] rounded-[1.5rem] overflow-hidden border border-white/5 shrink-0 bg-[#050505]">
                    <img id="img-${item.id}" src="${imgPath}" class="w-full h-full object-cover transition-opacity duration-500" />
                    <div class="absolute bottom-2 right-2 px-2 py-1 bg-black/80 rounded-lg flex items-center gap-1 text-[8px] font-black tracking-tight">
                        <span class="material-symbols-outlined text-[10px] ${item.synced ? 'text-primary' : 'text-white/20'}">${item.synced ? 'cloud_done' : 'cloud_off'}</span>
                        <span class="text-white/30">${timeStr}</span>
                    </div>
                </div>
                <div class="flex-1 flex flex-col justify-between h-full py-0">
                    <div class="flex flex-col gap-1">
                        <span class="text-[8px] text-white/40 font-black uppercase tracking-[0.2em] pl-1">DESCRIPCIÓN TÉCNICA</span>
                        <div id="desc-${item.id}" class="bg-white/5 rounded-xl border border-white/5 px-4 h-8 text-[11px] text-white/80 font-medium uppercase truncate flex items-center">
                            ${item.descripcion || 'SIN COMENTARIOS'}
                        </div>
                    </div>
                    <div class="flex flex-col gap-1">
                        <span class="text-[8px] text-white/40 font-black uppercase tracking-[0.2em] pl-1">ITEM / ACTIVIDAD</span>
                        <div class="bg-primary/5 rounded-xl border border-primary/10 px-4 h-8 text-[10px] text-primary font-black uppercase truncate flex items-center justify-between shadow-inner">
                            <span class="item-activity-label truncate">${item.actividad || 'GENERAL'}</span>
                            <span class="material-symbols-outlined text-[14px] opacity-30">chevron_right</span>
                        </div>
                    </div>
                </div>
            </div>`;
    }
};
