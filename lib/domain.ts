export function satang(input: string): bigint {
  if (!/^\d+(\.\d{1,2})?$/.test(input))
    throw new Error("ระบุจำนวนเงินที่ไม่ติดลบ ทศนิยมไม่เกิน 2 ตำแหน่ง");
  const [whole, fraction = ""] = input.split(".");
  return BigInt(whole) * 100n + BigInt(fraction.padEnd(2, "0"));
}
export function decimal(value: bigint): string {
  const n = value < 0n ? -value : value;
  return `${value < 0n ? "-" : ""}${n / 100n}.${(n % 100n).toString().padStart(2, "0")}`;
}
export function money(value: unknown): string {
  try {
    const v = String(value ?? "0");
    const negative = v.startsWith("-");
    const n = satang(negative ? v.slice(1) : v);
    return `${negative ? "-" : ""}${(n / 100n).toLocaleString("en-US")}.${(n % 100n).toString().padStart(2, "0")}`;
  } catch {
    return "—";
  }
}
export function today(now = new Date()): string {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Bangkok",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  const get = (type: string) => parts.find((p) => p.type === type)?.value;
  return `${get("year")}-${get("month")}-${get("day")}`;
}
export function date(value: unknown, long = false): string {
  const v = String(value ?? "");
  if (!v) return "—";
  const d = new Date(v.length === 10 ? `${v}T12:00:00+07:00` : v);
  if (Number.isNaN(d.getTime())) return "—";
  return new Intl.DateTimeFormat("th-TH", {
    timeZone: "Asia/Bangkok",
    day: "numeric",
    month: long ? "long" : "short",
    year: "numeric",
    ...(long ? { weekday: "long" as const } : {}),
  }).format(d);
}
export function clock(value: unknown): string {
  const s = String(value ?? "");
  if (/^\d{2}:\d{2}/.test(s)) return s.slice(0, 5);
  const d = new Date(s);
  return Number.isNaN(d.getTime())
    ? "—"
    : new Intl.DateTimeFormat("th-TH", {
        timeZone: "Asia/Bangkok",
        hour: "2-digit",
        minute: "2-digit",
        hourCycle: "h23",
      }).format(d);
}
export function period(
  month: string,
  halfValue: string | number,
): { period_start: string; period_end: string } {
  const half = String(halfValue);
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(month) || !["1", "2"].includes(half))
    throw new Error("รอบค่าจ้างไม่ถูกต้อง");
  const [year, m] = month.split("-").map(Number);
  const last = new Date(Date.UTC(year, m, 0)).getUTCDate();
  return {
    period_start: `${month}-${half === "1" ? "01" : "16"}`,
    period_end: `${month}-${half === "1" ? "15" : last}`,
  };
}
export function verifyFile(file: File, types: string[]): void {
  if (
    !types.includes(file.type) ||
    file.size === 0 ||
    file.size > 5 * 1024 * 1024
  )
    throw new Error("ไฟล์ต้องเป็นชนิดที่รองรับ และขนาดไม่เกิน 5 MB");
}
export const todayBangkok = today;
export const dateThai = date;
export function safeQR(value: string): string {
  if (value.length < 10 || value.length > 4096 || /[\s<>]/.test(value))
    throw new Error("QR ไม่ถูกต้อง กรุณาสแกนใหม่");
  return value;
}
export function distanceMeters(
  a: number,
  b: number,
  c: number,
  d: number,
): number {
  const r = Math.PI / 180;
  const x =
    Math.sin(((c - a) * r) / 2) ** 2 +
    Math.cos(a * r) * Math.cos(c * r) * Math.sin(((d - b) * r) / 2) ** 2;
  return 6371000 * 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
}
