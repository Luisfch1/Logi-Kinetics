/**
 * GalleryCardItem.js (Nexus Shield v180)
 * Item individual de la cuadrícula de Galería.
 * - FIX: Ocultar cápsula si el texto es descriptivo sin números (ej. "SELECCIONAR...").
 */
export const GalleryCardItem = {
    render(item, isSelectionMode = false, isSelected = false, cols = 2) {
        const imgId = `gal-img-${item.id}`;
        const isCompact = cols === 3;
        
        // --- LÓGICA DE CAPSULA INTELIGENTE (Refinada) ---
        const actividadRaw = (item.actividad || '').trim().toUpperCase();
        
        // Se considera "default" si está vacío, es GENERAL o es el placeholder de selección
        const isDefault = !actividadRaw || 
                          actividadRaw === 'GENERAL' || 
                          actividadRaw === 'SELECCIONAR...' || 
                          actividadRaw === 'CAPTURA';
        
        const shortActividad = isDefault ? '' : (actividadRaw.length > 8 ? actividadRaw.substring(0, 7) + '..' : actividadRaw);
        
        // Solo mostramos la cápsula si tenemos un número válido y no estamos en modo selección
        const showCapsule = !isSelectionMode && shortActividad !== '';

        // --- ESTADOS DE SELECCIÓN ---
        const borderClass = isSelected ? 'border-primary shadow-neon' : 'border-white/5';
        const opacityClass = isSelected ? 'opacity-100' : (isSelectionMode ? 'opacity-40' : 'opacity-100');
        const scaleClass = isSelected ? 'scale-95' : 'active:scale-[0.98]';

        // --- AJUSTES DE ESCALA (v193.3-OAK) ---
        const cardRadius = isCompact ? 'rounded-2xl' : 'rounded-3xl';
        const capsuleScale = isCompact ? 'scale-[0.7] top-2 left-2' : 'scale-90 top-4 left-4';
        const actionBtnSize = isCompact ? 'w-7 h-7 bottom-2 right-2' : 'w-9 h-9 bottom-4 right-4';
        const actionIconSize = isCompact ? 'text-[14px]' : 'text-[18px]';

        return `
            <div class="gallery-card-item relative pb-4" 
                 id="gallery-card-${item.id}"
                 data-id="${item.id}"
                 style="display: block !important; width: 100% !important; position: relative !important;">
                
                <!-- Contenedor Maestra de Altura -->
                <div class="relative w-full ${cardRadius} bg-white/5 border-2 ${borderClass} overflow-hidden group ${scaleClass} transition-all duration-300 shadow-lg" 
                     style="padding-bottom: 100% !important; height: 0 !important; position: relative !important;">
                    
                    <!-- Contenido Absoluto dentro del Padding Hack -->
                    <div class="absolute inset-0">
                        <!-- Imagen de Fondo -->
                <img id="${imgId}"
                     src="data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7"
                     class="w-full h-full object-cover ${opacityClass} group-hover:opacity-100 transition-opacity duration-500" 
                     alt="Capture ${item.id}">

                <!-- Indicador de Selección (Check Icon) -->
                ${isSelected ? `
                <div class="absolute inset-0 bg-primary/10 flex items-center justify-center z-30">
                    <div class="w-8 h-8 bg-primary rounded-full flex items-center justify-center shadow-neon">
                        <span class="material-symbols-outlined text-black font-black text-xl">done</span>
                    </div>
                </div>
                ` : ''}

                <!-- Etiqueta de Actividad -->
                ${showCapsule ? `
                <div class="absolute z-10 origin-top-left ${capsuleScale}">
                    <div class="bg-primary text-black font-headline font-black text-[10px] px-2.5 h-7 min-w-[28px] flex items-center justify-center rounded-full shadow-neon whitespace-nowrap">
                        ${shortActividad}
                    </div>
                </div>
                ` : ''}

                <!-- Botón de Compartir (Solo si NO estamos en modo selección) -->
                ${!isSelectionMode ? `
                <button class="action-btn absolute ${actionBtnSize} bg-primary rounded-2xl flex items-center justify-center text-black shadow-neon active:scale-90 transition-transform z-20"
                        onclick="event.stopPropagation(); window.GalleryController?.shareItem('${item.id}')">
                    <span class="material-symbols-outlined ${actionIconSize} font-bold">share</span>
                </button>
                ` : ''}

                <!-- Overlay Inferior (Sutilizado para no lavar la foto) -->
                <div class="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-black/50 to-transparent pointer-events-none group-hover:h-full transition-all"></div>
                
                <!-- Timestamp -->
                <!-- Timestamp -->
                <div class="absolute bottom-4 left-5 flex flex-col pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity">
                    <span class="text-[8px] text-white/50 font-black uppercase tracking-[0.2em]">
                        ${new Date(item.createdAt || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                </div>
            </div> <!-- Cierre Absolute Inset-0 -->
        </div> <!-- Cierre Padding Bottom Container -->
    </div> <!-- Cierre Gallery Card Item Root -->
`;
    }
};
