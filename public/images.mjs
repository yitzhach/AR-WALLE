import {INITIAL_EDITS} from './state.mjs';
export async function detectImage(blob){
 const bytes=new Uint8Array(await blob.slice(0,65536).arrayBuffer());let type;
 if(bytes[0]===255&&bytes[1]===216)type='image/jpeg';
 else if(bytes[0]===137&&bytes[1]===80&&bytes[2]===78&&bytes[3]===71)type='image/png';
 else throw Error('Please choose JPG or PNG images. Export HEIC/WebP as JPG or PNG first.');
 let orientation=1;
 if(type==='image/jpeg'){
  const v=new DataView(bytes.buffer);let pos=2;
  try{while(pos+4<bytes.length){if(v.getUint8(pos)!==255)break;const marker=v.getUint8(pos+1),len=v.getUint16(pos+2);if(len<2)break;
   if(marker===225&&v.getUint32(pos+4)===0x45786966){const t=pos+10,le=v.getUint16(t)===0x4949,ifd=t+v.getUint32(t+4,le),n=v.getUint16(ifd,le);for(let i=0;i<n;i++){const at=ifd+2+i*12;if(v.getUint16(at,le)===274)orientation=v.getUint16(at+8,le);}break;}pos+=2+len;}
  }catch{/* Truncated metadata: browser decode remains the validation gate. */}
 }
 return {blob:blob.slice(0,blob.size,type),normalize:orientation!==1};
}
export function loadImage(blob){return new Promise((resolve,reject)=>{const url=URL.createObjectURL(blob),image=new Image();image.onload=()=>resolve({image,url});image.onerror=()=>{URL.revokeObjectURL(url);reject(Error('This image could not be decoded. Try another JPG or PNG.'))};image.src=url;});}
export const isEdited=e=>Object.keys(INITIAL_EDITS).some(k=>e[k]!==INITIAL_EDITS[k]);
const clamp=v=>Math.max(0,Math.min(255,v));
export function adjustPixel(r,g,b,e,light=1){
 const bright=2**(e.brightness/100),contrast=1+e.contrast/100,sat=1+e.saturation/100;
 const luminance=(.2126*r+.7152*g+.0722*b)/255;
 const lift=e.highlights*.7*Math.max(0,(luminance-.45)/.55)+e.shadows*.7*Math.max(0,(.55-luminance)/.55);
 r=((r*bright+lift-127.5)*contrast+127.5)+e.warmth*.35;
 g=((g*bright+lift-127.5)*contrast+127.5)+e.warmth*.05;
 b=((b*bright+lift-127.5)*contrast+127.5)-e.warmth*.35;
 const grey=.2126*r+.7152*g+.0722*b;r=grey+(r-grey)*sat;g=grey+(g-grey)*sat;b=grey+(b-grey)*sat;
 const angle=e.hue*Math.PI/180,c=Math.cos(angle),s=Math.sin(angle);
 const rr=(.213+.787*c-.213*s)*r+(.715-.715*c-.715*s)*g+(.072-.072*c+.928*s)*b;
 const gg=(.213-.213*c+.143*s)*r+(.715+.285*c+.140*s)*g+(.072-.072*c-.283*s)*b;
 const bb=(.213-.213*c-.787*s)*r+(.715-.715*c+.715*s)*g+(.072+.928*c+.072*s)*b;
 return [clamp(rr*light),clamp(gg*light),clamp(bb*light)];
}
const png=canvas=>new Promise((resolve,reject)=>canvas.toBlob(b=>b?resolve(b):reject(Error('Could not prepare the image.')),'image/png'));
export async function renderTexture(piece,gallery=false){
 const loaded=await loadImage(piece.blob),e=piece.edits;
 if(!isEdited(e)&&!gallery&&!piece.normalize)return {...loaded,blob:piece.blob,extension:piece.blob.type==='image/png'?'png':'jpeg'};
 const {image,url}=loaded;
 try{
  const scale=Math.min(1,2048/Math.max(image.naturalWidth,image.naturalHeight)),canvas=document.createElement('canvas');
  canvas.width=Math.max(1,Math.round(image.naturalWidth*scale));canvas.height=Math.max(1,Math.round(image.naturalHeight*scale));
  const ctx=canvas.getContext('2d',{willReadFrequently:true});ctx.translate(e.flipH?canvas.width:0,e.flipV?canvas.height:0);ctx.scale(e.flipH?-1:1,e.flipV?-1:1);ctx.drawImage(image,0,0,canvas.width,canvas.height);
  const pixels=ctx.getImageData(0,0,canvas.width,canvas.height),a=pixels.data;
  for(let y=0;y<canvas.height;y++)for(let x=0;x<canvas.width;x++){
   const i=(y*canvas.width+x)*4,nx=x/canvas.width,ny=y/canvas.height;
   // Deliberately a preview spotlight simulation, not inferred surface relief.
   const light=gallery?.88+.26*Math.exp(-((nx-.35)**2/.12+(ny-.1)**2/.45)):1;
   const rgb=adjustPixel(a[i],a[i+1],a[i+2],e,light);a[i]=rgb[0];a[i+1]=rgb[1];a[i+2]=rgb[2];
  }
  ctx.putImageData(pixels,0,0);const blob=await png(canvas),out=await loadImage(blob);return {...out,blob,extension:'png'};
 }finally{URL.revokeObjectURL(url);}
}
export async function makeShadow(){
 const c=document.createElement('canvas');c.width=c.height=256;const ctx=c.getContext('2d');
 // Smooth analytic rectangle falloff, strongest behind the panel, soft at edges.
 const p=ctx.createImageData(256,256);
 for(let y=0;y<256;y++)for(let x=0;x<256;x++){const dx=Math.max(25-x,0,x-231),dy=Math.max(25-y,0,y-231),i=(y*256+x)*4;p.data[i+3]=Math.round(142*Math.exp(-(dx*dx+dy*dy)/155));}
 ctx.putImageData(p,0,0);return new Uint8Array(await(await png(c)).arrayBuffer());
}
export async function makeLabel(text){
 const c=document.createElement('canvas');c.width=1024;c.height=128;const ctx=c.getContext('2d');ctx.fillStyle='rgba(19,23,29,0.9)';ctx.fillRect(0,0,c.width,c.height);ctx.fillStyle='#fff';ctx.textAlign='center';ctx.textBaseline='middle';ctx.font='44px Arial';ctx.fillText(text,512,64,960);return new Uint8Array(await(await png(c)).arrayBuffer());
}
