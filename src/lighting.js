export const ROOM_LIGHT_COLORS={registration:0xffe9ce,ward:0xffefda,office:0xffefdf,corridor:0xfff1dc,clinical:0xf1f8ff,icu:0xe4f3ff,operation:0xf2fbff,lab:0xeaf5ff,toilet:0xf1f7ef,kitchen:0xf4f7ed,laundry:0xedf5ff,linen:0xf0f6ed,workshop:0xeaf5ff,staff:0xffe9d0};
export const LIGHTING_PRESETS={
 day:{name:'Siang',background:0xe4edf0,fog:0xe4edf0,sun:0xfff0d5,sunIntensity:2.15,sky:0xe7f3ff,ground:0x8a9e82,hemisphere:1.2,fill:1.0,exposure:1.0,position:[-16,26,12],interior:9,diffuse:1.0,exterior:0},
 dusk:{name:'Senja',background:0xc1c2cf,fog:0xc1c2cf,sun:0xffbc85,sunIntensity:1.15,sky:0xb2c7e7,ground:0x65786e,hemisphere:.8,fill:.65,exposure:1.06,position:[-24,9,9],interior:10,diffuse:1.08,exterior:19},
 night:{name:'Malam',background:0x172b3e,fog:0x172b3e,sun:0xabc9f3,sunIntensity:.32,sky:0x8aa6c4,ground:0x46584e,hemisphere:.38,fill:.28,exposure:1.12,position:[10,23,-12],interior:11,diffuse:1.14,exterior:25}
};
export const lightPower=(state,preset,exterior=false)=>exterior?(state.mains?preset.exterior:0):state.mains?preset.interior:state.ups?5:0;
export function lightSelection(points,camera,floor,count,interior){
 return points.filter(p=>p.floor===0||interior&&(floor==='all'||p.floor===floor)).map(p=>({...p,distance:(p.x-camera.x)**2+(p.y-camera.y)**2+(p.z-camera.z)**2})).sort((a,b)=>a.distance-b.distance).slice(0,count);
}
