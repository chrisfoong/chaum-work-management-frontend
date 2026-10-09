import { object, type User } from "./types";
export function verifiedUser(value: unknown, platform: "web" | "worker"): User {
  const me = object(value);
  if (
    !["supervisor", "assistant", "worker"].includes(String(me.role)) ||
    me.is_active !== true ||
    typeof me.user_id !== "string"
  )
    throw new Error("บัญชีนี้ไม่มีสิทธิ์ใช้งานระบบ");
  if ((platform === "worker") !== (me.role === "worker"))
    throw new Error("บัญชีนี้ใช้ช่องทางเข้าสู่ระบบไม่ตรงกับบทบาท");
  return me as User;
}
