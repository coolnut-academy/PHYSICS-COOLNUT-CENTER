# PHYSICS COOLNUT CENTER — ติดตั้งระบบ LIVE

> **ยังไม่ผ่าน Live Integration Test**: ขั้นตอนต่อไปนี้ใช้สำหรับทีมพัฒนา/ผู้ดูแลระบบบนบัญชี Google ที่ได้รับอนุมัติเท่านั้น

## 1. สำรองของเดิมก่อน

หากตั้งใจใช้ Google Sheets/Drive ของ Hongson Classfolio เวอร์ชันก่อน ให้สำรอง Spreadsheet ทั้งไฟล์และโฟลเดอร์ Drive ก่อนอัปเดต หากเป็นระบบ Hongson Student Innovators เดิมที่มีแต่ README ยังไม่สามารถ Migration อัตโนมัติได้

## 2. Apps Script Backend

- สร้าง Apps Script Project ใหม่ หรืออัปเดต Project ต้นแบบ Classfolio ที่รู้จัก ID แน่นอน
- คัดลอก `appscript/Code.gs`, `appscript/Bridge.html` และ manifest `appsscript.json`
- ตั้งค่า Script Properties อย่างถูกต้อง และให้สิทธิ์เจ้าของ Spreadsheet/Drive
- เรียก `setupPhysicsCoolnut()` **หนึ่งครั้ง** (หรือตอนต้องเพิ่มคอลัมน์ schema); ดูผลที่คืนค่า IDs ของ Sheet/Drive
- หากใช้ Sheet เดิม ฟังก์ชันจะเติมคอลัมน์ต่อท้าย `Topics`: `type`, `targetUrl`, `requirements` และ `Groups`: `membersJSON`; จะไม่ลบคอลัมน์เก่า
- ตั้ง `TEACHER_PASSWORD_HASH` เป็น SHA-256 ของรหัสผ่านครูยาวพอ (ห้ามใส่รหัสหรือแฮชลง GitHub)
- ตั้ง `ALLOWED_ORIGINS` ให้ตรงกับ Origin ของเว็บจริง เช่น `https://example.github.io` หรือ Origin ของเว็บไซต์โรงเรียน คั่นหลายรายการด้วย comma; ไม่ใส่ wildcard `*`

ตัวอย่างการสร้างแฮชบนเครื่องครู:

```bash
node -e "const c=require('crypto');const p=process.argv[1];if(!p||p.length<12)throw Error('password too short');console.log(c.createHash('sha256').update(p).digest('hex'))" 'YOUR_STRONG_PASSWORD'
```

## 3. Deploy

- Apps Script → Deploy → New Deployment → Web App
- Execute as: เจ้าของบัญชีครู (Me)
- Who has access: ตามนโยบายองค์กร; สถาปัตยกรรม Bridge อาจต้องตั้ง Anyone หากนโยบายอนุญาตเท่านั้น
- คัดลอกลิงก์ `/exec` แล้วตั้งใน `assets/js/config.js`:

```js
MODE: 'live',
API_URL: 'https://script.google.com/macros/s/.../exec',
```

- นำไฟล์หน้าเว็บทั้งหมดขึ้น GitHub Pages (`index.html` อยู่ root) หรือโฮสต์ HTTPS ของโรงเรียน
- ตั้ง Origin ตาม URL ที่ใช้งานจริงใน `ALLOWED_ORIGINS`
- ทดสอบการเข้าโหมดครูด้วยรหัสใหม่ และยืนยันว่าข้อมูลถูกบันทึกใน Sheets จริง

## 4. ต้องทดสอบก่อนใช้ข้อมูลจริง

1. ครูสร้าง **ลิงก์** 1 ปุ่มและ **ส่งงาน** 1 ปุ่ม; ลิงก์ต้องเปิดเว็บใหม่โดยไม่เปิดหน้าส่งงาน
2. ครูแก้ URL เดิมและเปลี่ยนชื่อปุ่มได้; ห้าม URL `javascript:` และห้ามนักเรียนแก้ปุ่มครู
3. กิจกรรมส่งงานแสดง **สิ่งที่ต้องส่ง** ชัดเจน และเข้าร่วมด้วยรหัสกิจกรรมที่ถูกต้อง
4. กลุ่มสร้างการ์ดพร้อมรายชื่อสมาชิกแยกช่อง 4 ฟิลด์, รูปปก, รูปใบงาน 2 หน้า; ระบบปฏิเสธเลขที่ซ้ำภายในกลุ่ม
5. อุปกรณ์อีกเครื่องใช้รหัสกิจกรรมดูผลงานแล้วเห็นข้อมูลสมาชิกครบ และภาพไม่เสีย
6. รหัสแก้ไขกลุ่มผิดต้องแก้ไม่ได้; กลุ่มอื่นไม่มีสิทธิ์แก้ข้อมูล
7. Slide Show บนจอสัมผัสจริง: ภาพปก → หน้า 1 → หน้า 2, ปุ่มซ้าย/ขวา, Swipe, Zoom และ Fullscreen
8. Feedback → Revision และ Quiz ภายในกิจกรรมต้องบันทึกและ Export ได้จริง
9. ทดสอบ upload 8 กลุ่มภายใต้เครือข่ายโรงเรียนจริง, เส้นทางสำรองเมื่อ Wi-Fi/Google ขัดข้อง
10. ตรวจสิทธิ์ Drive และการเผยแพร่ข้อมูลนักเรียนตามนโยบายโรงเรียน

### ข้อสำคัญ

อย่าคิดว่า DEMO ผ่านแล้วเท่ากับ LIVE ผ่าน เพราะ Apps Script มีข้อจำกัดและอาจพบ Redirect/Timeout/ขนาด Payload ระหว่างใช้งานจริง
