import {layoutPieces} from './state.mjs';
const enc=new TextEncoder(), M=.0254;
const tuple=a=>'('+a.join(', ')+')';
const linear=n=>{n/=255;return n<=.04045?n/12.92:((n+.055)/1.055)**2.4};
function mesh(name,faces,mat,uv=false){const points=faces.flat().map(([x,y,z])=>[x,z,-y]);return `def Mesh "${name}" (prepend apiSchemas = ["MaterialBindingAPI"]) {
 uniform token subdivisionScheme = "none"
 bool doubleSided = false
 int[] faceVertexCounts = [${faces.map(()=>4)}]
 int[] faceVertexIndices = [${points.map((_,i)=>i)}]
 point3f[] points = [${points.map(tuple)}]
 ${uv?'texCoord2f[] primvars:st = [(0,0),(1,0),(1,1),(0,1)] (interpolation = "faceVarying")':''}
 rel material:binding = </Artwork/Looks/${mat}>
 }`;}
function quad(name,left,bottom,right,top,z,mat,uv=true){return mesh(name,[[[left,bottom,z],[right,bottom,z],[right,top,z],[left,top,z]]],mat,uv);}
function material(name,color,texture='',alpha=false,emission=false){return `def Material "${name}" {
 token outputs:surface.connect = </Artwork/Looks/${name}/Surface.outputs:surface>
 def Shader "Surface" {
 uniform token info:id = "UsdPreviewSurface"
 color3f inputs:diffuseColor = ${tuple(color)}
 ${texture?`color3f inputs:diffuseColor.connect = </Artwork/Looks/${name}/Texture.outputs:rgb>`:''}
 ${alpha?`float inputs:opacity.connect = </Artwork/Looks/${name}/Texture.outputs:a>`:''}
 ${emission?`color3f inputs:emissiveColor = ${tuple(color)}`:''}
 float inputs:roughness = 1
 float inputs:metallic = 0
 token outputs:surface
 }
 ${texture?`def Shader "UV" { uniform token info:id = "UsdPrimvarReader_float2"
 token inputs:varname = "st"
 float2 outputs:result
 }
 def Shader "Texture" {
 uniform token info:id = "UsdUVTexture"
 asset inputs:file = @${texture}@
 token inputs:sourceColorSpace = "sRGB"
 token inputs:wrapS = "clamp"
 token inputs:wrapT = "clamp"
 float2 inputs:st.connect = </Artwork/Looks/${name}/UV.outputs:result>
 float3 outputs:rgb
 float outputs:a
 }`:''}
 }`;}
export function scene(pieces,settings){
 const layout=layoutPieces(pieces,settings),geometries=[],mats=[];
 layout.items.forEach((p,i)=>{
  const l=(p.x-p.width/2)*M,r=(p.x+p.width/2)*M,b=(p.y-p.height/2)*M,t=(p.y+p.height/2)*M;
  const back=.5*M,front=(p.depth+.5)*M; // Half-inch standoff from the wall.
  geometries.push(quad(`Front${i}`,l,b,r,t,front,`Image${i}`));
  geometries.push(mesh(`Panel${i}`,[
   [[r,b,back],[l,b,back],[l,t,back],[r,t,back]],
   [[l,b,back],[r,b,back],[r,b,front],[l,b,front]],
   [[r,t,back],[l,t,back],[l,t,front],[r,t,front]],
   [[l,t,back],[l,b,back],[l,b,front],[l,t,front]],
   [[r,b,back],[r,t,back],[r,t,front],[r,b,front]]],`Side${i}`));
  mats.push(material(`Image${i}`,[1,1,1],`art${i}.${p.extension||'jpeg'}`,true));
  mats.push(material(`Side${i}`,[1,3,5].map(c=>linear(parseInt(p.color.slice(c,c+2),16)))));
  if(settings.shadow){const pad=Math.max(.7*M,Math.min(p.width,p.height)*M*.045),dx=.45*M,dy=-.6*M;geometries.push(quad(`Shadow${i}`,l-pad+dx,b-pad+dy,r+pad+dx,t+pad+dy,.0002,'Shadow'));}
  if(settings.dimensions){const width=Math.min(p.width,32)*M;geometries.push(quad(`Label${i}`,p.x*M-width/2,b-3*M,p.x*M+width/2,b-.6*M,front,`Label${i}`));mats.push(material(`Label${i}`,[1,1,1],`label${i}.png`,true));}
 });
 if(settings.shadow)mats.push(material('Shadow',[0,0,0],'shadow.png',true));
 if(settings.wallGuide){
  const w=settings.wallWidth*M/2,h=settings.wallHeight*M/2,q=.003;
  geometries.push(quad('WallTop',-w,h-q,w,h,0,'Guide',false),quad('WallBottom',-w,-h,w,-h+q,0,'Guide',false),quad('WallLeft',-w,-h,-w+q,h,0,'Guide',false),quad('WallRight',w-q,-h,w,h,0,'Guide',false));
  geometries.push(quad('WallLabel',-Math.min(w,.6),h+.01,Math.min(w,.6),h+.08,.0003,'WallText'));
  mats.push(material('Guide',[.15,.55,.65],'',false,true),material('WallText',[1,1,1],'wall-label.png',true));
 }
 return `#usda 1.0
(defaultPrim = "Artwork"
 metersPerUnit = 1
 upAxis = "Y"
 customLayerData = { dictionary Apple = { int preferredIblVersion = 2 } })
def Xform "Artwork" (prepend apiSchemas = ["Preliminary_AnchoringAPI"]
 kind = "component") {
 uniform token preliminary:anchoring:type = "plane"
 uniform token preliminary:planeAnchoring:alignment = "vertical"
 ${geometries.join('\n')}
 def Scope "Looks" {
 ${mats.join('\n')}
 }
}`;
}
export function build(pieces,settings,assets){return zip([['model.usda',enc.encode(scene(pieces,settings))],...assets]);}
function crc32(a) { let c=0xffffffff; for(const b of a){ c^=b; for(let k=0;k<8;k++) c=(c>>>1)^((c&1)?0xedb88320:0); } return (c^0xffffffff)>>>0; }
// ZIP_STORED, aligned file payloads, USD root first. No recompression.
export function zip(entries) {
 const chunks=[],central=[]; let offset=0;
 for(const [name,data] of entries){
  const n=enc.encode(name),crc=crc32(data);
  let padding=(64-((offset+30+n.length)%64))%64; if(padding>0&&padding<4) padding+=64;
  const h=new Uint8Array(30+n.length+padding),v=new DataView(h.buffer);
  v.setUint32(0,0x04034b50,true);v.setUint16(4,20,true);v.setUint32(14,crc,true);v.setUint32(18,data.length,true);v.setUint32(22,data.length,true);v.setUint16(26,n.length,true);v.setUint16(28,padding,true);h.set(n,30);
  if(padding){v.setUint16(30+n.length,0x1986,true);v.setUint16(32+n.length,padding-4,true);}
  const c=new Uint8Array(46+n.length),cv=new DataView(c.buffer);
  cv.setUint32(0,0x02014b50,true);cv.setUint16(4,20,true);cv.setUint16(6,20,true);cv.setUint32(16,crc,true);cv.setUint32(20,data.length,true);cv.setUint32(24,data.length,true);cv.setUint16(28,n.length,true);cv.setUint32(42,offset,true);c.set(n,46);
  chunks.push(h,data);central.push(c);offset+=h.length+data.length;
 }
 const centralSize=central.reduce((s,c)=>s+c.length,0),end=new Uint8Array(22),v=new DataView(end.buffer);
 v.setUint32(0,0x06054b50,true);v.setUint16(8,entries.length,true);v.setUint16(10,entries.length,true);v.setUint32(12,centralSize,true);v.setUint32(16,offset,true);
 return new Blob([...chunks,...central,end],{type:'model/vnd.usdz+zip'});
}
