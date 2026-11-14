import {CONFIG} from './config.js';
export function readFileAsDataURL(file){return new Promise((resolve,reject)=>{const r=new FileReader();r.onload=()=>resolve(r.result);r.onerror=()=>reject(new Error('อ่านไฟล์ไม่สำเร็จ'));r.readAsDataURL(file);});}
export async function optimizeImage(file,role='page'){
  if(!file) return null;
  if(!file.type.startsWith('image/')) throw new Error('รองรับไฟล์ภาพ JPG, PNG, WebP เท่านั้น');
  if(file.size>CONFIG.MAX_FILE_MB*1024*1024) throw new Error(`รูปมีขนาดเกิน ${CONFIG.MAX_FILE_MB} MB`);
  const raw=await readFileAsDataURL(file);
  const img=new Image(); img.src=raw; await img.decode();
  const maxWidth=role==='cover'?CONFIG.MAX_COVER_WIDTH:CONFIG.MAX_PAGE_WIDTH;
  const scale=Math.min(1,maxWidth/Math.max(img.width,img.height));
  const canvas=document.createElement('canvas');canvas.width=Math.max(1,Math.round(img.width*scale));canvas.height=Math.max(1,Math.round(img.height*scale));
  const ctx=canvas.getContext('2d');ctx.fillStyle='#ffffff';ctx.fillRect(0,0,canvas.width,canvas.height);ctx.drawImage(img,0,0,canvas.width,canvas.height);
  const target=(role==='cover'?CONFIG.MAX_COVER_KB:CONFIG.MAX_PAGE_KB)*1024;
  let data='';
  for(const q of [0.82,0.72,0.60,0.48,0.38]){data=canvas.toDataURL('image/jpeg',q);if(data.length*0.75<=target)break;}
  return data;
}
const MEDIA_CACHE_NAME='cf-media-v1';
const mediaCache=new Map();
const inflightMedia=new Map();
function cacheKeyUrl(id){return `https://cf-media.local/${encodeURIComponent(id)}`;}
function setMemoryCache(id,url){
  if(mediaCache.has(id))mediaCache.delete(id);
  else if(mediaCache.size>=80){const oldest=mediaCache.keys().next().value;mediaCache.delete(oldest);}
  mediaCache.set(id,url);
}
async function readStoredMedia(id){
  if(typeof caches!=='object'||typeof Response!=='function')return null;
  try{
    const cache=await caches.open(MEDIA_CACHE_NAME);
    const hit=await cache.match(cacheKeyUrl(id));
    if(!hit)return null;
    const text=await hit.text();
    return text.startsWith('data:')?text:null;
  }catch{return null;}
}
async function writeStoredMedia(id,dataUrl){
  if(typeof caches!=='object'||typeof Response!=='function')return;
  try{
    const cache=await caches.open(MEDIA_CACHE_NAME);
    await cache.put(cacheKeyUrl(id),new Response(dataUrl,{headers:{'Content-Type':'text/plain;charset=utf-8'}}));
  }catch{}
}
export function clearMediaCache(){
  mediaCache.clear();
  inflightMedia.clear();
  if(typeof caches==='object'){try{caches.delete(MEDIA_CACHE_NAME).catch(()=>{});}catch{}}
}
export async function getMediaSource(api,mediaId){
  if(!mediaId) return './assets/demo/empty-page.svg';
  if(mediaId.startsWith('./')||mediaId.startsWith('data:'))return mediaId;
  if(mediaCache.has(mediaId))return mediaCache.get(mediaId);
  if(inflightMedia.has(mediaId))return inflightMedia.get(mediaId);
  const job=(async()=>{
    const stored=await readStoredMedia(mediaId);
    if(stored){setMemoryCache(mediaId,stored);return stored;}
    const data=await api.call('getMedia',{mediaId});
    setMemoryCache(mediaId,data.dataUrl);
    writeStoredMedia(mediaId,data.dataUrl);
    return data.dataUrl;
  })();
  inflightMedia.set(mediaId,job);
  try{return await job;}finally{inflightMedia.delete(mediaId);}
}
