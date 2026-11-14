/**
 * Mock Mode เป็นข้อมูลตัวอย่างจำลองเท่านั้น ไม่ใช่ผลการสอนจริง
 * ใช้ IndexedDB เพื่อเก็บภาพที่อัปโหลด ไม่ใช่ localStorage (ที่มักเต็มเร็ว)
 */
const DB='physics-coolnut-center-demo-v1';
const now=()=>new Date().toISOString();
const checkUrl=value=>{try{const u=new URL(String(value||''));if(!['https:','http:'].includes(u.protocol)||['localhost','127.0.0.1'].includes(u.hostname))throw Error();return u.href;}catch{throw Error('URL ต้องเป็น http(s) และไม่ใช่ localhost')}};
const normalizeMembers=v=>{if(!Array.isArray(v)||v.length<1||v.length>8)throw Error('ต้องมีสมาชิก 1–8 คน');const seen=new Set();return v.map(m=>{const a={firstName:String(m.firstName||'').trim(),lastName:String(m.lastName||'').trim(),className:String(m.className||'').trim(),studentNo:String(m.studentNo||'').trim()};if(!a.firstName||!a.lastName||!a.className||!/^[0-9]{1,3}$/.test(a.studentNo))throw Error('ข้อมูลสมาชิกต้องมีชื่อ นามสกุล ชั้น เลขที่ครบถ้วน');if(Object.values(a).some(x=>x.length>60))throw Error('ชื่อสมาชิกยาวเกินไป');const k=a.className+'|'+a.studentNo;if(seen.has(k))throw Error('เลขที่ซ้ำในชั้นเดียวกัน');seen.add(k);return a;});};
const genId=()=>('id-'+crypto.randomUUID());
const seed=()=>({
  topics:[
    {id:'torquelab-demo',type:'submission',targetUrl:'',requirements:'ภาพหมู่ 1 ภาพ + ใบงาน A4 สองหน้า (FBD และผลทดลอง)',title:'ส่งงาน · สมดุลต่อการหมุน',subject:'ฟิสิกส์ 2',className:'ม.4/1',description:'ทดลองคานจริง วาด Free Body Diagram และอธิบายจากหลักฐาน',accessCode:'TL2569',open:true,createdAt:now(),quiz:{text:'จุดหมุนอยู่ที่ 50 cm วางตุ้มที่ 70 cm แขนโมเมนต์ยาวเท่าไร?',options:['20 cm','50 cm','70 cm','120 cm'],correctIndex:0,active:true}},
    {id:'other-demo',type:'submission',targetUrl:'',requirements:'ปกกลุ่ม + ภาพผลงาน 2 หน้า',title:'ส่งงาน · โครงงานฟิสิกส์รอบตัว',subject:'กิจกรรมสร้างสรรค์',className:'ม.4',description:'รวบรวมภาพผลงานและนำเสนอหน้าชั้น',accessCode:'CLASS01',open:true,createdAt:now(),quiz:null}
    ,{id:'external-phet-demo',type:'link',targetUrl:'https://phet.colorado.edu/th/simulations/balancing-act',title:'เรียนรู้ · แบบจำลองคานสมดุล',subject:'Simulation',className:'ม.4/1',description:'เปิดกิจกรรมจำลองบนเว็บไซต์ PhET (แหล่งเรียนรู้ภายนอก)',accessCode:'',open:true,createdAt:now(),quiz:null},
    {id:'external-quiz-demo',type:'link',targetUrl:'https://forms.google.com',title:'Quiz ภายนอก · ตัวอย่างปุ่ม',subject:'แบบทดสอบ',className:'ม.4/1',description:'ปุ่มตัวอย่างสำหรับครูแก้ไขให้เป็นลิงก์ Quiz จริงที่สร้างไว้',accessCode:'',open:true,createdAt:now(),quiz:null}
  ],
  groups:[
    {id:'demo-g1',topicId:'torquelab-demo',number:1,title:'กลุ่มที่ 1 · ตัวอย่าง',members:'นักเรียนตัวอย่าง 1–4',coverId:'./assets/demo/cover-a.svg',page1Id:'./assets/demo/page-predict.svg',page2Id:'./assets/demo/page-observe.svg',editCodeHash:'demo-group-1',revision:'ตัวอย่าง: ปรับจากการใช้ตำแหน่ง x ไปใช้แขนโมเมนต์ d ที่วัดจากจุดหมุน',updatedAt:now(),demo:true},
    {id:'demo-g2',topicId:'torquelab-demo',number:2,title:'กลุ่มที่ 2 · ตัวอย่าง',members:'นักเรียนตัวอย่าง 5–8',coverId:'./assets/demo/cover-b.svg',page1Id:'./assets/demo/page-predict.svg',page2Id:'./assets/demo/page-observe.svg',editCodeHash:'demo-group-2',revision:'',updatedAt:now(),demo:true},
    {id:'demo-g3',topicId:'torquelab-demo',number:3,title:'กลุ่มที่ 3 · ตัวอย่าง',members:'นักเรียนตัวอย่าง 9–12',coverId:'./assets/demo/cover-c.svg',page1Id:'./assets/demo/page-predict.svg',page2Id:null,editCodeHash:'demo-group-3',revision:'',updatedAt:now(),demo:true}
  ],
  feedback:[{id:'demo-feedback',topicId:'torquelab-demo',fromGroupId:'demo-g2',toGroupId:'demo-g1',text:'ตัวอย่าง: ระบุระยะ d จากจุดหมุนได้ชัดเจนขึ้น',createdAt:now(),demo:true}],
  answers:[], media:{}, logs:[]
});
async function database(){return new Promise((res,rej)=>{const r=indexedDB.open(DB,1);r.onupgradeneeded=()=>r.result.createObjectStore('kv');r.onsuccess=()=>res(r.result);r.onerror=()=>rej(r.error);});}
async function getState(){const db=await database();return new Promise((res,rej)=>{const tx=db.transaction('kv','readonly'), r=tx.objectStore('kv').get('state');r.onsuccess=()=>{db.close();res(r.result||seed())};r.onerror=()=>rej(r.error);});}
async function saveState(v){const db=await database();return new Promise((res,rej)=>{const tx=db.transaction('kv','readwrite');tx.objectStore('kv').put(v,'state');tx.oncomplete=()=>{db.close();res()};tx.onerror=()=>rej(tx.error);});}
function topicInfo(t,groups,admin){return {type:'submission',targetUrl:'',...t,accessCode:admin?t.accessCode:undefined,groupCount:groups.filter(g=>g.topicId===t.id).length,quiz:t.quiz?{active:t.quiz.active}:null};}
function groupPublic(g){const {editCodeHash,...v}=g;return {...v,membersList:Array.isArray(g.membersList)?g.membersList:[]};}
function hasAccess(state,topicId,p){const t=state.topics.find(x=>x.id===topicId);if(!t)throw new Error('ไม่พบหัวข้อ');if(t.type==='link')throw Error('ปุ่มนี้เป็นลิงก์ ไม่รับส่งผลงาน');if(p.token==='demo-teacher')return t;if((p.accessCode||'').trim().toUpperCase()!==t.accessCode.toUpperCase())throw new Error('รหัสเข้าหัวข้อไม่ถูกต้อง');return t;}
function owned(g,p){if(p.token==='demo-teacher')return true;return p.editCode==='DEMO'+g.number || p.editCode===g.editCodeHash;}
export const mock={
  async call(action,p={}){
    const s=await getState();let out;
    switch(action){
      case 'getTopics':out=s.topics.map(t=>topicInfo(t,s.groups,p.token==='demo-teacher'));break;
      case 'teacherLogin':out={token:'demo-teacher',expiresInSeconds:3600,mode:'demo'};break;
      case 'healthCheck':out={mode:'demo',status:'ok',storage:'indexeddb'};break;
      case 'getTopic':{
        const t=hasAccess(s,p.topicId,p);out={topic:topicInfo(t,s.groups,p.token==='demo-teacher'),groups:s.groups.filter(g=>g.topicId===t.id).map(groupPublic),feedback:s.feedback.filter(f=>f.topicId===t.id),quiz:t.quiz?{text:t.quiz.text,options:t.quiz.options,active:t.quiz.active}:null,quizStats:p.token==='demo-teacher'?s.answers.filter(a=>a.topicId===t.id):null};break;
      }
      case 'createTopic':{
        if(p.token!=='demo-teacher')throw Error('เฉพาะครู');
        const type=p.type==='link'?'link':'submission';const topic={id:genId(),type,targetUrl:type==='link'?checkUrl(p.targetUrl):'',title:p.title.trim().slice(0,80),subject:(p.subject||'').trim().slice(0,60),className:(p.className||'').trim().slice(0,40),description:(p.description||'').trim().slice(0,300),requirements:(p.requirements||'').trim().slice(0,600),accessCode:type==='link'?'':(p.accessCode||'').toUpperCase().trim(),open:true,createdAt:now(),quiz:null};
        if(topic.title.length<2||(type==='submission'&&topic.accessCode.length<4))throw Error('กรอกชื่อหัวข้อและรหัสเข้าหัวข้ออย่างน้อย 4 ตัวอักษร');
        s.topics.unshift(topic);out=topic;break;
      }
      case 'updateTopic':{
        if(p.token!=='demo-teacher')throw Error('เฉพาะครู');const t=s.topics.find(t=>t.id===p.topicId);if(!t)throw Error('ไม่พบหัวข้อ');
        const type=p.type==='link'?'link':'submission';if(type!==(t.type||'submission')&&s.groups.some(g=>g.topicId===t.id))throw Error('หัวข้อนี้มีผลงานแล้ว ไม่อนุญาตให้เปลี่ยนประเภท');
        t.type=type;t.targetUrl=type==='link'?checkUrl(p.targetUrl):'';t.title=String(p.title||'').trim().slice(0,80);t.subject=String(p.subject||'').trim().slice(0,60);t.className=String(p.className||'').trim().slice(0,40);t.description=String(p.description||'').trim().slice(0,300);t.requirements=String(p.requirements||'').trim().slice(0,600);t.accessCode=type==='link'?'':String(p.accessCode||'').trim().toUpperCase();if(t.title.length<2||(type==='submission'&&t.accessCode.length<4))throw Error('ข้อมูลปุ่มไม่ครบ');out=topicInfo(t,s.groups,true);break;
      }
      case 'toggleTopic':{if(p.token!=='demo-teacher')throw Error('เฉพาะครู');const t=s.topics.find(t=>t.id===p.topicId);if(!t||t.type==='link')throw Error('ประเภทปุ่มไม่รองรับการเปิด/ปิดรับงาน');t.open=!t.open;out={open:t.open};break;}
      case 'createGroup':{
        const t=hasAccess(s,p.topicId,p);if(!t.open)throw Error('หัวข้อนี้ปิดรับผลงาน');
        const number=Number(p.number);if(!Number.isInteger(number)||number<1||number>40)throw Error('หมายเลขกลุ่มไม่ถูกต้อง');
        if(s.groups.some(g=>g.topicId===t.id&&g.number===number))throw Error('กลุ่มนี้ถูกสร้างแล้ว ให้เข้าการ์ดเดิมเพื่อแก้ไข');
        const editCode='EDIT'+Math.random().toString(36).slice(2,10).toUpperCase();
        const group={id:genId(),topicId:t.id,number,title:(p.title||`กลุ่มที่ ${number}`).slice(0,70),members:'',membersList:normalizeMembers(p.membersList),coverId:null,page1Id:null,page2Id:null,editCodeHash:editCode,revision:'',updatedAt:now(),demo:false};
        for(const [key,field] of [['coverData','coverId'],['page1Data','page1Id'],['page2Data','page2Id']])if(p[key]){const id=genId();s.media[id]=p[key];group[field]=id;}
        s.groups.push(group);out={group:groupPublic(group),editCode};break;
      }
      case 'updateGroup':{
        const g=s.groups.find(x=>x.id===p.groupId);if(!g)throw Error('ไม่พบกลุ่ม');const t=hasAccess(s,g.topicId,p);if(!t.open&&p.token!=='demo-teacher')throw Error('ปิดรับผลงานแล้ว');if(!owned(g,p))throw Error('รหัสแก้ไขของกลุ่มไม่ถูกต้อง');
        if(p.title!==undefined)g.title=p.title.slice(0,70);if(p.membersList!==undefined)g.membersList=normalizeMembers(p.membersList);if(p.revision!==undefined)g.revision=p.revision.slice(0,1200);
        for(const [key,field] of [['coverData','coverId'],['page1Data','page1Id'],['page2Data','page2Id']])if(p[key]){const id=genId();s.media[id]=p[key];g[field]=id;}
        g.updatedAt=now();out={group:groupPublic(g)};break;
      }
      case 'getMedia':{
        let id=p.mediaId;
        if(id.startsWith('./assets/'))return {dataUrl:id};
        const g=s.groups.find(x=>[x.coverId,x.page1Id,x.page2Id].includes(id));if(!g)throw Error('ไม่พบภาพ');hasAccess(s,g.topicId,p);
        const dataUrl=s.media[id];if(!dataUrl)throw Error('ไฟล์ภาพสูญหาย');return {dataUrl};
      }
      case 'addFeedback':{
        const target=s.groups.find(x=>x.id===p.toGroupId), source=s.groups.find(x=>x.id===p.fromGroupId);if(!target||!source||target.topicId!==source.topicId)throw Error('เลือกกลุ่มให้ถูกต้อง');hasAccess(s,target.topicId,p);if(!owned(source,p))throw Error('รหัสแก้ไขของกลุ่มผู้ให้ Feedback ไม่ถูกต้อง');if(target.id===source.id)throw Error('ไม่สามารถให้ Feedback กลุ่มตนเอง');
        const text=(p.text||'').trim();if(text.length<10)throw Error('อธิบาย Feedback อย่างน้อย 10 ตัวอักษร');
        const existing=s.feedback.find(f=>f.toGroupId===target.id&&f.fromGroupId===source.id);
        if(existing){existing.text=text;existing.createdAt=now();out=existing;}
        else{out={id:genId(),topicId:target.topicId,fromGroupId:source.id,toGroupId:target.id,text,createdAt:now()};s.feedback.push(out);}break;
      }
      case 'setQuiz':{if(p.token!=='demo-teacher')throw Error('เฉพาะครู');const t=s.topics.find(x=>x.id===p.topicId);if(!t)throw Error('ไม่พบหัวข้อ');if((p.options||[]).length!==4)throw Error('ต้องมี 4 ตัวเลือก');t.quiz={text:p.text.slice(0,280),options:p.options.map(x=>x.slice(0,160)),correctIndex:Number(p.correctIndex),active:true};out={saved:true};break;}
      case 'answerQuiz':{const t=hasAccess(s,p.topicId,p);if(!t.quiz?.active)throw Error('ไม่มี Quiz ที่เปิดใช้งาน');const no=String(p.studentNo||'').trim();if(!/^\d{1,5}$/.test(no))throw Error('กรอกเลขที่นักเรียนให้ถูกต้อง');if(s.answers.some(a=>a.topicId===t.id&&a.studentNo===no))throw Error('เลขที่นี้ส่งคำตอบแล้ว');const answer=Number(p.optionIndex);if(answer<0||answer>3)throw Error('เลือกคำตอบก่อนส่ง');out={saved:true};s.answers.push({topicId:t.id,studentNo:no,optionIndex:answer,correct:answer===t.quiz.correctIndex,createdAt:now()});break;}
      case 'exportTopic':{if(p.token!=='demo-teacher')throw Error('เฉพาะครู');const t=s.topics.find(x=>x.id===p.topicId);if(!t)throw Error('ไม่พบหัวข้อ');out={exportedAt:now(),topic:t,groups:s.groups.filter(g=>g.topicId===t.id).map(groupPublic),feedback:s.feedback.filter(f=>f.topicId===t.id),quizAnswers:s.answers.filter(a=>a.topicId===t.id)};break;}
      default:throw Error('ไม่รองรับ API: '+action);
    }
    await saveState(s);return out;
  }
};
