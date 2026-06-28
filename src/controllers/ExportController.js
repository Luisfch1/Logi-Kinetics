/**
 * ExportController.js (v199 - Nexus 6-Pack Grid)
 * Motor PDF Nativo con Grid 3x2 (6 fotos) y Fechas Inteligentes.
 */
import { State } from '../core/state.js';
import { Architect } from '../core/Architect.js';
import { LogiNative } from '../core/capacitor-bridge.js';
import { CaptureDialog } from '../screens/capture/CaptureDialog.js';
import { ReportsModule } from './ReportsController.js';
import { 
    Document, Packer, Paragraph, TextRun, ImageRun, 
    Table, TableRow, TableCell, WidthType, AlignmentType, 
    Header, Footer, BorderStyle, HeightRule, VerticalAlign 
} from 'docx';

export const ExportModule = {
    isProcessing: false,
    config: {
        mode: 'dia',
        dateDay: new Date().toISOString().split('T')[0],
        dateMonth: new Date().toISOString().split('T')[0].substring(0, 7),
        dateStart: new Date().toISOString().split('T')[0],
        dateEnd: new Date().toISOString().split('T')[0],
        format: 'pdf',
        template: 'Grid6.pdf',
        logo: null,
        logoPosition: 'top-left',
        whatsappIncludeLogo: false,
        whatsappIncludeTimestamp: false
    },

    _loaded: false,

    async init() {
        window.ExportController = this;
        window.ExportModule = this;
        
        // Cargar configuración de forma SÍNCRONA antes del primer renderizado
        if (!this._loaded) {
            this._loaded = true;
            await this.loadInitialConfig();
        }

        this.rebind();
        console.log(">>> MOTOR PDF NATIVO 8-PACK (v300) INICIALIZADO <<<");
    },

    async loadInitialConfig() {
        try {
            console.log("ExportModule: Cargando config en segundo plano...");
            
            // 1. Cargar Logo (Método Robusto de Archivo Crudo)
            const savedLogo = await LogiNative.getLogo();
            if (savedLogo) {
                this.config.logo = savedLogo;
            }
            
            // 2. Cargar Posición (JSON ligero está OK)
            const savedPos = await LogiNative.dbGet('config', 'export_logo_pos');
            if (savedPos) this.config.logoPosition = savedPos.value;

            // 3. Cargar Opciones de WhatsApp
            const wLogo = await LogiNative.dbGet('config', 'export_whatsappIncludeLogo');
            if (wLogo) this.config.whatsappIncludeLogo = wLogo.value;
            
            const wTime = await LogiNative.dbGet('config', 'export_whatsappIncludeTimestamp');
            if (wTime) this.config.whatsappIncludeTimestamp = wTime.value;

            console.log("ExportModule: Configuración cargada al 100%.");
        } catch (e) {
            console.error("Error cargando config inicial:", e);
        }
    },

    rebind() {
        const selectMode = document.getElementById('select-mode');
        if (selectMode) selectMode.onchange = (e) => this.setMode(e.target.value);

        const inputDay = document.getElementById('input-date-day');
        if (inputDay) inputDay.onchange = (e) => {
            this.config.dateDay = e.target.value;
            Architect.render('export');
        };

        const inputMonth = document.getElementById('input-date-month');
        if (inputMonth) inputMonth.onchange = (e) => {
            this.config.dateMonth = e.target.value;
            Architect.render('export');
        };

        const inputStart = document.getElementById('input-date-start');
        if (inputStart) inputStart.onchange = (e) => {
            this.config.dateStart = e.target.value;
            Architect.render('export');
        };

        const inputEnd = document.getElementById('input-date-end');
        if (inputEnd) inputEnd.onchange = (e) => {
            this.config.dateEnd = e.target.value;
            Architect.render('export');
        };

        const btnLoadLogo = document.getElementById('btn-load-logo');
        if (btnLoadLogo) btnLoadLogo.onclick = () => this.loadLogo();

        const btnRemoveLogo = document.getElementById('btn-remove-logo');
        if (btnRemoveLogo) btnRemoveLogo.onclick = () => this.removeLogo();

        const btnExport = document.getElementById('btn-export-final');
        if (btnExport) btnExport.onclick = () => this.performExport();

        const selectLogoPos = document.getElementById('select-logo-pos');
        if (selectLogoPos) selectLogoPos.onchange = (e) => this.setLogoPosition(e.target.value);
    },

    async setMode(newMode) {
        this.config.mode = newMode;
        await Architect.render('export'); 
    },

    async setTemplate(newId) {
        this.config.template = newId;
        await Architect.render('export');
    },

    async setFormat(newFmt) {
        this.config.format = newFmt;
        await Architect.render('export');
    },

    async setLogoPosition(newPos) {
        this.config.logoPosition = newPos;
        await LogiNative.dbPut('config', { id: 'export_logo_pos', value: newPos });
        await Architect.render('export');
    },

    async setWhatsappOption(key, value) {
        this.config[key] = value;
        await LogiNative.dbPut('config', { id: `export_${key}`, value: value });
        await Architect.render('export');
    },

    async loadLogo() {
        try {
            const data = await LogiNative.pickImage();
            if (data) {
                this.config.logo = data;
                await LogiNative.saveLogo(data);
                await Architect.render('export');
            }
        } catch (e) {
            console.error("Error cargando logo:", e);
        }
    },

    async removeLogo() {
        this.config.logo = null;
        await LogiNative.deleteLogo();
        await Architect.render('export');
    },

    // --- HELPER DE PROGRESO ---
    _updateProgress(msg) {
        if (typeof CaptureDialog !== 'undefined' && CaptureDialog.show) {
            CaptureDialog.show(msg, null, true);
        }
        console.log(`[ExportProgress] ${msg}`);
    },

    _hideProgress() {
        if (typeof CaptureDialog !== 'undefined' && CaptureDialog.hide) {
            CaptureDialog.hide();
        }
    },

    // --- HELPER DE COLOR PARA PDF-LIB ---
    _getAccentRgb() {
        const hex = State.accentColor || '#cafd00';
        const r = parseInt(hex.slice(1, 3), 16) / 255;
        const g = parseInt(hex.slice(3, 5), 16) / 255;
        const b = parseInt(hex.slice(5, 7), 16) / 255;
        return { r, g, b };
    },

    _getItemName(code) {
        if (!State.catalog || !code) return "";
        const cleanCode = String(code).trim().toUpperCase();
        const item = State.catalog.find(it => String(it.item).trim().toUpperCase() === cleanCode);
        if (!item) return "";

        let desc = (item.descripcion || "").toUpperCase();
        // Truncado protector de grillas (Nexus-Oak v192.8) - Capacidad para 2 líneas compactas
        if (desc.length > 85) desc = desc.substring(0, 82) + "...";
        return desc;
    },

    // --- LÓGICA DE FECHAS INTELIGENTE ---
    _formatDateRange(startStr, endStr) {
        const months = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];
        
        const d1 = new Date(startStr + "T12:00:00");
        const d2 = new Date(endStr + "T12:00:00");
        
        const day1 = d1.getDate();
        const month1 = months[d1.getMonth()];
        const year1 = d1.getFullYear();
        
        const day2 = d2.getDate();
        const month2 = months[d2.getMonth()];
        const year2 = d2.getFullYear();

        if (startStr === endStr) {
            return `del ${day1} de ${month1} de ${year1}`;
        }

        if (year1 === year2) {
            if (month1 === month2) {
                return `del ${day1} al ${day2} de ${month1} de ${year1}`;
            }
            return `del ${day1} de ${month1} al ${day2} de ${month2} de ${year1}`;
        }
        
        return `del ${day1} de ${month1} de ${year1} al ${day2} de ${month2} de ${year2}`;
    },
    // --- MOTOR DE OVERLAYS PARA WHATSAPP ---
    async processImageWithOverlays(base64, timestamp) {
        console.log("ExportModule: Procesando imagen con overlays...");
        if (!this.config.whatsappIncludeLogo && !this.config.whatsappIncludeTimestamp) return base64;

        try {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            const img = await this._loadImage(base64);
            
            canvas.width = img.width;
            canvas.height = img.height;
            ctx.drawImage(img, 0, 0);

            const padding = Math.min(canvas.width, canvas.height) * 0.05;

            // 1. Dibujar Logo
            if (this.config.whatsappIncludeLogo && this.config.logo) {
                const logoImg = await this._loadImage(this.config.logo);
                const logoW = canvas.width * 0.18; // Logo un poco más grande para visibilidad
                const logoH = (logoImg.height / logoImg.width) * logoW;
                const pos = this._getCoordinates(this.config.logoPosition, canvas.width, canvas.height, logoW, logoH, padding);
                
                ctx.save();
                ctx.globalAlpha = 0.85;
                ctx.shadowColor = "rgba(0,0,0,0.5)";
                ctx.shadowBlur = 15;
                ctx.drawImage(logoImg, pos.x, pos.y, logoW, logoH);
                ctx.restore();
            }

            // 2. Dibujar Fecha y Hora
            if (this.config.whatsappIncludeTimestamp) {
                const oppositePos = this._getOppositePosition(this.config.logoPosition);
                const fontSize = Math.max(16, canvas.width * 0.028);
                ctx.font = `bold ${fontSize}px Inter, sans-serif, Arial`;
                
                const d = new Date(timestamp || Date.now());
                const dateText = d.toLocaleString('es-ES', { 
                    day: '2-digit', month: '2-digit', year: 'numeric', 
                    hour: '2-digit', minute: '2-digit' 
                }).toUpperCase();

                const textMetrics = ctx.measureText(dateText);
                const textW = textMetrics.width;
                const textH = fontSize;
                const pos = this._getCoordinates(oppositePos, canvas.width, canvas.height, textW, textH, padding);
                
                ctx.save();
                ctx.shadowColor = "black";
                ctx.shadowBlur = 8;
                ctx.shadowOffsetX = 2;
                ctx.shadowOffsetY = 2;
                ctx.fillStyle = State.accentColor || "#cafd00"; // Neon Dinámico
                ctx.fillText(dateText, pos.x, pos.y + textH);
                ctx.restore();
            }

            return canvas.toDataURL('image/jpeg', 0.85);
        } catch (e) {
            console.error("Error processing overlay:", e);
            return base64;
        }
    },

    _getOppositePosition(pos) {
        const mapping = {
            'top-left': 'bottom-right',
            'top-right': 'bottom-left',
            'bottom-left': 'top-right',
            'bottom-right': 'top-left'
        };
        return mapping[pos] || 'bottom-right';
    },

    _getCoordinates(pos, stageW, stageH, itemW, itemH, m) {
        switch(pos) {
            case 'top-left': return { x: m, y: m };
            case 'top-right': return { x: stageW - itemW - m, y: m };
            case 'bottom-left': return { x: m, y: stageH - itemH - m };
            case 'bottom-right': return { x: stageW - itemW - m, y: stageH - itemH - m };
            default: return { x: m, y: m };
        }
    },

    _loadImage(src) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.crossOrigin = "anonymous";
            img.onload = () => resolve(img);
            img.onerror = reject;
            img.src = src;
        });
    },

    async performExport() {
        if (this.isProcessing) return;
        this.isProcessing = true;
        
        const format = this.config.format || 'pdf';
        const tmplId = this.config.template || 'Plantilla1.pdf';
        const project = State.currentProject;

        if (!project) {
            alert("No hay un proyecto activo.");
            this.isProcessing = false;
            return;
        }

        this._updateProgress("VERIFICANDO CATÁLOGO...");
        if (!State.catalog || State.catalog.length === 0) {
            await State.loadCatalog();
        }

        this._updateProgress("FILTRANDO CAPTURAS...");
        
        try {
            const filtered = this.getFilteredPhotos(project);
            if (!filtered || filtered.length === 0) {
                let diag = `PROYECTO: ${project.name}\nMODO: ${this.config.mode.toUpperCase()}`;
                if (this.config.mode === 'dia') diag += `\nDÍA: ${this.config.dateDay}`;
                
                alert(`NO SE ENCONTRARON FOTOS.\n\n${diag}\n\nVerifica que el proyecto y la fecha sean correctos en la Galería.`);
                return;
            }

            const timestamp = Date.now();
            const baseFileName = `Informe_${project.name.replace(/\s+/g, '_')}_${timestamp}`;

            if (format === 'docx') {
                const adaptiveMaxWidth = filtered.length > 300 ? 720 : (filtered.length > 120 ? 800 : 1024);
                if (filtered.length > 120) console.log(`[ExportOptimizer] Adaptando resolución Word a ${adaptiveMaxWidth}px para ${filtered.length} fotos.`);

                this._updateProgress(`GENERANDO WORD Y PDF (${adaptiveMaxWidth}px)...`);
                
                // 1. Generar Word
                if (tmplId === 'Plantilla2.pdf' || tmplId === 'Plantilla3.pdf') {
                    await this._generateTechnicalDocx(project, filtered, `${baseFileName}.docx`, adaptiveMaxWidth);
                } else {
                    await this._generateDocx(project, filtered, `${baseFileName}.docx`, adaptiveMaxWidth);
                }

                // v191.9-TURBO: Guardar metadatos para regeneración on-demand (Opción B)
                const meta = {
                    tmplId,
                    itemIds: filtered.map(f => f.id),
                    projectName: project.name,
                    projectId: project.id,
                    timestamp
                };
                await LogiNative.saveReportMeta(`${baseFileName}.meta`, meta, project.id);
            } else if (format === 'zip') {
                this._updateProgress(`GENERANDO PAQUETE ZIP...`);
                await this._generateZipExport(project, filtered, `${baseFileName}.zip`);
            } else {
                // Solo PDF
                const adaptiveMaxWidth = filtered.length > 300 ? 720 : (filtered.length > 120 ? 800 : 1024);
                if (filtered.length > 120) console.log(`[ExportOptimizer] Adaptando resolución a ${adaptiveMaxWidth}px para ${filtered.length} fotos.`);
                
                this._updateProgress(`GENERANDO REPORTE PDF (${adaptiveMaxWidth}px)...`);
                if (tmplId === 'Plantilla2.pdf' || tmplId === 'Plantilla3.pdf') {
                    await this._generateTechnicalReport(project, filtered, `${baseFileName}.pdf`, adaptiveMaxWidth);
                } else {
                    await this._generateClassicReport(project, filtered, `${baseFileName}.pdf`, adaptiveMaxWidth);
                }
            }
        } catch (error) {
            console.error("ERROR EXPORT:", error);
            alert("Error en exportación: " + error.message);
        } finally {
            this.isProcessing = false;
            this._hideProgress();
            // Notificar a la pantalla de reportes para que se actualice
            if (typeof ReportsModule !== 'undefined' && ReportsModule.loadAndRender) {
                ReportsModule.loadAndRender();
            }
        }
        return;
    },

    async _generateClassicReport(project, filtered, fileName, customResizeWidth) {
        const { PDFDocument, rgb, StandardFonts } = window.PDFLib;
        const doc = await PDFDocument.create();
        const Helvetica = await doc.embedFont(StandardFonts.Helvetica);
        const HelveticaBold = await doc.embedFont(StandardFonts.HelveticaBold);

        let logoImg = null;
        if (this.config.logo) {
            try {
                const logoBytes = await LogiNative.getBlobBytes(this.config.logo);
                if (logoBytes) logoImg = await doc.embedJpg(logoBytes);
            } catch (e) { console.warn("Logo no cargado", e); }
        }

        const PAGE_WIDTH = 595.28; // A4
        const PAGE_HEIGHT = 841.89;
        const MARGIN = 30;
        const PHOTOS_PER_PAGE = 8;
        const COLS = 2;

        let dateLabel = "";
        if (this.config.mode === 'dia') dateLabel = this._formatDateRange(this.config.dateDay, this.config.dateDay);
        else if (this.config.mode === 'mes') {
            const [y, m] = this.config.dateMonth.split('-');
            const lastDay = new Date(y, m, 0).getDate();
            dateLabel = this._formatDateRange(`${y}-${m}-01`, `${y}-${m}-${lastDay}`);
        } else {
            dateLabel = this._formatDateRange(this.config.dateStart, this.config.dateEnd);
        }

        // Ordenar
        filtered.sort((a, b) => {
            const actA = (a.actividad || '').toUpperCase();
            const actB = (b.actividad || '').toUpperCase();
            if (actA < actB) return -1;
            if (actA > actB) return 1;
            return (a.createdAt || 0) - (b.createdAt || 0);
        });

        for (let i = 0; i < filtered.length; i += PHOTOS_PER_PAGE) {
            const pageNum = Math.floor(i / PHOTOS_PER_PAGE) + 1;
            const totalPages = Math.ceil(filtered.length / PHOTOS_PER_PAGE);
            this._updateProgress(`GENERANDO PÁGINA ${pageNum} DE ${totalPages}...`);

            const page = doc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
            const chunk = filtered.slice(i, i + PHOTOS_PER_PAGE);

            this._drawHeader(page, project, logoImg, dateLabel, Helvetica, HelveticaBold, rgb, PAGE_WIDTH, PAGE_HEIGHT, MARGIN);

            const slotW = (PAGE_WIDTH - (MARGIN * 2) - 20) / COLS;
            const slotH = 185;

            for (let j = 0; j < chunk.length; j++) {
                const snap = chunk[j];
                const col = j % COLS;
                const row = Math.floor(j / COLS);
                const x = MARGIN + (col * (slotW + 20));
                const y = PAGE_HEIGHT - 100 - ((row + 1) * slotH);
                await this._drawPhotoSlot(doc, page, snap, i + j + 1, x, y, slotW, slotH, Helvetica, HelveticaBold, rgb, customResizeWidth);
            }

            page.drawText(`Logi Kinetic | Página ${pageNum} de ${totalPages}`, {
                x: MARGIN, y: 15, size: 7, font: Helvetica, color: rgb(0.5, 0.5, 0.5)
            });

            if (pageNum % 4 === 0) {
                this._updateProgress(`ESTABILIZANDO MEMORIA... (${pageNum}/${totalPages})`);
                await new Promise(r => setTimeout(r, 250));
            }
        }

        const pdfBytes = await doc.save();
        const finalName = fileName || `Reporte_Clasico_${project.name || 'Logi'}_${Date.now()}.pdf`;
        this._updateProgress("GUARDANDO EN DISCO...");
        const blob = new Blob([pdfBytes], { type: 'application/pdf' });
        this._updateProgress("COMPARTIENDO INFORMACIÓN...");
        await LogiNative.shareBlob(blob, finalName, project.id);
    },

    _drawHeader(page, project, logoImg, dateLabel, fontNormal, fontBold, rgb, w, h, m) {
        const acc = this._getAccentRgb();
        page.drawRectangle({ x: 0, y: h - 5, width: w, height: 5, color: rgb(acc.r, acc.g, acc.b) });
        page.drawText("LOGI", { x: m, y: h - 35, size: 18, font: fontBold, color: rgb(acc.r, acc.g, acc.b) });
        const projectName = (project.name || "S/N").toUpperCase();
        page.drawText(projectName, { x: m + 50, y: h - 35, size: 11, font: fontBold, color: rgb(0.1, 0.1, 0.1) });
        page.drawText(`REGISTRO FOTOGRÁFICO: ${dateLabel.toUpperCase()}`, { x: m + 50, y: h - 48, size: 7, font: fontNormal, color: rgb(0.4, 0.4, 0.4) });

        if (logoImg) {
            const lW = 40;
            const lH = (logoImg.height / logoImg.width) * lW;
            page.drawImage(logoImg, { x: w - m - lW, y: h - 55, width: lW, height: lH });
        }
    },

    async _generateTechnicalReport(project, filtered, fileName, customResizeWidth) {
        const { PDFDocument, rgb, StandardFonts } = window.PDFLib;
        const doc = await PDFDocument.create();
        const Helvetica = await doc.embedFont(StandardFonts.Helvetica);
        const HelveticaBold = await doc.embedFont(StandardFonts.HelveticaBold);

        let logoImg = null;
        if (this.config.logo) {
            try {
                const logoBytes = await LogiNative.getBlobBytes(this.config.logo);
                if (logoBytes) logoImg = await doc.embedJpg(logoBytes);
            } catch (e) { console.warn("Logo no cargado", e); }
        }

        const PAGE_WIDTH = 612; // Letter
        const PAGE_HEIGHT = 792;
        const MARGIN = 40;
        const PHOTOS_PER_PAGE = 6;
        const COLS = 2;

        let dateLabel = "";
        if (this.config.mode === 'dia') dateLabel = this._formatDateRange(this.config.dateDay, this.config.dateDay);
        else if (this.config.mode === 'mes') {
            const [y, m] = this.config.dateMonth.split('-');
            const lastDay = new Date(y, m, 0).getDate();
            dateLabel = this._formatDateRange(`${y}-${m}-01`, `${y}-${m}-${lastDay}`);
        } else {
            dateLabel = this._formatDateRange(this.config.dateStart, this.config.dateEnd);
        }

        // Ordenar
        filtered.sort((a, b) => {
            const actA = (a.actividad || '').toUpperCase();
            const actB = (b.actividad || '').toUpperCase();
            if (actA < actB) return -1;
            if (actA > actB) return 1;
            return (a.createdAt || 0) - (b.createdAt || 0);
        });

        for (let i = 0; i < filtered.length; i += PHOTOS_PER_PAGE) {
            const pageNum = Math.floor(i / PHOTOS_PER_PAGE) + 1;
            const totalPages = Math.ceil(filtered.length / PHOTOS_PER_PAGE);
            this._updateProgress(`GENERANDO PÁGINA ${pageNum} DE ${totalPages}...`);

            const page = doc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
            const chunk = filtered.slice(i, i + PHOTOS_PER_PAGE);

            this._drawHeaderV2(page, project, logoImg, dateLabel, Helvetica, HelveticaBold, rgb, PAGE_WIDTH, PAGE_HEIGHT, MARGIN);

            const slotW = (PAGE_WIDTH - (MARGIN * 2) - 20) / COLS;
            const slotH = 210; 

            for (let j = 0; j < chunk.length; j++) {
                const snap = chunk[j];
                const col = j % COLS;
                const row = Math.floor(j / COLS);
                const x = MARGIN + (col * (slotW + 20));
                const y = PAGE_HEIGHT - 120 - ((row + 1) * slotH);
                await this._drawPhotoSlotV2(doc, page, snap, i + j + 1, x, y, slotW, slotH, Helvetica, HelveticaBold, rgb, customResizeWidth);
            }

            page.drawText(`Logi Kinetic | Página ${pageNum} de ${totalPages} | RPT-AS-${project.id || 0}`, {
                x: MARGIN, y: 15, size: 7, font: Helvetica, color: rgb(0.5, 0.5, 0.5)
            });

            if (pageNum % 4 === 0) {
                this._updateProgress(`ESTABILIZANDO MEMORIA... (${pageNum}/${totalPages})`);
                await new Promise(r => setTimeout(r, 250));
            }
        }

        const pdfBytes = await doc.save();
        const finalName = fileName || `Reporte_Tecnico_${project.name || 'Logi'}_${Date.now()}.pdf`;
        this._updateProgress("GUARDANDO EN DISCO...");
        const blob = new Blob([pdfBytes], { type: 'application/pdf' });
        this._updateProgress("COMPARTIENDO INFORMACIÓN...");
        await LogiNative.shareBlob(blob, finalName, project.id);
    },

    _drawHeaderV2(page, project, logoImg, dateLabel, fontNormal, fontBold, rgb, w, h, m) {
        page.drawRectangle({ x: m, y: h - 105, width: w - (m * 2), height: 1.5, color: rgb(0,0,0) });
        page.drawText("LOGI", { x: m, y: h - 60, size: 28, font: fontBold, color: rgb(0,0,0) });
        page.drawText("SISTEMAS DE CONTROL TÉCNICO", { x: m, y: h - 78, size: 8, font: fontNormal, color: rgb(0.6, 0.6, 0.6) });

        const rightX = w - m;
        const emissionDate = new Date().toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' }).toUpperCase();
        
        const drawR = (text, y, size, bold = false) => {
            const font = bold ? fontBold : fontNormal;
            const tw = font.widthOfTextAtSize(text, size);
            page.drawText(text, { x: rightX - tw, y, size, font, color: rgb(0,0,0) });
        };

        drawR(`PROYECTO: ${(project.name || "S/N").toUpperCase()}`, h - 45, 12, true);
        drawR("INFORME TÉCNICO DIARIO", h - 60, 10);
        drawR(`FECHA DE EMISIÓN: ${emissionDate}`, h - 75, 10);
        drawR(`CÓDIGO: RPT-AS-094-2024`, h - 90, 10);

        if (logoImg) {
            const lW = 45;
            const lH = (logoImg.height / logoImg.width) * lW;
            page.drawImage(logoImg, { x: m + 80, y: h - 65, width: lW, height: lH });
        }
    },

    async _drawPhotoSlot(doc, page, snap, idx, x, y, slotW, slotH, font, fontBold, rgb, customResizeWidth) {
        try {
            let imgBytes = await LogiNative.getBlobBytes(snap.filename);
            if (imgBytes) {
                // v191.9-TITAN-ULTRA: Redimensionamiento dinámico
                const resizeW = customResizeWidth || 1024;
                // v191.9-TITAN-ULTRA: Procesamiento con marca de agua opcional
                const includeLogo = this.config.whatsappIncludeLogo;
                const includeTime = this.config.whatsappIncludeTimestamp;
                imgBytes = await this._processImage(imgBytes, resizeW, includeLogo, includeTime, snap, true); 
                
                const img = await doc.embedJpg(imgBytes);
                const FIXED_W = 220.8; // 7.79 cm
                const FIXED_H = 134;   // 4.73 cm
                
                // Reducimos el área de la foto para dar más espacio abajo
                const textSpace = 55; 
                const photoAreaH = slotH - textSpace;
                
                const drawX = x + (slotW - FIXED_W) / 2;
                const drawY = y + textSpace + (photoAreaH - FIXED_H) / 2;

                // Marco de la foto
                page.drawRectangle({ 
                    x: drawX - 1, y: drawY - 1, 
                    width: FIXED_W + 2, height: FIXED_H + 2, 
                    color: rgb(0.95, 0.95, 0.95) 
                });

                // Imagen
                page.drawImage(img, { x: drawX, y: drawY, width: FIXED_W, height: FIXED_H });

                // INDICE (Neon Square)
                const boxSize = 14;
                const boxX = drawX + 5;
                const boxY = drawY + FIXED_H - 5 - boxSize;
                const acc = this._getAccentRgb();
                page.drawRectangle({ x: boxX, y: boxY, width: boxSize, height: boxSize, color: rgb(acc.r, acc.g, acc.b) });
                page.drawText(String(idx), { x: boxX + (idx < 10 ? 4 : 2), y: boxY + 4, size: 8, font: fontBold, color: rgb(0,0,0) });

                // Descripciones (Aumentamos separación vertical movemos labelY hacia abajo)
                let labelY = y + 42; 
                
                const itemCode = (snap.actividad || 'GENERAL').toUpperCase();
                const itemName = this._getItemName(itemCode);
                const fullLabel = itemName ? `FOTO ${idx}: ${itemCode} - ${itemName}` : `FOTO ${idx}: ${itemCode}`;

                const labelLines = this._wrapText(fullLabel, 38);
                labelLines.slice(0, 2).forEach((line, lIdx) => {
                    page.drawText(line, {
                        x: x, y: labelY - (lIdx * 9), size: 7.5, font: fontBold, color: rgb(0, 0, 0)
                    });
                });
                
                const desc = (snap.descripcion || 'SIN DESCRIPCIÓN').toUpperCase();
                const lines = this._wrapText(desc, 50);
                const descStartY = labelY - (labelLines.slice(0, 2).length * 9) - 2;

                lines.slice(0, 2).forEach((line, lIdx) => {
                    page.drawText(line, {
                        x: x, y: descStartY - (lIdx * 8), size: 6, font: font, color: rgb(0.4, 0.4, 0.4)
                    });
                });
            }
        } catch (e) {
            console.error(`Error procesando foto ${idx}:`, e);
        }
    },

    _wrapText(text, maxChars) {
        const words = text.split(' ');
        const lines = [];
        let currentLine = '';
        words.forEach(word => {
            if ((currentLine + word).length > maxChars) {
                lines.push(currentLine.trim());
                currentLine = word + ' ';
            } else {
                currentLine += word + ' ';
            }
        });
        lines.push(currentLine.trim());
        return lines;
    },

    /**
     * _processImage: MOTOR DE PROCESAMIENTO HÍBRIDO (v192-TITAN-X)
     * Maneja redimensionamiento, marca de agua (logo) y estampado de fecha/hora.
     */
    async _processImage(uint8Array, maxWidth, includeLogo = false, includeTimestamp = false, itemMeta = null, isClassic = false) {
        return new Promise((resolve) => {
            const blob = new Blob([uint8Array], { type: 'image/jpeg' });
            const url = URL.createObjectURL(blob);
            const img = new Image();
            img.onload = async () => {
                URL.revokeObjectURL(url);
                const canvas = document.createElement('canvas');
                let width = img.width;
                let height = img.height;

                if (width > maxWidth) {
                    height = (maxWidth / width) * height;
                    width = maxWidth;
                }

                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, width, height);

                // 1. Aplicar Logo si se solicita y existe
                if (includeLogo && this.config.logo) {
                    try {
                        const logoImg = await new Promise((resLogo, rejLogo) => {
                            const li = new Image();
                            li.onload = () => resLogo(li);
                            li.onerror = rejLogo;
                            li.src = this.config.logo.startsWith('data:') ? this.config.logo : 'data:image/png;base64,' + this.config.logo;
                        });
                        
                        const logoSize = Math.floor(width * 0.18); // 18% del ancho
                        const logoH = Math.floor((logoSize / logoImg.width) * logoImg.height);
                        const margin = 20;
                        
                        let lx = margin, ly = margin;
                        if (this.config.logoPosition === 'top-right') lx = width - logoSize - margin;
                        else if (this.config.logoPosition === 'bottom-left') ly = height - logoH - margin;
                        else if (this.config.logoPosition === 'bottom-right') { lx = width - logoSize - margin; ly = height - logoH - margin; }
                        
                        ctx.globalAlpha = 0.9;
                        ctx.drawImage(logoImg, lx, ly, logoSize, logoH);
                        ctx.globalAlpha = 1.0;
                    } catch(e) { console.warn("[Export] Error dibujando logo:", e); }
                }

                // 2. Aplicar Fecha y Hora (En esquina opuesta al logo para evitar solapamiento)
                if (includeTimestamp) {
                    const now = (itemMeta && itemMeta.createdAt) ? new Date(itemMeta.createdAt) : new Date();
                    const dateStr = now.toLocaleDateString() + ' ' + now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                    
                    const fontSize = Math.max(14, Math.floor(width * 0.03));
                    ctx.font = `bold ${fontSize}px sans-serif`;
                    
                    const textW = ctx.measureText(dateStr).width;
                    const margin = 20;

                    // Lógica de posicionamiento opuesto (v192.1)
                    let tx, ty, tAlign;
                    const lp = (includeLogo && this.config.logo) ? (this.config.logoPosition || 'top-left') : 'none';

                    if (lp === 'bottom-right') {
                        tx = margin; 
                        ty = margin + fontSize; 
                        
                        // v192.9-OAK: Si es Formato Clásico, el número de foto (Naranja) está en top-left.
                        // Desplazamos la estampa hacia abajo para evitar solapamiento.
                        if (isClassic) ty += (fontSize + 10); 
                        
                        tAlign = 'left';
                    } else if (lp === 'top-right') {
                        tx = margin; ty = height - margin; tAlign = 'left';
                    } else if (lp === 'bottom-left') {
                        tx = width - margin; ty = margin + fontSize; tAlign = 'right';
                    } else {
                        // Default: bottom-right (si el logo está en top-left o no hay logo)
                        tx = width - margin; ty = height - margin; tAlign = 'right';
                    }

                    ctx.textAlign = tAlign;
                    
                    // Fondo semi-transparente para legibilidad extrema
                    ctx.fillStyle = 'rgba(0,0,0,0.6)';
                    const rectX = tAlign === 'right' ? tx - textW - 10 : tx - 10;
                    ctx.fillRect(rectX, ty - fontSize - 5, textW + 20, fontSize + 15);
                    
                    ctx.fillStyle = '#cafd00'; // Color primario Logi
                    ctx.fillText(dateStr.toUpperCase(), tx, ty);
                }

                canvas.toBlob((resultBlob) => {
                    const reader = new FileReader();
                    reader.onloadend = () => resolve(new Uint8Array(reader.result));
                    reader.readAsArrayBuffer(resultBlob);
                }, 'image/jpeg', 0.82);
            };
            img.onerror = () => { URL.revokeObjectURL(url); resolve(uint8Array); };
            img.src = url;
        });
    },

    /**
     * Prepara una imagen para compartir en redes (WhatsApp) con marca de agua (v191.9-PREMIUM)
     */
    async processForShare(item) {
        try {
            let bytes = await LogiNative.getBlobBytes(item.filename);
            if (!bytes) return null;

            // v191.9-TURBO: Aplicar configuración de marca de agua
            const includeLogo = this.config.whatsappIncludeLogo;
            const includeTime = this.config.whatsappIncludeTimestamp;

            bytes = await this._processImage(bytes, 1280, includeLogo, includeTime, item);
            
            // Convertir a Base64 para LogiNative.shareProcessed
            const base64 = await new Promise(r => {
                const reader = new FileReader();
                reader.onloadend = () => r(reader.result);
                reader.readAsDataURL(new Blob([bytes], { type: 'image/jpeg' }));
            });

            return { filename: item.filename, base64 };
        } catch (e) {
            console.error("[Export] Error procesando para compartir:", e);
            return null;
        }
    },

    getFilteredPhotos(project) {
        // v192.2-FIX: State.items ya está filtrado por proyecto (usando normalización de IDs).
        // Volver a filtrar por projectId === project.id aquí causaba que fotos con IDs con/sin prefijo 
        // desaparecieran si no coincidían exactamente, aunque aparecieran en la galería.
        const projectPhotos = State.items || [];
        
        console.log(`[ExportFilter] Iniciando filtrado para ${projectPhotos.length} fotos del proyecto.`);

        const getLocalDateStr = (timestamp) => {
            if (!timestamp) return "";
            const d = new Date(timestamp);
            if (isNaN(d.getTime())) return "";
            
            const y = d.getFullYear();
            const m = String(d.getMonth() + 1).padStart(2, '0');
            const r = String(d.getDate()).padStart(2, '0');
            return `${y}-${m}-${r}`;
        };

        if (this.config.mode === 'dia') {
            const target = this.config.dateDay; // "YYYY-MM-DD"
            const filtered = projectPhotos.filter(p => getLocalDateStr(p.createdAt) === target);
            console.log(`[ExportFilter] Modo DÍA (${target}): Encontradas ${filtered.length} fotos.`);
            return filtered;
        } else if (this.config.mode === 'mes') {
            const target = this.config.dateMonth; // "YYYY-MM"
            const filtered = projectPhotos.filter(p => getLocalDateStr(p.createdAt).startsWith(target));
            console.log(`[ExportFilter] Modo MES (${target}): Encontradas ${filtered.length} fotos.`);
            return filtered;
        } else {
            const start = this.config.dateStart;
            const end = this.config.dateEnd;
            const filtered = projectPhotos.filter(p => {
                const ds = getLocalDateStr(p.createdAt);
                return ds >= start && ds <= end;
            });
            console.log(`[ExportFilter] Modo RANGO (${start} a ${end}): Encontradas ${filtered.length} fotos.`);
            return filtered;
        }
    },

    async _generateDocx(project, filtered, fileName, customResizeWidth) {
        try {
             // Ordenar
             filtered.sort((a, b) => {
                const actA = (a.actividad || '').toUpperCase();
                const actB = (b.actividad || '').toUpperCase();
                if (actA < actB) return -1;
                if (actA > actB) return 1;
                return (a.createdAt || 0) - (b.createdAt || 0);
            });

            let dateLabel = "";
            if (this.config.mode === 'dia') dateLabel = this._formatDateRange(this.config.dateDay, this.config.dateDay);
            else if (this.config.mode === 'mes') {
                const [y, m] = this.config.dateMonth.split('-');
                const lastDay = new Date(y, m, 0).getDate();
                dateLabel = this._formatDateRange(`${y}-${m}-01`, `${y}-${m}-${lastDay}`);
            } else {
                dateLabel = this._formatDateRange(this.config.dateStart, this.config.dateEnd);
            }

            // --- HEADER (Usando Tabla para máxima estabilidad) ---
            let headerLogoContent = [];
            if (this.config.logo) {
                const logoBytes = await LogiNative.getBlobBytes(this.config.logo);
                if (logoBytes) {
                    headerLogoContent.push(new Paragraph({
                        children: [
                            new ImageRun({
                                data: logoBytes,
                                transformation: { width: 45, height: 45 },
                            }),
                        ],
                        alignment: AlignmentType.RIGHT,
                    }));
                }
            }

            const headerTable = new Table({
                width: { size: 100, type: WidthType.PERCENTAGE },
                borders: {
                    top: { style: BorderStyle.NONE },
                    bottom: { style: BorderStyle.SINGLE, size: 1, color: "E0E0E0" },
                    left: { style: BorderStyle.NONE },
                    right: { style: BorderStyle.NONE },
                },
                rows: [
                    new TableRow({
                        children: [
                            new TableCell({
                                children: [
                                    new Paragraph({
                                        children: [
                                            new TextRun({ text: "LOGI", bold: true, color: "555555", size: 32 }), 
                                            new TextRun({ text: `  |  ${(project.name || "").toUpperCase()}`, bold: true, color: "000000", size: 20 }),
                                        ],
                                    }),
                                    new Paragraph({
                                        children: [
                                            new TextRun({ text: `REGISTRO FOTOGRÁFICO: ${dateLabel.toUpperCase()}`, color: "888888", size: 14 }),
                                        ],
                                        spacing: { after: 100 },
                                    }),
                                ],
                                width: { size: 70, type: WidthType.PERCENTAGE },
                                borders: { bottom: { style: BorderStyle.NONE } }
                            }),
                            new TableCell({
                                children: headerLogoContent.length > 0 ? headerLogoContent : [new Paragraph({ text: "" })],
                                width: { size: 30, type: WidthType.PERCENTAGE },
                                borders: { bottom: { style: BorderStyle.NONE } }
                            }),
                        ],
                    }),
                ],
            });

            // --- CUERPO (TABLA 2 COLUMNAS) ---
            const docRows = [];
            for (let i = 0; i < filtered.length; i += 2) {
                this._updateProgress(`PROCESANDO WORD: FOTOS ${i+1}-${Math.min(i+2, filtered.length)}...`);
                const chunk = filtered.slice(i, i + 2);
                const cells = [];

                for (let j = 0; j < 2; j++) {
                    const snap = chunk[j];
                    const cellChildren = [];
                    
                    if (snap) {
                        const imgBytes = await LogiNative.getBlobBytes(snap.filename);
                        if (imgBytes) {
                            cellChildren.push(new Paragraph({
                                children: [
                                    new ImageRun({
                                        data: imgBytes,
                                        transformation: { width: 280, height: 170 },
                                    }),
                                ],
                                alignment: AlignmentType.CENTER,
                                spacing: { before: 200, after: 100 },
                            }));
                        }

                        const itemName = this._getItemName((snap.actividad || 'GENERAL').toUpperCase());
                        cellChildren.push(new Paragraph({
                            children: [
                                new TextRun({ 
                                    text: itemName 
                                        ? `FOTO ${i + j + 1}: ${(snap.actividad || 'GENERAL').toUpperCase()} - ${itemName}`
                                        : `FOTO ${i + j + 1}: ${(snap.actividad || 'GENERAL').toUpperCase()}`, 
                                    bold: true, size: 18 
                                }),
                            ],
                            alignment: AlignmentType.LEFT,
                        }));

                        cellChildren.push(new Paragraph({
                            children: [
                                new TextRun({ text: (snap.descripcion || 'SIN DESCRIPCIÓN').toUpperCase(), color: "444444", size: 14 }),
                            ],
                            alignment: AlignmentType.LEFT,
                            spacing: { after: 300 },
                        }));
                    }

                    cells.push(new TableCell({
                        children: cellChildren,
                        width: { size: 4500, type: WidthType.DXA },
                        borders: {
                            top: { style: BorderStyle.NONE },
                            bottom: { style: BorderStyle.NONE },
                            left: { style: BorderStyle.NONE },
                            right: { style: BorderStyle.NONE },
                        }
                    }));
                }
                docRows.push(new TableRow({ children: cells }));
            }

            const mainTable = new Table({
                rows: docRows,
                width: { size: 100, type: WidthType.PERCENTAGE },
            });

            const doc = new Document({
                styles: {
                    default: {
                        document: {
                            run: {
                                font: "Segoe UI",
                                size: 20, 
                            },
                        },
                    },
                },
                sections: [{
                    headers: { default: new Header({ children: [headerTable] }) },
                    children: [mainTable],
                }],
            });

            this._updateProgress("EMPAQUETANDO WORD...");
            const blob = await Packer.toBlob(doc);
            const finalName = fileName || `Reporte_${project.name || 'Logi'}_${Date.now()}.docx`;
            this._updateProgress("GUARDANDO EN DISCO...");
            await LogiNative.shareBlob(blob, finalName, project.id);

        } catch (e) {
            console.error("Error DOCX:", e);
            alert("Error Word: " + e.message);
        }
    },

    async _generateTechnicalDocx(project, filtered, fileName, customResizeWidth) {
        try {
            // Ordenar
            filtered.sort((a, b) => {
                const actA = (a.actividad || '').toUpperCase();
                const actB = (b.actividad || '').toUpperCase();
                if (actA < actB) return -1;
                if (actA > actB) return 1;
                return (a.createdAt || 0) - (b.createdAt || 0);
            });

            const emissionDate = new Date().toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' }).toUpperCase();

            // --- HEADER V2 (Tabla de alta fidelidad) ---
            let logoCellChildren = [];
            if (this.config.logo) {
                const logoBytes = await LogiNative.getBlobBytes(this.config.logo);
                if (logoBytes) {
                    logoCellChildren.push(new Paragraph({
                        children: [new ImageRun({ data: logoBytes, transformation: { width: 50, height: 50 } })],
                        alignment: AlignmentType.CENTER,
                    }));
                }
            }

            const headerTable = new Table({
                width: { size: 100, type: WidthType.PERCENTAGE },
                borders: {
                    top: { style: BorderStyle.NONE }, bottom: { style: BorderStyle.SINGLE, size: 2, color: "000000" },
                    left: { style: BorderStyle.NONE }, right: { style: BorderStyle.NONE },
                    insideHorizontal: { style: BorderStyle.NONE }, insideVertical: { style: BorderStyle.NONE }
                },
                rows: [
                    new TableRow({
                        children: [
                            new TableCell({
                                children: [
                                    new Paragraph({
                                        children: [new TextRun({ text: "LOGI", bold: true, size: 48, color: "000000" })],
                                        spacing: { before: 200 }
                                    }),
                                    new Paragraph({
                                        children: [new TextRun({ text: "SISTEMAS DE CONTROL TÉCNICO", size: 16, color: "999999" })],
                                        spacing: { after: 200 }
                                    })
                                ],
                                width: { size: 40, type: WidthType.PERCENTAGE }
                            }),
                            new TableCell({
                                children: logoCellChildren.length > 0 ? logoCellChildren : [new Paragraph("")],
                                width: { size: 20, type: WidthType.PERCENTAGE },
                                verticalAlign: VerticalAlign.CENTER
                            }),
                            new TableCell({
                                children: [
                                    new Paragraph({
                                        children: [new TextRun({ text: `PROYECTO: ${(project.name || "S/N").toUpperCase()}`, bold: true, size: 24 })],
                                        alignment: AlignmentType.RIGHT
                                    }),
                                    new Paragraph({
                                        children: [new TextRun({ text: "INFORME TÉCNICO DIARIO", size: 18 })],
                                        alignment: AlignmentType.RIGHT
                                    }),
                                    new Paragraph({
                                        children: [new TextRun({ text: `FECHA DE EMISIÓN: ${emissionDate}`, size: 18 })],
                                        alignment: AlignmentType.RIGHT,
                                        spacing: { after: 200 }
                                    })
                                ],
                                width: { size: 40, type: WidthType.PERCENTAGE }
                            })
                        ]
                    })
                ]
            });

            // --- GRID 2 COLUMNAS (Stitch V2 Style + TITAN-X Optimization) ---
            const docRows = [];
            for (let i = 0; i < filtered.length; i += 2) {
                const pageNum = Math.floor(i / 2) + 1;
                const totalPages = Math.ceil(filtered.length / 2);
                this._updateProgress(`CONSTRUYENDO WORD... (${pageNum}/${totalPages})`);

                const chunk = filtered.slice(i, i + 2);
                const cells = [];

                for (let j = 0; j < 2; j++) {
                    const snap = chunk[j];
                    const cellChildren = [];

                    if (snap) {
                        let imgBytes = await LogiNative.getBlobBytes(snap.filename);
                        if (imgBytes) {
                            // v191.9-TITAN-X: Redimensionar antes de meter al Word para evitar cierres
                            const resizeW = customResizeWidth || 1024;
                            imgBytes = await this._resizeImage(imgBytes, resizeW);
                            
                            cellChildren.push(new Paragraph({
                                children: [new ImageRun({ data: imgBytes, transformation: { width: 300, height: 180 } })],
                                alignment: AlignmentType.CENTER,
                                spacing: { before: 400, after: 200 }
                            }));
                        }

                        // Contenedor de Texto con Borde Izquierdo (Simulando línea negra)
                        const activityTxt = (snap.actividad || 'GENERAL').toUpperCase();
                        const descriptionTxt = (snap.descripcion || 'SIN DESCRIPCIÓN').toUpperCase();
                        const itemName = this._getItemName(activityTxt);

                        cellChildren.push(new Table({
                            width: { size: 100, type: WidthType.PERCENTAGE },
                            borders: {
                                left: { style: BorderStyle.SINGLE, size: 24, color: "000000" },
                                top: { style: BorderStyle.NONE }, bottom: { style: BorderStyle.NONE }, right: { style: BorderStyle.NONE },
                                insideHorizontal: { style: BorderStyle.NONE }, insideVertical: { style: BorderStyle.NONE }
                            },
                            rows: [
                                new TableRow({
                                    children: [
                                        new TableCell({
                                            children: [
                                                new Paragraph({
                                                    children: [new TextRun({ 
                                                        text: itemName ? `FOTO ${i + j + 1}: ${activityTxt} - ${itemName}` : `FOTO ${i + j + 1}: ${activityTxt}`, 
                                                        bold: true, size: 20 
                                                    })],
                                                    indent: { left: 240 }
                                                }),
                                                new Paragraph({
                                                    children: [new TextRun({ text: descriptionTxt, size: 16, color: "666666" })],
                                                    indent: { left: 240 },
                                                    spacing: { after: 400 }
                                                })
                                            ],
                                            borders: { left: { style: BorderStyle.NONE } } // Ya lo tiene la tabla
                                        })
                                    ]
                                })
                            ]
                        }));
                    } else {
                        cellChildren.push(new Paragraph(""));
                    }

                    cells.push(new TableCell({
                        children: cellChildren,
                        width: { size: 50, type: WidthType.PERCENTAGE },
                        borders: { top: { style: BorderStyle.NONE }, bottom: { style: BorderStyle.NONE }, left: { style: BorderStyle.NONE }, right: { style: BorderStyle.NONE } }
                    }));
                }
                docRows.push(new TableRow({ children: cells }));
            }

            const mainTable = new Table({
                rows: docRows,
                width: { size: 100, type: WidthType.PERCENTAGE },
                borders: { top: { style: BorderStyle.NONE }, bottom: { style: BorderStyle.NONE }, left: { style: BorderStyle.NONE }, right: { style: BorderStyle.NONE }, insideHorizontal: { style: BorderStyle.NONE }, insideVertical: { style: BorderStyle.NONE } }
            });

            const doc = new Document({
                styles: {
                    default: {
                        document: {
                            run: { font: "Segoe UI", size: 20 }
                        }
                    }
                },
                sections: [{
                    properties: { page: { size: { width: 11906, height: 16838 } } }, // A4
                    headers: { default: new Header({ children: [headerTable] }) },
                    children: [mainTable],
                }],
            });

            this._updateProgress("EMPAQUETANDO WORD...");
            const blob = await Packer.toBlob(doc);
            const finalName = fileName || `Informe_Tecnico_${project.name || 'Logi'}_${Date.now()}.docx`;
            this._updateProgress("GUARDANDO EN DISCO...");
            await LogiNative.shareBlob(blob, finalName, project.id);

        } catch (e) {
            console.error("Error DOCX V2:", e);
            alert("Error Word Técnico: " + e.message);
        }
    },

    async _drawPhotoSlotV2(doc, page, snap, idx, x, y, slotW, slotH, font, fontBold, rgb, customResizeWidth) {
        try {
            let imgBytes = await LogiNative.getBlobBytes(snap.filename);
            if (imgBytes) {
                // v191.9-TITAN-ULTRA: Procesamiento con marca de agua opcional
                const includeLogo = this.config.whatsappIncludeLogo;
                const includeTime = this.config.whatsappIncludeTimestamp;
                const resizeW = customResizeWidth || 1024;

                imgBytes = await this._processImage(imgBytes, resizeW, includeLogo, includeTime, snap, false);
                
                const img = await doc.embedJpg(imgBytes);
                const drawW = slotW - 10;
                const drawH = 130;
                
                page.drawImage(img, { x: x, y: y + slotH - drawH, width: drawW, height: drawH });

                // Indicador Vertical Negro (Mockup)
                const textY = y + slotH - drawH - 20;
                page.drawRectangle({ x: x, y: textY - 35, width: 2, height: 45, color: rgb(0,0,0) });

                const activityTxt = (snap.actividad || 'GENERAL').toUpperCase();
                const itemName = this._getItemName(activityTxt);
                const fullLabel = itemName ? `FOTO ${idx}: ${activityTxt} - ${itemName}` : `FOTO ${idx}: ${activityTxt}`;

                const labelLines = this._wrapText(fullLabel, 35);
                labelLines.slice(0, 2).forEach((line, lIdx) => {
                    page.drawText(line, {
                        x: x + 10, y: textY - (lIdx * 10), size: 9, font: fontBold, color: rgb(0, 0, 0)
                    });
                });
                
                const desc = (snap.descripcion || 'SIN DESCRIPCIÓN').toUpperCase();
                const lines = this._wrapText(desc, 50);
                const descStartY = textY - (labelLines.slice(0, 2).length * 10) - 2;

                lines.slice(0, 2).forEach((line, lIdx) => {
                    page.drawText(line, {
                        x: x + 10, y: descStartY - (lIdx * 9), size: 7, font: font, color: rgb(0.4, 0.4, 0.4)
                    });
                });
            }
        } catch (e) { console.error(e); }
    },

    /**
     * Regenera un PDF a partir de un archivo .meta (Opción B)
     */
    async regeneratePdfFromMeta(metaFilename, projectId) {
        try {
            const meta = await LogiNative.getReportMeta(metaFilename, projectId);
            if (!meta) throw new Error("No se encontraron metadatos para este reporte.");

            this._updateProgress("RECONSTRUYENDO DATOS...");
            
            // Reconstruir lista de items filtrada
            const allItems = State._allItems || [];
            const filtered = meta.itemIds.map(id => allItems.find(it => it.id === id)).filter(Boolean);
            
            if (filtered.length === 0) throw new Error("Los items originales ya no existen en este proyecto.");

            const adaptiveMaxWidth = filtered.length > 300 ? 720 : (filtered.length > 120 ? 800 : 1024);
            const pdfName = metaFilename.replace('.meta', '.pdf');
            const project = { id: meta.projectId, name: meta.projectName };

            this._updateProgress(`RE-GENERANDO PDF (${adaptiveMaxWidth}px)...`);

            if (meta.tmplId === 'Plantilla2.pdf' || meta.tmplId === 'Plantilla3.pdf') {
                await this._generateTechnicalReport(project, filtered, pdfName, adaptiveMaxWidth);
            } else {
                await this._generateClassicReport(project, filtered, pdfName, adaptiveMaxWidth);
            }

            return true;
        } catch (e) {
            console.error("RegeneratePdf Error:", e);
            alert("Error al regenerar PDF: " + e.message);
            return false;
        } finally {
            setTimeout(() => this._updateProgress(null), 1000);
        }
    },

    async _generateZipExport(project, filtered, fileName) {
        if (typeof JSZip === 'undefined') {
            alert("Librería de compresión no cargada. Reintenta en unos segundos.");
            return;
        }

        try {
            const zip = new JSZip();
            this._updateProgress("PREPARANDO ZIP...");

            // Agrupar por fecha local
            const groups = {};
            filtered.forEach(photo => {
                const d = new Date(photo.createdAt || Date.now());
                const dateStr = d.toISOString().split('T')[0];
                if (!groups[dateStr]) groups[dateStr] = [];
                groups[dateStr].push(photo);
            });

            const dates = Object.keys(groups).sort();
            let processedCount = 0;
            const totalCount = filtered.length;

            for (const dateStr of dates) {
                const folder = zip.folder(dateStr);
                const photosInDate = groups[dateStr];
                
                for (let i = 0; i < photosInDate.length; i++) {
                    const photo = photosInDate[i];
                    processedCount++;
                    this._updateProgress(`EMPAQUETANDO: ${dateStr} (${i+1}/${photosInDate.length}) | Total: ${processedCount}/${totalCount}`);
                    
                    const bytes = await LogiNative.getBlobBytes(photo.filename);
                    if (bytes) {
                        folder.file(photo.filename, bytes);
                    }
                    
                    // Ceder el control cada 5 fotos para no congelar la UI
                    if(processedCount % 5 === 0) await new Promise(r => setTimeout(r, 0));
                }
            }

            this._updateProgress("GENERANDO ARCHIVO ZIP...");
            const content = await zip.generateAsync({ type: "blob" });
            
            this._updateProgress("COMPARTIENDO ZIP...");
            await LogiNative.shareBlob(content, fileName, project.id);
            
            console.log(`[Export] ZIP generado con éxito: ${fileName} (${totalCount} fotos)`);
        } catch (err) {
            console.error("Zip Export Error:", err);
            alert("Error al generar el ZIP: " + err.message);
        }
    }
};
