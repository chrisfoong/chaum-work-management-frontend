# ชะอุ่ม · Chaum Work Management Frontend

Frontend แยกจาก Go Backend ใช้โครงสร้าง Next.js App Router เดิม, React, TypeScript และ Tailwind พร้อม CSS สำหรับ Web และ Worker ตาม Figma Make: [Design System for Chaum App](https://www.figma.com/make/E7Hy2suF0nOL0LGsyeEW50/Design-System-for-Chaum-App).

## เปิดใช้งาน

```bash
cd /c/SA/chaum-work-management-frontend
npm ci
npm run dev
```

เปิด `http://localhost:3000` เพื่อ Login หรือ `/preview` เพื่อดูหน้าตาทั้งสามบทบาทด้วยข้อมูลสมมติ ปุ่มบันทึกใน Preview ถูกปฏิเสธก่อนเรียกเครือข่าย ไม่ใช่ login mock ของระบบจริง

ตั้งค่าเองโดยอิง `.env.example`: `BACKEND_URL` เป็น origin ของ Go API, public LIFF ID ของ Web และ Worker เป็นคนละค่า LIFF ID ไม่ใช่ Channel ID ไม่ต้องใส่ Supabase URL/key, database password หรือ LINE channel secret ใน Frontend

สำหรับ LINE จริงให้ใช้ HTTPS origin ของเว็บนี้ ตั้ง Web LIFF endpoint เป็น `/web` และ Worker Mini App endpoint เป็น `/worker` พร้อม callback URL ของแต่ละช่องทางให้ตรงกัน เปิด scope `openid` และ `profile` ให้ช่องทาง Web/Mini App อยู่ Provider เดียวกันและอยู่ใน Backend channel allowlist ต้องมี verified LINE subject ใน `public."USER".line_id` และบัญชี active ก่อนใช้งาน Backend อ่าน role จาก DB. `/portal` รองรับช่องทางที่เลือกไว้แล้ว; ลิงก์ 9A ของ Backend ควรตั้ง `ASSISTANT_DASHBOARD_URL` เป็น HTTPS `/web`

Frontend ส่ง ID token ไป `/api/backend/web/*` หรือ `/api/backend/liff/*` Next route proxy ส่งต่อไป Go ด้วย origin ที่ตั้งไว้ ไม่ส่ง cookie ไม่เก็บ response cache ไม่ log token และไม่เชื่อ role/user_id ที่เลือกบน UI เป็นหลักฐานสิทธิ์ Backend ใช้ Supabase เดิมและตัดสินสิทธิ์/ownership/ธุรกรรมทั้งหมด

## ฟังก์ชัน

- Supervisor: TOR wizard 2 ขั้นตอน, พื้นที่/อุปกรณ์/บุคลากร, อนุมัติจัดซื้อ, หลักฐานโอนเงิน, เข้างาน, ประมวลผลค่าจ้าง, ยืนยันจ่าย, ใบวางบิล/รับเงิน, รายงาน JSON/PDF/CSV และกดแจ้ง 9A
- Assistant: จัดกะจากพนักงานว่าง, พิจารณาใบลาและคนแทน, สำรวจ/ตรวจคำขอ, ซื้อหลายรอบและ preview ยอด, ส่งมอบรูปหลักฐาน, retry LINE และรายงาน 9A เชิงปฏิบัติการ
- Worker: ตารางตนเอง, แจ้งลา, GPS + QR check-in, ส่งภาพผลงานและ check-out, ขออุปกรณ์ และสลิปที่จ่ายแล้ว
- Staff QR ลงนามจาก Go, เปิดกล้องอ่าน QR ผ่าน ZXing, ไฟล์ raw bytes ผ่าน API ไป private Storage

ดูรายละเอียดทุก Use Case ใน [docs/USECASE_MATRIX.md](docs/USECASE_MATRIX.md) และสถานะตรวจรับจริงใน [docs/TASKS.md](docs/TASKS.md)

## ตรวจรับ

```bash
npm run lint
npm run typecheck
npm test
npm run build
npm run format:check
```

Unit/API/proxy tests ใช้ข้อมูลทดสอบในหน่วยความจำ ไม่เชื่อม Supabase และไม่ถือเป็น LINE/Storage/GPS/QR end-to-end ผ่านจริง การลองงานที่เขียนข้อมูลต้องใช้สภาพแวดล้อมทดสอบแยกเท่านั้น

## ความต่างจาก Figma ที่ตั้งใจปรับ

กะ 08:00–16:00 (8 ชั่วโมง), GPS และ QR ต้องผ่านทั้งคู่, ตัดรับ/ปฏิเสธงานแทนล่วงหน้า, ไม่มี inbox/read receipts, Assistant ไม่มี financials, 9A เป็น realtime ไม่เก็บ snapshot และส่งเองโดย Supervisor หลังตรวจ 5S/6S ข้อมูล LINE ผลอุปกรณ์อยู่ใน LINE Chat

ใช้ enum จริง `tor_base`/`additional`, `shift_status`, `request_id`, `check_in`, `photo_url`, `penalty_amount`, `labor`/`material`/`profit` ไม่ใช้ชื่อฟิลด์สมมติจาก prototype

## โครงสร้าง

`app/` routes และ server proxy, `components/` แยกกลุ่มงาน, `lib/` API/session/เงิน/วันและ preview, `tests/` unit/proxy tests, `docs/` requirement และตรวจรับ ใช้ฟอนต์ Noto Sans Thai/Inter แบบ bundled ไม่โหลด Google Fonts ตอน build

Feature branches เป็นชุดต่อกันจาก `feature/frontend-foundation` ไปจน `feature/frontend-verification` ให้ตรวจ diff ต่อ parent ของแต่ละชุด การ merge ควรทำตามลำดับ ไม่มีการ deploy อัตโนมัติ
