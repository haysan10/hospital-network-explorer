// Reproducible, self-contained GLB export: geometry + UVs + tangents + PBR PNGs.
import {writeFile,mkdir} from 'node:fs/promises';
import {deflateSync} from 'node:zlib';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import * as T from '../vendor/three.module.js';
import {GLTFExporter} from '../vendor/addons/exporters/GLTFExporter.js';
import {makeAsset,ASSET_NAMES,material} from '../src/assets.js';
class FileReaderShim {
  readAsArrayBuffer(blob){blob.arrayBuffer().then(buffer=>{this.result=buffer;this.onloadend?.({target:this});}).catch(e=>this.onerror?.(e));}
  readAsDataURL(blob){blob.arrayBuffer().then(buffer=>{this.result='data:'+blob.type+';base64,'+Buffer.from(buffer).toString('base64');this.onloadend?.({target:this});});}
}
globalThis.FileReader=FileReaderShim;
const directory=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../assets/models');await mkdir(directory,{recursive:true});
function crc32(buffer){let crc=0xffffffff;for(const b of buffer){crc^=b;for(let i=0;i<8;i++)crc=(crc>>>1)^((crc&1)?0xedb88320:0);}return (crc^0xffffffff)>>>0;}
function png(texture,packing='normal'){
 const {width,height}=texture.image,data=new Uint8Array(texture.image.data);if(packing==='mr')for(let i=2;i<data.length;i+=4)data[i]=255;const raw=Buffer.alloc(height*(1+width*4));
 for(let y=0;y<height;y++){const offset=y*(1+width*4);raw[offset]=0;Buffer.from(data.buffer,data.byteOffset+y*width*4,width*4).copy(raw,offset+1);}
 const chunk=(name,body)=>{const n=Buffer.from(name),length=Buffer.alloc(4),crc=Buffer.alloc(4);length.writeUInt32BE(body.length);crc.writeUInt32BE(crc32(Buffer.concat([n,body])));return Buffer.concat([length,n,body,crc]);};
 const header=Buffer.alloc(13);header.writeUInt32BE(width,0);header.writeUInt32BE(height,4);header[8]=8;header[9]=6;
 return Buffer.concat([Buffer.from([137,80,78,71,13,10,26,10]),chunk('IHDR',header),chunk('IDAT',deflateSync(raw)),chunk('IEND',Buffer.alloc(0))]);
}
const exporter=new GLTFExporter(),report=[];
async function save(name,object){
 object.updateMatrixWorld(true);let triangles=0;const originals=new Map();
 object.traverse(o=>{if(o.isMesh){triangles+=(o.geometry.index?.count||o.geometry.attributes.position.count)/3;
  if(o.material.normalMap||o.material.roughnessMap){const original=o.material,m=original.clone();m.normalMap=null;m.roughnessMap=null;m.map=null;m.aoMap=null;m.onBeforeCompile=()=>{};o.material=m;originals.set(m.name,original);}
 }});
 const buffer=Buffer.from(await exporter.parseAsync(object,{binary:true,onlyVisible:true})),jsonLength=buffer.readUInt32LE(12),g=JSON.parse(buffer.subarray(20,20+jsonLength)),oldBin=buffer.subarray(28+jsonLength),parts=[oldBin];let byteLength=oldBin.length;
 const textures=new Map();
 function embed(texture,packing){const key=texture.uuid+packing;
  if(textures.has(key))return textures.get(key);
  const data=png(texture,packing),pad=Buffer.alloc((4-byteLength%4)%4);parts.push(pad,data);byteLength+=pad.length;
  const view=g.bufferViews.length;g.bufferViews.push({buffer:0,byteOffset:byteLength,byteLength:data.length});byteLength+=data.length;
  const image=(g.images??=[]).length;g.images.push({bufferView:view,mimeType:'image/png',name:'Procedural PBR'});
  g.samplers??=[{magFilter:9729,minFilter:9987,wrapS:10497,wrapT:10497}];const index=(g.textures??=[]).length;g.textures.push({source:image,sampler:0});textures.set(key,index);return index;
 }
 for(const m of g.materials||[]){const source=originals.get(m.name);if(!source)continue;
  const tex=(t,packing)=>({index:embed(t,packing),extensions:{KHR_texture_transform:{scale:[t.repeat.x,t.repeat.y]}}});
  m.pbrMetallicRoughness.baseColorTexture=tex(source.map,'color');m.occlusionTexture={...tex(source.aoMap,'ao'),strength:source.aoMapIntensity};
  m.normalTexture={...tex(source.normalMap,'normal'),scale:1};m.pbrMetallicRoughness.metallicRoughnessTexture=tex(source.roughnessMap,'mr');
 }
 if(textures.size)g.extensionsUsed=[...new Set([...(g.extensionsUsed||[]),'KHR_texture_transform'])];
 g.buffers[0].byteLength=byteLength;const binary=Buffer.concat(parts),json=Buffer.from(JSON.stringify(g)),jpad=Buffer.alloc((4-json.length%4)%4,32),bpad=Buffer.alloc((4-binary.length%4)%4);
 const header=Buffer.alloc(12),jheader=Buffer.alloc(8),bheader=Buffer.alloc(8),size=12+8+json.length+jpad.length+8+binary.length+bpad.length;
 header.writeUInt32LE(0x46546c67);header.writeUInt32LE(2,4);header.writeUInt32LE(size,8);jheader.writeUInt32LE(json.length+jpad.length);jheader.writeUInt32LE(0x4e4f534a,4);bheader.writeUInt32LE(binary.length+bpad.length);bheader.writeUInt32LE(0x004e4942,4);
 await writeFile(path.join(directory,name+'.glb'),Buffer.concat([header,jheader,json,jpad,bheader,binary,bpad]));
 report.push({file:name+'.glb',bytes:size,triangles,embeddedPbrTextures:textures.size,uvAtlas:true,tangents:true});
}
for(const name of ASSET_NAMES)await save(name,makeAsset(name));
for(const [name,color,radius]of [['lan-cable',0x366bff,.018],['fiber-cable',0x10bcae,.036],['power-cable',0xe0a136,.018]]){
 const curve=new T.CatmullRomCurve3([new T.Vector3(-1,0,0),new T.Vector3(-.3,.05,0),new T.Vector3(.3,.05,.1),new T.Vector3(1,0,.1)]),geometry=new T.TubeGeometry(curve,32,radius,10,false);geometry.computeTangents();
 await save(name,new T.Mesh(geometry,material(color,0,'rubber')));
}
await writeFile(path.join(directory,'asset-catalog.json'),JSON.stringify(report,null,2));console.log('Exported',report.length,'embedded GLBs;',report.reduce((s,a)=>s+a.bytes,0),'bytes; max',Math.max(...report.map(a=>a.triangles)),'triangles per asset');
