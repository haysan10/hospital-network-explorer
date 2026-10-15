// Reproducible GLB export, using only the bundled Three.js files and Node.js.
import {writeFile,mkdir} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import * as T from '../vendor/three.module.js';
import {GLTFExporter} from '../vendor/addons/exporters/GLTFExporter.js';
import {makeAsset,ASSET_NAMES} from '../src/assets.js';
import {makeRoof,makeConnector} from '../src/building.js';
import {installPNGCanvas} from './png-canvas.mjs';
installPNGCanvas();
class FileReaderShim {
  readAsArrayBuffer(blob){blob.arrayBuffer().then(buffer=>{this.result=buffer;this.onloadend?.({target:this});}).catch(e=>this.onerror?.(e));}
  readAsDataURL(blob){blob.arrayBuffer().then(buffer=>{this.result='data:'+blob.type+';base64,'+Buffer.from(buffer).toString('base64');this.onloadend?.({target:this});});}
}
globalThis.FileReader=FileReaderShim;
const directory=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../assets/models');await mkdir(directory,{recursive:true});
const exporter=new GLTFExporter(),report=[];
async function save(name,object){
  object.updateMatrixWorld(true);const buffer=await exporter.parseAsync(object,{binary:true,onlyVisible:true});
  await writeFile(path.join(directory,name+'.glb'),Buffer.from(buffer));report.push({file:name+'.glb',bytes:buffer.byteLength});
}
for(const name of ASSET_NAMES)await save(name,makeAsset(name));
await save('roof-lower',makeRoof(1));await save('roof-upper',makeRoof(2));
const connector=makeConnector();delete connector.userData.roof;await save('stairs-connected',connector);
for(const [name,color,radius]of [['lan-cable',0x366bff,.018],['fiber-cable',0x10bcae,.029],['power-cable',0xe0a136,.018]]){
  const curve=new T.CatmullRomCurve3([new T.Vector3(-1,0,0),new T.Vector3(-.3,.05,0),new T.Vector3(.3,.05,.1),new T.Vector3(1,0,.1)]);
  await save(name,new T.Mesh(new T.TubeGeometry(curve,24,radius,6,false),new T.MeshStandardMaterial({color,roughness:.65})));
}
await writeFile(path.join(directory,'asset-catalog.json'),JSON.stringify(report,null,2));
console.log('Exported',report.length,'reusable GLB assets;',report.reduce((s,a)=>s+a.bytes,0),'bytes');
