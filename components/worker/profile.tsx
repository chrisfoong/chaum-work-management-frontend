"use client";
import { useSession } from "../auth";
import { Button, Heading, Panel } from "../ui";
import { str } from "@/lib/types";

export function Profile() {
  const { user, logout } = useSession();
  return (
    <>
      <Heading title="โปรไฟล์ของฉัน" />
      <Panel>
        <div className="profile-hero">
          <span className="avatar large">{user.first_name?.slice(0, 1)}</span>
          <h2>
            {user.first_name} {user.last_name}
          </h2>
          <span className="badge green">
            {user.role === "worker"
              ? "พนักงาน"
              : user.role === "assistant"
                ? "ผู้ดูแลงาน"
                : "ผู้ควบคุมงาน"}
          </span>
        </div>
        <div className="profile-details">
          <span>
            เบอร์โทรศัพท์<strong>{str(user, "phone_number") || "—"}</strong>
          </span>
          <span>
            สถานะบัญชี<strong>{user.is_active ? "ใช้งาน" : "ระงับ"}</strong>
          </span>
          <span>
            ช่องทางเข้าสู่ระบบ<strong>LINE</strong>
          </span>
        </div>
        <p className="notice">
          แก้ไขข้อมูลส่วนตัวผ่านผู้ควบคุมงาน ระบบไม่เปิดให้เปลี่ยนบทบาทด้วยตนเอง
        </p>
        <Button variant="secondary" onClick={logout}>
          ออกจากระบบ
        </Button>
      </Panel>
    </>
  );
}
