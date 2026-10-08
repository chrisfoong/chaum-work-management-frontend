import type { Metadata } from "next";
import "@fontsource/noto-sans-thai/400.css";
import "@fontsource/noto-sans-thai/500.css";
import "@fontsource/noto-sans-thai/600.css";
import "@fontsource/noto-sans-thai/700.css";
import "@fontsource/inter/400.css";
import "@fontsource/inter/600.css";
import "./globals.css";
export const metadata: Metadata = {
  title: "ชะอุ่ม | Chaum Work Management",
  description: "ระบบจัดการงาน พื้นที่ บุคลากร และอุปกรณ์ของชะอุ่ม",
  robots: { index: false, follow: false },
};
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="th">
      <body>{children}</body>
    </html>
  );
}
