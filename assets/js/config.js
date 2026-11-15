/** เปลี่ยน API_URL เป็นลิงก์ Apps Script /exec เมื่อผ่าน Connectivity Test แล้ว */
export const CONFIG = Object.freeze({
  APP_NAME: 'PHYSICS COOLNUT CENTER',
  TEACHER_NAME: 'ครูผู้สอน นายสาธิต ศิริวัชน์',
  API_URL: 'https://script.google.com/macros/s/AKfycbxA7iA9-ctizGYCLHt8hw44PiJUv9lrASSMvz9OM7Q5zTMxhbA4-YHc-qS0SVRKwfgs/exec',
  MODE: 'live', // demo | live  ต้องตั้ง live พร้อม API_URL ก่อน deploy จริง
  APP_SUBTITLE: 'ครูผู้สอน นายสาธิต ศิริวัชน์',
  MAX_COVER_KB: 180,
  MAX_PAGE_KB: 420,
  MAX_PAGE_WIDTH: 1500,
  MAX_COVER_WIDTH: 960,
  MAX_FILE_MB: 12,
  REQUEST_TIMEOUT_MS: 40000,
});
