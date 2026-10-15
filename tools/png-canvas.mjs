// Minimal PNG encoder for exporting procedural RGBA DataTextures in Node.
// No browser, native canvas, or additional package is required.
import {deflateSync} from 'node:zlib';
const table=Uint32Array.from({length:256},(_,n)=>{let c=n;for(let k=0;k<8;k++)c=c&1?0xedb88320^(c>>>1):c>>>1;return c>>>0;});
function crc(bytes){let value=0xffffffff;for(const b of bytes)value=table[(value^b)&255]^(value>>>8);return (value^0xffffffff)>>>0;}
function chunk(name,data){const type=Buffer.from(name),len=Buffer.alloc(4),sum=Buffer.alloc(4);len.writeUInt32BE(data.length);sum.writeUInt32BE(crc(Buffer.concat([type,data])));return Buffer.concat([len,type,data,sum]);}
export function encodePNG(width,height,data){
  const header=Buffer.alloc(13);header.writeUInt32BE(width,0);header.writeUInt32BE(height,4);header[8]=8;header[9]=6;
  const scanlines=Buffer.alloc(height*(width*4+1));for(let y=0;y<height;y++)Buffer.from(data.buffer,data.byteOffset+y*width*4,width*4).copy(scanlines,y*(width*4+1)+1);
  return Buffer.concat([Buffer.from([137,80,78,71,13,10,26,10]),chunk('IHDR',header),chunk('IDAT',deflateSync(scanlines)),chunk('IEND',Buffer.alloc(0))]);
}
export class PNGCanvas {
  constructor(width,height){this.width=width;this.height=height;}
  getContext(){return {putImageData:image=>{this.data=image.data;},translate(){},scale(){}};}
  async convertToBlob(){if(!this.data)throw new Error('Only RGBA DataTextures are supported in the offline exporter.');return new Blob([encodePNG(this.width,this.height,this.data)],{type:'image/png'});}
}
export function installPNGCanvas(){globalThis.OffscreenCanvas=PNGCanvas;globalThis.ImageData=class{constructor(data,width,height){this.data=data;this.width=width;this.height=height;}};}
