"use client";
import { Button, ErrorBox } from "@/components/ui";
export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <main className="main-content">
      <h1>เปิดหน้านี้ไม่สำเร็จ</h1>
      <ErrorBox error="เกิดข้อผิดพลาดในหน้าจอ กรุณาลองใหม่ หากยังพบปัญหาให้ติดต่อผู้ดูแล" />
      <Button onClick={reset}>ลองเปิดอีกครั้ง</Button>
    </main>
  );
}
