import { str, type Row } from "./types";
export function retryOptions(
  row: Row,
  userID: string,
  delivered: boolean,
): { value: string; label: string }[] {
  if (row.status === "pending_approval")
    return [
      { value: "approval_needed", label: "แจ้ง Supervisor ให้พิจารณาอนุมัติ" },
    ];
  if (row.status === "pending_fund")
    return [
      { value: "purchase_funding", label: "แจ้ง Supervisor ให้โอนเงินจัดซื้อ" },
    ];
  if (
    row.status === "rejected" &&
    row.requisition_type === "additional" &&
    str(row, "reviewed_by") === userID
  )
    return [{ value: "no_purchase", label: "แจ้ง Worker ว่าไม่จัดซื้อ" }];
  if (
    row.status === "completed" &&
    row.requisition_type === "additional" &&
    delivered
  )
    return [{ value: "delivery", label: "แจ้ง Worker ว่าส่งมอบแล้ว" }];
  return [];
}
export function procurementNextStep(row: Row, delivered: boolean): string {
  switch (row.status) {
    case "pending_survey":
      return row.requisition_type === "additional"
        ? "Assistant ต้องกด “ตรวจและพิจารณาคำขอ” ก่อน หากต้องซื้อจึงส่งให้ Supervisor อนุมัติ"
        : "Assistant ต้องกด “กรอกผลสำรวจ” และบันทึกจำนวนอุปกรณ์ที่มีอยู่ก่อน";
    case "pending_approval":
      return "รอ Supervisor เปิดหน้าอนุมัติจัดซื้อ แล้วอนุมัติหรือปฏิเสธคำขอ ยังไม่ถึงขั้นรอเงินจัดซื้อ";
    case "pending_fund":
      return "รอ Supervisor เปิดคำขอแล้วกด “บันทึกโอนเงิน” พร้อมแนบหลักฐาน จากนั้น Assistant จึงจัดซื้อต่อได้";
    case "pending_procurement":
      return "Assistant ต้องกด “บันทึกจัดหาอุปกรณ์” กรอกจำนวนและราคาที่ซื้อจริง พร้อมแนบใบเสร็จตามเงื่อนไข";
    case "completed":
      return row.requisition_type !== "additional"
        ? "อุปกรณ์ TOR ตั้งต้นครบแล้ว ไม่มีเหตุการณ์ส่งมอบให้ Worker ที่ต้องแจ้งซ้ำ สามารถไปจัดตารางงานต่อได้เมื่อสัญญาพร้อม"
        : delivered
          ? "ส่งมอบและบันทึกหลักฐานแล้ว สามารถส่งข้อความแจ้ง Worker ซ้ำได้"
          : "จัดซื้อครบแล้ว แต่ยังไม่ได้บันทึกส่งมอบ Assistant ต้องกด “บันทึกการส่งมอบ” และแนบหลักฐานก่อนแจ้งว่าส่งมอบแล้ว";
    case "rejected":
      return "คำขอถูกปฏิเสธแล้ว หากเป็นการตัดสินใจไม่ซื้อโดยคุณ ให้ส่งเหตุผลเดิมแจ้ง Worker ซ้ำได้ ส่วนการปฏิเสธโดย Supervisor ใช้เหตุการณ์นี้ไม่ได้";
    default:
      return "กรุณาตรวจสถานะคำขอล่าสุดก่อนส่งแจ้งเตือนซ้ำ";
  }
}
