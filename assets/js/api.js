import {CONFIG} from './config.js';
import {mock} from './mock.js';

/**
 * Production bridge: iframe on Apps Script HTML Service -> google.script.run -> server
 * ไม่ใช้ fetch(no-cors) และไม่อ้างว่าบันทึกสำเร็จก่อน Server ตอบกลับ
 */
class RpcBridge {
  constructor(url){this.url=url;this.iframe=null;this.pending=new Map();this.ready=null;this.counter=0;window.addEventListener('message',e=>this.onMessage(e));}
  onMessage(e){
    if(!this.iframe||e.source!==this.iframe.contentWindow)return;
    let origin='';
    try{origin=new URL(e.origin).hostname;}catch{return;}
    if(!(['script.google.com','script.googleusercontent.com'].includes(origin)||origin.endsWith('.googleusercontent.com')))return;
    const d=e.data||{};
    if(d.type==='classfolio:bridge-ready'&&this.resolveReady){this.resolveReady();this.resolveReady=null;return;}
    if(d.type!=='classfolio:rpc-result'||!this.pending.has(d.id))return;
    const item=this.pending.get(d.id);clearTimeout(item.timer);this.pending.delete(d.id);
    if(d.ok)item.resolve(d.data);else item.reject(new Error(d.error||'บริการไม่ตอบกลับ'));
  }
  async connect(){
    if(this.ready)return this.ready;
    this.ready=new Promise((resolve,reject)=>{
      const timer=setTimeout(()=>{this.resolveReady=null;reject(new Error('เชื่อมต่อ Apps Script Bridge ไม่ได้ ตรวจการ Deploy และ ALLOWED_ORIGINS'))},20000);
      this.resolveReady=()=>{clearTimeout(timer);resolve();};
      this.iframe=document.createElement('iframe');this.iframe.title='Classfolio API Bridge';this.iframe.hidden=true;
      this.iframe.src=this.url+(this.url.includes('?')?'&':'?')+'mode=bridge';document.body.appendChild(this.iframe);
    });
    this.ready=this.ready.catch(err=>{this.ready=null;this.iframe?.remove();this.iframe=null;throw err});
    return this.ready;
  }
  async call(action,payload={}){
    await this.connect();
    const id='rpc-'+(++this.counter)+'-'+Date.now();
    return new Promise((resolve,reject)=>{
      const timer=setTimeout(()=>{this.pending.delete(id);reject(new Error('หมดเวลารอเซิร์ฟเวอร์ กรุณาตรวจสถานะก่อนลองส่งใหม่'))},CONFIG.REQUEST_TIMEOUT_MS);
      this.pending.set(id,{resolve,reject,timer});
      // GAS HTML Service อาจย้าย iframe จาก script.google.com ไป googleusercontent.com
      // กำหนดสิทธิ์จาก ALLOWED_ORIGINS ใน Bridge และ API ฝั่งเซิร์ฟเวอร์แทน
      this.iframe.contentWindow.postMessage({type:'classfolio:rpc',id,action,payload},'*');
    });
  }
}
// ใช้ mock เฉพาะตอนไม่มี DOM จริง (เช่น Node render_smoke test)
const live=CONFIG.MODE==='live'&&Boolean(CONFIG.API_URL)&&typeof document?.createElement==='function';
const bridge=live?new RpcBridge(CONFIG.API_URL):null;
export const api={mode:live?'live':'demo',async call(action,payload={}){return live?bridge.call(action,payload):mock.call(action,payload);}};
