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

## Dev / Docker — 2026-10-10

- เพิ่ม npm run dev ที่พอร์ต 5500 และ Docker Compose สำหรับสอง repo; คู่มือ DEV_DOCKER.md
- Frontend lint/typecheck/33 tests/format check ผ่าน; Docker build ทั้งสอง image ผ่าน
- Smoke test container บนพอร์ต 5510/8081: health และ preview HTTP 200; proxy เชื่อมถึง /api/web/me และปฏิเสธ dummy token ด้วย HTTP 401 ตามคาด
- ผลนี้ไม่แทนผลทดสอบ GPS/QR/Storage/LINE จริงตาม use case

## Live export / 9A check — 2026-10-10

- ดาวน์โหลดจาก UI จริงทั้ง PDF/CSV ของ TOR TEST รอบ 1–10 ต.ค.; เปิดไฟล์และเทียบรายรับ 0, ค่าแรง 0, จัดซื้อ 300, กำไร -300 ตรงกับหน้าเว็บ
- 9A รอบปิด 16–30 ก.ย. กดส่งจาก UI จริง: HTTP 200 ของ command แต่ notification failed; active Assistant มี line_id ไม่ถูกรูปแบบ และผู้ใช้มี LINE บัญชี Supervisor เดียว
- ยังไม่รับรองการรับ 9A จริง ต้องมี Assistant LINE แยก; บัญชีเดิมคงเป็น Supervisor

## 2026-10-10 Production wording and acceptance audit

- Removed developer terminology and preview link from production login; retained honest notification warnings and preview labels.
- Dashboard uses current operating contracts and pending-only requisitions, including contract numbers.
- Frontend 33 tests passed with no skips, lint/typecheck/format passed, production Docker build and startup passed.
- Full 22-case status is recorded in [UI_ACCEPTANCE_20261010.md](UI_ACCEPTANCE_20261010.md). Not all live UI/LINE outcomes or new screenshots are complete: LINE callback reports a network failure; 9A requires a separate real Assistant recipient.
- Google Docs User interface updated with latest results and two verified full desktop images. No claim that all end-to-end cases pass; no merge/push based on partial acceptance.

## 2026-10-14: LINE invitation onboarding (no ER change)

- Replaced the prepared registration-request approach with Supervisor-issued invitations using existing USER/WORKER columns only; no Supabase DDL or new table.
- Added creation/renewal, verified-LINE preview/claim, 24-hour expiry, one-time consumption and inactive-account protection. Pending users have no business access or Worker mapping.
- Frontend creates/copies LIFF links, preserves invitation fragments through redirects, removes manual LINE subject entry, and displays pending LINE binding separately from suspension.
- Verified backend go test ./... against isolated loopback PostgreSQL, go vet/build; frontend lint/typecheck/format, 35 tests; production Docker builds and both services healthy (5501/8081).
- Preview browser check passed on desktop/mobile: three roles and no LINE subject field. This is visual evidence only. A real separate LINE recipient still needs to complete the mobile claim flow before claiming live end-to-end acceptance.
- Full instructions: docs/ONBOARDING.md. No push/merge performed.

## 2026-10-14: Cancel LINE invitations

Supervisor can cancel the current unclaimed invitation without deleting personnel or changing ER. Cancelled accounts can be re-invited; linked accounts cannot be deactivated through cancellation. Added transaction/row-lock race coverage and UI confirmation/status labels. Tests run on isolated loopback PostgreSQL, not shared Supabase.

## Worker leave duplicate submission UI — 2026-10-14

Excluded already submitted leave dates in every state, showed existing statuses, disabled empty/loading submissions and translated stale duplicate errors. Backend duplicate/date rules unchanged. Supabase inspection found only one request each for Oct 14 (approved emergency) and Oct 15 (rejected advance) for the requested Worker; no leave records removed. 37 frontend tests, typecheck, targeted lint/formatting and production Docker build passed. Real mobile LINE form validation remains pending.

## TOR coordinates and Worker leave cards — 2026-10-14

New TOR location fields collect required latitude/longitude with numeric bounds; coordinates travel in existing new_location payload and are persisted atomically with TOR using existing LOCATION columns. Worker Home and Schedule load owned leave requests and display pending/approved/rejected status separately from shift status; approved leave hides check-in/out actions. No ER change or Supabase test writes for this change. Frontend 38 tests, typecheck, targeted lint/format, and production build passed. Worker mobile Preview screenshots at 390px show pending leave on both pages without horizontal overflow; live mobile LINE visual confirmation remains pending.

## Worker shortage equipment selector — 2026-10-14

Replaced global equipment load with assignment_id-scoped TOR equipment query. Area selection is controlled, shows project/location, resets selected items on change and blocks stale/loading/empty/error submissions. Full 38 frontend tests, typecheck, targeted lint and production build passed. Real mobile LINE confirmation remains pending.

## Single-action Login and centered loading — 2026-10-14

Removed platform selection from Login; retained original green palette in a centered responsive panel. AuthProvider loading now uses its own centered viewport layout. Verified onboarding response supplies account platform; mismatched entry redirects to the configured LIFF/Mini App and requires normal channel verification again. No client role selection or token bypass. 38 tests, typecheck, targeted lint/format and production build passed. Browser screenshot assertions passed at 1440x900 and 390x844: one LINE button, no selector, no horizontal overflow, loading centered on both axes. LINE requests were held only during loading layout capture; live OAuth cross-channel flow remains pending real-account verification. Docker healthy.

## Worker duplicate selections and attendance actions — 2026-10-14

Equipment dropdowns exclude selections used by other rows; add-row is disabled for incomplete selections or exhausted active TOR equipment and handler guards prevent duplicate selection. Worker Schedule loads owned attendance by selected period, matches schedule_id, disables saved check-in, enables checkout only after check-in and disables both after checkout; Home uses same attendance-aware card. 41 unit/regression tests, typecheck, targeted lint/format and production build passed. Browser Preview at 390px verified duplicate option removal/add limit and disabled checked-in action with enabled checkout. Screenshots saved in workspace. Docker Frontend healthy; real mobile confirmation pending. No Backend or database change for this fix.

## Actionable LINE retry guidance — 2026-10-14

Retry popup now displays current request status and next actor/action, limits notification kinds to committed-state candidates, requires original Assistant ownership for no_purchase and known delivery evidence for delivery, hides irrelevant reason field and disables send when no event is eligible. Stale-state conflict is translated into Thai with refresh instruction. Backend remains authoritative and unchanged. 43 tests, typecheck, lint, production build passed; browser Preview verified disabled blocked state, only approval_needed for pending approval, and mobile overflow check. No LINE messages sent by verification. Docker healthy.

## Scheduled-end checkout guard — 2026-10-14

Worker card and checkout form now require scheduled shift_end_at before enabling submission, show the exact eligible date/time, and update clock every 15 seconds. Worker schedule default includes yesterday for overnight attendance; unclosed cards retain checkout actions after midnight. Server is authoritative. 44 tests, typecheck, lint/format and production build passed. Mobile Preview with controlled 15:00 clock verified disabled checkout before 16:00 end and displayed availability; no live write. Docker both healthy. User reports TOR equipment, real GPS/QR and shortage request exercised; DB read verified check-in and one additional request pending_procurement. Early 20:39 checkout on 18:00-02:00 shift preserved as defect evidence, not silently corrected. New real-device checkout policy remains pending.
