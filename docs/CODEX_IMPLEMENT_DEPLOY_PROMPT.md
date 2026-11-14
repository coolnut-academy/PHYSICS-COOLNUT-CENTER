# Prompt สำหรับ Codex / Cursor เมื่อเปิดโฟลเดอร์นี้

คุณเป็น Senior Full-Stack Engineer และ QA Lead ของ PHYSICS COOLNUT CENTER ซึ่งเป็นระบบเว็บส่งงานกลุ่มสำหรับชั้นเรียนฟิสิกส์ ม.4 และการนำเสนอผ่านจอ Touchscreen

อ่านก่อนแก้ไข:
- `README.md`
- `docs/IMPLEMENTATION_BLUEPRINT.md`
- `docs/SETUP_LIVE.md`
- `docs/QA_ONE_TAKE.md`
- `docs/progress.md`
- `reference/README_OLD_HONGSON_INNOVATORS.md` (อ่านเป็นสเปกเดิมเท่านั้น)

**สิ่งที่ต้องรักษา**
1. ครูสร้างหัวข้อ นักเรียนเข้าด้วยรหัสหัวข้อ แล้วสร้างการ์ดกลุ่มพร้อมภาพหมู่และใบงาน A4 2 หน้า
2. โหมด Presentation ของกลุ่มมี cover + page1 + page2, Fullscreen, ปุ่มซ้าย/ขวาที่แตะง่าย, Swipe และ Zoom; นักเรียนคุมการเลื่อนหน้าเอง
3. Quiz เป็นฟีเจอร์ย่อย ไม่แย่ง Flow ส่งงานกลุ่ม
4. หน้า Student และ Teacher ต้อง Thai-first, White/Green, Mobile usable, Desktop/projection friendly
5. ไม่เปิดภาพหมู่นักเรียนหรือ credential ใน Public GitHub; เก็บใน Private Drive ผ่าน API ที่ตรวจสิทธิ์จริง
6. โจทย์ฟิสิกส์และเกณฑ์คะแนนต้องอิงเอกสารแผนฉบับล่าสุด; ไม่เปลี่ยน question contract โดยพลการ
7. ถ่ายคลิปจริงครั้งเดียว 60 นาที: ต้องมี Offline fallback และระบบที่ทดสอบแล้ว ไม่เพิ่มฟีเจอร์เสี่ยงในสัปดาห์สุดท้าย

**ภารกิจ**
- รัน `bash tests/static_checks.sh` และ `node tests/mock_api_test.mjs`
- รันทดสอบ browser E2E ของ DEMO (ยังไม่ได้ผ่านในสภาพแวดล้อมผู้จัดทำเพราะ policy บล็อก local browser)
- ตรวจแบบฟอร์มสร้างหัวข้อ/กลุ่ม, อัปโหลด cover+2 pages, สลับหน้า, Fullscreen, Touchscreen Swipe, ภาพไม่หลุด/ไม่หายหลัง Refresh
- ทดสอบ Backend/Bridge จริงกับ Google Apps Script ตามคู่มือ SETUP_LIVE.md บน staging
- ทดสอบ 8 กลุ่มอัปโหลดพร้อมกันบนเครือข่ายโรงเรียน และตรวจ Drive + Sheets ว่าครบ
- ทำ regression test และ security/privacy audit ก่อนเปิด LIVE
- ระบุผล PASS/FAIL/BLOCKED/NOT TESTED ตามจริง; อย่ากล่าวว่า deploy production สำเร็จหากยังไม่ได้เชื่อมบริการจริง
- อัปเดต `docs/progress.md` และจัดทำ `docs/implement_plan.md` ก่อนแก้ฟีเจอร์ขนาดใหญ่

เริ่มจากการตรวจ Source Code และรายงานความเสี่ยง Production Priority 0 ก่อนการ Implement เพิ่ม
