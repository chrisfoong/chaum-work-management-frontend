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
    accepted: "LINE รับคำขอส่งแล้ว ยังไม่ยืนยันว่าผู้รับได้รับหรืออ่าน",
    partial: "LINE รับคำขอส่งเพียงบางส่วน มีผู้รับที่ส่งไม่สำเร็จ",
    failed: "ส่งคำขอ LINE ไม่สำเร็จ สามารถลองส่งแจ้งเตือนใหม่ได้",
    disabled: "ยังไม่ได้เปิดบริการส่ง LINE ไม่มีข้อความถูกส่ง",
  };
  return {
    message: labels[String(notice.status)] || "ยังไม่ทราบผลการส่ง LINE",
    warning: notice.status !== "accepted",
  };
}
