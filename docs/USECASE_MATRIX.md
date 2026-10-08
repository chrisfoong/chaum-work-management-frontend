# Frontend Use Case matrix

อิง Use Case Description ที่ผู้ใช้รับรองล่าสุด, ข้อตกลง 9A และ API ของ Backend ที่ตรวจจาก source จริงในวันที่ 2026-10-09. Figma เป็นแหล่งอ้างอิงหน้าตาเท่านั้น

| Use Case | หน้า / function                                         | API                                                                         |
| -------- | ------------------------------------------------------- | --------------------------------------------------------------------------- |
| 1S       | Contracts, TORWizard: ข้อมูล → พื้นที่/อุปกรณ์ → ยืนยัน | contracts/info, scope, confirm; files                                       |
| 2S       | ProcurementAction fund                                  | requisitions/:id/fund-transfers                                             |
| 3S       | ProcurementAction review                                | requisitions/:id/review (approve/reject)                                    |
| 4S       | Attendance + Payroll process                            | attendance/finalize                                                         |
| 5S       | Payroll, PayrollDetail: รอบครึ่งเดือน/จ่ายจริง          | payroll/batch, payroll?period_month, :id/mark-paid                          |
| 6S       | Finance: รายงาน/รายละเอียด/PDF/CSV, invoice             | reports/profit, confirm, .pdf, .csv; invoices                               |
| 1A       | ProcurementAction survey                                | requisitions/:id/survey                                                     |
| 2A       | PurchaseForm TOR base                                   | purchase/preview, purchase; latest price                                    |
| 3A       | ScheduleForm: ขั้นต่ำ/พนักงานว่าง                       | assignments, workers/available, schedules                                   |
| 4A       | LeaveReview: พิจารณา/คนแทน                              | leave-requests/:id, candidates, review, replacement                         |
| 5A       | RequisitionDetail: เทียบ TOR/คำขอค้าง                   | requisitions/:id/inspection                                                 |
| 6A       | ProcurementAction decision                              | requisitions/:id/decision                                                   |
| 7A       | PurchaseForm additional                                 | purchase/preview, purchase; weighted price                                  |
| 8A       | ProcurementAction delivery / หลักฐาน                    | delivery-schedules, delivery, deliveries, files                             |
| 9A       | Operations, Manual notify ใน Finance                    | assignments/:id/operations-summary; contracts/:id/operations-summary/notify |
| 1W       | WorkerHome, Schedules                                   | liff/schedules, dashboard, attendance                                       |
| 2W       | WorkerLeave                                             | liff/leave-requests                                                         |
| 3W       | CheckIn: GPS + QR                                       | liff/attendance/check-in                                                    |
| 4W       | Checkout                                                | liff/files, attendance/check-out                                            |
| 5W       | Shortage                                                | liff/equipment, requisitions                                                |
| 6W       | LINE Chat ของ Backend ไม่มีหน้า inbox เพิ่ม             | Backend notifications; ไม่เรียก messaging API จาก Browser                   |
| 7W       | WorkerPayslips                                          | liff/payroll?period_month                                                   |

## การคุ้มครองข้อมูล

- ไม่มี signup mock/role selector ใน production. role selector อยู่ `/preview` เท่านั้น และไม่เรียก API เขียน
- LINE ID token ใช้จาก LIFF SDK ไม่เพิ่มที่เก็บ token ของแอป ไม่ log secrets หรือบัญชีธนาคาร
- Proxy จำกัด route/method และ origin; Backend เป็นตัวบังคับสิทธิ์จริง
- เงินใช้ decimal string/BigInt สตางค์, GPS คำนวณระยะเชิงแสดงผลเท่านั้น การตัดสินใช้ Go
- ไม่เขียน `to_buy_qty` และไม่รัน SQL/migrations ใดจาก Frontend
- กะสิ้นสุดใช้ timestamps จาก API +8 ชั่วโมง; ไม่เดาสถานะขาดจากการไม่มี attendance
- QR ต้องได้จาก staff API มีลายเซ็น/expiry; ไม่สร้าง QR ปลอมเพื่อผ่านเช็คอิน
- Assistant เห็น operational counts/procurement เท่านั้น ไม่มี wage/penalty/profit

## ขอบเขตการตรวจ

ตรวจ source contract, build/typecheck/lint, API/proxy tests และ UI preview แยกแต่ละ role. ยังต้องตรวจ LINE login จริงบน HTTPS ของ frontend นี้, private Storage, GPS/QR จริง และ LINE delivery บนฐานทดสอบแยกก่อนนับ end-to-end ผ่าน
