import assert from 'node:assert/strict';
let value;
const db={createObjectStore(){},close(){},transaction(){const tx={oncomplete:null,objectStore(){return {get(){const r={result:value};queueMicrotask(()=>r.onsuccess?.());return r;},put(x){value=structuredClone(x);queueMicrotask(()=>tx.oncomplete?.());}}}};return tx;}};
globalThis.indexedDB={open(){const request={result:db};queueMicrotask(()=>request.onsuccess?.());return request;}};
const {mock}=await import('../assets/js/mock.js');
const teacher=(await mock.call('teacherLogin',{})).token;
assert.equal(teacher,'demo-teacher');
const topics=await mock.call('getTopics',{});
assert.equal(topics.length,4);
assert.equal(topics.find(t=>t.type==='link').accessCode,undefined);
assert.equal(topics.filter(t=>t.type==='submission').length,2);
assert.ok(topics.some(t=>t.targetUrl?.includes('phet.colorado.edu')));
let denied=false;
try{await mock.call('getTopic',{topicId:'torquelab-demo',accessCode:'WRONG'});}catch{denied=true;}
assert.ok(denied,'invalid topic access code must fail');
const demo=await mock.call('getTopic',{topicId:'torquelab-demo',accessCode:'TL2569'});
assert.equal(demo.groups.length,3);
const link=await mock.call('createTopic',{type:'link',token:teacher,title:'ทดลองควิซ',targetUrl:'https://example.edu/quiz',subject:'Quiz'});
assert.equal(link.type,'link');
assert.equal(link.accessCode,'');
assert.ok(link.targetUrl.startsWith('https://'));
let badURL=false;
try{await mock.call('createTopic',{type:'link',token:teacher,title:'Bad Link',targetUrl:'javascript:alert(1)'});}catch{badURL=true;}
assert.ok(badURL,'javascript URL must fail');
let rejectedLinkGroup=false;
try{await mock.call('createGroup',{topicId:link.id,number:1,title:'bad'});}catch{rejectedLinkGroup=true;}
assert.ok(rejectedLinkGroup,'no group creation under link');
const edited=await mock.call('updateTopic',{type:'link',topicId:link.id,token:teacher,title:'Quiz ใหม่',targetUrl:'https://example.edu/q2',description:'ไปทำแบบทดสอบ'});
assert.equal(edited.title,'Quiz ใหม่');assert.equal(edited.targetUrl,'https://example.edu/q2');
const submission=await mock.call('createTopic',{type:'submission',token:teacher,title:'ทดลองส่งงาน',subject:'ฟิสิกส์',className:'ม.4/1',accessCode:'TEST99',requirements:'ภาพหมู่และใบงานสองหน้า'});
assert.equal(submission.type,'submission');
const roster=[{firstName:'สมชาย',lastName:'ตัวอย่าง',className:'ม.4/1',studentNo:'12'},{firstName:'สมหญิง',lastName:'ทดลอง',className:'ม.4/1',studentNo:'15'}];
const image='data:image/jpeg;base64,ZmFrZQ==';
const g=await mock.call('createGroup',{topicId:submission.id,accessCode:'TEST99',number:1,title:'กลุ่ม 1',membersList:roster,coverData:image,page1Data:image,page2Data:image});
assert.equal(g.group.number,1);assert.equal(g.group.membersList.length,2);assert.ok(g.editCode);
const media=await mock.call('getMedia',{mediaId:g.group.coverId,accessCode:'TEST99'});
assert.equal(media.dataUrl,image);
let rejected=false;try{await mock.call('updateGroup',{groupId:g.group.id,accessCode:'TEST99',editCode:'BAD',title:'ผิด'});}catch{rejected=true;}
assert.ok(rejected,'bad edit code must be denied');
const updated=await mock.call('updateGroup',{groupId:g.group.id,accessCode:'TEST99',editCode:g.editCode,revision:'แก้ไขระยะแขนโมเมนต์'});
assert.match(updated.group.revision,/แขนโมเมนต์/);
let cannotConvert=false;try{await mock.call('updateTopic',{type:'link',token:teacher,topicId:submission.id,title:'แปลง',targetUrl:'https://example.com'});}catch{cannotConvert=true;}
assert.ok(cannotConvert,'submission with existing groups cannot change type');
let duplicate=false;try{await mock.call('createGroup',{topicId:submission.id,accessCode:'TEST99',number:2,membersList:[roster[0],roster[0]]});}catch{duplicate=true;}
assert.ok(duplicate,'duplicate student should fail');
const other=await mock.call('createGroup',{topicId:submission.id,accessCode:'TEST99',number:2,title:'กลุ่ม 2',membersList:[{firstName:'อภิชาติ',lastName:'สมมติ',className:'ม.4/1',studentNo:'16'}]});
await mock.call('addFeedback',{accessCode:'TEST99',fromGroupId:other.group.id,toGroupId:g.group.id,editCode:other.editCode,text:'ตรวจค่า d จากจุดหมุนให้ครบถ้วน'});
const res=await mock.call('getTopic',{topicId:submission.id,token:teacher});
assert.equal(res.feedback.length,1);assert.equal(res.groups[0].membersList[0].className,'ม.4/1');
const exported=await mock.call('exportTopic',{token:teacher,topicId:submission.id});
assert.equal(exported.groups.length,2);assert.equal(exported.groups[0].membersList.length,2);
console.log('PASS: mock API — button types, link validation, editing, group roster, media, access, feedback, export');
