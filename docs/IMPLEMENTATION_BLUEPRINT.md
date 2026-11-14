# Product Blueprint — PHYSICS COOLNUT CENTER v1.0

## Product Definition

Physics learning & group submission hub. ตัดสินใจใช้กิจกรรมที่แยกเป็น `link` กับ `submission` แทนระบบหมวดหมู่เดิมที่รับงานทุกหัวข้อ

## Type Contract

`type='link'`: `title`, `subject`, `className`, `description`, `targetUrl` (https/http)
- กดจากหน้าแรก เปิดหน้าเว็บภายนอก (new tab; `noopener noreferrer`)
- ครูเป็นผู้สร้าง/แก้ไขเท่านั้น, ไม่มีการ์ดผลงานของนักเรียนในปุ่มชนิดนี้
- ใช้สำหรับ PhET / Online Quiz / Learning Video / External LMS

`type='submission'`: `title`, `subject`, `className`, `description`, `requirements`, `accessCode`, `open`
- กดจากหน้าแรก → ยืนยันรหัส → เห็นสิ่งที่ต้องส่ง → การ์ดกลุ่ม (ครูควบคุมปิดรับ)
- Group data: `number`, `title`, `membersJSON`, `coverId`, `page1Id`, `page2Id`, `revision`, `updatedAt`
- `membersJSON`: Array ของ `{firstName,lastName,className,studentNo}` 1–8 คน
- Media: Cover + A4 หน้า 1 (Predict + FBD) + A4 หน้า 2 (Observe + Explain)
- Presentation: Cover → หน้า 1 → หน้า 2; ปุ่มลูกศรใหญ่ Touchscreen/Swipe/Fullscreen/Zoom
- Feedback: source group, destination group, comments; Revision แยกจากภาพใบงาน
- Sub-feature Quiz in-app 1 MCQ per activity; Quiz external can instead be a `link` button

## Data Migration from Classfolio v0.9

`Topics` Append columns: `type`, `targetUrl`, `requirements`.
`Groups` Append column: `membersJSON`.
Missing/blank type treated as `submission`; missing membersJSON falls back to old free-text members display, and structured roster must be filled when editing group.

**Do not** overwrite old Sheets if column order differs; backup all data before migration. Do not claim migration of original Hongson Student Innovators actual data (README-only reference).

## Security

Teacher actions use server session. Group edits require edit code. Topic enter uses shared access code and is not individual identity verification. Sheet and Drive should not be public, and API should only return media after checking permissions. No private student data committed to public GitHub. Photo-use permission per school policy.

## Non-Goals for v1.0

SSO, AI scoring, complex LMS, real-time live collaboration, auto slide generation, saving a downloadable PowerPoint, offline sync of Drive, rubric auto-grade. Focus on reliable group submission and touch presentation.

## Test status

Static JavaScript syntax and Mock API covered in `tests/`; browser end-to-end and Google Services live integration not verified. Must run One-Take QA.
