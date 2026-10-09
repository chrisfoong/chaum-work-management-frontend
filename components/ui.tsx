"use client";
import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import {
  ArrowLeft,
  Check,
  ChevronLeft,
  ChevronRight,
  CircleAlert,
  LoaderCircle,
  Plus,
  Search,
  TreePine,
  X,
} from "lucide-react";
import type { API } from "@/lib/api";
import { tableRowKeys } from "@/lib/table";
import { notificationInfo } from "@/lib/notification";
import { dateThai, money } from "@/lib/domain";
import { num, str, type Row } from "@/lib/types";
export function Brand({ small = false }: { small?: boolean }) {
  return (
    <div className={`brand ${small ? "small" : ""}`}>
      <span className="brand-icon">
        <TreePine size={small ? 22 : 27} />
      </span>
      <div>
        <strong>ชะอุ่ม</strong>
        {!small && <small>CHAUM WORK MANAGEMENT</small>}
      </div>
    </div>
  );
}
export function Badge({ value }: { value: unknown }) {
  const key = String(value || "");
  const labels: Record<string, string> = {
    active: "กำลังดำเนินงาน",
    registered: "ลงทะเบียน",
    ended: "สิ้นสุด",
    complete: "สิ้นสุด",
    cancelled: "ยกเลิก",
    scheduled: "มีกำหนดงาน",
    completed: "เสร็จสิ้น",
    pending: "รอพิจารณา",
    approved: "อนุมัติแล้ว",
    rejected: "ไม่อนุมัติ",
    pending_survey: "รอสำรวจ",
    pending_approval: "รออนุมัติ",
    pending_fund: "รอเงินจัดซื้อ",
    pending_procurement: "รอจัดหา",
    on_time: "ตรงเวลา",
    late: "สาย",
    absent: "ขาดงาน",
    leave: "ลา",
  };
  return (
    <span
      className={`badge ${["active", "approved", "completed", "on_time"].includes(key) ? "green" : ["rejected", "absent", "cancelled"].includes(key) ? "red" : "amber"}`}
    >
      {labels[key] || key || "—"}
    </span>
  );
}
export function Button({
  children,
  onClick,
  variant = "primary",
  disabled = false,
  type = "button",
}: {
  children: ReactNode;
  onClick?: () => void;
  variant?: string;
  disabled?: boolean;
  type?: "button" | "submit";
}) {
  return (
    <button
      type={type}
      disabled={disabled}
      onClick={onClick}
      className={`button ${variant}`}
    >
      {children}
    </button>
  );
}
export function Empty({
  text = "ยังไม่มีข้อมูล",
  detail = "ข้อมูลจะแสดงเมื่อมีการบันทึกในระบบ",
}: {
  text?: string;
  detail?: string;
}) {
  return (
    <div className="empty">
      <h3>{text}</h3>
      <p>{detail}</p>
    </div>
  );
}
export function ErrorBox({
  error,
  retry,
}: {
  error: string;
  retry?: () => void;
}) {
  return (
    <div role="alert" className="error-box">
      <CircleAlert size={19} />
      <div>
        {error}
        {retry && <button onClick={retry}>ลองอีกครั้ง</button>}
      </div>
    </div>
  );
}
export function Loading() {
  return (
    <div role="status" className="loading">
      <LoaderCircle className="spin" size={22} /> กำลังโหลดข้อมูล…
    </div>
  );
}
export function useData<T>(
  load: (signal: AbortSignal) => Promise<T>,
  deps: unknown[],
) {
  const [data, setData] = useState<T>();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    Promise.resolve()
      .then(() => {
        if (!controller.signal.aborted) {
          setLoading(true);
          setError("");
        }
        return load(controller.signal);
      })
      .then((result) => {
        if (!controller.signal.aborted) setData(result);
      })
      .catch((e) => {
        if (!controller.signal.aborted)
          setError(e instanceof Error ? e.message : "โหลดข้อมูลไม่สำเร็จ");
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort(); // dependencies are supplied by the resource owner
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, revision]);
  return { data, error, loading, refresh: () => setRevision((r) => r + 1) };
}
export function Resource({
  loading,
  error,
  children,
  retry,
}: {
  loading: boolean;
  error: string;
  children: ReactNode;
  retry: () => void;
}) {
  return loading ? (
    <Loading />
  ) : error ? (
    <ErrorBox error={error} retry={retry} />
  ) : (
    <>{children}</>
  );
}
export function Stat({
  label,
  value,
  note,
}: {
  label: string;
  value: ReactNode;
  note?: string;
  icon?: ReactNode;
}) {
  return (
    <div className="stat">
      <div className="stat-top">
        <span>{label}</span>
      </div>
      <strong>{value}</strong>
      {note && <small>{note}</small>}
    </div>
  );
}
export function Panel({
  title,
  children,
  action,
}: {
  title?: string;
  children: ReactNode;
  action?: ReactNode;
}) {
  return (
    <section className="panel">
      {title && (
        <div className="panel-heading">
          <h2>{title}</h2>
          {action}
        </div>
      )}
      {children}
    </section>
  );
}
export function Heading({
  eyebrow,
  title,
  description,
  action,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="page-heading">
      <div>
        {eyebrow && <span className="eyebrow">{eyebrow}</span>}
        <h1>{title}</h1>
        {description && <p>{description}</p>}
      </div>
      {action}
    </div>
  );
}
export function Field({
  label,
  children,
  hint,
}: {
  label: string;
  children: ReactNode;
  hint?: string;
}) {
  const id = useId();
  return (
    <div className="field">
      <label id={id}>{label}</label>
      <div aria-labelledby={id}>{children}</div>
      {hint && <small>{hint}</small>}
    </div>
  );
}
export type FieldSpec = {
  name: string;
  label: string;
  type?: string;
  required?: boolean;
  options?: { value: string; label: string }[];
  value?: string;
  min?: number;
  max?: number;
  maxLength?: number;
  pattern?: string;
  hint?: string;
  multiple?: boolean;
};
export function Inputs({ fields }: { fields: FieldSpec[] }) {
  return (
    <div className="form-grid">
      {fields.map((f) => (
        <Field key={f.name} label={f.label} hint={f.hint}>
          {f.options ? (
            <select
              aria-label={f.label}
              name={f.name}
              required={f.required !== false}
              defaultValue={f.value || ""}
              multiple={f.multiple}
            >
              <option value="">เลือก{f.label}</option>
              {f.options.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          ) : f.type === "textarea" ? (
            <textarea
              aria-label={f.label}
              name={f.name}
              required={f.required !== false}
              maxLength={f.maxLength || 1000}
              defaultValue={f.value}
            />
          ) : (
            <input
              aria-label={f.label}
              name={f.name}
              type={f.type || "text"}
              required={f.required !== false}
              min={f.min}
              max={f.max}
              maxLength={f.maxLength}
              pattern={f.pattern}
              step={f.type === "number" ? "1" : undefined}
              defaultValue={f.value}
            />
          )}
        </Field>
      ))}
    </div>
  );
}
export function Modal({
  title,
  children,
  onClose,
  busy = false,
}: {
  title: string;
  children: ReactNode;
  onClose: () => void;
  busy?: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const previous = useRef<HTMLElement | null>(null);
  useEffect(() => {
    previous.current = document.activeElement as HTMLElement;
    const node = ref.current;
    node?.querySelector<HTMLElement>("button,input,select,textarea")?.focus();
    const old = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = old;
      previous.current?.focus();
    };
  }, []);
  return (
    <div
      className="modal-backdrop"
      onKeyDown={(e) => {
        if (e.key === "Escape" && !busy) onClose();
        if (e.key === "Tab") {
          const nodes = ref.current?.querySelectorAll<HTMLElement>(
            "button:not(:disabled),input:not(:disabled),select:not(:disabled),textarea:not(:disabled),a[href]",
          );
          if (!nodes?.length) return;
          const first = nodes[0],
            last = nodes[nodes.length - 1];
          if (e.shiftKey && document.activeElement === first) {
            e.preventDefault();
            last.focus();
          } else if (!e.shiftKey && document.activeElement === last) {
            e.preventDefault();
            first.focus();
          }
        }
      }}
    >
      <div
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="modal"
      >
        <div className="modal-heading">
          <h2>{title}</h2>
          <button aria-label="ปิดหน้าต่าง" disabled={busy} onClick={onClose}>
            <X />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
export function ActionForm({
  title,
  children,
  submit,
  onDone,
  onClose,
  submitLabel = "ยืนยันบันทึก",
}: {
  title: string;
  children: ReactNode;
  submit: (fd: FormData) => Promise<unknown>;
  onDone: () => void;
  onClose: () => void;
  submitLabel?: string;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);
  const [result, setResult] = useState<Row>({});
  const notification = notificationInfo(result);
  return (
    <Modal
      title={title}
      onClose={() => {
        if (!busy) onClose();
      }}
      busy={busy}
    >
      {done ? (
        <div className="success">
          <Check size={40} />
          <h3>ดำเนินรายการเสร็จแล้ว</h3>
          {notification && (
            <p role={notification.warning ? "alert" : undefined}>
              {notification.message}
            </p>
          )}
          {result.persisted === false && !notification && (
            <p>คำนวณจากข้อมูลปัจจุบัน ไม่ได้เก็บผลสรุปถาวร</p>
          )}
          <Button
            onClick={() => {
              onDone();
              onClose();
            }}
          >
            เสร็จสิ้น
          </Button>
        </div>
      ) : (
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            setError("");
            setBusy(true);
            try {
              const value = await submit(new FormData(e.currentTarget));
              setResult(
                typeof value === "object" && value !== null
                  ? (value as Row)
                  : {},
              );
              setDone(true);
            } catch (e) {
              setError(e instanceof Error ? e.message : "บันทึกไม่สำเร็จ");
            } finally {
              setBusy(false);
            }
          }}
        >
          <fieldset disabled={busy}>{children}</fieldset>
          {error && <ErrorBox error={error} />}
          <div className="modal-footer">
            <Button variant="secondary" onClick={onClose} disabled={busy}>
              ยกเลิก
            </Button>
            <Button type="submit" disabled={busy}>
              {busy ? (
                <LoaderCircle size={18} className="spin" />
              ) : (
                <Check size={18} />
              )}{" "}
              {busy ? "กำลังบันทึก…" : submitLabel}
            </Button>
          </div>
        </form>
      )}
    </Modal>
  );
}
export function Table({
  data,
  columns,
  onRow,
}: {
  data: Row[];
  columns: {
    key: string;
    label: string;
    format?: "date" | "money" | "status" | ((r: Row) => ReactNode);
  }[];
  onRow?: (row: Row) => void;
}) {
  if (!data.length) return <Empty />;
  const rowKeys = tableRowKeys(data);
  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            {columns.map((c) => (
              <th key={c.key}>{c.label}</th>
            ))}
            {onRow && <th>รายละเอียด</th>}
          </tr>
        </thead>
        <tbody>
          {data.map((r, i) => (
            <tr key={rowKeys[i]}>
              {columns.map((c) => (
                <td key={c.key}>
                  {typeof c.format === "function" ? (
                    c.format(r)
                  ) : c.format === "date" ? (
                    dateThai(str(r, c.key))
                  ) : c.format === "money" ? (
                    money(str(r, c.key))
                  ) : c.format === "status" ? (
                    <Badge value={r[c.key]} />
                  ) : (
                    str(r, c.key) || "—"
                  )}
                </td>
              ))}
              {onRow && (
                <td>
                  <button className="text-button" onClick={() => onRow(r)}>
                    ดูรายละเอียด <ChevronRight size={16} />
                  </button>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
export function Pager({
  offset,
  count,
  hasNext,
  onChange,
}: {
  offset: number;
  count: number;
  hasNext?: boolean;
  onChange: (n: number) => void;
}) {
  return (
    <div className="pager">
      <span>
        {count
          ? `รายการ ${offset + 1}–${offset + count}`
          : "ไม่มีรายการในหน้านี้"}
      </span>
      <Button
        variant="secondary"
        disabled={!offset}
        onClick={() => onChange(Math.max(0, offset - 50))}
      >
        <ChevronLeft size={16} />
        ก่อนหน้า
      </Button>
      <Button
        variant="secondary"
        disabled={hasNext === undefined ? count < 50 : !hasNext}
        onClick={() => onChange(offset + 50)}
      >
        ถัดไป
        <ChevronRight size={16} />
      </Button>
    </div>
  );
}
export function SearchBox({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="search">
      <Search size={18} />
      <input
        aria-label="ค้นหา"
        placeholder="ค้นหาชื่อหรือเลขที่…"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}
export function Back({ onClick }: { onClick: () => void }) {
  return (
    <button className="text-button back" onClick={onClick}>
      <ArrowLeft size={17} />
      กลับรายการ
    </button>
  );
}
export function AddButton({
  children,
  onClick,
}: {
  children: ReactNode;
  onClick: () => void;
}) {
  return (
    <Button onClick={onClick}>
      <Plus size={18} />
      {children}
    </Button>
  );
}
export function options(data: Row[], key: string, label: string) {
  return data.map((r) => ({
    value: str(r, key),
    label: str(r, label) || `${str(r, "first_name")} ${str(r, "last_name")}`,
  }));
}
export function fdString(fd: FormData, key: string) {
  return String(fd.get(key) || "").trim();
}
export function fdNumber(fd: FormData, key: string) {
  const n = Number(fdString(fd, key));
  if (!Number.isFinite(n)) throw new Error("ตัวเลขไม่ถูกต้อง");
  return n;
}
export function itemRows(row: Row) {
  return Array.isArray(row.items) ? (row.items as Row[]) : [];
}
export function amount(r: Row, key: string) {
  return money(str(r, key));
}
export function count(r: Row, key: string) {
  return num(r, key);
}
export async function fileFrom(
  fd: FormData,
  key: string,
  api: API,
  types?: string[],
) {
  const file = fd.get(key);
  if (!(file instanceof File) || !file.size) throw new Error("กรุณาแนบไฟล์");
  return api.upload(file, types);
}
