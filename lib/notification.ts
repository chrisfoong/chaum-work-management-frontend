import { object } from "./types";
export function notificationInfo(
  value: unknown,
): { message: string; warning: boolean } | null {
  const result = object(value);
  const notice = result.notification
    ? object(result.notification)
    : "delivery_verified" in result
      ? result
      : null;
  if (!notice) return null;
  const labels: Record<string, string> = {
    accepted: "ส่งคำขอแจ้งเตือนไปยัง LINE แล้ว ยังไม่ยืนยันการรับข้อความ",
    partial: "ส่งคำขอแจ้งเตือนได้บางส่วน กรุณาลองส่งใหม่สำหรับผู้รับที่เหลือ",
    failed: "ส่งการแจ้งเตือนไม่สำเร็จ กรุณาลองใหม่",
    disabled: "บริการแจ้งเตือนยังไม่พร้อมใช้งาน กรุณาติดต่อผู้ดูแลระบบ",
  };
  return {
    message: labels[String(notice.status)] || "ยังไม่ทราบผลการส่ง LINE",
    warning: notice.status !== "accepted",
  };
}
