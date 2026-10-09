# เปิด Frontend และสถานะการทดสอบ

อัปเดต 10 ตุลาคม 2026 (Asia/Bangkok) — repo chaum-work-management-frontend ใช้ branch รวมงาน develop

## เปิด server

เปิด Backend 8080 ก่อน แล้วเปิด Terminal 2

Git Bash:

```bash
cd /c/SA/chaum-work-management-frontend
npm ci
npm run dev -- --hostname 127.0.0.1 --port 5500
```

PowerShell:

```powershell
cd C:\SA\chaum-work-management-frontend
npm ci
npm run dev -- --hostname 127.0.0.1 --port 5500
```

npm ci ใช้ติดตั้งครั้งแรก/หลัง lockfile เปลี่ยน ไม่ต้องทำทุกครั้ง Local: http://127.0.0.1:5500/web, Worker /worker, ตัวอย่าง /preview
5500 คือพอร์ตหลักรอบล่าสุด; 3100 เป็น preview เก่า Preview เป็น sample และปฏิเสธการบันทึก ไม่ใช่หลักฐาน API/Storage

โปรแกรมโหลด config ตามปกติ ผู้ใช้จัดการค่าจริงเอง คู่มือไม่มี secrets และไม่ต้องเปิด/แก้ .env เพื่อรันคำสั่ง หากเปลี่ยน config ต้อง Ctrl+C แล้วเปิดใหม่ BACKEND_URL เช่น http://127.0.0.1:8080 และ public LIFF IDs ของ Web/Worker ต้องตรงจริง ห้ามใส่ Supabase service key หรือ LINE Messaging token ใน Frontend

## LINE ผ่าน HTTPS

เปิด Terminal 3:

```bash
ngrok http 5500
```

ใช้ HTTPS URL ที่ ngrok แสดงและคง Terminal ทั้งสามไว้ URL ที่เคยทดสอบ https://unfiled-bunkhouse-float.ngrok-free.dev ต้องตรวจว่า tunnel ปัจจุบันใช้ URL นี้จริง LIFF endpoint/callback ต้องตรง origin/path ปัจจุบัน Web /web, Worker /worker พร้อม openid

หน้า Web → เลือกผู้ควบคุม/ผู้ดูแลงาน → Login LINE; Worker เลือก Mini App บัญชีต้อง active/LINE identity ตรง DB และ Worker มี worker mapping; role ไม่ได้มาจากปุ่ม UI

ERR_NGROK_3200 หมายถึง tunnel offline; EADDRINUSE:5500 มี process เปิดพอร์ตแล้ว ตรวจ server เดิมก่อนเปิดซ้ำ; token expired ให้ Login LINE ใหม่ ไม่ใช้ /preview ข้ามสิทธิ์

```powershell
netstat -ano | findstr :5500
Get-Process -Id <PID>
```

## สิ่งที่แก้และตรวจแล้ว

- UI เรียบ/สม่ำเสมอตาม layout เดิม และจัดแนว finance filters
- แก้ React row keys ซ้ำด้วย record identity/occurrence ไม่ทิ้งแถว
- 401 แนะนำ Login ใหม่; explicit Login ต่ออายุ LINE session และ initialize LIFF callback ก่อนกลับ Web/Worker
- Frontend 33 tests ผ่าน fail 0 skip 0 รันซ้ำ 10 ต.ค. ใช้ mock ไม่เรียก Supabase
- lint/typecheck/production build ผ่านหลังแก้ callback; build ไม่ยืนยันทุก business flow
- Login จริง 3 roles, role menus/ผิดแพลตฟอร์ม, Dashboard/9A reads และ QR issuance/expiry ผ่าน 9 ต.ค.

## ยังไม่ได้ตรวจครบผ่านระบบจริง

| Flow                   | ต้องตรวจต่อ                                                                                          |
| ---------------------- | ---------------------------------------------------------------------------------------------------- |
| TOR/Storage            | PNG upload → ยืนยัน → ดาวน์โหลดไฟล์จริง; error/ชนิด/ขนาด                                             |
| จัดซื้อ/หลักฐานโอนเงิน | สำรวจ → ยอดขาด → funding → partial/repeated purchase → ส่งมอบ; additional approve/reject/no_purchase |
| ตาราง/ลา/คนแทน         | populated data สัญญาใช้งานได้ อุปกรณ์พร้อม คนขั้นต่ำ/กะ; อนุมัติ/ปฏิเสธ/replacement                  |
| GPS+QR check-in        | Worker mapping+กะ → กล้อง/ตำแหน่งจริง → สแกน QR → check-in; ออก QR ได้ยังไม่ยืนยัน flow นี้          |
| Check-out              | ต้อง check-in สำเร็จและแนบภาพผลงานก่อนตรวจบันทึกจริง                                                 |
| Payroll/Finance        | attendance/payroll/paid/invoice → deductions/net → PDF/CSV → Worker paid slip                        |
| LINE จริง              | ส่งบัญชีทดสอบที่เพิ่มเพื่อน OA → ตรวจแชตผู้รับ/ลิงก์ 9A; API success ไม่ยืนยันรับ/อ่าน               |

บัญชีเดิมคืน Supervisor และ Worker mapping ทดสอบลบแล้ว ต้องเตรียม mapping/กะใหม่ก่อน Worker test การอ่านรายการว่างไม่ยืนยัน mutation

9A ไม่มี send/read/snapshot tables ตาม MVP Assistant เห็น operational เท่านั้น Supervisor กดแจ้งเองหลังตรวจ 5S/6S กะ 8 ชั่วโมง และ check-in ต้อง GPS พร้อม QR

## ตรวจอัตโนมัติ

```bash
npm run lint
npm run typecheck
npm test
npm run build
npm run format:check
```

คู่มือ Backend: chaum-work-management-backend/docs/SERVER_AND_TEST_STATUS.md
หลักฐาน workspace แยกจาก Git: frontend-test-proof-2026-10-10.txt, SUPERVISOR_LIVE_TEST_2026-10-09.md และภาพประกอบ
