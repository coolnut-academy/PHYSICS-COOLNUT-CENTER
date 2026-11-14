import {CONFIG} from './config.js';
import {mock} from './mock.js';

const READ_ACTIONS=new Set(['healthCheck','getTopics','getTopic','getMedia']);
const pause=ms=>new Promise(resolve=>setTimeout(resolve,ms));

/**
 * Production API client: CORS POST (text/plain, credentials: omit) -> Apps Script doPost -> ContentService JSON
 * ใช้ credentials: 'omit' เพื่อเลี่ยง Google multi-account redirect (/macros/u/N/s/...) และ retry เฉพาะคำสั่งอ่านเมื่อเน็ตสะดุด
 */
class LiveApiClient {
  constructor(url){
    this.url=url;
  }
  async call(action,payload={}){
    const canRetry=READ_ACTIONS.has(action);
    const maxAttempts=canRetry?2:1;
    let lastErr;
    for(let attempt=0;attempt<maxAttempts;attempt++){
      try{
        return await this.sendOnce(action,payload);
      }catch(err){
        lastErr=err;
        if(!canRetry||attempt===maxAttempts-1||!err?.retryable)throw err;
        await pause(300);
      }
    }
    throw lastErr;
  }
  async sendOnce(action,payload){
    const controller=new AbortController();
    const timer=setTimeout(()=>controller.abort(),CONFIG.REQUEST_TIMEOUT_MS);
    try{
      const response=await fetch(this.url,{
        method:'POST',
        credentials:'omit',
        redirect:'follow',
        headers:{'Content-Type':'text/plain;charset=utf-8'},
        body:JSON.stringify({action,payload}),
        signal:controller.signal
      });
      const text=await response.text();
      let result;
      try{
        result=JSON.parse(text);
      }catch{
        if(!response.ok)throw new Error(`เซิร์ฟเวอร์ตอบกลับสถานะ ${response.status} ตรวจการ Deploy Apps Script (Execute as: Me, Access: Anyone)`);
        throw new Error('Apps Script ยังไม่ได้รองรับการตอบกลับ JSON (กรุณาอัปเดต Code.gs ที่มี doPost แล้ว Deploy ใหม่)');
      }
      if(!result||typeof result!=='object')throw new Error('รูปแบบข้อมูลจากเซิร์ฟเวอร์ไม่ถูกต้อง');
      if(!result.ok)throw new Error(result.error||'บริการไม่ตอบกลับ');
      return result.data;
    }catch(err){
      if(err?.name==='AbortError'){
        const e=new Error('หมดเวลารอเซิร์ฟเวอร์ กรุณาตรวจสถานะก่อนลองส่งใหม่');
        e.retryable=true;
        throw e;
      }
      if(err instanceof TypeError){
        const e=new Error('เชื่อมต่อ Apps Script ไม่ได้ ตรวจ URL /exec และการ Deploy (Execute as: Me, Access: Anyone)');
        e.retryable=true;
        throw e;
      }
      throw err;
    }finally{
      clearTimeout(timer);
    }
  }
}

// ใช้ mock เฉพาะตอนไม่มี DOM จริง (เช่น Node render_smoke test)
const live=CONFIG.MODE==='live'&&Boolean(CONFIG.API_URL)&&typeof document?.createElement==='function';
const client=live?new LiveApiClient(CONFIG.API_URL):null;
export const api={mode:live?'live':'demo',async call(action,payload={}){return live?client.call(action,payload):mock.call(action,payload);}};
