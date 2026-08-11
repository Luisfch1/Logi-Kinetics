/**
 * ImageCompressor.js — Logi Kinetic (v2.0)
 * Utility to downscale smartphone camera images to max 1400px and compress JPEG quality to 0.75.
 * Prevents bridge timeouts, out-of-memory crashes, and LocalStorage quota errors.
 */
import { DebugLogger } from './DebugLogger.js';

export const ImageCompressor = {
    isHeic(input) {
        const name = typeof input?.name === 'string' ? input.name.toLowerCase() : '';
        const type = typeof input?.type === 'string' ? input.type.toLowerCase() : '';
        return type === 'image/heic' || type === 'image/heif' || /\.(heic|heif)$/.test(name);
    },

    async decodeForBrowser(input) {
        if (!this.isHeic(input)) return input;

        DebugLogger.info('COMPRESSOR', `Convirtiendo imagen ${input.name || 'HEIC'} a JPEG para compatibilidad web...`);
        // Cargamos el decodificador solo cuando hace falta. heic-to mantiene
        // libheif actualizada; algunas fotos recientes de iPhone no podían
        // ser interpretadas por el decodificador anterior.
        const { heicTo } = await import('heic-to');
        const blob = await heicTo({
            blob: input,
            type: 'image/jpeg',
            quality: 0.92
        });
        return new File([blob], `${(input.name || 'imagen').replace(/\.(heic|heif)$/i, '')}.jpg`, {
            type: 'image/jpeg',
            lastModified: input.lastModified || Date.now()
        });
    },

    /**
     * Compresor principal para Base64 o File/Blob
     * @param {string|File|Blob} input - String base64 o File/Blob
     * @param {number} maxDim - Dimensión máxima en píxeles (default 1400)
     * @param {number} quality - Calidad JPEG de 0.0 a 1.0 (default 0.75)
     * @returns {Promise<{ base64: string, originalKB: number, compressedKB: number, width: number, height: number, durationMs: number }>}
     */
    async compress(input, maxDim = 1400, quality = 0.75) {
        const startTime = performance.now();
        
        try {
            let dataUrl = '';
            let originalBytes = 0;

            if (typeof input === 'string') {
                dataUrl = input.startsWith('data:') ? input : `data:image/jpeg;base64,${input}`;
                originalBytes = input.length;
            } else if (input instanceof Blob || input instanceof File) {
                input = await this.decodeForBrowser(input);
                originalBytes = input.size;
                dataUrl = await new Promise((resolve, reject) => {
                    const reader = new FileReader();
                    reader.onload = () => resolve(reader.result);
                    reader.onerror = reject;
                    reader.readAsDataURL(input);
                });
            } else {
                throw new Error("Formato de entrada no soportado para compresión");
            }

            const originalKB = (originalBytes / 1024).toFixed(1);

            // Cargar imagen en HTMLImageElement
            const img = await new Promise((resolve, reject) => {
                const image = new Image();
                image.onload = () => resolve(image);
                image.onerror = (e) => reject(new Error("No se pudo decodificar la imagen"));
                image.src = dataUrl;
            });

            let width = img.width;
            let height = img.height;

            // Si la imagen ya es pequeña y el payload es menor a 300KB, saltar canvas si ya es JPEG comprimido
            if (width <= maxDim && height <= maxDim && originalBytes < 300 * 1024) {
                const durationMs = Math.round(performance.now() - startTime);
                const rawBase64 = dataUrl.replace(/^data:image\/[a-z]+;base64,/, '');
                return {
                    base64: rawBase64,
                    originalKB,
                    compressedKB: originalKB,
                    width,
                    height,
                    durationMs
                };
            }

            // Calcular nuevas dimensiones manteniendo aspect ratio
            if (width > maxDim || height > maxDim) {
                if (width > height) {
                    height = Math.round((height * maxDim) / width);
                    width = maxDim;
                } else {
                    width = Math.round((width * maxDim) / height);
                    height = maxDim;
                }
            }

            // Renderizar en Canvas 2D
            const canvas = document.createElement('canvas');
            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');
            
            // Suavizado de imagen de alta calidad
            ctx.imageSmoothingEnabled = true;
            ctx.imageSmoothingQuality = 'high';
            ctx.drawImage(img, 0, 0, width, height);

            // Exportar a JPEG comprimido
            const compressedDataUrl = canvas.toDataURL('image/jpeg', quality);
            const rawCompressedBase64 = compressedDataUrl.replace(/^data:image\/jpeg;base64,/, '');
            const compressedBytes = rawCompressedBase64.length;
            const compressedKB = (compressedBytes / 1024).toFixed(1);

            const durationMs = Math.round(performance.now() - startTime);
            const ratio = ((1 - (compressedBytes / originalBytes)) * 100).toFixed(0);

            DebugLogger.info('COMPRESSOR', `Compresión exitosa: ${originalKB}KB -> ${compressedKB}KB (-${ratio}%) | ${width}x${height}px | ${durationMs}ms`, {
                originalKB,
                compressedKB,
                width,
                height,
                durationMs
            });

            return {
                base64: rawCompressedBase64,
                originalKB,
                compressedKB,
                width,
                height,
                durationMs
            };

        } catch (e) {
            DebugLogger.error('COMPRESSOR', `Error en compresión de imagen: ${e.message}`, { error: e });
            // Fallback: Si la compresión falla, retornar el base64 original si es posible
            const raw = typeof input === 'string' ? input.replace(/^data:image\/[a-z]+;base64,/, '') : null;
            return {
                base64: raw,
                originalKB: 0,
                compressedKB: 0,
                width: 0,
                height: 0,
                durationMs: Math.round(performance.now() - startTime)
            };
        }
    }
};
