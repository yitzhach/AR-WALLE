export const INITIAL_EDITS = Object.freeze({brightness:0,contrast:0,saturation:0,highlights:0,shadows:0,hue:0,warmth:0,flipH:false,flipV:false});
// Label textures are 1024×128; AR label quads must keep this ratio or text distorts.
export const LABEL_ASPECT=8;
// Longest texture edge sent to AR: fits every AR-capable iPhone GPU and Safari's canvas limit.
export const MAX_TEXTURE=4096;
export const INITIAL_SCENE = Object.freeze({layout:'row',gap:3,shadow:true,gallery:false,dimensions:false,wallGuide:false,wallWidth:120,wallHeight:96,resize:true});
export function createPiece(id,name,blob,pixelWidth,pixelHeight,normalize=false){
 return {id,name,blob,pixelWidth,pixelHeight,normalize,width:48*pixelWidth/Math.max(pixelWidth,pixelHeight),height:48*pixelHeight/Math.max(pixelWidth,pixelHeight),depth:3.5,color:'#747474',aspect:true,ratio:pixelWidth/pixelHeight,edits:{...INITIAL_EDITS}};
}
export function validatePiece(p){
 for(const key of ['width','height'])if(!Number.isFinite(p[key])||p[key]<1||p[key]>240)throw Error('Artwork width and height must be 1–240 inches.');
 if(!Number.isFinite(p.depth)||p.depth<.05||p.depth>12)throw Error('Thickness must be 0.05–12 inches.');
 if(!/^#[a-f\d]{6}$/i.test(p.color))throw Error('Choose a valid side color.');
 return p;
}
export function validateScene(s){
 if(!['row','column','grid'].includes(s.layout))throw Error('Choose an arrangement.');
 if(!Number.isFinite(s.gap)||s.gap<0||s.gap>60)throw Error('Spacing must be 0–60 inches.');
 for(const key of ['wallWidth','wallHeight'])if(!Number.isFinite(s[key])||s[key]<12||s[key]>600)throw Error('Wall measurements must be 12–600 inches.');
}
export function setDimension(p,key,value){p[key]=value;if(p.aspect&&value>0)p[key==='width'?'height':'width']=key==='width'?value/p.ratio:value*p.ratio;return p;}
export function layoutPieces(pieces,scene){
 validateScene(scene);if(!pieces.length||pieces.length>8)throw Error('Add 1–8 artworks to the arrangement.');pieces.forEach(validatePiece);
 const cols=scene.layout==='row'?pieces.length:scene.layout==='column'?1:Math.min(2,pieces.length),rows=Math.ceil(pieces.length/cols);
 const widths=Array(cols).fill(0),heights=Array(rows).fill(0);
 pieces.forEach((p,i)=>{widths[i%cols]=Math.max(widths[i%cols],p.width);heights[Math.floor(i/cols)]=Math.max(heights[Math.floor(i/cols)],p.height);});
 const width=widths.reduce((a,b)=>a+b,0)+scene.gap*(cols-1),height=heights.reduce((a,b)=>a+b,0)+scene.gap*(rows-1);
 return {width,height,items:pieces.map((p,i)=>{const col=i%cols,row=Math.floor(i/cols);return {...p,x:-width/2+widths.slice(0,col).reduce((a,b)=>a+b,0)+scene.gap*col+widths[col]/2,y:height/2-heights.slice(0,row).reduce((a,b)=>a+b,0)-scene.gap*row-heights[row]/2};})};
}
export function setScaleOption(s,key,enabled){
 s[key]=enabled;
 if(key==='resize'&&enabled){s.dimensions=false;s.wallGuide=false;}
 if((key==='dimensions'||key==='wallGuide')&&enabled)s.resize=false;
 return s;
}
export function arFragment(s){return '#allowsContentScaling='+(s.resize&&!s.dimensions&&!s.wallGuide?'1':'0');}
export const fmt=n=>Number(n.toFixed(2)).toString();
export function validateRecord(r){
 if(!r||typeof r.name!=='string'||r.name.length>160||!(r.blob instanceof Blob)||!['image/jpeg','image/png'].includes(r.blob.type)||r.blob.size>15*1024*1024)throw Error('Invalid library artwork.');
 if(!Number.isFinite(r.pixelWidth)||!Number.isFinite(r.pixelHeight)||r.pixelWidth<1||r.pixelHeight<1)throw Error('Invalid image dimensions.');
 validatePiece(r);
 for(const k of Object.keys(INITIAL_EDITS)){const v=r.edits?.[k];if(k.startsWith('flip')){if(typeof v!=='boolean')throw Error('Invalid flip setting.');}else if(!Number.isFinite(v)||Math.abs(v)>(k==='hue'?180:100))throw Error('Invalid image adjustment.');}
 if(typeof r.aspect!=='boolean'||!Number.isFinite(r.ratio)||r.ratio<=0)throw Error('Invalid aspect ratio.');
 // Only trusted schema fields survive imports; never retain arbitrary backup keys.
 return {id:r.id,name:r.name,blob:r.blob,pixelWidth:r.pixelWidth,pixelHeight:r.pixelHeight,
  normalize:r.normalize===true,width:r.width,height:r.height,depth:r.depth,color:r.color,
  aspect:r.aspect,ratio:r.ratio,edits:Object.fromEntries(Object.keys(INITIAL_EDITS).map(k=>[k,r.edits[k]])),
  updatedAt:Number.isFinite(r.updatedAt)?r.updatedAt:Date.now(),trashed:r.trashed===true};
}
