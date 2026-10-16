// Operaciones puras compartidas por la galería y sus pruebas.
export function preparePhotoMove(items, ids, source, target, makeId = () => crypto.randomUUID()) {
    if (!source?.id || !target?.id || String(source.id) === String(target.id)) throw new Error('Elige otro proyecto de destino.');
    const selected = new Set(ids.map(String));
    if (!selected.size) throw new Error('Selecciona al menos una foto.');
    const photos = items.filter(item => selected.has(String(item.id)));
    if (photos.length !== selected.size || photos.some(item => String(item.projectId) !== String(source.id))) throw new Error('La selección cambió. Vuelve a seleccionar las fotos del proyecto actual.');
    return photos.map(item => ({
        ...item, projectId: target.id, projectName: target.name, proyecto: target.id,
        proyecto_id: target.id, proyecto_name: target.name, legacy_name: '',
        actividad: '', itemCode: '', synced: false,
        controlProjectId: target.controlProjectId || '', driveInboxId: target.driveInboxId || '',
        googleEmail: target.googleEmail || '', drivePhotoId: `move_${makeId()}`,
        driveFileId: '', _tempImageSrc: undefined,
        _pnid: undefined, _pnname: undefined, _pnlegacy: undefined,
        movedFromProjectId: source.id, movedAt: Date.now()
    }));
}

export function commitPhotoMove(storage, current, replacements) {
    const byId = new Map(replacements.map(item => [String(item.id), item]));
    const next = current.map(item => byId.get(String(item.id)) || item).map(item => {
        const {_tempImageSrc, base64, ...metadata} = item;
        return metadata;
    });
    // Un único setItem es atómico: si falla la cuota no se cambia la memoria.
    storage.setItem('logi_web_items_meta', JSON.stringify(next));
    return next;
}

export function processedPhotoFiles(items) {
    return items.map(item => {
        const encoded = String(item.base64 || '').replace(/^data:[^,]+,/, '');
        const binary = atob(encoded);
        return new File([Uint8Array.from(binary, c => c.charCodeAt(0))], item.filename, {type: 'image/jpeg'});
    });
}

export function shareFailureMessage(error) {
    if (error?.name === 'NotAllowedError') return 'El teléfono no permitió abrir Compartir. Pulsa de nuevo «Compartir ahora»; si persiste, prueba un lote menor.';
    return 'No se pudo abrir Compartir con este lote. Las fotos siguen seleccionadas y no se borró ninguna. Prueba un lote menor.';
}
