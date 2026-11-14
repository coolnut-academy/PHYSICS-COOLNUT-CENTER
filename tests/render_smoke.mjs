import assert from 'node:assert/strict';
const mode=process.argv[2]||'home';
let dbValue;
const db={createObjectStore(){},close(){},transaction(){const tx={oncomplete:null,objectStore(){return {get(){const r={result:dbValue};queueMicrotask(()=>r.onsuccess?.());return r;},put(x){dbValue=structuredClone(x);queueMicrotask(()=>tx.oncomplete?.());}}}};return tx;}};
globalThis.indexedDB={open(){const req={result:db};queueMicrotask(()=>req.onsuccess?.());return req;}};
const elements={'#app':{innerHTML:''},'#modal-layer':{innerHTML:''},'#presentation-layer':{innerHTML:''}};
globalThis.document={querySelector:q=>elements[q]||null,querySelectorAll:()=>[],getElementById:()=>({innerHTML:''}),addEventListener(){},fullscreenElement:null};
globalThis.window={addEventListener(){}};
const cache={'cf_teacher':mode==='teacher'?'demo-teacher':'','cf_access':JSON.stringify({'torquelab-demo':'TL2569'})};
globalThis.sessionStorage={getItem:k=>cache[k]||null,setItem:(k,v)=>cache[k]=v,removeItem:k=>delete cache[k]};
globalThis.location={hash:mode==='teacher'?'#/teacher':mode==='topic'?'#/topic/torquelab-demo':'#/'};
await import('../assets/js/app.js');
await new Promise(resolve=>setTimeout(resolve,350));
const content=elements['#app'].innerHTML;
assert.ok(content.includes('PHYSICS COOLNUT CENTER'),'brand should render');
if(mode==='home'){
 assert.ok(content.includes('เรียนรู้ / ลิงก์กิจกรรม'));
 assert.ok(content.includes('ส่งงาน / ผลงานกลุ่ม'));
 assert.ok(content.includes('สมดุลต่อการหมุน'));
 assert.ok(content.includes('แบบจำลองคานสมดุล'));
}
if(mode==='teacher'){
 assert.ok(content.includes('ลิงก์เรียนรู้'));
 assert.ok(content.includes('สร้างปุ่มกิจกรรม'));
 assert.ok(content.includes('Quiz ในเว็บ'));
}
if(mode==='topic'){
 assert.ok(content.includes('สิ่งที่ต้องส่ง'));
 assert.ok(content.includes('สร้างการ์ดกลุ่ม'));
 assert.ok(content.includes('กลุ่มที่ 1'));
}
console.log('PASS: SPA render smoke —',mode);
