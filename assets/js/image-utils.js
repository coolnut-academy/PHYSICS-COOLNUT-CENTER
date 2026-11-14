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
  for(const q of [0.84,0.76,0.65,0.53,0.42]){data=canvas.toDataURL('image/jpeg',q);if(data.length*0.75<=target)break;}
  return data;
}
const mediaCache=new Map();
export function clearMediaCache(){mediaCache.clear();}
export async function getMediaSource(api,mediaId){
  if(!mediaId) return './assets/demo/empty-page.svg';
  if(mediaId.startsWith('./')||mediaId.startsWith('data:'))return mediaId;
  if(mediaCache.has(mediaId))return mediaCache.get(mediaId);
  const data=await api.call('getMedia',{mediaId});
  if(mediaCache.size>=40){const oldest=mediaCache.keys().next().value;mediaCache.delete(oldest);}
  mediaCache.set(mediaId,data.dataUrl);
  return data.dataUrl;
}
