# Frontend tasks

## Implemented

- [x] Next.js App Router เดิม + responsive Web sidebar / Worker bottom navigation
- [x] โทนเขียวธรรมชาติและ bundled Noto Sans Thai/Inter อิง Figma Make
- [x] LINE LIFF Web/Worker, role จาก verified Backend /me; ปฏิเสธ inactive/unknown/mismatched role
- [x] Server API proxy แบบ allowlist, no-store, request size limit, sanitized errors
- [x] TOR wizard / สถานะสัญญา / catalog / บุคลากร
- [x] ตารางงาน / เลือกพนักงานว่าง / ใบลา / จัดคนแทน
- [x] สำรวจ / เทียบ TOR / อนุมัติ / โอนเงิน / ซื้อหลายรอบ / ส่งมอบ / retry LINE
- [x] การเข้างาน / payroll ครึ่งเดือน / สลิป / mark-paid / invoice / finance export
- [x] 9A current operational report และ manual Supervisor notification
- [x] Worker schedule / leave / GPS+QR / checkout photo / shortage / payslip / profile
- [x] Preview ข้อมูลสมมติแยกจาก API จริง

## Verified locally

- [x] lint / typecheck / unit + API + proxy tests / production build / format
- [x] Browser preview ทุกเมนู Web และ Worker; desktop/mobile layouts

Unit/API/proxy tests 27 ผ่าน, fail 0, skip 0. Browser smoke ตรวจ 8 เมนู Supervisor, 6 เมนู Assistant, 4 เมนู Worker; TOR dialog, 9A ไม่มี financials, CheckIn disabled ก่อนมี GPS/QR และ Preview บล็อก mutation. ไม่พบ console error ใน Preview

Production build ใช้สำเนา source ที่ตรง repo ในพื้นที่ทดสอบซึ่งไม่มี `.env` เพื่อรักษาข้อห้ามอ่านไฟล์ลับ. Baseline starter ก่อนแก้ lint/build ผ่าน. Typecheck ใน repo รอบแรกติดสิทธิ์เขียน cache tsbuildinfo; ใช้ `--incremental false` เพื่อตรวจโดยไม่เขียน cache

## Live integration unverified

- [ ] LINE login จริงทั้ง Web/Mini App บน frontend origin นี้
- [ ] Storage upload/download จริง, GPS/QR check-in, LINE notification จริงในฐานทดสอบแยก

## Deployment configuration / limits

ต้องตั้ง BACKEND_URL, public Web/Worker LIFF IDs และ LIFF endpoint/callback HTTPS ให้ตรง origin นี้เอง ไม่อ่านหรือแก้ `.env` ให้ผู้ใช้ ไม่เพิ่ม Supabase schema และไม่ใช้ Shared Supabase เป็นฐานเขียนเพื่อทดสอบ

5S เอกสารของ Backend ที่ผู้ใช้ให้เลื่อนไว้ไม่ได้แก้ในรอบ Frontend. 6W ไม่มีหน้าเว็บเพิ่ม ใช้ LINE Chat. การส่ง/อ่าน 9A ไม่มีที่เก็บโดยตั้งใจ; accepted ไม่เท่ากับ delivered/read. ไม่มี deploy/push ในรอบนี้

Backend feature/worker-overnight-read-model เพิ่มกะวันก่อนที่ยังไม่สิ้นสุดโดยคง ownership; หน้า Worker โหลดกะที่ยังดำเนินอยู่และ attendance วันก่อนด้วย. Regression ผ่านบน isolated DB; Backend process ที่รันจริงยังต้อง restart เพื่อใช้ revision ใหม่นี้

## Payroll summary follow-up (2026-10-09)

- [x] สรุปพนักงานไม่ซ้ำและยอดสุทธิทั้งรอบ แยกจาก pagination; ไม่โหลด API ซ้ำเมื่อเปลี่ยนหน้าตาราง
- [x] เปลี่ยนเดือน/ครึ่งเดือน, รีเฟรชข้อมูล, วันเริ่ม/สิ้นสุดภาษาไทย, ไอคอน และสถานะจ่ายแล้ว/ยังไม่จ่าย
- [x] ข้อมูล Preview ทั้งสองครึ่งเดือนปัจจุบัน; เดือนอื่นแสดงว่าง ไม่คัดลอกยอดไปทุกเดือน
- [x] โหลด/ผิดพลาดไม่แสดงยอดศูนย์แทนข้อมูลจริง; ยอด/identity ผิดรูปแบบไม่รวมยอดบางส่วนเงียบๆ
- [x] Tests รวมเกิน 50 แถว/พนักงานซ้ำ/สตางค์/ยอดผิดรูปแบบ/ข้ามรอบ/Preview filter

ยอด Preview เป็นข้อมูลสมมติเท่านั้น; ยังไม่ตรวจ live Supabase/LINE ของ frontend นี้ และไม่สร้างสลิปในฐานจริงเพื่อแก้หน้าจอ Preview

## Live attendance preparation

- [x] GPS gate matches Backend <=50m accuracy and <=200m radius; invalid/missing TOR coordinates block client submission.
- [x] QR countdown uses issued expiry; expired Staff QR hidden and Worker QR blocked; Backend remains signature authority.
- [x] Shared LIFF initialization and timeout prevent duplicate initialization/infinite loading, no auth bypass.
- [x] Configurable explicit FRONTEND_DEV_HOST for owned development tunnel.
- [ ] Live login/upload/check-in/out/LINE delivery still pending actual configuration and human mobile steps. See LIVE_ACCEPTANCE.md.

## Mock verification follow-up (2026-10-09)

- [x] User authorized self-generated mock data following Supabase format; full Backend isolated integration run: 235 tests/subtests pass, fail 0, skip 0.
- [x] Frontend tests: 28 pass, fail 0, skip 0; lint/typecheck/build passed on source copy without .env.
- [x] Location catalog now uses nullable coordinates returned directly by GET locations; Backend regression verifies unassigned locations and null coordinates.
- [x] Actual Supervisor LINE login and existing mock location read verified in browser.
- [ ] Physical GPS/camera, real Storage upload/download and LINE delivery still unverified. File chooser did not attach the mock PNG and browser tab crashed; no upload success claimed.

User previously allowed scoped live application writes in shared Supabase, superseding the old shared-write restriction for that workflow. Automated mock integration still uses isolated localhost PostgreSQL only. No Supabase schema changes or test writes this round. Go runtime must restart to use the location read change. No .env access, push or deploy.

## UI refinement (2026-10-09)

- [x] Preserved page layouts, green visual identity, routes, API calls, state and business behavior.
- [x] Removed greeting emojis, login orbs, decorative sidebar note, duplicate status decoration and empty/stat icons.
- [x] Unified Lucide stroke/functional icon sizes, restrained radii/badges, plain surfaces and focus outlines; improved small-text readability.
- [x] Audited app/components source for emoji/gradients; reviewed all Supervisor/Assistant/Worker menu pages, Login and Worker at 390px. Preview only; no mutation.
- [x] Frontend 28 tests, lint, typecheck, production build and formatting passed on the source copy without .env. Backend pre-merge isolated suite 235 tests/subtests, vet/build passed.

Real mobile GPS/camera, real Storage transfer and actual LINE delivery remain separate acceptance checks. UI polish does not establish those results. User authorized pushing and merging both repositories into develop after checks; no deploy.

## Live test follow-up: table identity and LINE expiry (2026-10-09)

- [x] Shared Table prefers record IDs over shared TOR/User foreign keys; repeated IDs receive distinct occurrence keys without dropping rows.
- [x] Regression covers payroll rows for the same user/TOR, reordered records, repeated IDs and missing IDs.
- [x] HTTP 401 shows a LINE relogin instruction; no retry or authentication bypass. Mock token-expiry regression passes.
- [x] Frontend automated tests: 31 pass, 0 fail, 0 skipped; targeted lint passed.
- [ ] Successful LINE relogin on the affected live screen remains unverified; user must authenticate through LINE.

## LINE login renewal (2026-10-09)

- [x] Explicit Login clears an existing SDK session before requesting LINE authorization, preventing reuse of a rejected cached ID token.
- [x] Regression covers an existing session and a signed-out Worker redirect. Frontend tests: 33 pass, 0 fail, 0 skipped; targeted lint and typecheck passed.
- [ ] Actual LINE reauthorization/verified Supervisor login remains pending user login; a fresh-token 401 may still indicate verifier/channel configuration and is not proven fixed by this UI regression.

## Current handoff — 2026-10-10

- [x] Explicit login renewal and LIFF callback routing verified by actual LINE Supervisor/Assistant/Worker login on 9 October; historical pending-login entries above superseded.
- [x] Paired startup/acceptance guide: SERVER_AND_TEST_STATUS.md; Frontend 5500, Backend 8080, HTTPS LINE tunnel.
- [x] Frontend rerun: 33 tests, 0 failed/skipped. Backend isolated rerun: 235 tests/subtests, 0 failed/test skips; vet/build passed. Real QR issuance/expiry verified.
- [ ] Storage, populated business writes, physical GPS+camera check-in/out and actual LINE recipient delivery remain separate live acceptance; empty list reads and mock tests do not establish these.
