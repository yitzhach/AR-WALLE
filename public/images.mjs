import {INITIAL_EDITS,LABEL_ASPECT,MAX_TEXTURE} from './state.mjs';
export function isHEIF(bytes){
 if(bytes.length<12||String.fromCharCode(...bytes.slice(4,8))!=='ftyp')return false;
 const brands=String.fromCharCode(...bytes.slice(8,Math.min(bytes.length,64)));
 return !/avif|avis/.test(brands)&&/heic|heix|hevc|hevx|heif|mif1|msf1/.test(brands);
}
// Safari can decode HEIC photos natively. USDZ only accepts JPEG/PNG textures,
// so convert the selected photo locally; the source file on the phone is untouched.
export async function prepareUpload(file){
 const bytes=new Uint8Array(await file.slice(0,64).arrayBuffer());
 if(!isHEIF(bytes))return {...await detectImage(file),converted:false};
 let loaded;
 try{
  loaded=await loadImage(file);
  const {naturalWidth:w,naturalHeight:h}=loaded.image;
  if(!w||!h)throw Error('Empty image.');
  const scale=Math.min(1,Math.sqrt(24000000/(w*h))),canvas=document.createElement('canvas');
  canvas.width=Math.max(1,Math.round(w*scale));canvas.height=Math.max(1,Math.round(h*scale));
  canvas.getContext('2d').drawImage(loaded.image,0,0,canvas.width,canvas.height);
  const jpeg=await encode(canvas,'image/jpeg');
  if(jpeg.size>15*1024*1024)throw Error('Converted photo exceeds 15 MB. Use a smaller photo.');
  return {...await detectImage(jpeg),converted:true};
 }catch(error){
  if(error.message.includes('could not be decoded'))throw Error('This iPhone photo cannot be decoded by this browser. Choose it from Photos again, or export it as JPG.');
  throw error;
 }finally{if(loaded)URL.revokeObjectURL(loaded.url);}
}
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
const hasPixelEdits=e=>Object.keys(INITIAL_EDITS).some(k=>!k.startsWith('flip')&&e[k]!==INITIAL_EDITS[k]);
export const textureSize=(w,h)=>{const scale=Math.min(1,MAX_TEXTURE/Math.max(w,h));return [Math.max(1,Math.round(w*scale)),Math.max(1,Math.round(h*scale))];};
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
const encode=(canvas,type='image/png')=>new Promise((resolve,reject)=>canvas.toBlob(b=>b?resolve(b):reject(Error('Could not prepare the image.')),type,.92));
const png=canvas=>encode(canvas);
export async function renderTexture(piece,gallery=false){
 const loaded=await loadImage(piece.blob),e=piece.edits,{image,url}=loaded,source=piece.blob.type==='image/png'?'png':'jpeg';
 const [width,height]=textureSize(image.naturalWidth,image.naturalHeight),oversized=width!==image.naturalWidth;
 if(!isEdited(e)&&!gallery&&!piece.normalize&&!oversized)return {...loaded,blob:piece.blob,extension:source};
 try{
  const canvas=document.createElement('canvas');canvas.width=width;canvas.height=height;
  const ctx=canvas.getContext('2d',{willReadFrequently:true});ctx.translate(e.flipH?width:0,e.flipV?height:0);ctx.scale(e.flipH?-1:1,e.flipV?-1:1);ctx.drawImage(image,0,0,width,height);
  if(hasPixelEdits(e)||gallery){
   const pixels=ctx.getImageData(0,0,width,height),a=pixels.data;
   for(let y=0;y<height;y++)for(let x=0;x<width;x++){
    const i=(y*width+x)*4,nx=x/width,ny=y/height;
    // Deliberately a preview spotlight simulation, not inferred surface relief.
    const light=gallery?.88+.26*Math.exp(-((nx-.35)**2/.12+(ny-.1)**2/.45)):1;
    const rgb=adjustPixel(a[i],a[i+1],a[i+2],e,light);a[i]=rgb[0];a[i+1]=rgb[1];a[i+2]=rgb[2];
   }
   ctx.putImageData(pixels,0,0);
  }
  // PNG sources may carry transparency; photos stay JPEG so derivatives are not larger than originals.
  const blob=await encode(canvas,source==='png'?'image/png':'image/jpeg'),out=await loadImage(blob);return {...out,blob,extension:source};
 }finally{URL.revokeObjectURL(url);}
}
export async function makeShadow(){
 const c=document.createElement('canvas');c.width=c.height=256;const ctx=c.getContext('2d');
 // Wide soft edge; the previous 25-pixel falloff was almost entirely hidden
 // behind the panel, making the AR shadow appear absent.
 const p=ctx.createImageData(256,256);
 for(let y=0;y<256;y++)for(let x=0;x<256;x++){const dx=Math.max(58-x,0,x-197),dy=Math.max(58-y,0,y-197),i=(y*256+x)*4;p.data[i+3]=Math.round(165*Math.exp(-(dx*dx+dy*dy)/750));}
 ctx.putImageData(p,0,0);return new Uint8Array(await(await png(c)).arrayBuffer());
}
export async function makeLabel(text){
 const c=document.createElement('canvas');c.width=1024;c.height=1024/LABEL_ASPECT;const ctx=c.getContext('2d');ctx.fillStyle='rgba(19,23,29,0.9)';ctx.fillRect(0,0,c.width,c.height);ctx.fillStyle='#fff';ctx.textAlign='center';ctx.textBaseline='middle';ctx.font='44px Arial';ctx.fillText(text,512,c.height/2,960);return new Uint8Array(await(await png(c)).arrayBuffer());
}

// Small original-image library previews; full originals remain available for AR/backup.
export async function makeThumbnail(blob){
 const {image,url}=await loadImage(blob);
 try{
  const scale=Math.min(1,256/Math.max(image.naturalWidth,image.naturalHeight));
  const canvas=document.createElement('canvas');
  canvas.width=Math.max(1,Math.round(image.naturalWidth*scale));canvas.height=Math.max(1,Math.round(image.naturalHeight*scale));
  canvas.getContext('2d').drawImage(image,0,0,canvas.width,canvas.height);
  return await encode(canvas,blob.type);
 }finally{URL.revokeObjectURL(url);}
}
