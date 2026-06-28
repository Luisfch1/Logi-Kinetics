/**
 * ExportScaffold.js (Nexus Shield v185)
 * Estructura Dinámica de Exportación.
 * - ADD: Previsualización de LOGO y Selector de POSICIÓN.
 */
export const ExportScaffold = {
    render(state) {
        console.log("ExportScaffold: Rendering con logo:", state.logo ? "SI (L=" + state.logo.length + ")" : "NO");
        
        const formatDate = (val) => {
            if(!val) return '...';
            const [y, m, d] = val.split('-');
            const date = new Date(y, m - 1, d);
            return date.toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' }).toUpperCase();
        };

        const formatMonth = (val) => {
            if(!val) return '...';
            const [y, m] = val.split('-');
            const date = new Date(y, m - 1, 1);
            return date.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' }).toUpperCase();
        };

        // --- Renderizado Condicional de Fecha ---
        let dateUI = '';
        if (state.mode === 'dia') {
            dateUI = `
                <div class="relative bg-white/5 border border-white/10 rounded-2xl p-4 h-20 flex flex-col justify-center active:bg-white/10 transition-all overflow-hidden cursor-pointer">
                    <span class="text-[7px] text-white/20 font-bold uppercase tracking-widest leading-none">FECHA ESPECÍFICA</span>
                    <span id="display-day" class="font-headline font-black text-xs text-white/90 uppercase tracking-tighter italic">${formatDate(state.dateDay)}</span>
                    <input id="input-date-day" type="date" value="${state.dateDay}" class="absolute inset-0 opacity-0 cursor-pointer z-10">
                </div>
            `;
        } else if (state.mode === 'mes') {
            dateUI = `
                <div class="relative bg-white/5 border border-white/10 rounded-2xl p-4 h-20 flex flex-col justify-center active:bg-white/10 transition-all overflow-hidden cursor-pointer">
                    <span class="text-[7px] text-white/20 font-bold uppercase tracking-widest leading-none">MES DE REPORTE</span>
                    <span id="display-month" class="font-headline font-black text-xs text-white/90 uppercase tracking-tighter italic">${formatMonth(state.dateMonth)}</span>
                    <input id="input-date-month" type="month" value="${state.dateMonth}" class="absolute inset-0 opacity-0 cursor-pointer z-10">
                </div>
            `;
        } else {
            dateUI = `
                <div class="grid grid-cols-2 gap-4">
                    <div class="relative bg-white/5 border border-white/10 rounded-2xl p-4 h-20 flex flex-col justify-center active:bg-white/10 transition-all overflow-hidden cursor-pointer">
                        <span class="text-[7px] text-white/20 font-bold uppercase tracking-widest leading-none">INICIO</span>
                        <span id="display-start" class="font-headline font-black text-xs text-primary uppercase tracking-tighter italic">${formatDate(state.dateStart)}</span>
                        <input id="input-date-start" type="date" value="${state.dateStart}" class="absolute inset-0 opacity-0 cursor-pointer z-10">
                    </div>
                    <div class="relative bg-white/5 border border-white/10 rounded-2xl p-4 h-20 flex flex-col justify-center active:bg-white/10 transition-all overflow-hidden cursor-pointer">
                        <span class="text-[7px] text-white/20 font-bold uppercase tracking-widest leading-none">FIN</span>
                        <span id="display-end" class="font-headline font-black text-xs text-white/90 uppercase tracking-tighter italic">${formatDate(state.dateEnd)}</span>
                        <input id="input-date-end" type="date" value="${state.dateEnd}" class="absolute inset-0 opacity-0 cursor-pointer z-10">
                    </div>
                </div>
            `;
        }

        const modeDisplay = state.mode.charAt(0).toUpperCase() + state.mode.slice(1);

        // --- Mapping de Posición para label ---
        const posLabels = {
            'top-left': 'Superior izquierda',
            'top-right': 'Superior derecha',
            'bottom-left': 'Inferior izquierda',
            'bottom-right': 'Inferior derecha'
        };

        // --- Plantillas ---
        const templates = [
            { id: 'Plantilla1.pdf', name: 'CLÁSICA', preview: './templates/previews/CLÁSICA_mockup.png' },
            { id: 'Plantilla2.pdf', name: 'INFORME TÉCNICO', preview: './templates/previews/INFORME_TÉCNICO_mockup.png' },
            { id: 'Plantilla3.pdf', name: 'FOTOS POR ÍTEM', preview: './templates/previews/FOTOS_POR_ÍTEM_mockup.png' }
        ];

        return `
            <div class="w-full h-full bg-black overflow-y-auto px-5 pb-32 pt-4 space-y-8 scroll-smooth">
                
                <!-- 1. MODO -->
                <div class="space-y-3">
                    <span class="text-[8px] text-white/30 font-black uppercase tracking-[0.3em] pl-1">MODO</span>
                    <div class="relative bg-white/5 border border-white/10 rounded-2xl h-14 flex items-center px-4 justify-between active:bg-white/10 transition-all cursor-pointer">
                        <span class="font-headline font-black text-xs text-primary uppercase tracking-tight italic">${modeDisplay}</span>
                        <span class="material-symbols-outlined text-primary text-xl">expand_more</span>
                        <select id="select-mode" class="absolute inset-0 opacity-0 cursor-pointer z-10">
                            <option value="dia" ${state.mode === 'dia' ? 'selected' : ''}>Día</option>
                            <option value="mes" ${state.mode === 'mes' ? 'selected' : ''}>Mes</option>
                            <option value="rango" ${state.mode === 'rango' ? 'selected' : ''}>Rango</option>
                        </select>
                    </div>
                </div>

                <!-- 2. FECHA -->
                <div class="space-y-3">
                    <span class="text-[8px] text-white/30 font-black uppercase tracking-[0.3em] pl-1">FECHA</span>
                    ${dateUI}
                </div>

                <!-- 3. FORMATO DE SALIDA -->
                <div class="space-y-3">
                    <span class="text-[8px] text-white/30 font-black uppercase tracking-[0.3em] pl-1">FORMATO DE SALIDA</span>
                    <div class="grid grid-cols-3 gap-3">
                        <button onclick="window.ExportController?.setFormat('pdf')"
                                class="h-14 rounded-2xl flex flex-col items-center justify-center gap-1 transition-all ${state.format === 'pdf' ? 'bg-white/10 border-2 border-primary shadow-neon opacity-100' : 'bg-white/5 border border-white/10 opacity-40'}">
                            <span class="material-symbols-outlined ${state.format === 'pdf' ? 'text-primary' : 'text-white/50'} text-xl">picture_as_pdf</span>
                            <span class="font-headline font-black text-[8px] text-white uppercase tracking-widest">PDF</span>
                        </button>
                        <button onclick="window.ExportController?.setFormat('docx')"
                                class="h-14 rounded-2xl flex flex-col items-center justify-center gap-1 transition-all ${state.format === 'docx' ? 'bg-white/10 border-2 border-primary shadow-neon opacity-100' : 'bg-white/5 border border-white/10 opacity-40'}">
                            <span class="material-symbols-outlined ${state.format === 'docx' ? 'text-primary' : 'text-white/50'} text-xl">description</span>
                            <span class="font-headline font-black text-[8px] text-white uppercase tracking-widest">DOCX</span>
                        </button>
                        <button onclick="window.ExportController?.setFormat('zip')"
                                class="h-14 rounded-2xl flex flex-col items-center justify-center gap-1 transition-all ${state.format === 'zip' ? 'bg-white/10 border-2 border-primary shadow-neon opacity-100' : 'bg-white/5 border border-white/10 opacity-40'}">
                            <span class="material-symbols-outlined ${state.format === 'zip' ? 'text-primary' : 'text-white/50'} text-xl">folder_zip</span>
                            <span class="font-headline font-black text-[8px] text-white uppercase tracking-widest">ZIP</span>
                        </button>
                    </div>
                </div>

                <!-- 4. PLANTILLAS -->
                <div class="space-y-3">
                    <span class="text-[8px] text-white/30 font-black uppercase tracking-[0.3em] pl-1">PLANTILLAS</span>
                    <div class="flex gap-4 overflow-x-auto pb-4 -mx-1 px-1 scrollbar-hide no-scrollbar">
                        ${templates.map(tmpl => {
                            const isSelected = state.template === tmpl.id;
                            const cardClass = isSelected ? "border-2 border-primary shadow-neon opacity-100" : "border border-white/10 grayscale opacity-40";
                            return `
                                <div onclick="window.ExportController?.setTemplate('${tmpl.id}')"
                                     class="shrink-0 w-36 space-y-3 transition-all cursor-pointer">
                                    <div class="aspect-[3/4] rounded-2xl overflow-hidden relative ${cardClass} bg-white/5">
                                        <img src="${tmpl.preview}" class="w-full h-full object-cover">
                                    </div>
                                    <span class="block text-center font-headline font-black text-[8px] ${isSelected ? 'text-primary' : 'text-white/40'} uppercase tracking-widest">${tmpl.name}</span>
                                </div>
                            `;
                        }).join('')}
                    </div>
                </div>

                <!-- 5. LOGO (MODIFICADO CON PREVIEW) -->
                <div class="space-y-3">
                    <span class="text-[8px] text-white/30 font-black uppercase tracking-[0.3em] pl-1">LOGO (OPCIONAL)</span>
                    <div class="bg-white/5 border border-white/10 rounded-[2rem] p-6 space-y-5">
                        
                        <!-- Logo y Botones (v192.5 - Rediseño Profesional) -->
                        <div class="flex items-center gap-6">
                            <!-- Miniatura del Logo (Rectangular) -->
                            <div class="w-32 h-20 bg-white/5 border-2 ${state.logo ? 'border-primary shadow-neon' : 'border-white/5'} rounded-2xl flex items-center justify-center overflow-hidden transition-all duration-500 shrink-0">
                                ${state.logo 
                                    ? `<img src="${state.logo}" class="w-full h-full object-contain" />`
                                    : `<span class="material-symbols-outlined text-white/5 text-4xl">image</span>`
                                }
                            </div>

                            <!-- Botones (Apilados Verticamente) -->
                            <div class="flex-1 flex flex-col gap-3">
                                <button id="btn-load-logo" class="h-11 rounded-xl bg-white/5 border border-primary/30 flex items-center justify-center gap-3 active:bg-primary/10 transition-all group">
                                    <span class="material-symbols-outlined text-primary text-base group-hover:scale-110 transition-transform">photo_size_select_actual</span>
                                    <span class="font-headline font-black text-[9px] text-primary uppercase tracking-[0.2em]">CARGAR LOGO</span>
                                </button>
                                <button id="btn-remove-logo" class="h-11 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center gap-3 ${!state.logo ? 'opacity-20' : 'active:bg-red-500/10'} transition-all group">
                                    <span class="material-symbols-outlined text-white/30 text-base group-hover:scale-110 transition-transform">delete</span>
                                    <span class="font-headline font-black text-[9px] text-white/30 uppercase tracking-[0.2em]">QUITAR LOGO</span>
                                </button>
                            </div>
                        </div>
                        
                        <!-- Selector de Posición -->
                        <div class="relative bg-white/5 border border-white/10 rounded-xl h-12 flex items-center px-4 justify-between active:bg-white/10 transition-all">
                            <span class="font-headline font-black text-[9px] text-white/70 uppercase tracking-widest">${posLabels[state.logoPosition]}</span>
                            <span class="material-symbols-outlined text-primary text-sm">unfold_more</span>
                            <select id="select-logo-pos" class="absolute inset-0 opacity-0 cursor-pointer z-10">
                                <option value="top-left">Superior izquierda</option>
                                <option value="top-right">Superior derecha</option>
                                <option value="bottom-left">Inferior izquierda</option>
                                <option value="bottom-right">Inferior derecha</option>
                            </select>
                        </div>
                        
                        <p class="text-[7px] text-white/20 font-bold uppercase tracking-[0.1em] text-center italic leading-relaxed">
                            El logo se aplica solo al exportar o compartir.<br>La foto original no se modifica.
                        </p>
                    </div>
                </div>

                <!-- 6. OPCIONES -->
                <div class="space-y-3">
                    <span class="text-[8px] text-white/30 font-black uppercase tracking-[0.3em] pl-1">OPCIONES</span>
                    <div class="bg-white/5 border border-white/10 rounded-[2rem] divide-y divide-white/5 overflow-hidden">
                        
                        <!-- Toggle Logo -->
                        <div class="flex items-center justify-between p-5 cursor-pointer active:bg-white/5 transition-all"
                             onclick="window.ExportController?.setWhatsappOption('whatsappIncludeLogo', ${!state.whatsappIncludeLogo})">
                            <div class="flex flex-col gap-0.5">
                                <span class="font-headline font-black text-[9px] ${state.whatsappIncludeLogo ? 'text-white' : 'text-white/40'} uppercase tracking-widest transition-colors">WhatsApp: incluir logo</span>
                                <span class="text-[6px] text-white/20 font-bold uppercase tracking-widest">EN ESQUINA: ${posLabels[state.logoPosition]}</span>
                            </div>
                            <div class="w-10 h-5 ${state.whatsappIncludeLogo ? 'bg-primary shadow-neon' : 'bg-white/10'} rounded-full relative transition-all duration-300">
                                <div class="absolute ${state.whatsappIncludeLogo ? 'right-1' : 'left-1'} top-0.5 w-4 h-4 bg-black rounded-full transition-all duration-300"></div>
                            </div>
                        </div>

                        <!-- Toggle Fecha -->
                        <div class="flex items-center justify-between p-5 cursor-pointer active:bg-white/5 transition-all"
                             onclick="window.ExportController?.setWhatsappOption('whatsappIncludeTimestamp', ${!state.whatsappIncludeTimestamp})">
                            <div class="flex flex-col gap-0.5">
                                <span class="font-headline font-black text-[9px] ${state.whatsappIncludeTimestamp ? 'text-white' : 'text-white/40'} uppercase tracking-widest transition-colors">WhatsApp: incluir fecha</span>
                                <span class="text-[6px] text-white/20 font-bold uppercase tracking-widest italic">ESQUINA OPUESTA AL LOGO</span>
                            </div>
                            <div class="w-10 h-5 ${state.whatsappIncludeTimestamp ? 'bg-primary shadow-neon' : 'bg-white/10'} rounded-full relative transition-all duration-300">
                                <div class="absolute ${state.whatsappIncludeTimestamp ? 'right-1' : 'left-1'} top-0.5 w-4 h-4 bg-black rounded-full transition-all duration-300"></div>
                            </div>
                        </div>

                    </div>
                </div>

                <!-- 7. BOTÓN -->
                <button id="btn-export-final" 
                        class="w-full h-16 bg-primary rounded-2xl flex items-center justify-center font-headline font-black text-xs text-black uppercase tracking-[0.4em] shadow-neon active:scale-95 transition-all">
                    EXPORTAR
                </button>

            </div>
        `;
    }
};
