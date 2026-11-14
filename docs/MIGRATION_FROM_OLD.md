# แนวทางย้ายจาก Hongson Student Innovators เดิม

มี **เฉพาะ README** ของระบบเดิม ไม่ได้รับ Source Code, Schema Google Sheets จริง, ID ของ Google Drive หรือสิทธิ์เชื่อมต่อ จึงยังไม่มีการนำเข้าข้อมูลจริงหรือแก้ Source Code เดิม

| โครงสร้าง README เดิม | Classfolio ใหม่ | วิธีคิดในการย้าย |
|---|---|---|
| Categories | Topics | เพิ่ม subject, className, accessCode, open |
| Submissions | Groups | เดิมผูกผลงานรายคน/URL; ใหม่ผูกกลุ่ม 1–8 และงาน A4 สองหน้า |
| Cover image | Group coverId | รับภาพหมู่ (ต้องมีการอนุญาต) |
| Drive category folders | Private Drive media | จำกัดการเข้าถึงผ่าน Apps Script API; ห้ามเปิดลิงก์ Drive Public |
| Admin Session | Teacher Token | CacheService 60 นาทีและ verify server-side |
| URL ผลงาน / Showcase | 2 worksheet pages + slideshow | แยกไฟล์ภาพหน้า 1/2 ชัดเจน |
| Sort by studentNo | Sort by group number | Topic มีรหัสเข้าเรียน |

## แนวทาง Migration เมื่อมี repo เดิมจริง

1. สำรอง Google Sheet/Drive จากระบบเดิมแบบ read-only
2. ตรวจ Schema จริงของ Categories, Submissions, Images, AdminLog
3. สร้าง Mapping ID category→topic, submission→group ตามความหมายจริง (ไม่สมมติว่าทุกรายการเป็นงานกลุ่ม)
4. เขียน Script Migration แบบ dry-run พร้อมนับรายการซ้ำ/รายการไม่มีไฟล์
5. ขออนุมัติสิทธิ์การใช้ภาพหมู่นักเรียนก่อนย้ายภาพ
6. ทดสอบแยก Mock, Staging, Live ไม่เขียนทับฐานเดิมจนกว่าจะตรวจข้อมูลทั้งหมด
