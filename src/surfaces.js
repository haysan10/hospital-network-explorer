import * as T from '../vendor/three.module.js';
const cache=new Map();
const PROFILES={
  wood:{roughness:.63,metalness:0,bump:.018,repeat:1.7},
  fabric:{roughness:.95,metalness:0,bump:.011,repeat:9},
  linen:{roughness:.98,metalness:0,bump:.007,repeat:11},
  metal:{roughness:.32,metalness:.76,bump:.003,repeat:5},
  tile:{roughness:.43,metalness:.025,bump:.009,repeat:1.6},
  roof:{roughness:.63,metalness:.52,bump:.028,repeat:2.8},
  plaster:{roughness:.88,metalness:0,bump:.006,repeat:3}
};
// Deterministic, local texture generation. No images or network requests.
export function surface(color,type='plaster'){
  const key=type+':'+color;if(cache.has(key))return cache.get(key);
  const p=PROFILES[type]||PROFILES.plaster,size=128,rgba=new Uint8Array(size*size*4),height=new Uint8Array(size*size*4);
  for(let y=0;y<size;y++)for(let x=0;x<size;x++){
    const noise=((x*73+y*131+x*y*17)%101)/100;
    let value=.96+(noise-.5)*.07,h=noise*.15+.6;
    if(type==='wood'){const grain=Math.sin(x*.33+Math.sin(y*.04)*1.9+Math.sin(x*.08)*1.5);value=.88+grain*.065+noise*.07;h=.5+grain*.16;}
    if(type==='fabric'||type==='linen'){const weave=(x%4===0||y%4===0);value=weave?.84:.97+noise*.03;h=weave?.28:.76;}
    if(type==='metal'){value=.92+(((y*13)%17)/17)*.06+noise*.02;h=.5+noise*.09;}
    if(type==='tile'){const grout=x<2||y<2;value=grout?.76:.97+noise*.03;h=grout?.18:.82;}
    if(type==='roof'){const seam=x%32<3;value=seam?.7:.92+noise*.04;h=seam?.95:.48;}
    const i=(y*size+x)*4;rgba[i]=rgba[i+1]=rgba[i+2]=Math.round(value*255);rgba[i+3]=255;
    height[i]=height[i+1]=height[i+2]=Math.round(h*255);height[i+3]=255;
  }
  const texture=(data,srgb=false)=>{const t=new T.DataTexture(data,size,size,T.RGBAFormat);t.wrapS=t.wrapT=T.RepeatWrapping;t.repeat.setScalar(p.repeat);t.magFilter=T.LinearFilter;t.minFilter=T.LinearMipmapLinearFilter;t.generateMipmaps=true;t.anisotropy=4;t.colorSpace=srgb?T.SRGBColorSpace:T.NoColorSpace;t.needsUpdate=true;return t;};
  const mat=new T.MeshStandardMaterial({color,map:texture(rgba,true),bumpMap:texture(height),bumpScale:p.bump,roughness:p.roughness,metalness:p.metalness});mat.userData.surface=type;cache.set(key,mat);return mat;
}
export function setSurfaceQuality(name){for(const mat of cache.values()){for(const tex of [mat.map,mat.bumpMap])if(tex){tex.anisotropy=name==='high'?8:name==='eco'?1:4;tex.needsUpdate=true;}mat.bumpScale=name==='eco'?0:PROFILES[mat.userData.surface].bump;}}
