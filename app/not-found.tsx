import Link from "next/link";
export default function NotFound() {
  return (
    <main className="main-content">
      <h1>ไม่พบหน้าที่ต้องการ</h1>
      <p className="muted">ตรวจสอบลิงก์หรือกลับไปหน้าเข้าสู่ระบบ</p>
      <Link href="/" className="button primary">
        กลับหน้าหลัก
      </Link>
    </main>
  );
}
