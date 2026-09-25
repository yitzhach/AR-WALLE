import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {INITIAL_SCENE,INITIAL_EDITS,LABEL_ASPECT,MAX_TEXTURE,createPiece,setDimension,layoutPieces,setScaleOption,arFragment,validateRecord} from '../public/state.mjs';
import {scene,build} from '../public/model.mjs';
import {detectImage,prepareUpload,isHEIF,adjustPixel,isEdited,textureSize} from '../public/images.mjs';
const original=await readFile(new URL('../public/assets/example.jpeg',import.meta.url));
const piece=()=>({...createPiece('test','Test',new Blob([original],{type:'image/jpeg'}),962,2047),width:48,height:60});
test('defaults and aspect link preserve proportions',()=>{const p=createPiece('a','A',new Blob(),4,5);assert.equal(p.depth,3.5);assert.equal(INITIAL_SCENE.shadow,true);setDimension(p,'width',48);assert.equal(p.height,60);p.aspect=false;setDimension(p,'width',36);assert.equal(p.height,60);});
test('multi-piece physical bounds and spacing',()=>{const a=piece(),b={...piece(),width:24};const l=layoutPieces([a,b],{...INITIAL_SCENE,gap:3});assert.equal(l.width,75);assert.equal(l.height,60);assert.equal((l.items[1].x-12)-(l.items[0].x+24),3);assert.equal(layoutPieces([a,b],{...INITIAL_SCENE,layout:'column'}).height,123);assert.throws(()=>layoutPieces([{...a,width:NaN}],INITIAL_SCENE));});
test('measurements force true scale; free pinch is explicit',()=>{assert.equal(arFragment(INITIAL_SCENE),'#allowsContentScaling=1');for(const option of [{resize:false},{dimensions:true},{wallGuide:true}])assert.equal(arFragment({...INITIAL_SCENE,...option}),'#allowsContentScaling=0');});
test('JPEG detection preserves original bytes',async()=>{const result=await detectImage(new Blob([original]));assert.equal(result.blob.type,'image/jpeg');assert.equal(result.normalize,false);assert.deepEqual(Buffer.from(await result.blob.arrayBuffer()),original);await assert.rejects(detectImage(new Blob(['invalid'])));});
test('iPhone photo format is recognized without confusing AVIF and existing JPEG',async()=>{
 const header=brand=>new TextEncoder().encode(`....ftyp${brand}....mif1`);
 assert.equal(isHEIF(header('heic')),true);
 assert.equal(isHEIF(header('avif')),false);
 const result=await prepareUpload(new Blob([original],{type:'image/jpeg'}));
 assert.equal(result.converted,false);
 assert.deepEqual(Buffer.from(await result.blob.arrayBuffer()),original);
});
test('neutral pixel edits are identity, edits are deterministic and bounded',()=>{assert.equal(isEdited(INITIAL_EDITS),false);const out=adjustPixel(50,110,210,INITIAL_EDITS);out.forEach((v,i)=>assert.ok(Math.abs(v-[50,110,210][i])<1e-8));const edited=adjustPixel(50,110,210,{...INITIAL_EDITS,brightness:100});assert.ok(edited[0]>out[0]);assert.ok(edited.every(n=>n>=0&&n<=255));assert.equal(isEdited({...INITIAL_EDITS,flipH:true}),true);});
test('library validation rejects corrupt dimensions and settings',()=>{assert.equal(validateRecord(piece()).width,48);assert.throws(()=>validateRecord({...piece(),depth:-1}));assert.throws(()=>validateRecord({...piece(),edits:{...INITIAL_EDITS,hue:181}}));});
test('USD wall anchoring and exact geometry encode inches as meters',()=>{const usd=scene([piece()],{...INITIAL_SCENE,shadow:false});assert.match(usd,/metersPerUnit = 1/);assert.match(usd,/planeAnchoring:alignment = "vertical"/);const points=usd.match(/point3f\[\] points = \[([^\]]+)\]/)[1].match(/\([^)]+\)/g).map(p=>p.slice(1,-1).split(',').map(Number));assert.ok(Math.abs(points[1][0]-points[0][0]-1.2192)<1e-7);assert.ok(Math.abs(points[0][2]-points[2][2]-1.524)<1e-7);assert.equal(points[0][1],.1016);assert.match(usd,/0.0127/);const rich=scene([piece()],{...INITIAL_SCENE,dimensions:true,wallGuide:true});assert.match(rich,/def Mesh "Shadow0"/);assert.match(rich,/def Mesh "Label0"/);assert.match(rich,/def Mesh "WallTop"/);});
test('USDZ entries are uncompressed, aligned and preserve original texture',async()=>{const blob=build([piece()],{...INITIAL_SCENE,shadow:false},[['art0.jpeg',original]]);const bytes=Buffer.from(await blob.arrayBuffer());let offset=0,entries=[];while(bytes.readUInt32LE(offset)===0x04034b50){assert.equal(bytes.readUInt16LE(offset+8),0);const size=bytes.readUInt32LE(offset+18),n=bytes.readUInt16LE(offset+26),extra=bytes.readUInt16LE(offset+28),start=offset+30+n+extra;assert.equal(start%64,0);entries.push([bytes.subarray(offset+30,offset+30+n).toString(),bytes.subarray(start,start+size)]);offset=start+size;}assert.equal(entries[0][0],'model.usda');assert.deepEqual(entries[1][1],original);assert.equal(bytes.readUInt32LE(offset),0x02014b50);});
const quadSize=(usd,name)=>{const pts=usd.match(new RegExp(`def Mesh "${name}"[\\s\\S]*?points = \\[([^\\]]+)\\]`))[1].match(/\([^)]+\)/g).map(p=>p.slice(1,-1).split(',').map(Number));return [Math.abs(pts[1][0]-pts[0][0]),Math.abs(pts[2][2]-pts[1][2])];};
test('AR labels keep the label texture aspect ratio at any artwork or wall size',()=>{for(const width of [6,10,19.2,48,200])for(const wallWidth of [12,40,120,600]){const usd=scene([{...piece(),width,aspect:false}],{...INITIAL_SCENE,dimensions:true,wallGuide:true,wallWidth});for(const name of ['Label0','WallLabel']){const [w,h]=quadSize(usd,name);assert.ok(Math.abs(w/h-LABEL_ASPECT)<1e-9,`${name} ${width}/${wallWidth}: ${w/h}`);}}});
test('artwork is opaque; only overlays use texture alpha',()=>{const usd=scene([piece()],{...INITIAL_SCENE,dimensions:true});const image=usd.match(/def Material "Image0"[\s\S]*?def Shader "UV"/)[0];assert.doesNotMatch(image,/inputs:opacity/);assert.match(usd.match(/def Material "Label0"[\s\S]*?def Shader "UV"/)[0],/inputs:opacity.connect/);assert.match(usd.match(/def Material "Shadow"[\s\S]*?def Shader "UV"/)[0],/inputs:opacity.connect/);});
test('shadow projects beyond artwork while staying inside the half-inch mounting gap',()=>{
 const usd=scene([piece()],INITIAL_SCENE);
 const points=name=>usd.match(new RegExp(`def Mesh "${name}"[\\s\\S]*?points = \\[([^\\]]+)\\]`))[1].match(/\([^)]+\)/g).map(v=>v.slice(1,-1).split(',').map(Number));
 const front=points('Front0'),shadow=points('Shadow0');
 assert.ok(Math.max(...shadow.map(p=>p[0]))>Math.max(...front.map(p=>p[0])));
 assert.ok(Math.min(...shadow.map(p=>p[2]))<Math.min(...front.map(p=>p[2])));
 assert.ok(shadow.every(p=>p[1]>0&&p[1]<.0127));
 assert.doesNotMatch(scene([piece()],{...INITIAL_SCENE,shadow:false}),/def Mesh "Shadow0"/);
});
test('AR textures are capped on the long edge and keep proportions',()=>{assert.deepEqual(textureSize(962,2047),[962,2047]);assert.deepEqual(textureSize(12000,2000),[MAX_TEXTURE,683]);assert.deepEqual(textureSize(3000,6000),[2048,MAX_TEXTURE]);assert.deepEqual(textureSize(MAX_TEXTURE,10),[MAX_TEXTURE,10]);});

test('panorama and portrait uploads start with a 48-inch longest edge',()=>{
 for(const [w,h] of [[6000,1000],[1000,6000],[4000,3000],[3000,4000],[2000,2000]]){
  const p=createPiece('upload','Upload',new Blob(),w,h);
  assert.equal(Math.max(p.width,p.height),48);
  assert.ok(Math.abs(p.width/p.height-w/h)<1e-10);
  assert.doesNotThrow(()=>layoutPieces([p],INITIAL_SCENE));
 }
});
test('enabling pinch clears measurement locks; enabling measurements disables pinch',()=>{
 for(const key of ['dimensions','wallGuide']){
  const s={...INITIAL_SCENE};setScaleOption(s,key,true);
  assert.equal(s.resize,false);assert.equal(arFragment(s),'#allowsContentScaling=0');
  setScaleOption(s,'resize',true);
  assert.equal(s.dimensions,false);assert.equal(s.wallGuide,false);
  assert.equal(arFragment(s),'#allowsContentScaling=1');
  setScaleOption(s,'resize',false);assert.equal(arFragment(s),'#allowsContentScaling=0');
 }
});
