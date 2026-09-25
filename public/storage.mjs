let pending;
function db(){return pending??=new Promise((resolve,reject)=>{const r=indexedDB.open('ar-walle-library',1);r.onupgradeneeded=()=>r.result.createObjectStore('artworks',{keyPath:'id'});r.onsuccess=()=>resolve(r.result);r.onerror=()=>{pending=null;reject(r.error)};r.onblocked=()=>{pending=null;reject(Error('Close another AR[T]WALLE tab and try saving again.'))};});}
async function write(records){const d=await db();return new Promise((resolve,reject)=>{const t=d.transaction('artworks','readwrite');t.oncomplete=resolve;t.onerror=()=>reject(t.error||Error('Library save failed.'));t.onabort=()=>reject(t.error||Error('Library save was interrupted.'));for(const record of records)t.objectStore('artworks').put(record);});}
export async function saveMany(records){await write(records);}
export async function listSaved(){const d=await db();return new Promise((resolve,reject)=>{const t=d.transaction('artworks','readonly'),r=t.objectStore('artworks').getAll();let data=[];r.onsuccess=()=>data=r.result;t.oncomplete=()=>resolve(data.filter(r=>!r.trashed));t.onerror=()=>reject(t.error);});}
export async function trash(record){await write([{...record,trashed:true}]);}
export async function restore(record){await write([{...record,trashed:false}]);}
