"use client";
import { useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, Download, Trash2 } from "lucide-react";
import {
  MAX_EVIDENCE_BYTES,
  MAX_EVIDENCE_FILES,
} from "@/lib/contract-evidence";
import { Button, Field } from "./ui";

export function ContractEvidence({
  files,
  onChange,
  error,
  onError,
  prepared,
  onPrepare,
}: {
  files: File[];
  onChange: (files: File[]) => void;
  error?: string;
  onError: (message: string) => void;
  prepared: File | null;
  onPrepare: () => Promise<File>;
}) {
  const [index, setIndex] = useState(0);
  const [combined, setCombined] = useState(false);
  const [busy, setBusy] = useState(false);
  const active = Math.min(index, files.length - 1);
  const showCombined = combined && Boolean(prepared);
  const previewFile = showCombined ? prepared : files[active];
  async function prepare(download: boolean) {
    setBusy(true);
    onError("");
    try {
      const file = await onPrepare();
      setCombined(true);
      if (download) {
        const url = URL.createObjectURL(file);
        const link = document.createElement("a");
        link.href = url;
        link.download = "หลักฐานสัญญา.png";
        document.body.appendChild(link);
        link.click();
        link.remove();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
      }
    } catch (e) {
      onError(e instanceof Error ? e.message : "เตรียมหลักฐานสัญญาไม่สำเร็จ");
    } finally {
      setBusy(false);
    }
  }
  return (
    <Field
      label="หลักฐานสัญญา PNG"
      hint="เลือกเพิ่มได้หลายครั้ง สูงสุด 10 ภาพ ภาพละไม่เกิน 5 MB ระบบจะรวมตามลำดับเป็น PNG เดียวไม่เกิน 5 MB โดยไม่ย่อหรือตัดภาพ"
      error={error}
      errorId="contract-file-error"
    >
      <input
        type="file"
        name="file"
        accept="image/png"
        multiple
        aria-label="เลือกภาพหลักฐานสัญญา"
        aria-invalid={Boolean(error)}
        aria-describedby={error ? "contract-file-error" : undefined}
        disabled={busy}
        onChange={(e) => {
          const selected = Array.from(e.target.files || []);
          e.target.value = "";
          const bad = selected.find(
            (file) =>
              file.type !== "image/png" ||
              !file.size ||
              file.size > MAX_EVIDENCE_BYTES,
          );
          if (bad) {
            onError(`${bad.name}: กรุณาเลือกภาพ PNG ที่มีขนาดไม่เกิน 5 MB`);
            return;
          }
          const next = [...files];
          for (const file of selected)
            if (
              !next.some(
                (v) =>
                  v.name === file.name &&
                  v.size === file.size &&
                  v.lastModified === file.lastModified,
              )
            )
              next.push(file);
          if (next.length > MAX_EVIDENCE_FILES) {
            onError(
              `แนบได้สูงสุด ${MAX_EVIDENCE_FILES} ภาพ กรุณาลบบางภาพก่อนเพิ่ม`,
            );
            return;
          }
          onError("");
          setCombined(false);
          setIndex(Math.max(0, next.length - 1));
          onChange(next);
        }}
      />
      {files.length > 0 && (
        <div className="contract-evidence">
          <div className="evidence-pages" aria-label="รายการภาพหลักฐาน">
            {files.map((file, i) => (
              <div
                className="evidence-page"
                key={`${file.name}-${file.size}-${file.lastModified}`}
              >
                <button
                  type="button"
                  className={!showCombined && active === i ? "active" : ""}
                  aria-pressed={!showCombined && active === i}
                  onClick={() => {
                    setIndex(i);
                    setCombined(false);
                  }}
                >
                  {i + 1}. {file.name}
                </button>
                <button
                  type="button"
                  disabled={busy}
                  aria-label={`ลบภาพ ${file.name}`}
                  onClick={() => {
                    onChange(files.filter((_, n) => n !== i));
                    onError("");
                    setCombined(false);
                  }}
                >
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
          </div>
          {previewFile && (
            <EvidencePreview
              file={previewFile}
              combined={showCombined}
              alt={
                showCombined
                  ? "ภาพหลักฐานฉบับรวมที่จะบันทึก"
                  : `หลักฐานภาพที่ ${active + 1}: ${files[active].name}`
              }
              onError={() =>
                onError(
                  "เปิดภาพตัวอย่างไม่ได้ กรุณาตรวจสอบไฟล์หรือเลือกภาพใหม่",
                )
              }
            />
          )}
          <div className="evidence-navigation">
            <Button
              variant="secondary"
              disabled={active <= 0 || busy}
              onClick={() => {
                setIndex(active - 1);
                setCombined(false);
              }}
            >
              <ChevronLeft size={16} /> ภาพก่อนหน้า
            </Button>
            <span aria-live="polite">
              {showCombined
                ? "ฉบับรวมที่จะบันทึก"
                : `ภาพที่ ${active + 1} / ${files.length}`}
            </span>
            <Button
              variant="secondary"
              disabled={active >= files.length - 1 || busy}
              onClick={() => {
                setIndex(active + 1);
                setCombined(false);
              }}
            >
              ภาพถัดไป <ChevronRight size={16} />
            </Button>
          </div>
          <div className="toolbar">
            <Button
              variant="secondary"
              disabled={busy || active < 0}
              onClick={() => {
                const file = files[active];
                if (!file) return;
                const url = URL.createObjectURL(file);
                const link = document.createElement("a");
                link.href = url;
                link.download = file.name;
                document.body.appendChild(link);
                link.click();
                link.remove();
                setTimeout(() => URL.revokeObjectURL(url), 1000);
              }}
            >
              <Download size={16} /> ดาวน์โหลดภาพที่เลือก
            </Button>
            <Button
              variant="secondary"
              disabled={busy}
              onClick={() => prepare(false)}
            >
              {busy ? "กำลังเตรียมภาพ…" : "ตรวจฉบับรวมที่จะบันทึก"}
            </Button>
            <Button
              variant="secondary"
              disabled={busy}
              onClick={() => prepare(true)}
            >
              <Download size={16} /> ดาวน์โหลดหลักฐาน PNG
            </Button>
          </div>
        </div>
      )}
    </Field>
  );
}

function EvidencePreview({
  file,
  combined,
  alt,
  onError,
}: {
  file: File;
  combined: boolean;
  alt: string;
  onError: () => void;
}) {
  const ref = useRef<HTMLImageElement>(null);
  useEffect(() => {
    const image = ref.current;
    const url = URL.createObjectURL(file);
    if (image) image.src = url;
    return () => {
      image?.removeAttribute("src");
      URL.revokeObjectURL(url);
    };
  }, [file]);
  return (
    <div className={`evidence-image ${combined ? "combined" : ""}`}>
      {/* Blob previews are local and their URLs are revoked when the file changes. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img ref={ref} alt={alt} width={900} height={1200} onError={onError} />
    </div>
  );
}
