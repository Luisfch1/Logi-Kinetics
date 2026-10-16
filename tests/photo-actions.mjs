import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import vm from 'node:vm';
import {preparePhotoMove,commitPhotoMove,processedPhotoFiles,shareFailureMessage} from '../src/core/photoActions.js';

const source={id:'p_1',name:'Proyecto A'},target={id:'p_2',name:'Proyecto B'};
const original=Array.from({length:12},(_,i)=>({id:'photo'+i,filename:`cap_${i}.jpg`,projectId:source.id,descripcion:`Texto ${i}`,actividad:'1.1',createdAt:1760000000000+i,latitude:4.15,longitude:-73.6,synced:true,driveFileId:'old-drive',controlProjectId:'old-control',_pnid:'1',_pnname:'proyectoa',_pnlegacy:'proyectoa'}));
const before=JSON.stringify(original);
let count=0;
const moved=preparePhotoMove(original,original.map(p=>p.id),source,target,()=>String(++count));
assert.equal(moved.length,12); assert.equal(JSON.stringify(original),before);
for(let i=0;i<12;i++){
 assert.equal(moved[i].id,original[i].id); assert.equal(moved[i].filename,original[i].filename);
 for(const key of ['descripcion','createdAt','latitude','longitude'])assert.equal(moved[i][key],original[i][key]);
 assert.equal(moved[i].projectId,target.id); assert.equal(moved[i].actividad,'');assert.equal(moved[i].synced,false);
 assert.equal(moved[i].driveFileId,'');assert.equal(moved[i].controlProjectId,'');assert.notEqual(moved[i].drivePhotoId,original[i].id);
}
assert.equal(new Set(moved.map(p=>p.drivePhotoId)).size,12);
assert.throws(()=>preparePhotoMove(original,['missing'],source,target));
assert.throws(()=>preparePhotoMove(original,['photo1'],target,source));
assert.throws(()=>preparePhotoMove(original,['photo1'],source,source));
let saved;
const next=commitPhotoMove({setItem:(key,value)=>{assert.equal(key,'logi_web_items_meta');saved=value;}},[...original,{id:'other',projectId:'p_3'}],moved);
assert.equal(JSON.parse(saved).length,13);assert.equal(next[12].projectId,'p_3');
assert.throws(()=>commitPhotoMove({setItem:()=>{throw new Error('QuotaExceededError');}},original,moved),/Quota/);
assert.equal(JSON.stringify(original),before);
const files=processedPhotoFiles(original.map(item=>({filename:item.filename,base64:'data:image/jpeg;base64,/9j/2Q=='})));
assert.equal(files.length,12); assert.equal(files[0].type,'image/jpeg');assert.equal(files[0].name,original[0].filename);
assert.match(shareFailureMessage({name:'NotAllowedError'}),/Compartir ahora/);

// Probar el State real con almacenamiento simulado: sin abrir proyectos o red.
let failStorage=false,writes=0;
const bridge={movePhotoMetadata:replacements=>{if(failStorage)throw new Error('sin espacio');writes++;return true;},dbPut:async()=>true};
const context=vm.createContext({console:{log(){},warn(){},error(){}},localStorage:{getItem:()=>null},setTimeout,clearTimeout,crypto});
const actions=new vm.SyntheticModule(['preparePhotoMove'],function(){this.setExport('preparePhotoMove',preparePhotoMove);},{context});
const native=new vm.SyntheticModule(['LogiNative'],function(){this.setExport('LogiNative',bridge);},{context});
const stateModule=new vm.SourceTextModule(await fs.readFile(new URL('../src/core/state.js',import.meta.url),'utf8'),{context});
await stateModule.link(spec=>spec.includes('photoActions')?actions:native); await stateModule.evaluate();
const state=stateModule.namespace.State;
state.projects=[source,target];state.currentProject=source;state._allItems=structuredClone(original);state.isLoaded=true;
state._filterItems();assert.equal(state.items.length,12);
failStorage=true;
await assert.rejects(state.movePhotos(original.map(p=>p.id),target.id),/sin espacio/);
assert.equal(state.items.length,12);assert.equal(state._allItems[0].projectId,source.id);
failStorage=false;
assert.equal(await state.movePhotos(original.map(p=>p.id),target.id),12);
assert.equal(writes,1);assert.equal(state.items.length,0);
state.currentProject=target;state._filterItems();assert.equal(state.items.length,12);
await state.updateItemSyncStatus('photo0',true,source.id,'photo0');assert.equal(state._allItems[0].synced,false);
const currentIdentity=state._allItems[0].drivePhotoId;
await state.updateItemSyncStatus('photo0',true,target.id,currentIdentity);assert.equal(state._allItems[0].synced,true);
// Ni siquiera proyectos homónimos deben mostrar las fotos del otro.
state.currentProject={...source,name:target.name};state._filterItems();assert.equal(state.items.length,0);
const reloaded=JSON.parse(JSON.stringify(state._allItems));state._allItems=reloaded;state.currentProject=target;state._filterItems();assert.equal(state.items.length,12);
// Servicio Drive real, con transporte y cuenta completamente simulados.
const capacitor=new vm.SyntheticModule(['Capacitor','registerPlugin'],function(){this.setExport('Capacitor',{isNativePlatform:()=>false});this.setExport('registerPlugin',()=>({}));},{context});
const stateStub=new vm.SyntheticModule(['State'],function(){this.setExport('State',state);},{context});
const logger=new vm.SyntheticModule(['DebugLogger'],function(){this.setExport('DebugLogger',{event(){},error(){},warn(){}});},{context});
Object.assign(context,{Blob,FormData,URLSearchParams,atob});
const driveModule=new vm.SourceTextModule(await fs.readFile(new URL('../src/core/GoogleDriveService.js',import.meta.url),'utf8'),{context});
await driveModule.link(spec=>spec==='@capacitor/core'?capacitor:spec.includes('state.js')?stateStub:spec.includes('capacitor-bridge')?native:logger);await driveModule.evaluate();
const drive=driveModule.namespace.GoogleDriveSvc;
const connectedTarget={...target,googleConnected:true,controlProjectId:'control-target',driveInboxId:'target-inbox'};
const photo=state._allItems[0];photo.synced=false;
assert.equal(await drive._uploadPhoto(original[0],{...source,googleConnected:true,controlProjectId:'old-control'}),false);
let queried,posted;
drive._alreadyUploaded=async id=>{queried=id;return null;};
bridge.readBlobAsBase64=async()=>'data:image/jpeg;base64,/9j/2Q==';
drive._authorizedFetch=async(url,options)=>{posted=JSON.parse(await options.body.get('metadata').text());return {};};
assert.equal(await drive._uploadPhoto(photo,connectedTarget),true);
assert.equal(queried,photo.drivePhotoId);assert.notEqual(queried,photo.id);
assert.equal(posted.appProperties.controlProjectId,'control-target');
assert.equal(posted.appProperties.controlPhotoId,photo.drivePhotoId);assert.equal(posted.parents[0],'target-inbox');
assert.equal(JSON.parse(posted.description).id,photo.drivePhotoId);assert.equal(JSON.parse(posted.description).description,photo.descripcion);
assert.equal(photo.synced,true);
console.log('OK: traslado de 12, originales/metadatos, cuota atómica, reapertura, aislamiento, envío obsoleto rechazado y nuevo envío Drive con identidad/destino correctos (sin red).');
