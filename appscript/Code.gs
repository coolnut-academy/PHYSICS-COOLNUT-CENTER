/** PHYSICS COOLNUT CENTER · Google Apps Script backend
 * Deploy: Execute as ME; access Anyone (bridge ตรวจ Origin และทุกคำสั่งตรวจรหัส/สิทธิ์ฝั่ง server)
 * รูปภาพเก็บ PRIVATE ใน Drive; เปิดผ่าน getMedia หลังตรวจรหัสหัวข้อ
 * ใช้ LockService กันเลขกลุ่มซ้ำ/คำตอบซ้ำ ไม่ใช้ no-cors
 */
const DB_CONFIG = Object.freeze({
  SPREADSHEET_ID: '1eO61GtA0wFA6tgLyliaSxyKKMZXG4T1xdKD-kNA0NR4',
  DRIVE_FOLDER_ID: '1GbddM05xgjVgQjwQn1_1DxzHQIufmpsU',
  ALLOWED_ORIGINS: [
    'https://coolnut-academy.github.io',
    'http://localhost:4173',
    'http://127.0.0.1:4173',
    'http://localhost:5500',
    'http://127.0.0.1:5500',
    'http://localhost:3000',
    'http://127.0.0.1:3000',
    'http://localhost:8080',
    'http://127.0.0.1:8080'
  ]
});
const TEACHER_TTL_SECONDS = 14400;

const TABLES = {
  Topics: ['id','title','subject','className','description','accessCode','open','createdAt','quizJSON','type','targetUrl','requirements'],
  Groups: ['id','topicId','number','title','members','coverId','page1Id','page2Id','editCodeHash','revision','updatedAt','membersJSON'],
  Feedback: ['id','topicId','fromGroupId','toGroupId','text','createdAt'],
  QuizAnswers: ['id','topicId','studentNo','optionIndex','correct','createdAt'],
  AdminLog: ['id','action','refId','createdAt']
};

function props_(){return PropertiesService.getScriptProperties();}
function hash_(v){return Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256,String(v),Utilities.Charset.UTF_8).map(b=>('0'+(b<0?b+256:b).toString(16)).slice(-2)).join('');}
function uid_(){return Utilities.getUuid();}
function time_(){return new Date().toISOString();}
function safe_(v,max){const s=String(v==null?'':v).trim().slice(0,max||1000);return /^[\s]*[=+@-]/.test(s)?"'"+s:s;}
function text_(v,max){return safe_(v,max||1000);}
function assert_(condition,msg){if(!condition)throw new Error(msg||'ข้อมูลไม่ถูกต้อง');}
function isOpen_(v){return String(v).trim().toLowerCase()==='true';}
function cellVal_(v){if(v instanceof Date)return v.toISOString();if(v===undefined||v===null)return '';return v;}

function withLock_(fn){
  const lock=LockService.getScriptLock();
  assert_(lock.tryLock(20000),'ระบบกำลังบันทึกงานอื่น กรุณาลองใหม่');
  try{return fn();}finally{lock.releaseLock();}
}

function spreadsheetId_(){
  const id=DB_CONFIG.SPREADSHEET_ID||String(props_().getProperty('SPREADSHEET_ID')||'').trim();
  assert_(id,'ยังไม่ได้ตั้งค่า SPREADSHEET_ID · รัน setupPhysicsCoolnut()');
  return id;
}
function driveFolderId_(){
  const id=DB_CONFIG.DRIVE_FOLDER_ID||String(props_().getProperty('DRIVE_FOLDER_ID')||'').trim();
  assert_(id,'ยังไม่ได้ตั้งค่า DRIVE_FOLDER_ID · รัน setupPhysicsCoolnut()');
  return id;
}
let reqCache_={ss:null,sheets:{},rows:{}};
function resetReqCache_(){reqCache_={ss:null,sheets:{},rows:{}};}
function invalidateTable_(name){
  if(reqCache_&&reqCache_.rows)delete reqCache_.rows[name];
  try{CacheService.getScriptCache().remove('tbl_v1_'+name);}catch(_e){}
}

function spreadsheet_(){return reqCache_.ss||(reqCache_.ss=SpreadsheetApp.openById(spreadsheetId_()));}
function driveFolder_(){return DriveApp.getFolderById(driveFolderId_());}

function ensureSchema_(ss,name){
  let sh=ss.getSheetByName(name);
  if(!sh){
    sh=ss.insertSheet(name);
    sh.appendRow(TABLES[name]);
    sh.setFrozenRows(1);
    return sh;
  }
  if(sh.getLastRow()===0){
    sh.appendRow(TABLES[name]);
    sh.setFrozenRows(1);
    return sh;
  }
  const lastCol=Math.max(sh.getLastColumn(),1);
  const old=sh.getRange(1,1,1,lastCol).getValues()[0].map(x=>String(x||'').trim());
  TABLES[name].forEach((col,i)=>{
    if(old[i]!==col){
      assert_(!old.includes(col),'คอลัมน์เก่าไม่เรียงตามสคีมา: '+name);
      sh.getRange(1,i+1).setValue(col);
    }
  });
  return sh;
}

function sheet_(name){
  if(reqCache_.sheets[name])return reqCache_.sheets[name];
  const ss=spreadsheet_();
  let s=ss.getSheetByName(name);
  if(!(s&&s.getLastRow()>=1&&s.getLastColumn()>=TABLES[name].length)){
    s=withLock_(()=>ensureSchema_(ss,name));
  }
  return (reqCache_.sheets[name]=s);
}

function rows_(name){
  if(reqCache_.rows[name])return reqCache_.rows[name];
  try{
    const cached=CacheService.getScriptCache().get('tbl_v1_'+name);
    if(cached){
      const parsed=JSON.parse(cached);
      if(Array.isArray(parsed))return (reqCache_.rows[name]=parsed);
    }
  }catch(_e){}
  const s=sheet_(name), values=s.getDataRange().getValues();
  let out=[];
  if(values.length>=2){
    const heads=TABLES[name];
    const rawHeaders=values[0].map(h=>String(h||'').trim());
    const colIdx=heads.map(h=>rawHeaders.indexOf(h));
    const idIdx=colIdx[0]>=0?colIdx[0]:0;
    out=values.slice(1)
      .map((r,i)=>({r,row:i+2}))
      .filter(({r})=>String(r[idIdx]||'').trim()!=='')
      .map(({r,row})=>{
        const obj={_row:row};
        heads.forEach((h,j)=>{
          const idx=colIdx[j]>=0?colIdx[j]:j;
          obj[h]=cellVal_(r[idx]);
        });
        return obj;
      });
  }
  reqCache_.rows[name]=out;
  try{
    const json=JSON.stringify(out);
    if(json.length<90000)CacheService.getScriptCache().put('tbl_v1_'+name,json,30);
  }catch(_e){}
  return out;
}

function insert_(name,record){
  const cols=TABLES[name];
  sheet_(name).appendRow(cols.map(key=>safe_(record[key],25000)));
  invalidateTable_(name);
}
function update_(name,record){
  const cols=TABLES[name];
  assert_(record._row,'ข้อมูลไม่พบแถวต้นฉบับ');
  sheet_(name).getRange(record._row,1,1,cols.length).setValues([cols.map(key=>safe_(record[key],25000))]);
  invalidateTable_(name);
}
function log_(action,refId){insert_('AdminLog',{id:uid_(),action,refId,createdAt:time_()});}

function teacher_(p){
  const token=String(p?.token||'');
  return token.length>20&&CacheService.getScriptCache().get('admin_'+token)==='yes';
}
function requireTeacher_(p){assert_(teacher_(p),'ครูยังไม่เข้าสู่ระบบหรือ Session หมดอายุ');}

function topic_(id){
  const tid=String(id||'').trim();
  const t=rows_('Topics').find(x=>String(x.id)===tid);
  assert_(t,'ไม่พบหัวข้อการเรียน');
  return t;
}
function requireTopic_(id,p){
  const t=topic_(id);
  assert_(String(t.type||'submission')!=='link','ปุ่มลิงก์ไม่รับส่งผลงาน');
  if(teacher_(p))return t;
  assert_(String(p?.accessCode||'').trim().toUpperCase()===String(t.accessCode||'').trim().toUpperCase(),'รหัสเข้าหัวข้อไม่ถูกต้อง');
  return t;
}
function publicGroup_(g){
  const {editCodeHash,_row,membersJSON,...item}=g;
  let membersList=[];
  try{membersList=JSON.parse(membersJSON||'[]');}catch(_e){}
  if(!Array.isArray(membersList))membersList=[];
  return {
    ...item,
    id:String(item.id||''),
    topicId:String(item.topicId||''),
    number:Number(item.number),
    title:String(item.title||''),
    members:String(item.members||''),
    coverId:String(item.coverId||''),
    page1Id:String(item.page1Id||''),
    page2Id:String(item.page2Id||''),
    revision:String(item.revision||''),
    updatedAt:String(item.updatedAt||''),
    membersList
  };
}
function publicTopic_(t,teacher){
  const {_row,quizJSON,...item}=t;
  item.id=String(item.id||'');
  item.title=String(item.title||'');
  item.subject=String(item.subject||'');
  item.className=String(item.className||'');
  item.description=String(item.description||'');
  item.type=String(item.type||'')==='link'?'link':'submission';
  item.targetUrl=String(item.targetUrl||'');
  item.requirements=String(item.requirements||'');
  item.open=isOpen_(item.open);
  item.createdAt=String(item.createdAt||'');
  if(teacher)item.accessCode=String(item.accessCode||'');
  else delete item.accessCode;
  return item;
}
function validatedMembers_(raw){
  assert_(Array.isArray(raw)&&raw.length>=1&&raw.length<=8,'กรอกสมาชิก 1–8 คน');
  const seen={};
  return raw.map(m=>{
    const a={
      firstName:requireStr_(m.firstName,60,'ชื่อ'),
      lastName:requireStr_(m.lastName,60,'นามสกุล'),
      className:requireStr_(m.className,20,'ชั้น'),
      studentNo:String(m.studentNo||'').trim()
    };
    assert_(/^[0-9]{1,3}$/.test(a.studentNo),'เลขที่ไม่ถูกต้อง');
    const k=a.className+'|'+a.studentNo;
    assert_(!seen[k],'เลขที่ซ้ำในชั้นเดียวกัน');
    seen[k]=true;
    return a;
  });
}
function validatedUrl_(value){
  const raw=requireStr_(value,1500,'URL');
  assert_(/^https?:\/\/[^\s]+$/i.test(raw),'ต้องเป็นลิงก์ http(s)');
  assert_(!/^https?:\/\/(localhost|127\.0\.0\.1)([:\/]|$)/i.test(raw),'ห้ามใช้ localhost');
  return raw;
}
function groups_(tid){return rows_('Groups').filter(g=>String(g.topicId)===String(tid));}
function canEdit_(g,p){
  if(teacher_(p))return true;
  const raw=String(p?.editCode||'').trim();
  if(!raw)return false;
  return hash_(raw+'|'+g.id)===g.editCodeHash||hash_(raw.toUpperCase()+'|'+g.id)===g.editCodeHash;
}
function quiz_(t){try{return JSON.parse(t.quizJSON||'null');}catch(_e){return null;}}
function requireStr_(v,limit,label){
  const s=String(v||'').trim();
  assert_(s.length>0&&s.length<=(limit||500),label+' ไม่ถูกต้อง');
  return safe_(s,limit);
}
function saveImage_(data,filename){
  assert_(typeof data==='string'&&data.length<4500000,'ไฟล์ภาพใหญ่เกินไป ให้ถ่ายหรือบีบอัดใหม่');
  const match=data.match(/^data:image\/(jpeg|png|webp);base64,([a-zA-Z0-9+/=]+)$/);
  assert_(match,'รองรับไฟล์ภาพ JPEG/PNG/WebP เท่านั้น');
  const bytes=Utilities.base64Decode(match[2]);
  assert_(bytes.length<=3000000,'ไฟล์ภาพเกิน 3 MB');
  const mime={'jpeg':'image/jpeg','png':'image/png','webp':'image/webp'}[match[1]];
  const folder=driveFolder_();
  const file=folder.createFile(Utilities.newBlob(bytes,mime,filename+'.'+(match[1]==='jpeg'?'jpg':match[1])));
  // ไม่เรียก setSharing(ANYONE_WITH_LINK) : ไฟล์ PRIVATE และผ่าน API ตรวจสิทธิ์เท่านั้น
  return file.getId();
}

/** ตั้งรหัสผ่านครูเป็น SHA-256 ลงใน Script Properties */
function setTeacherPassword(password){
  assert_(typeof password==='string'&&password.length>=8,'รหัสผ่านครูต้องยาวอย่างน้อย 8 ตัวอักษร');
  props_().setProperty('TEACHER_PASSWORD_HASH',hash_(password));
  return {saved:true,message:'บันทึกรหัสผ่านครูแบบ SHA-256 เรียบร้อยแล้ว'};
}

/** Initial setup — เรียกครั้งเดียวจาก Apps Script Editor ในบัญชีครู */
function setupPhysicsCoolnut(){
  const p=props_();
  let sid=DB_CONFIG.SPREADSHEET_ID||String(p.getProperty('SPREADSHEET_ID')||'').trim();
  let folderId=DB_CONFIG.DRIVE_FOLDER_ID||String(p.getProperty('DRIVE_FOLDER_ID')||'').trim();
  if(!sid){sid=SpreadsheetApp.create('Physics Coolnut Center Database').getId();}
  if(!folderId){folderId=DriveApp.createFolder('Physics Coolnut Center Private Uploads').getId();}
  p.setProperty('SPREADSHEET_ID',sid);
  p.setProperty('DRIVE_FOLDER_ID',folderId);

  const ss=SpreadsheetApp.openById(sid);
  reqCache_.ss=ss;
  Object.keys(TABLES).forEach(name=>{ensureSchema_(ss,name);invalidateTable_(name);});
  const folder=DriveApp.getFolderById(folderId);

  const tempPass=String(p.getProperty('TEACHER_PASSWORD_TEMP')||'');
  if(tempPass){
    assert_(tempPass.length>=8,'TEACHER_PASSWORD_TEMP ต้องยาวอย่างน้อย 8 ตัวอักษร');
    p.setProperty('TEACHER_PASSWORD_HASH',hash_(tempPass));
    p.deleteProperty('TEACHER_PASSWORD_TEMP');
  }

  const origins=allowedOrigins_();
  if(!p.getProperty('ALLOWED_ORIGINS')){
    p.setProperty('ALLOWED_ORIGINS',origins.join(','));
  }

  const result={
    spreadsheetId:sid,
    spreadsheetName:ss.getName(),
    driveFolderId:folderId,
    driveFolderName:folder.getName(),
    tables:Object.keys(TABLES),
    allowedOrigins:origins,
    teacherPasswordConfigured:Boolean(String(p.getProperty('TEACHER_PASSWORD_HASH')||'').trim()),
    message:'เชื่อมต่อ Sheet และ Drive แล้ว · หาก teacherPasswordConfigured เป็น false ให้ตั้ง TEACHER_PASSWORD_HASH (หรือ TEACHER_PASSWORD_TEMP แล้วรัน setupPhysicsCoolnut อีกครั้ง) ก่อนใช้งานโหมดครู'
  };
  Logger.log(JSON.stringify(result));
  return result;
}

function normalizeOrigin_(v){
  const m=String(v||'').trim().match(/^(https?:\/\/[^\/\s"'<>]+)/i);
  return m?m[1].toLowerCase():'';
}

function allowedOrigins_(){
  const fromProps=String(props_().getProperty('ALLOWED_ORIGINS')||'')
    .split(',')
    .map(normalizeOrigin_)
    .filter(Boolean);
  const merged=[...DB_CONFIG.ALLOWED_ORIGINS,...fromProps]
    .map(normalizeOrigin_)
    .filter(Boolean);
  return [...new Set(merged)];
}

function buildBridgeHtml_(allowedOriginsJSON){
  return '<!DOCTYPE html><html><head><meta charset="utf-8"><style>html,body{margin:0;padding:0;font-family:system-ui,sans-serif;color:#143326;background:#f7f9f5}.box{max-width:460px;margin:48px auto;padding:20px;border:1px solid #d5e2d8;border-radius:14px;background:#fff}</style></head><body>'
    +'<div id="standalone" class="box"><strong>PHYSICS COOLNUT CENTER</strong><p>Apps Script WebApp API พร้อมใช้งาน (รองรับการเชื่อมต่อผ่าน POST JSON และ CORS)</p></div>'
    +'<script>'
    +'const ALLOWED_ORIGINS='+allowedOriginsJSON+';'
    +'function allowed(origin){return ALLOWED_ORIGINS.includes(origin);}'
    +'const hostTarget=(window.top&&window.top!==window)?window.top:window.parent;'
    +'window.addEventListener("message",function(event){'
    +'const msg=event.data||{};'
    +'if(msg.type!=="classfolio:rpc")return;'
    +'const id=String(msg.id||"");'
    +'if(!allowed(event.origin)){event.source.postMessage({type:"classfolio:rpc-result",id:id,ok:false,error:"Origin "+event.origin+" ยังไม่ได้รับอนุญาตใน ALLOWED_ORIGINS"},event.origin);return;}'
    +'google.script.run.withSuccessHandler(function(result){'
    +'if(!result){event.source.postMessage({type:"classfolio:rpc-result",id:id,ok:false,error:"เซิร์ฟเวอร์ Apps Script ไม่ได้ส่งผลลัพธ์กลับ"},event.origin);return;}'
    +'event.source.postMessage({type:"classfolio:rpc-result",id:id,ok:!!result.ok,data:result.data,error:result.error},event.origin);'
    +'}).withFailureHandler(function(err){'
    +'event.source.postMessage({type:"classfolio:rpc-result",id:id,ok:false,error:String(err&&err.message?err.message:err)},event.origin);'
    +'}).api(msg.action,msg.payload||{});'
    +'});'
    +'try{if(hostTarget&&hostTarget!==window)hostTarget.postMessage({type:"classfolio:bridge-ready"},"*");}catch(_e){}'
    +'<'+'/script></body></html>';
}

function jsonOut_(obj){
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

function doGet(e){
  const originsJSON=JSON.stringify(allowedOrigins_());
  const mode=String(e&&e.parameter&&e.parameter.mode||'');
  let output=null;
  if(mode==='bridge'){
    for(const name of ['Bridge','bridge']){
      try{
        if(HtmlService.createHtmlOutputFromFile(name).getContent().indexOf('classfolio:rpc')!==-1){
          const template=HtmlService.createTemplateFromFile(name);
          template.allowedOriginsJSON=originsJSON;
          output=template.evaluate();
          break;
        }
      }catch(_err){}
    }
  }
  if(!output)output=HtmlService.createHtmlOutput(buildBridgeHtml_(originsJSON));
  return output.setTitle('Physics Coolnut Center API').setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

function doPost(e){
  try{
    const raw=String(e&&e.postData&&e.postData.contents?e.postData.contents:'{}');
    const body=JSON.parse(raw);
    return jsonOut_(api(body.action,body.payload||{}));
  }catch(err){
    return jsonOut_({ok:false,error:String(err&&err.message?err.message:err)});
  }
}

/** จุดรวมเรียกคำสั่งฝั่ง Server (รองรับทั้ง doPost JSON และ google.script.run) */
function api(action,payload){resetReqCache_();try{return {ok:true,data:route_(String(action||''),payload||{})};}catch(err){return {ok:false,error:String(err.message||err)};}finally{resetReqCache_();}}

function route_(a,p){switch(a){
  case 'healthCheck':{
    const ss=spreadsheet_();
    const folder=driveFolder_();
    return {status:'ok',mode:'live',storage:'Google Sheets + Private Drive',spreadsheet:ss.getName(),driveFolder:folder.getName()};
  }
  case 'teacherLogin':{
    const expected=String(props_().getProperty('TEACHER_PASSWORD_HASH')||'').trim().toLowerCase();
    assert_(expected,'ยังไม่ตั้งค่า TEACHER_PASSWORD_HASH ใน Apps Script Script Properties');
    assert_(String(p.password||'').length>=8&&hash_(p.password)===expected,'รหัสผ่านครูไม่ถูกต้อง');
    const token=uid_()+uid_();
    CacheService.getScriptCache().put('admin_'+token,'yes',TEACHER_TTL_SECONDS);
    return {token,expiresInSeconds:TEACHER_TTL_SECONDS};
  }
  case 'getTopics':{
    const isTeacher=teacher_(p),counts={};
    rows_('Groups').forEach(g=>{const tid=String(g.topicId||'');counts[tid]=(counts[tid]||0)+1;});
    return rows_('Topics').map(t=>({...publicTopic_(t,isTeacher),groupCount:counts[String(t.id)]||0,quiz:quiz_(t)?{active:Boolean(quiz_(t).active)}:null}));
  }
  case 'getTopic':{
    const t=requireTopic_(p.topicId,p),isTeacher=teacher_(p),q=quiz_(t);
    const feedback=rows_('Feedback').filter(f=>String(f.topicId)===String(t.id)).map(({_row,...f})=>({
      id:String(f.id||''),topicId:String(f.topicId||''),fromGroupId:String(f.fromGroupId||''),toGroupId:String(f.toGroupId||''),text:String(f.text||''),createdAt:String(f.createdAt||'')
    }));
    const answers=isTeacher?rows_('QuizAnswers').filter(a=>String(a.topicId)===String(t.id)).map(({_row,...a})=>({
      id:String(a.id||''),topicId:String(a.topicId||''),studentNo:String(a.studentNo||''),optionIndex:Number(a.optionIndex),correct:isOpen_(a.correct),createdAt:String(a.createdAt||'')
    })):null;
    return {topic:publicTopic_(t,isTeacher),groups:groups_(t.id).map(publicGroup_),feedback,quiz:q?{text:String(q.text||''),options:Array.isArray(q.options)?q.options.map(String):[],active:Boolean(q.active)}:null,quizStats:answers};
  }
  case 'createTopic':return withLock_(()=>{
    requireTeacher_(p);
    const title=requireStr_(p.title,80,'ชื่อปุ่ม'),type=p.type==='link'?'link':'submission';
    const code=type==='link'?'':requireStr_(p.accessCode,30,'รหัสเข้ากิจกรรม').toUpperCase();
    if(type==='submission'){
      assert_(code.length>=4,'รหัสเข้ากิจกรรมอย่างน้อย 4 ตัว');
      assert_(!/^[\s]*[=+@-]/.test(String(p.accessCode||'')),'รหัสเข้ากิจกรรมห้ามขึ้นต้นด้วย = + @ -');
    }
    const t={id:uid_(),title,subject:text_(p.subject,60),className:text_(p.className,40),description:text_(p.description,300),accessCode:code,open:true,createdAt:time_(),quizJSON:'',type,targetUrl:type==='link'?validatedUrl_(p.targetUrl):'',requirements:text_(p.requirements,600)};
    insert_('Topics',t);log_('createTopic',t.id);return publicTopic_(t,true);
  });
  case 'updateTopic':return withLock_(()=>{
    requireTeacher_(p);
    const t=topic_(p.topicId),type=p.type==='link'?'link':'submission';
    assert_(type===(String(t.type||'')||'submission')||groups_(t.id).length===0,'มีผลงานส่งแล้ว ไม่อนุญาตให้เปลี่ยนประเภทปุ่ม');
    t.type=type;t.title=requireStr_(p.title,80,'ชื่อปุ่ม');t.subject=text_(p.subject,60);t.className=text_(p.className,40);t.description=text_(p.description,300);t.requirements=text_(p.requirements,600);
    t.targetUrl=type==='link'?validatedUrl_(p.targetUrl):'';
    t.accessCode=type==='submission'?requireStr_(p.accessCode,30,'รหัสเข้ากิจกรรม').toUpperCase():'';
    if(type==='submission'){
      assert_(t.accessCode.length>=4,'รหัสเข้ากิจกรรมสั้นเกินไป');
      assert_(!/^[\s]*[=+@-]/.test(String(p.accessCode||'')),'รหัสเข้ากิจกรรมห้ามขึ้นต้นด้วย = + @ -');
    }
    update_('Topics',t);log_('updateTopic',t.id);return publicTopic_(t,true);
  });
  case 'toggleTopic':return withLock_(()=>{
    requireTeacher_(p);
    const t=topic_(p.topicId);
    assert_(String(t.type||'submission')!=='link','ปุ่มลิงก์ไม่มีสถานะรับงาน');
    t.open=!isOpen_(t.open);
    update_('Topics',t);log_('toggleTopic',t.id);
    return {open:t.open};
  });
  case 'createGroup':return withLock_(()=>{
    const t=requireTopic_(p.topicId,p);
    assert_(isOpen_(t.open),'หัวข้อนี้ปิดรับผลงานแล้ว');
    const number=Number(p.number);
    assert_(Number.isInteger(number)&&number>=1&&number<=40,'หมายเลขกลุ่มต้องเป็น 1–40');
    assert_(!groups_(t.id).some(g=>Number(g.number)===number),'กลุ่มนี้มีการ์ดแล้ว ให้ใช้รหัสแก้ไขของกลุ่ม');
    const id=uid_(),editCode=uid_().replace(/-/g,'').slice(0,12).toUpperCase();
    const g={id,topicId:t.id,number,title:text_(p.title,70)||'กลุ่มที่ '+number,members:'',coverId:'',page1Id:'',page2Id:'',editCodeHash:hash_(editCode+'|'+id),revision:'',updatedAt:time_(),membersJSON:JSON.stringify(validatedMembers_(p.membersList))};
    [['coverData','coverId'],['page1Data','page1Id'],['page2Data','page2Id']].forEach(([src,key])=>{if(p[src])g[key]=saveImage_(p[src],id+'-'+key);});
    insert_('Groups',g);log_('createGroup',id);return {group:publicGroup_(g),editCode};
  });
  case 'updateGroup':return withLock_(()=>{
    const g=rows_('Groups').find(x=>String(x.id)===String(p.groupId||''));
    assert_(g,'ไม่พบกลุ่ม');
    const t=requireTopic_(g.topicId,p);
    assert_(isOpen_(t.open)||teacher_(p),'ปิดรับผลงานแล้ว');
    assert_(canEdit_(g,p),'รหัสแก้ไขกลุ่มไม่ถูกต้อง');
    if(p.title!==undefined)g.title=text_(p.title,70);
    if(p.membersList!==undefined)g.membersJSON=JSON.stringify(validatedMembers_(p.membersList));
    if(p.revision!==undefined)g.revision=text_(p.revision,1200);
    [['coverData','coverId'],['page1Data','page1Id'],['page2Data','page2Id']].forEach(([src,key])=>{if(p[src])g[key]=saveImage_(p[src],g.id+'-'+key);});
    g.updatedAt=time_();update_('Groups',g);log_('updateGroup',g.id);return {group:publicGroup_(g)};
  });
  case 'getMedia':{
    const id=String(p.mediaId||'').trim();
    assert_(id,'ไม่พบภาพผลงาน');
    const g=rows_('Groups').find(x=>[String(x.coverId||''),String(x.page1Id||''),String(x.page2Id||'')].includes(id));
    assert_(g,'ไม่พบภาพผลงาน');
    requireTopic_(g.topicId,p);
    try{
      const cachedImg=CacheService.getScriptCache().get('media_v1_'+id);
      if(cachedImg)return {dataUrl:cachedImg};
    }catch(_e){}
    const file=DriveApp.getFileById(id);
    assert_(!file.isTrashed(),'ไฟล์ภาพถูกลบออกจาก Drive แล้ว');
    assert_(file.getSize()<3500000,'ภาพใหญ่เกินระบบแสดงผล');
    const blob=file.getBlob();
    const bytes=blob.getBytes();
    assert_(bytes.length<3500000,'ภาพใหญ่เกินระบบแสดงผล');
    const mime=blob.getContentType()||file.getMimeType()||'image/jpeg';
    const dataUrl='data:'+mime+';base64,'+Utilities.base64Encode(bytes);
    try{if(dataUrl.length<90000)CacheService.getScriptCache().put('media_v1_'+id,dataUrl,60);}catch(_e){}
    return {dataUrl};
  }
  case 'addFeedback':return withLock_(()=>{
    const from=rows_('Groups').find(x=>String(x.id)===String(p.fromGroupId||''));
    const to=rows_('Groups').find(x=>String(x.id)===String(p.toGroupId||''));
    assert_(from&&to&&String(from.topicId)===String(to.topicId)&&String(from.id)!==String(to.id),'เลือกกลุ่มผู้ให้และผู้รับให้ถูกต้อง');
    requireTopic_(to.topicId,p);
    assert_(canEdit_(from,p),'รหัสกลุ่มผู้ให้ Feedback ไม่ถูกต้อง');
    const content=requireStr_(p.text,700,'ข้อความ Feedback');
    assert_(content.length>=10,'กรอก Feedback อย่างน้อย 10 ตัวอักษร');
    const old=rows_('Feedback').find(x=>String(x.fromGroupId)===String(from.id)&&String(x.toGroupId)===String(to.id));
    if(old){old.text=content;old.createdAt=time_();update_('Feedback',old);return {saved:true,updated:true};}
    const f={id:uid_(),topicId:to.topicId,fromGroupId:from.id,toGroupId:to.id,text:content,createdAt:time_()};
    insert_('Feedback',f);return {saved:true};
  });
  case 'setQuiz':return withLock_(()=>{
    requireTeacher_(p);
    const t=topic_(p.topicId);
    assert_(String(t.type||'submission')!=='link','ปุ่มลิงก์ไม่มี Quiz ภายใน');
    assert_(Array.isArray(p.options)&&p.options.length===4,'Quiz ต้องมี 4 ตัวเลือก');
    const q={text:requireStr_(p.text,280,'คำถาม'),options:p.options.map(x=>requireStr_(x,160,'ตัวเลือก')),correctIndex:Number(p.correctIndex),active:true};
    assert_(Number.isInteger(q.correctIndex)&&q.correctIndex>=0&&q.correctIndex<=3,'เฉลยไม่ถูกต้อง');
    t.quizJSON=JSON.stringify(q);update_('Topics',t);log_('setQuiz',t.id);return {saved:true};
  });
  case 'answerQuiz':return withLock_(()=>{
    const t=requireTopic_(p.topicId,p),q=quiz_(t);
    assert_(q&&q.active,'ยังไม่เปิด Quiz');
    const no=String(p.studentNo||'').trim();
    assert_(/^\d{1,5}$/.test(no),'เลขที่นักเรียนไม่ถูกต้อง');
    assert_(!rows_('QuizAnswers').some(x=>String(x.topicId)===String(t.id)&&String(x.studentNo)===no),'เลขที่นี้ส่งคำตอบแล้ว');
    const index=Number(p.optionIndex);
    assert_(Number.isInteger(index)&&index>=0&&index<=3,'กรุณาเลือกข้อที่ตอบ');
    insert_('QuizAnswers',{id:uid_(),topicId:t.id,studentNo:no,optionIndex:index,correct:index===Number(q.correctIndex),createdAt:time_()});
    return {saved:true};
  });
  case 'exportTopic':{
    requireTeacher_(p);
    const t=topic_(p.topicId);
    const feedback=rows_('Feedback').filter(x=>String(x.topicId)===String(t.id)).map(({_row,...v})=>({
      id:String(v.id||''),topicId:String(v.topicId||''),fromGroupId:String(v.fromGroupId||''),toGroupId:String(v.toGroupId||''),text:String(v.text||''),createdAt:String(v.createdAt||'')
    }));
    const quizAnswers=rows_('QuizAnswers').filter(x=>String(x.topicId)===String(t.id)).map(({_row,...v})=>({
      id:String(v.id||''),topicId:String(v.topicId||''),studentNo:String(v.studentNo||''),optionIndex:Number(v.optionIndex),correct:isOpen_(v.correct),createdAt:String(v.createdAt||'')
    }));
    return {exportedAt:time_(),topic:publicTopic_(t,true),groups:groups_(t.id).map(publicGroup_),feedback,quizAnswers};
  }
  default:throw new Error('ไม่มี API Action นี้: '+a);
}}
