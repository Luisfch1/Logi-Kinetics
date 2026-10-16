import {processedPhotoFiles, shareFailureMessage} from '../../core/photoActions.js';

function panel(title) {
    const dialog = document.createElement('dialog');
    dialog.setAttribute('aria-label', title);
    dialog.style.cssText = 'margin:auto;color:var(--on-surface,#eee);background:var(--surface,#141414);border:1px solid #8886;border-radius:24px;padding:24px;width:min(92vw,420px);max-height:85dvh;overflow:auto;box-shadow:0 16px 60px #0009;';
    const heading = document.createElement('h2');
    heading.textContent = title;
    heading.style.cssText = 'font-size:18px;font-weight:700;margin-bottom:16px';
    const message = document.createElement('p');
    message.setAttribute('role', 'status');
    message.setAttribute('aria-live', 'polite');
    message.style.cssText = 'font-size:14px;line-height:1.6;margin-bottom:16px;white-space:pre-line';
    const actions = document.createElement('div');
    actions.style.cssText = 'display:flex;flex-wrap:wrap;gap:10px;margin-top:16px';
    const button = (text, handler, primary = false) => {
        const element = document.createElement('button');
        element.type = 'button'; element.textContent = text;
        element.style.cssText = `padding:12px 16px;min-height:44px;border-radius:12px;border:1px solid #8886;font-size:14px;cursor:pointer;background:${primary ? 'var(--primary,#cafd00)' : 'transparent'};color:${primary ? '#111' : 'inherit'};`;
        element.onclick = handler;
        actions.append(element); return element;
    };
    const close = button('Cerrar', () => dialog.close());
    dialog.append(heading, message, actions);
    document.body.append(dialog);
    dialog.showModal();
    return {dialog, message, actions, button, close};
}

export async function sharePhotosDialog(items, process, shareNative) {
    if (!items.length) return;
    const ui = panel('Compartir fotos');
    let closed = false;
    ui.dialog.addEventListener('close', () => {closed = true; ui.dialog.remove();}, {once:true});
    const processed = [];
    try {
        for (let index=0; index<items.length; index++) {
            ui.message.textContent = `Preparando ${index+1} de ${items.length} fotos…`;
            let timeout;
            const result = await Promise.race([
                process(items[index]),
                new Promise((_,reject)=>{timeout=setTimeout(()=>reject(new Error('La preparación tardó demasiado. No se compartió ninguna foto; puedes reintentar.')),30000);})
            ]).finally(()=>clearTimeout(timeout));
            if (closed) return;
            if (!result) throw new Error(`No se pudo preparar la foto ${index+1}. No se compartió ninguna. Las fotos siguen seleccionadas.`);
            processed.push(result);
        }
        const files = processedPhotoFiles(processed);
        let batches = [files], nativeBatches = [processed], current = 0, sharing = false;
        ui.message.textContent = `${files.length} fotos listas. Pulsa «Compartir ahora» para elegir WhatsApp u otra aplicación.`;
        const share = ui.button('Compartir ahora', () => {
            if (sharing || closed) return;
            let task;
            try {
                if (shareNative) task = shareNative(nativeBatches[current]);
                else {
                    if (!navigator.share || !navigator.canShare) throw new Error('Este navegador no permite compartir archivos.');
                    if (!navigator.canShare({files:batches[current]})) throw new Error('El teléfono no admite este lote. Prueba «Dividir en lotes».');
                    // Sin awaits antes de share(): se usa el nuevo gesto del usuario.
                    task = navigator.share({files:batches[current]});
                }
            } catch (error) {ui.message.textContent = error.message; return;}
            sharing = true; share.disabled = true; split.disabled = true;
            ui.close.disabled = true;
            Promise.resolve(task).then(() => {
                current++;
                if (current === batches.length) {
                    ui.message.textContent = 'Fotos entregadas al panel de compartir. Comprueba el envío en la aplicación elegida. Los originales siguen en Logi.';
                    share.remove(); split.remove();
                } else {
                    ui.message.textContent = `Lote ${current} entregado al teléfono. Falta el lote ${current+1} de ${batches.length} (${batches[current].length} fotos).`;
                    share.textContent = 'Compartir siguiente lote';
                }
            }).catch(error => {
                ui.message.textContent = error?.name === 'AbortError'
                    ? 'Se canceló o no hubo un destino disponible. Puedes volver a intentar este mismo lote.'
                    : shareFailureMessage(error);
            }).finally(() => {sharing=false; share.disabled=false; split.disabled=false; ui.close.disabled=false;});
        }, true);
        const split = ui.button('Dividir en lotes', () => {
            if (sharing || current > 0) {ui.message.textContent = 'Continúa con los lotes pendientes para no repetir los anteriores.'; return;}
            // Solo a petición del usuario; no es un supuesto límite de WhatsApp.
            const size = Math.max(1, Math.floor(batches[0].length/2));
            batches=[]; nativeBatches=[];
            for(let index=0; index<files.length; index+=size) {
                batches.push(files.slice(index,index+size)); nativeBatches.push(processed.slice(index,index+size));
            }
            split.hidden = size === 1;
            ui.message.textContent = `${batches.length} lotes de hasta ${size} fotos. Pulsa para compartir el primero; cada lote requiere una pulsación.`;
        });
        split.hidden = files.length < 2;
        ui.dialog.addEventListener('cancel', event => {if(sharing) event.preventDefault();});
    } catch (error) {ui.message.textContent = error.message || 'No se pudieron preparar las fotos. No se compartió ninguna.';}
    return new Promise(resolve => {
        if(closed) resolve();
        else ui.dialog.addEventListener('close', resolve, {once:true});
    });
}

export function movePhotosDialog({items, source, projects, move}) {
    const ui = panel('Mover a otro proyecto');
    const targets = projects.filter(p => String(p.id) !== String(source.id) && !p.isOrphan);
    const select = document.createElement('select');
    select.setAttribute('aria-label','Proyecto de destino');
    select.style.cssText='width:100%;padding:12px;border:1px solid #8886;border-radius:12px;background:#222;color:#fff;font-size:15px';
    for(const project of targets) {
        const option=document.createElement('option'); option.value=project.id; option.textContent=project.name; select.append(option);
    }
    ui.actions.before(select);
    let moving=false;
    ui.message.textContent = targets.length
        ? `Se moverán ${items.length} fotos desde «${source.name}». Se conservan los originales, fechas y descripciones; se quita el ítem anterior.\nLas copias ya enviadas a Drive o CONTROL NO se trasladan ni se borran. Debes revisarlas allí. En el destino quedarán pendientes de enviar.`
        : 'Primero crea otro proyecto para poder trasladar las fotos.';
    const confirm = ui.button('Continuar', () => {
        const target=targets.find(p=>String(p.id)===select.value);
        if(!target || moving) return;
        if(!select.disabled) {
            select.disabled=true;
            ui.message.textContent=`¿Mover ${items.length} fotos de «${source.name}» a «${target.name}»?\nLas copias anteriores en Drive o CONTROL permanecerán en su proyecto. El traslado es local.`;
            confirm.textContent='Confirmar traslado'; return;
        }
        moving=true; confirm.disabled=true; ui.close.disabled=true;
        Promise.resolve().then(()=>move(target.id)).then(count=>{
            ui.message.textContent=`${count} fotos trasladadas a «${target.name}».`; confirm.remove();
        }).catch(error=>{
            ui.message.textContent=`No se completó el traslado: ${error.message}`;
            select.disabled=false; confirm.textContent='Continuar';
        }).finally(()=>{moving=false; confirm.disabled=false; ui.close.disabled=false;});
    }, true);
    confirm.disabled = !targets.length;
    ui.dialog.addEventListener('cancel', event=>{if(moving) event.preventDefault();});
    return new Promise(resolve=>ui.dialog.addEventListener('close',()=>{ui.dialog.remove();resolve();},{once:true}));
}
