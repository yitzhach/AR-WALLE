import {INITIAL_EDITS,INITIAL_SCENE,createPiece,layoutPieces,setDimension,setScaleOption,arFragment,validateRecord,fmt} from './state.mjs';
import {saveMany,listSaved,trash,restore} from './storage.mjs';
import {detectImage,prepareUpload,loadImage,renderTexture,makeShadow,makeLabel} from './images.mjs';
import {build} from './model.mjs';
const $=id=>document.getElementById(id),pieces=[],settings={...INITIAL_SCENE};
let selected=null,saved=[],deleted=null,libraryURLs=[],cache=new Map(),generation=0,timer,arBlob,arURL,shadow,picking=false,theme='dark',libraryBusy=false;
let supportsAR=false;try{supportsAR=$('launch').relList.supports('ar')}catch{}
const active=()=>pieces.find(p=>p.id===selected);
const notice=text=>$('message').textContent=text;
const uid=()=>crypto.randomUUID?.()||`art-${Date.now()}-${Math.random().toString(16).slice(2)}`;
const element=(tag,attrs={},text='')=>{const e=document.createElement(tag);for(const [k,v]of Object.entries(attrs))if(k==='class')e.className=v;else e.setAttribute(k,v);e.textContent=text;return e;};
function setTheme(mode){theme=mode;document.documentElement.dataset.theme=theme;$('theme').textContent=theme==='dark'?'Light mode':'Dark mode';$('theme').setAttribute('aria-label',`Switch to ${theme==='dark'?'light':'dark'} mode`);try{localStorage.setItem('ar-walle-theme',theme)}catch{}}
try{theme=localStorage.getItem('ar-walle-theme')==='light'?'light':'dark'}catch{}setTheme(theme);
$('theme').addEventListener('click',()=>setTheme(theme==='dark'?'light':'dark'));
const editorTabs=[...document.querySelectorAll('.editor-tabs [role="tab"]')];
function showEditorTab(tab){
 for(const item of editorTabs){const active=item===tab;item.setAttribute('aria-selected',String(active));item.tabIndex=active?0:-1;$(item.getAttribute('aria-controls')).hidden=!active;}
 document.querySelector('.workspace').classList.toggle('image-editing',tab.id==='tab-image');
}
editorTabs.forEach((tab,index)=>{
 tab.addEventListener('click',()=>showEditorTab(tab));
 tab.addEventListener('keydown',event=>{if(!['ArrowLeft','ArrowRight','Home','End'].includes(event.key))return;event.preventDefault();const next=event.key==='Home'?0:event.key==='End'?editorTabs.length-1:(index+(event.key==='ArrowRight'?1:-1)+editorTabs.length)%editorTabs.length;showEditorTab(editorTabs[next]);editorTabs[next].focus();});
});
function readScene(){for(const key of ['gap','wallWidth','wallHeight'])settings[key]=Number($(key).value);settings.layout=$('layout').value;for(const key of ['shadow','gallery','dimensions','wallGuide','resize'])settings[key]=$(key).checked;
 const locked=settings.dimensions||settings.wallGuide;if(locked){settings.resize=false;$('resize').checked=false;}
 $('scale-note').textContent=locked?'Measurements lock scale. Enable pinch resizing to hide measurements and resize in AR.':settings.resize?'Pinch enabled. Entered dimensions are the starting size; AR cannot report the final resized dimensions.':'True-size mode. Pinching is disabled; change dimensions here and relaunch.';
}
function setARDisabled(text){arBlob=null;$('launch').removeAttribute('href');$('launch').setAttribute('aria-disabled','true');$('download').disabled=true;$('ar-status').textContent=text;}
function invalidate(){generation++;clearTimeout(timer);readScene();setARDisabled('Preparing your arrangement…');paintPreview();timer=setTimeout(prepare,300);}
async function texture(p,version){const key=JSON.stringify([p.edits,settings.gallery,p.normalize]),existing=cache.get(p.id);if(existing?.key===key)return existing;
 const result=await renderTexture({...p,edits:{...p.edits}},settings.gallery);if(version!==generation){URL.revokeObjectURL(result.url);return result;}const latest=cache.get(p.id);if(latest)URL.revokeObjectURL(latest.url);const entry={...result,key};cache.set(p.id,entry);return entry;
}
function newARLink(){if(!arBlob)return;const prev=arURL;arURL=URL.createObjectURL(arBlob);$('launch').href=arURL+arFragment(settings);$('launch').setAttribute('download','ar-walle.usdz');if(prev)setTimeout(()=>URL.revokeObjectURL(prev),120000);}
async function prepare(){
 const version=generation;
 try{
  const layout=layoutPieces(pieces,settings),assets=[],models=[];
  shadow??=await makeShadow();
  for(let i=0;i<layout.items.length;i++){
   const p=pieces[i],tx=await texture(p,version);if(version!==generation)return;
   assets.push([`art${i}.${tx.extension}`,new Uint8Array(await tx.blob.arrayBuffer())]);models.push({...p,extension:tx.extension});
   if(settings.dimensions)assets.push([`label${i}.png`,await makeLabel(`${fmt(p.width)} × ${fmt(p.height)} × ${fmt(p.depth)} in`)]);
  }
  if(version!==generation)return;
  if(settings.shadow)assets.push(['shadow.png',shadow]);
  if(settings.wallGuide)assets.push(['wall-label.png',await makeLabel(`WALL REFERENCE · ${fmt(settings.wallWidth)} × ${fmt(settings.wallHeight)} in`)]);
  if(version!==generation)return;
  const blob=build(models,settings,assets);if(blob.size>100*1024*1024)throw Error('This arrangement is too large for a mobile AR file. Use fewer or smaller images.');
  arBlob=blob;newARLink();$('launch').setAttribute('aria-disabled',String(!supportsAR));$('download').disabled=false;
  $('ar-status').textContent=supportsAR?'Ready. Point your iPhone toward a wall.':'AR placement opens in Safari on iPhone. You can still edit and download the USDZ here.';
  paintPreview();
 }catch(error){if(version===generation)setARDisabled(error.message);}
}
function paintPreview(){
 const wall=$('wall'),wrap=wall.parentElement,container=$('wall-art');container.replaceChildren();
 if(!pieces.length){$('total-size').textContent='No artwork';$('arrangement-title').textContent='Upload your first artwork';return;}
 let layout;try{layout=layoutPieces(pieces,settings)}catch{return;}
 $('total-size').textContent=`${fmt(layout.width)} × ${fmt(layout.height)} in`;$('arrangement-title').textContent=pieces.length===1?active()?.name||pieces[0].name:`${pieces.length}-piece arrangement`;
 const maxW=Math.max(200,wrap.clientWidth-50),maxH=Math.max(220,wrap.clientHeight-50),scale=Math.min(maxW/settings.wallWidth,maxH/settings.wallHeight);
 wall.style.width=`${settings.wallWidth*scale}px`;wall.style.height=`${settings.wallHeight*scale}px`;$('wall-guide').hidden=!settings.wallGuide;
 $('wall-caption').textContent=`Wall reference · ${fmt(settings.wallWidth)} × ${fmt(settings.wallHeight)} in`;
 layout.items.forEach(p=>{
  const tx=cache.get(p.id),button=element('button',{class:`wall-piece${p.id===selected?' selected':''}${picking&&p.id===selected?' picking':''}`,'aria-label':`Select ${p.name}`});
  Object.assign(button.style,{width:p.width*scale+'px',height:p.height*scale+'px',left:(settings.wallWidth/2+p.x)*scale+'px',top:(settings.wallHeight/2-p.y)*scale+'px',boxShadow:settings.shadow?`${Math.max(4,scale)}px ${Math.max(5,scale*1.25)}px ${Math.max(12,scale*2.5)}px ${Math.max(2,scale*.5)}px #0008`:'none',borderRight:`${Math.min(8,p.depth*scale*.25)}px solid ${p.color}`,boxSizing:'content-box'});
  if(tx){const img=element('img',{src:tx.url,alt:p.name,draggable:'false'});button.append(img);}
  if(settings.dimensions)button.append(element('span',{class:'dimension-tag'},`${fmt(p.width)} × ${fmt(p.height)} in`));
  button.addEventListener('click',e=>{if(picking&&p.id===selected){sample(e,button,p);return;}selected=p.id;syncInspector();paintPreview();renderTabs();});container.append(button);
 });
 $('preview-note').textContent=layout.width>settings.wallWidth||layout.height>settings.wallHeight?'This arrangement extends beyond the entered wall size. Reduce the artwork dimensions or increase the wall reference.':'Select an artwork to edit it. Measurements describe the artwork, not its shadow.';
}
function sample(e,button,p){const tx=cache.get(p.id);if(!tx)return;try{const img=button.querySelector('img'),r=img.getBoundingClientRect(),c=document.createElement('canvas');c.width=tx.image.naturalWidth;c.height=tx.image.naturalHeight;const ctx=c.getContext('2d',{willReadFrequently:true});ctx.drawImage(tx.image,0,0);const x=Math.max(0,Math.min(c.width-1,Math.floor((e.clientX-r.left)/r.width*c.width))),y=Math.max(0,Math.min(c.height-1,Math.floor((e.clientY-r.top)/r.height*c.height)));const rgb=ctx.getImageData(x,y,1,1).data;p.color='#'+Array.from(rgb).slice(0,3).map(v=>v.toString(16).padStart(2,'0')).join('');picking=false;syncInspector();invalidate();notice('Side color sampled from the artwork.');}catch{notice('Could not sample this image. Use the side color picker instead.');}}
function renderTabs(){const root=$('piece-tabs');root.replaceChildren();pieces.forEach((p,i)=>{const b=element('button',{'aria-pressed':String(p.id===selected)},`${i+1} · ${p.name}`);b.addEventListener('click',()=>{selected=p.id;syncInspector();renderTabs();paintPreview();});root.append(b);});}
function syncInspector(){const p=active();for(const id of ['name','width','height','depth','color','aspect','save','eyedropper','duplicate','remove','remove-artwork','flipH','flipV','reset-edits'])$(id).disabled=!p;
 if(!p)return;for(const k of ['name','width','height','depth','color'])$(k).value=typeof p[k]==='number'?Number(p[k].toFixed(6)):p[k];$('aspect').checked=p.aspect;
 $('aspect-note').textContent=p.aspect?'Current proportions stay linked.':'Width and height are independent; the artwork will stretch.';
 for(const k of Object.keys(INITIAL_EDITS)){if(k.startsWith('flip'))$(k).setAttribute('aria-pressed',String(p.edits[k]));else{$(k).value=p.edits[k];$(`${k}-value`).textContent=p.edits[k];}}
 $('eyedropper').setAttribute('aria-pressed',String(picking));$('eyedropper').textContent=picking?'Tap selected artwork · Cancel':'Pick side color from artwork';}
for(const [key,label]of [['brightness','Brightness'],['contrast','Contrast'],['saturation','Saturation'],['highlights','Highlights'],['shadows','Shadows'],['hue','Hue'],['warmth','Warmth']]){
 const row=element('div',{class:'slider-row'}),labelNode=element('label',{for:key},label),out=element('output',{id:`${key}-value`},'0'),input=element('input',{id:key,type:'range',min:key==='hue'?'-180':'-100',max:key==='hue'?'180':'100',value:'0',step:'1'});labelNode.append(out);row.append(labelNode,input);$('sliders').append(row);input.addEventListener('input',()=>{const p=active();if(!p)return;p.edits[key]=Number(input.value);out.textContent=input.value;invalidate();});
}
for(const key of ['width','height'])$(key).addEventListener('input',()=>{const p=active();if(!p)return;setDimension(p,key,Number($(key).value));if(p.aspect)$(key==='width'?'height':'width').value=Number(p[key==='width'?'height':'width'].toFixed(6));invalidate();});
$('name').addEventListener('input',()=>{const p=active();if(p){p.name=$('name').value.trim()||'Untitled artwork';renderTabs();paintPreview();}});
$('aspect').addEventListener('change',()=>{const p=active();if(!p)return;p.aspect=$('aspect').checked;if(p.width>0&&p.height>0)p.ratio=p.width/p.height;syncInspector();invalidate();});
for(const key of ['depth','color'])$(key).addEventListener('input',()=>{const p=active();if(p){p[key]=key==='depth'?Number($(key).value):$(key).value;invalidate();}});
for(const key of ['flipH','flipV'])$(key).addEventListener('click',()=>{const p=active();if(p){p.edits[key]=!p.edits[key];syncInspector();invalidate();}});
$('reset-edits').addEventListener('click',()=>{const p=active();if(p){p.edits={...INITIAL_EDITS};syncInspector();invalidate();notice('Image adjustments reset. Turn off Gallery lighting for the original appearance.');}});
$('eyedropper').addEventListener('click',()=>{picking=!picking;syncInspector();paintPreview();if(picking)notice('Tap a color on the selected artwork in the wall preview.');});
for(const key of ['dimensions','resize','wallGuide'])$(key).addEventListener('input',()=>{
 setScaleOption(settings,key,$(key).checked);
 for(const option of ['dimensions','resize','wallGuide'])$(option).checked=settings[option];
 invalidate();
});
for(const key of ['layout','gap','shadow','gallery','wallWidth','wallHeight'])$(key).addEventListener('input',invalidate);
$('reset-ar').addEventListener('click',()=>{invalidate();notice('Close AR, then reopen VIEW ON MY WALL to restore the entered dimensions.');});
$('launch').addEventListener('click',e=>{if(!supportsAR||!arBlob||$('launch').getAttribute('aria-disabled')==='true'){e.preventDefault();return;}newARLink();});
function download(blob,name){const url=URL.createObjectURL(blob),a=element('a',{href:url,download:name});document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),120000);}
$('download').addEventListener('click',()=>{if(arBlob)download(arBlob,'ar-walle.usdz');});
function addPiece(record){if(pieces.length>=8)throw Error('An arrangement can contain up to 8 pieces.');const p={...record,id:uid(),libraryId:record.libraryId||null,edits:{...record.edits}};pieces.push(p);selected=p.id;return p;}
function updateArrangement(){syncInspector();renderTabs();invalidate();}
$('duplicate').addEventListener('click',()=>{try{const p=active();if(p){addPiece({...p,libraryId:null,name:p.name+' · copy'});updateArrangement();}}catch(e){notice(e.message)}});
function removeSelected(){const i=pieces.findIndex(p=>p.id===selected);if(i<0)return;const old=cache.get(selected);if(old)URL.revokeObjectURL(old.url);cache.delete(selected);pieces.splice(i,1);selected=pieces[Math.max(0,i-1)]?.id||null;picking=false;updateArrangement();notice('Removed from this arrangement. A saved library copy is still available below.');}
for(const id of ['remove','remove-artwork'])$(id).addEventListener('click',removeSelected);
async function importFiles(files){
 if(files.length+pieces.length>8){notice('Add up to 8 pieces per arrangement. Remove a piece before uploading more.');return;}
 let added=0,converted=0;const errors=[],imported=[];for(const file of files){let loaded;try{
  if(file.size>15*1024*1024)throw Error('Each artwork must be under 15 MB.');
  if(pieces.reduce((n,p)=>n+p.blob.size,0)+file.size>60*1024*1024)throw Error('Keep the arrangement’s source images under 60 MB total.');
  const source=await prepareUpload(file);if(pieces.reduce((n,p)=>n+p.blob.size,0)+source.blob.size>60*1024*1024)throw Error('Keep the arrangement’s source images under 60 MB total.');loaded=await loadImage(source.blob);const {naturalWidth:w,naturalHeight:h}=loaded.image;if(w*h>24000000)throw Error('Please use an image of 24 megapixels or less.');
  const p=createPiece(uid(),file.name.replace(/\.[^.]+$/,'').slice(0,160),source.blob,w,h,source.normalize);imported.push(addPiece(p));added++;
  if(source.converted)converted++;
 }catch(e){errors.push(`${file.name}: ${e.message}`);}finally{if(loaded)URL.revokeObjectURL(loaded.url);}}
 updateArrangement();
 let savedCount=0;
 if(imported.length){try{
  const records=imported.map(p=>validateRecord(recordFromPiece(p,uid())));
  await saveMany(records);
  imported.forEach((p,i)=>p.libraryId=records[i].id);
  savedCount=records.length;
  await refreshLibrary();
 }catch(e){errors.push(`Could not save to the library: ${e.message}. The artwork remains on the wall; use Save artwork changes to retry.`);}}
 notice([savedCount?`Added and saved ${savedCount} artwork${savedCount===1?'':'s'} to this browser's library.`:added?`Added ${added} artwork${added===1?'':'s'} to the wall.`:'',converted?`Converted ${converted} iPhone photo${converted===1?'':'s'} to JPEG locally.`:'',...errors].filter(Boolean).join(' '));
}
$('upload').addEventListener('click',()=>$('files').click());$('files').addEventListener('change',async()=>{await importFiles([...$('files').files]);$('files').value='';});
$('quick-upload').addEventListener('click',()=>$('files').click());
$('camera').addEventListener('click',()=>$('camera-file').click());$('camera-file').addEventListener('change',async()=>{await importFiles([...$('camera-file').files]);$('camera-file').value='';});
function recordFromPiece(p,id){return {id,name:p.name,blob:p.blob,pixelWidth:p.pixelWidth,pixelHeight:p.pixelHeight,normalize:p.normalize,width:p.width,height:p.height,depth:p.depth,color:p.color,aspect:p.aspect,ratio:p.ratio,edits:{...p.edits},updatedAt:Date.now(),trashed:false};}
async function refreshLibrary(){saved=await listSaved();libraryURLs.forEach(URL.revokeObjectURL);libraryURLs=[];const root=$('library-list');root.replaceChildren();$('saved-count').textContent=`${saved.length} saved`;
 if(!saved.length){root.append(element('p',{class:'quiet'},'Save your first artwork to reuse it in another arrangement.'));return;}
 saved.sort((a,b)=>b.updatedAt-a.updatedAt).forEach(r=>{const card=element('div',{class:'library-card'}),url=URL.createObjectURL(r.blob);libraryURLs.push(url);card.append(element('img',{src:url,alt:r.name}));const content=element('div');content.append(element('p',{},r.name));const actions=element('div',{class:'actions'}),add=element('button',{},'Add'),remove=element('button',{},'Remove');add.setAttribute('aria-label',`Add ${r.name} from library`);remove.setAttribute('aria-label',`Remove ${r.name} from library`);add.addEventListener('click',()=>{try{addPiece({...r,libraryId:r.id});updateArrangement();notice('Added saved artwork with its dimensions and edits.');}catch(e){notice(e.message)}});remove.addEventListener('click',async()=>{try{await trash(r);deleted=r;$('undo-delete').hidden=false;await refreshLibrary();notice('Removed from library. You can undo this removal.');}catch(e){notice(e.message)}});actions.append(add,remove);content.append(actions);card.append(content);root.append(card);});
}
$('save').addEventListener('click',async()=>{if(libraryBusy||!active())return;libraryBusy=true;$('save').disabled=true;const p=active(),id=p.libraryId||uid();try{const record=validateRecord(recordFromPiece(p,id));await saveMany([record]);p.libraryId=id;await refreshLibrary();notice(`Saved “${record.name}” on this browser.`);}catch(e){notice(`Could not save: ${e.message}. Your artwork is still in the arrangement; try again or export it.`);}finally{libraryBusy=false;$('save').disabled=!active();}});
$('undo-delete').addEventListener('click',async()=>{if(!deleted)return;try{await restore(deleted);deleted=null;$('undo-delete').hidden=true;await refreshLibrary();notice('Library artwork restored.');}catch(e){notice(e.message)}});
const base64=blob=>new Promise((resolve,reject)=>{const r=new FileReader();r.onload=()=>resolve(String(r.result).split(',')[1]);r.onerror=()=>reject(r.error);r.readAsDataURL(blob);});
$('backup').addEventListener('click',async()=>{try{const records=await listSaved();if(!records.length){notice('Save an artwork before exporting your library.');return;}const items=[];for(const r of records){const {blob,...meta}=r;items.push({...meta,type:blob.type,data:await base64(blob)});}download(new Blob([JSON.stringify({format:'ar-walle-library',version:1,items})],{type:'application/json'}),'ar-walle-library.json');notice('Library backup downloaded, including originals and saved edits.');}catch(e){notice(`Backup failed: ${e.message}`)}});
$('restore').addEventListener('click',()=>$('backup-file').click());$('backup-file').addEventListener('change',async()=>{const file=$('backup-file').files[0];$('backup-file').value='';if(!file)return;try{
 if(file.size>100*1024*1024)throw Error('Backup must be under 100 MB.');const backup=JSON.parse(await file.text());if(backup.format!=='ar-walle-library'||backup.version!==1||!Array.isArray(backup.items)||backup.items.length>100)throw Error('Unsupported library backup.');
 const records=[];for(const item of backup.items){if(typeof item.data!=='string')throw Error('Missing image data.');const bytes=Uint8Array.from(atob(item.data),c=>c.charCodeAt(0)),source=await detectImage(new Blob([bytes],{type:item.type}));const r=validateRecord({...item,id:uid(),blob:source.blob,normalize:source.normalize,trashed:false,updatedAt:Date.now()});const loaded=await loadImage(r.blob);if(loaded.image.naturalWidth*loaded.image.naturalHeight>24000000){URL.revokeObjectURL(loaded.url);throw Error('Backup image is too large.');}r.pixelWidth=loaded.image.naturalWidth;r.pixelHeight=loaded.image.naturalHeight;URL.revokeObjectURL(loaded.url);delete r.data;records.push(r);}
 await saveMany(records);await refreshLibrary();notice(`Imported ${records.length} artworks as new library copies. Existing saves were kept.`);
 }catch(e){notice(`Import failed: ${e.message}. No partial library import was saved.`);}});
window.addEventListener('resize',paintPreview);
async function start(){readScene();try{await refreshLibrary()}catch{notice('Browser storage is unavailable. You can edit and use AR, but saving needs browser storage enabled.');}
 try{const response=await fetch('assets/example.jpeg');if(!response.ok)throw Error('Sample artwork unavailable. Upload a JPG or PNG to begin.');const blob=await response.blob(),source=await detectImage(blob),loaded=await loadImage(source.blob);const p=createPiece(uid(),'Uploaded artwork · sample',source.blob,loaded.image.naturalWidth,loaded.image.naturalHeight,source.normalize);URL.revokeObjectURL(loaded.url);addPiece(p);updateArrangement();}catch(e){notice(e.message);syncInspector();setARDisabled('Upload artwork to start.');}}
start();
