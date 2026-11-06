import { satang } from "./domain";

export const MAX_EVIDENCE_FILES = 10;
export const MAX_EVIDENCE_BYTES = 5 * 1024 * 1024;
export type ContractInfo = Record<string, string>;

export function contractInfoErrors(data: ContractInfo): Record<string, string> {
  const errors: Record<string, string> = {};
  if (!/^[0-9]{10}$/.test(data.contract_no || ""))
    errors.contract_no = "กรุณาระบุเลขที่สัญญาเป็นตัวเลข 10 หลัก";
  for (const [key, label] of [
    ["project_name", "ชื่อโครงการ"],
    ["partner_agency", "หน่วยงาน"],
  ]) {
    if (!data[key]?.trim()) errors[key] = `กรุณาระบุ${label}`;
    else if (data[key].trim().length > 255)
      errors[key] = `${label}ต้องไม่เกิน 255 ตัวอักษร`;
  }
  for (const [key, label] of [
    ["start_date", "วันที่เริ่ม"],
    ["end_date", "วันที่สิ้นสุด"],
  ]) {
    const value = data[key] || "";
    const date = new Date(`${value}T00:00:00Z`);
    if (
      !/^\d{4}-\d{2}-\d{2}$/.test(value) ||
      Number.isNaN(date.getTime()) ||
      date.toISOString().slice(0, 10) !== value
    )
      errors[key] = `กรุณาระบุ${label}ให้ถูกต้อง`;
  }
  if (!errors.start_date && !errors.end_date && data.end_date < data.start_date)
    errors.end_date = "วันที่สิ้นสุดต้องไม่ก่อนวันที่เริ่ม";
  try {
    if (satang(data.contract_value || "") > 999999999999n) throw new Error();
  } catch {
    errors.contract_value =
      "กรุณาระบุมูลค่าสัญญาไม่ติดลบ ไม่เกิน 9,999,999,999.99 บาท และทศนิยมไม่เกิน 2 ตำแหน่ง";
  }
  return errors;
}

export function evidenceLayout(sizes: { width: number; height: number }[]) {
  if (!sizes.length || sizes.length > MAX_EVIDENCE_FILES)
    throw new Error(
      `กรุณาเลือกภาพ PNG ตั้งแต่ 1 ถึง ${MAX_EVIDENCE_FILES} ภาพ`,
    );
  if (
    sizes.some(
      (s) =>
        !Number.isInteger(s.width) ||
        !Number.isInteger(s.height) ||
        s.width < 1 ||
        s.height < 1,
    )
  )
    throw new Error("ขนาดภาพไม่ถูกต้อง กรุณาเลือกไฟล์ใหม่");
  const width = Math.max(...sizes.map((s) => s.width));
  const height =
    sizes.reduce((sum, s) => sum + s.height, 0) + (sizes.length - 1) * 24;
  if (width > 8192 || height > 32760 || width * height > 32000000)
    throw new Error(
      "ภาพรวมมีขนาดใหญ่เกินไป กรุณาลดจำนวนภาพหรือความละเอียดก่อนแนบ โดยไม่ตัดข้อความสำคัญ",
    );
  let y = 0;
  const pages = sizes.map((s) => {
    const page = { x: Math.floor((width - s.width) / 2), y, ...s };
    y += s.height + 24;
    return page;
  });
  return { width, height, pages };
}

export async function prepareContractEvidence(files: File[]): Promise<File> {
  if (!files.length || files.length > MAX_EVIDENCE_FILES)
    throw new Error(
      `กรุณาเลือกภาพ PNG ตั้งแต่ 1 ถึง ${MAX_EVIDENCE_FILES} ภาพ`,
    );
  const images: ImageBitmap[] = [];
  const dimensions: { width: number; height: number }[] = [];
  try {
    for (const file of files) {
      if (
        file.type !== "image/png" ||
        !file.size ||
        file.size > MAX_EVIDENCE_BYTES
      )
        throw new Error(`${file.name}: ต้องเป็นภาพ PNG ที่มีขนาดไม่เกิน 5 MB`);
      const header = await file.slice(0, 24).arrayBuffer();
      const signature = new Uint8Array(header);
      if ([137, 80, 78, 71, 13, 10, 26, 10].some((v, i) => signature[i] !== v))
        throw new Error(
          `${file.name}: เนื้อหาไฟล์ไม่ใช่ PNG กรุณาเลือกไฟล์ใหม่`,
        );
      if (
        header.byteLength < 24 ||
        String.fromCharCode(...signature.slice(12, 16)) !== "IHDR"
      )
        throw new Error(`${file.name}: ข้อมูลภาพ PNG ไม่สมบูรณ์`);
      const view = new DataView(header);
      dimensions.push({
        width: view.getUint32(16),
        height: view.getUint32(20),
      });
      evidenceLayout(dimensions);
      try {
        images.push(await createImageBitmap(file));
      } catch {
        throw new Error(`${file.name}: เปิดภาพไม่ได้ ไฟล์อาจเสียหาย`);
      }
    }
    const layout = evidenceLayout(images);
    if (files.length === 1) return files[0];
    const canvas = document.createElement("canvas");
    canvas.width = layout.width;
    canvas.height = layout.height;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("ไม่สามารถเตรียมภาพรวมได้ กรุณาลองอีกครั้ง");
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, layout.width, layout.height);
    layout.pages.forEach((p, i) => ctx.drawImage(images[i], p.x, p.y));
    const blob = await new Promise<Blob>((resolve, reject) =>
      canvas.toBlob(
        (b) =>
          b ? resolve(b) : reject(new Error("ไม่สามารถสร้างไฟล์ PNG รวมได้")),
        "image/png",
      ),
    );
    if (blob.size > MAX_EVIDENCE_BYTES)
      throw new Error(
        "ไฟล์ PNG รวมเกิน 5 MB กรุณาลดจำนวนภาพหรือขนาดไฟล์ก่อนบันทึก",
      );
    return new File([blob], "หลักฐานสัญญา.png", { type: "image/png" });
  } finally {
    images.forEach((image) => image.close());
  }
}
