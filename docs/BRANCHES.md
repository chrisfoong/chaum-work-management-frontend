# Feature branches

Local commits เท่านั้น ไม่มี push/deploy. แต่ละ branch ต่อจาก branch ก่อนหน้าเพื่อคง dependency ของหน้าจอร่วมกัน ตรวจ diff เทียบ parent ตามตาราง

| Branch                           | Parent                           | งาน                                                                                             |
| -------------------------------- | -------------------------------- | ----------------------------------------------------------------------------------------------- |
| feature/frontend-foundation      | main                             | responsive shell, LINE auth, proxy, utilities, tests                                            |
| feature/frontend-tor-location    | feature/frontend-foundation      | TOR wizard, contract detail, location/catalog/personnel                                         |
| feature/frontend-schedule-leave  | feature/frontend-tor-location    | schedules, leave, replacement, QR, 9A operational report                                        |
| feature/frontend-procurement     | feature/frontend-schedule-leave  | survey, inspection, decision, approval, funds, purchases, delivery                              |
| feature/frontend-payroll-finance | feature/frontend-procurement     | payroll, payment confirmation, invoices, profit, exports, manual 9A notice                      |
| feature/frontend-worker-miniapp  | feature/frontend-payroll-finance | Worker GPS/QR, checkout photo, leave, shortage, payslips/profile                                |
| feature/frontend-verification    | feature/frontend-worker-miniapp  | final API field corrections, direct LIFF entry routes, notification outcomes, verification docs |

HEAD อยู่ feature/frontend-payroll-summary ซึ่งรวมทุก feature. main ยังเป็น baseline เดิม. Foundation มีช่องหน้าจอชั่วคราวที่ถูกแทนด้วย implementation ใน branch ถัดไป; อย่า merge/deploy foundation อย่างเดียวเป็นสินค้าสำเร็จ

```bash
git diff feature/frontend-foundation...feature/frontend-tor-location
git diff main...feature/frontend-verification
```

`feature/frontend-payroll-summary` ต่อจาก `feature/frontend-verification`: แก้ summary/range/Preview/refresh และ regression tests ของ Payroll.

`feature/frontend-live-attendance` ต่อจาก `feature/frontend-payroll-summary`: GPS/QR expiry, Worker overnight homepage, shared LIFF initialization/deadline และ explicit dev tunnel host. Live acceptance ยังรอผู้ใช้ login/config/mobile.
