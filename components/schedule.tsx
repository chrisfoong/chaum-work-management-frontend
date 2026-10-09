"use client";
import { useEffect, useState } from "react";
import { Clock, MapPin, QrCode, RefreshCw } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { useSession } from "./auth";
import {
  ActionForm,
  AddButton,
  Badge,
  Button,
  Empty,
  ErrorBox,
  Field,
  Heading,
  Inputs,
  Pager,
  Panel,
  Resource,
  Stat,
  Table,
  fdString,
  options,
  useData,
} from "./ui";
import { clock, dateThai, todayBangkok } from "@/lib/domain";
import { object, rows, str, num, type Row } from "@/lib/types";
import { CheckIn, Checkout } from "./worker";
export function DateFilters({
  start,
  end,
  setStart,
  setEnd,
}: {
  start: string;
  end: string;
  setStart: (v: string) => void;
  setEnd: (v: string) => void;
}) {
  return (
    <div className="date-filters">
      <label>
        ตั้งแต่
        <input
          aria-label="ตั้งแต่วันที่"
          type="date"
          value={start}
          onChange={(e) => setStart(e.target.value)}
        />
      </label>
      <span>—</span>
      <label>
        ถึง
        <input
          aria-label="ถึงวันที่"
          type="date"
          min={start}
          value={end}
          onChange={(e) => setEnd(e.target.value)}
        />
      </label>
    </div>
  );
}
export function Schedules({ worker = false }: { worker?: boolean }) {
  const { list } = useSession();
  const [start, setStart] = useState(todayBangkok());
  const [end, setEnd] = useState("");
  const [offset, setOffset] = useState(0);
  const [create, setCreate] = useState(false);
  const [selected, setSelected] = useState<Row | null>(null);
  const [action, setAction] = useState("");
  const resource = useData(
    (signal) =>
      list(
        `schedules?limit=50&offset=${offset}&period_start=${start}${end ? `&period_end=${end}` : ""}`,
        signal,
      ),
    [offset, start, end],
  );
  const done = () => {
    resource.refresh();
    setSelected(null);
  };
  return (
    <>
      <Heading
        eyebrow="SCHEDULE"
        title={worker ? "ตารางงานของฉัน" : "จัดตารางคนงาน"}
        description="กะละ 8 ชั่วโมงตามเวลาเริ่ม รองรับกะข้ามเที่ยงคืน"
        action={
          !worker && (
            <AddButton onClick={() => setCreate(true)}>จัดตารางงาน</AddButton>
          )
        }
      />
      <div className="toolbar">
        <DateFilters
          start={start}
          end={end}
          setStart={(v) => {
            setStart(v);
            setOffset(0);
          }}
          setEnd={(v) => {
            setEnd(v);
            setOffset(0);
          }}
        />
        <Button variant="secondary" onClick={resource.refresh}>
          <RefreshCw size={16} />
          รีเฟรช
        </Button>
      </div>
      <Resource {...resource} retry={resource.refresh}>
        {worker ? (
          <div className="schedule-cards">
            {resource.data?.length ? (
              resource.data.map((r) => (
                <ScheduleCard
                  key={str(r, "schedule_id")}
                  row={r}
                  onCheckIn={() => {
                    setSelected(r);
                    setAction("in");
                  }}
                  onCheckout={() => {
                    setSelected(r);
                    setAction("out");
                  }}
                />
              ))
            ) : (
              <Empty text="ยังไม่มีกะงานในช่วงที่เลือก" />
            )}
          </div>
        ) : (
          <Panel>
            <Table
              data={resource.data || []}
              columns={[
                { key: "work_date", label: "วันที่", format: "date" },
                { key: "location_name", label: "พื้นที่" },
                { key: "project_name", label: "โครงการ" },
                {
                  key: "first_name",
                  label: "พนักงาน",
                  format: (r) =>
                    `${str(r, "first_name")} ${str(r, "last_name")}`,
                },
                {
                  key: "shift_start_at",
                  label: "กะงาน",
                  format: (r) =>
                    `${clock(str(r, "shift_start_at"))}–${clock(str(r, "shift_end_at"))}`,
                },
                {
                  key: "shift_status",
                  label: "สถานะ",
                  format: (r) => <Badge value={r.shift_status || r.status} />,
                },
              ]}
            />
          </Panel>
        )}
        <Pager
          offset={offset}
          count={resource.data?.length || 0}
          onChange={setOffset}
        />
      </Resource>
      {create && (
        <ScheduleForm
          onDone={resource.refresh}
          onClose={() => setCreate(false)}
        />
      )}{" "}
      {selected &&
        (action === "in" ? (
          <CheckIn
            row={selected}
            onDone={done}
            onClose={() => setSelected(null)}
          />
        ) : (
          <Checkout
            row={selected}
            onDone={done}
            onClose={() => setSelected(null)}
          />
        ))}
    </>
  );
}
export function ScheduleCard({
  row,
  onCheckIn,
  onCheckout,
}: {
  row: Row;
  onCheckIn?: () => void;
  onCheckout?: () => void;
}) {
  const today = str(row, "work_date").slice(0, 10) === todayBangkok();
  const cancelled = row.shift_status === "cancelled";
  return (
    <section className="shift-card">
      <div className="shift-heading">
        <span className="eyebrow">{dateThai(str(row, "work_date"))}</span>
        <Badge value={row.shift_status || row.status} />
      </div>
      <h2>{str(row, "project_name")}</h2>
      <p>
        <MapPin size={16} />
        {str(row, "location_name")}
      </p>
      <div className="shift-time">
        <Clock size={18} />
        <strong>
          {clock(str(row, "shift_start_at"))}–{clock(str(row, "shift_end_at"))}
        </strong>
        <span>8 ชั่วโมง</span>
      </div>
      <small>{str(row, "address")}</small>
      {today && !cancelled && (
        <div className="shift-actions">
          <Button onClick={onCheckIn} disabled={!onCheckIn}>
            เช็คอิน
          </Button>
          <Button
            variant="secondary"
            onClick={onCheckout}
            disabled={!onCheckout}
          >
            ส่งผลงาน / เช็คเอาท์
          </Button>
        </div>
      )}
    </section>
  );
}
function ScheduleForm({
  onDone,
  onClose,
}: {
  onDone: () => void;
  onClose: () => void;
}) {
  const { list, api } = useSession();
  const [date, setDate] = useState(todayBangkok());
  const [assignment, setAssignment] = useState("");
  const areas = useData((signal) => list("assignments?limit=100", signal), []);
  const workers = useData(
    (signal) => list(`workers/available?work_date=${date}&limit=100`, signal),
    [date],
  );
  const [selected, setSelected] = useState<string[]>([]);
  const area = areas.data?.find((r) => str(r, "assignment_id") === assignment);
  return (
    <ActionForm
      title="จัดตารางงานใหม่"
      onClose={onClose}
      onDone={onDone}
      submit={(fd) => {
        if (!area?.can_schedule)
          throw new Error("พื้นที่นี้ยังไม่พร้อมจัดตารางงาน");
        if (selected.length < num(area, "required_workers"))
          throw new Error("จำนวนคนงานไม่ครบขั้นต่ำของพื้นที่");
        return api.post("schedules", {
          assignment_id: assignment,
          worker_ids: selected,
          work_date: date,
          shift_start_time: `${fdString(fd, "time")}:00`,
        });
      }}
    >
      <Field label="พื้นที่">
        <select
          aria-label="พื้นที่"
          required
          value={assignment}
          onChange={(e) => {
            setAssignment(e.target.value);
            setSelected([]);
          }}
        >
          <option value="">เลือกพื้นที่</option>
          {(areas.data || []).map((r) => (
            <option
              key={str(r, "assignment_id")}
              value={str(r, "assignment_id")}
              disabled={!r.can_schedule}
            >
              {str(r, "project_name")} · {str(r, "location_name")}
              {!r.can_schedule ? " (ยังไม่พร้อม)" : ""}
            </option>
          ))}
        </select>
      </Field>
      {areas.error && <ErrorBox error={areas.error} retry={areas.refresh} />}
      <div className="form-grid">
        <Field label="วันที่ทำงาน">
          <input
            type="date"
            required
            aria-label="วันที่ทำงาน"
            min={todayBangkok()}
            value={date}
            onChange={(e) => {
              setDate(e.target.value);
              setSelected([]);
            }}
          />
        </Field>
        <Inputs
          fields={[
            {
              name: "time",
              label: "เวลาเริ่มกะ",
              type: "time",
              value: "08:00",
            },
          ]}
        />
      </div>
      <p className="notice">
        ขั้นต่ำ {area ? num(area, "required_workers") : "—"} คน · เลือกแล้ว{" "}
        {selected.length} คน · กะสิ้นสุดหลังเริ่ม 8 ชั่วโมง
      </p>
      <Resource {...workers} retry={workers.refresh}>
        <div className="candidate-list">
          {workers.data?.map((r) => (
            <label key={str(r, "worker_id")}>
              <input
                type="checkbox"
                checked={selected.includes(str(r, "worker_id"))}
                onChange={(e) =>
                  setSelected((v) =>
                    e.target.checked
                      ? [...v, str(r, "worker_id")]
                      : v.filter((id) => id !== str(r, "worker_id")),
                  )
                }
              />
              <span className="avatar">{str(r, "first_name").slice(0, 1)}</span>
              <span>
                {str(r, "first_name")} {str(r, "last_name")}
              </span>
              <Badge value="active" />
            </label>
          ))}
          {!workers.data?.length && <Empty text="ไม่มีพนักงานว่างในวันนี้" />}
        </div>
      </Resource>
    </ActionForm>
  );
}
export function Leaves() {
  const { list } = useSession();
  const [status, setStatus] = useState("pending");
  const [offset, setOffset] = useState(0);
  const [selected, setSelected] = useState<Row | null>(null);
  const resource = useData(
    (signal) =>
      list(`leave-requests?status=${status}&limit=50&offset=${offset}`, signal),
    [status, offset],
  );
  return (
    <>
      <Heading
        eyebrow="LEAVE & REPLACEMENT"
        title="แจ้งลา / หาคนแทน"
        description="ผู้ดูแลงานพิจารณาคำขอลาและจัดคนแทนตามกะที่ได้รับผลกระทบ"
      />
      <div className="tabs">
        {[
          ["pending", "รอพิจารณา"],
          ["approved", "อนุมัติ"],
          ["rejected", "ไม่อนุมัติ"],
        ].map(([k, l]) => (
          <button
            key={k}
            className={status === k ? "active" : ""}
            onClick={() => {
              setStatus(k);
              setOffset(0);
            }}
          >
            {l}
          </button>
        ))}
      </div>
      <Panel>
        <Resource {...resource} retry={resource.refresh}>
          <Table
            data={resource.data || []}
            columns={[
              {
                key: "first_name",
                label: "พนักงาน",
                format: (r) => `${str(r, "first_name")} ${str(r, "last_name")}`,
              },
              { key: "leave_date", label: "วันที่ลา", format: "date" },
              { key: "reason", label: "เหตุผล" },
              { key: "status", label: "สถานะ", format: "status" },
            ]}
            onRow={setSelected}
          />
          <Pager
            offset={offset}
            count={resource.data?.length || 0}
            onChange={setOffset}
          />
        </Resource>
      </Panel>
      {selected && (
        <LeaveReview
          row={selected}
          onClose={() => setSelected(null)}
          onDone={resource.refresh}
        />
      )}
    </>
  );
}
function LeaveReview({
  row,
  onClose,
  onDone,
}: {
  row: Row;
  onClose: () => void;
  onDone: () => void;
}) {
  const { get, list, api } = useSession();
  const id = str(row, "request_id") || str(row, "leave_request_id");
  const resource = useData(
    async (signal) => ({
      detail: object(await get(`leave-requests/${id}`, signal)),
      candidates: await list(`leave-requests/${id}/candidates`, signal),
    }),
    [id],
  );
  const [decision, setDecision] = useState("approved");
  return (
    <ActionForm
      title="พิจารณาใบลาและจัดคนแทน"
      onClose={onClose}
      onDone={onDone}
      submit={(fd) =>
        row.status === "approved"
          ? api.post(`leave-requests/${id}/replacement`, {
              worker_id: fdString(fd, "worker"),
            })
          : api.post(`leave-requests/${id}/review`, {
              status: decision,
              ...(fdString(fd, "worker")
                ? { replacement_worker_id: fdString(fd, "worker") }
                : {}),
            })
      }
    >
      <div className="notice">
        {str(row, "first_name")} {str(row, "last_name")} ·{" "}
        {dateThai(str(row, "leave_date"))}
        <br />
        {str(row, "reason")}
      </div>
      <Resource {...resource} retry={resource.refresh}>
        <Table
          data={resource.data?.detail.schedule_id ? [resource.data.detail] : []}
          columns={[
            { key: "project_name", label: "โครงการ" },
            { key: "location_name", label: "พื้นที่" },
            { key: "shift_start_time", label: "เวลาเริ่ม" },
          ]}
        />
        {row.status === "pending" && (
          <Field label="ผลพิจารณา">
            <select
              aria-label="ผลพิจารณา"
              value={decision}
              onChange={(e) => setDecision(e.target.value)}
            >
              <option value="approved">อนุมัติ</option>
              <option value="rejected">ไม่อนุมัติ</option>
            </select>
          </Field>
        )}
        {(decision === "approved" || row.status === "approved") && (
          <Inputs
            fields={[
              {
                name: "worker",
                label: "พนักงานทำงานแทน",
                required: true,
                options: options(
                  resource.data?.candidates || [],
                  "worker_id",
                  "full_name",
                ),
              },
            ]}
          />
        )}
        <p className="muted">
          ระบบตรวจพนักงานว่างซ้ำเมื่อบันทึก ผู้ลาจะไม่อยู่ในรายชื่อคนแทน
        </p>
      </Resource>
      {row.status === "rejected" && (
        <p className="notice">
          ใบลานี้ถูกปฏิเสธแล้ว การบันทึกซ้ำจะถูก Backend ปฏิเสธ
        </p>
      )}
    </ActionForm>
  );
}
export function Attendance() {
  const { list, api } = useSession();
  const [start, setStart] = useState(todayBangkok());
  const [end, setEnd] = useState(todayBangkok());
  const [offset, setOffset] = useState(0);
  const [process, setProcess] = useState(false);
  const resource = useData(
    (signal) =>
      list(
        `attendance?period_start=${start}&period_end=${end}&limit=50&offset=${offset}`,
        signal,
      ),
    [start, end, offset],
  );
  return (
    <>
      <Heading
        title="การเข้างาน"
        description="สถานะจากเวลาบน Server และหลักฐาน GPS + QR"
        action={
          <Button onClick={() => setProcess(true)}>ประมวลผลขาดงาน</Button>
        }
      />
      <DateFilters
        start={start}
        end={end}
        setStart={(v) => {
          setStart(v);
          setOffset(0);
        }}
        setEnd={(v) => {
          setEnd(v);
          setOffset(0);
        }}
      />
      <Panel>
        <Resource {...resource} retry={resource.refresh}>
          <Table
            data={resource.data || []}
            columns={[
              { key: "work_date", label: "วันที่", format: "date" },
              {
                key: "first_name",
                label: "พนักงาน",
                format: (r) => `${str(r, "first_name")} ${str(r, "last_name")}`,
              },
              { key: "location_name", label: "พื้นที่" },
              {
                key: "check_in",
                label: "เช็คอิน",
                format: (r) => clock(str(r, "check_in")),
              },
              { key: "status", label: "สถานะ", format: "status" },
              { key: "late_minutes", label: "สายนาที" },
            ]}
          />
          <Pager
            offset={offset}
            count={resource.data?.length || 0}
            onChange={setOffset}
          />
        </Resource>
      </Panel>
      <Panel title="กติกาเงินหัก">
        <div className="rules-grid">
          <span>
            ตรงเวลา <strong>ไม่หัก</strong>
          </span>
          <span>
            สาย &lt;60 นาที <strong>300 บาท</strong>
          </span>
          <span>
            สาย 60–180 นาที <strong>400 บาท</strong>
          </span>
          <span>
            สาย &gt;180 นาที / ขาด <strong>1,500 บาท</strong>
          </span>
        </div>
        <p className="muted">
          ประมวลผลขาดหลังสิ้นกะ +2 ชั่วโมง
          การลาล่วงหน้าที่อนุมัติเท่านั้นได้รับยกเว้นตามกติกา Backend
        </p>
      </Panel>
      {process && (
        <ActionForm
          title="ยืนยันประมวลผลสถานะขาดงาน"
          onClose={() => setProcess(false)}
          onDone={resource.refresh}
          submit={() => api.post("attendance/finalize")}
        >
          <p>
            ประมวลผลกะที่ผ่านเวลาสิ้นสุด +2 ชั่วโมงแล้ว
            ระบบไม่ประมวลผลกะที่ยังไม่ถึงกำหนด
          </p>
        </ActionForm>
      )}
    </>
  );
}
export function Operations() {
  const { list, get } = useSession();
  const query =
    typeof window !== "undefined"
      ? new URLSearchParams(window.location.search)
      : new URLSearchParams();
  const [start, setStart] = useState(
    query.get("period_start") || todayBangkok().slice(0, 8) + "01",
  );
  const [end, setEnd] = useState(query.get("period_end") || todayBangkok());
  const [id, setID] = useState("");
  const areas = useData(
    (signal) =>
      list(
        `assignments?limit=100${query.get("tor_id") ? `&tor_id=${query.get("tor_id")}` : ""}`,
        signal,
      ),
    [query.get("tor_id")],
  );
  const resource = useData(
    (signal) =>
      id
        ? get(
            `assignments/${id}/operations-summary?period_start=${start}&period_end=${end}`,
            signal,
          )
        : Promise.resolve(null),
    [id, start, end],
  );
  const report = object(resource.data);
  const attendance = object(report.attendance);
  return (
    <>
      <Heading
        eyebrow="OPERATIONAL REPORT · 9A"
        title="สรุปการดำเนินงาน"
        description="ข้อมูลปัจจุบันตามรอบที่เลือก ไม่เก็บประวัติการส่งหรือการอ่าน"
      />
      <div className="toolbar">
        <Field label="พื้นที่">
          <select
            aria-label="พื้นที่รายงาน"
            value={id}
            onChange={(e) => setID(e.target.value)}
          >
            <option value="">เลือกพื้นที่</option>
            {areas.data?.map((r) => (
              <option
                key={str(r, "assignment_id")}
                value={str(r, "assignment_id")}
              >
                {str(r, "project_name")} · {str(r, "location_name")}
              </option>
            ))}
          </select>
        </Field>
        <DateFilters
          start={start}
          end={end}
          setStart={setStart}
          setEnd={setEnd}
        />
      </div>
      {areas.error && <ErrorBox error={areas.error} retry={areas.refresh} />}
      <Resource {...resource} retry={resource.refresh}>
        {!id ? (
          <Panel>
            <Empty text="เลือกพื้นที่เพื่อดูผลสรุป" />
          </Panel>
        ) : !report.has_data ? (
          <Panel>
            <Empty
              text={
                str(report, "summary_notice") ||
                "ยังไม่มีข้อมูลสรุปสำหรับรอบนี้"
              }
            />
            {report.can_continue === false && (
              <p className="error-box">{str(report, "continuation_notice")}</p>
            )}
          </Panel>
        ) : (
          <>
            {report.can_continue === false && (
              <p role="alert" className="error-box">
                {str(report, "continuation_notice")}
              </p>
            )}
            <div className="stats-grid">
              {[
                ["on_time", "เข้างานตรงเวลา"],
                ["late", "สาย"],
                ["absent", "ขาดงาน"],
                ["leave", "ลา"],
              ].map(([k, l]) => (
                <Stat key={k} label={l} value={num(attendance, k)} />
              ))}
            </div>
            <p className="notice">
              รอยืนยันการเข้างาน {num(attendance, "awaiting_attendance")} กะ —
              ยังไม่นับเป็นขาดงาน
            </p>
            <Panel title="ความคืบหน้าอุปกรณ์">
              <Table
                data={rows(report.procurement)}
                columns={[
                  { key: "status", label: "สถานะ", format: "status" },
                  { key: "request_count", label: "คำขอ" },
                  { key: "required_qty", label: "ต้องการ" },
                  { key: "existing_qty", label: "มีอยู่" },
                  { key: "acquired_qty", label: "ซื้อแล้วสะสม" },
                  { key: "remaining_qty", label: "ขาด" },
                ]}
              />
            </Panel>
          </>
        )}
      </Resource>
    </>
  );
}
export function StaffQR() {
  const { list, api } = useSession();
  const areas = useData((signal) => list("assignments?limit=100", signal), []);
  const [id, setID] = useState("");
  const [token, setToken] = useState("");
  const [expires, setExpires] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, []);
  const remaining = Math.max(0, Math.ceil((Date.parse(expires) - now) / 1000));
  const expired = !!token && (!Number.isFinite(remaining) || remaining === 0);
  return (
    <>
      <Heading
        title="QR เช็คอินพื้นที่"
        description="QR ลงนามโดย Backend มีอายุ 60 วินาที พนักงานต้องผ่าน GPS ด้วย"
      />
      <Panel>
        <Field label="พื้นที่">
          <select
            aria-label="พื้นที่ QR"
            value={id}
            onChange={(e) => {
              setID(e.target.value);
              setToken("");
            }}
          >
            <option value="">เลือกพื้นที่</option>
            {areas.data?.map((r) => (
              <option
                key={str(r, "assignment_id")}
                value={str(r, "assignment_id")}
              >
                {str(r, "project_name")} · {str(r, "location_name")}
              </option>
            ))}
          </select>
        </Field>
        <Button
          disabled={!id || busy}
          onClick={async () => {
            setBusy(true);
            setError("");
            try {
              const value = object(await api.post(`assignments/${id}/qr`));
              setToken(str(value, "qr_token"));
              setExpires(str(value, "expires_at"));
            } catch (e) {
              setError(e instanceof Error ? e.message : "สร้าง QR ไม่สำเร็จ");
            } finally {
              setBusy(false);
            }
          }}
        >
          <QrCode size={18} /> {token ? "สร้าง QR ใหม่" : "สร้าง QR"}
        </Button>
        {areas.error && <ErrorBox error={areas.error} retry={areas.refresh} />}{" "}
        {error && <ErrorBox error={error} />}{" "}
        {token && (
          <div className="qr-output">
            {expired ? (
              <p role="alert" className="error-box">
                QR หมดอายุแล้ว กรุณากดสร้าง QR ใหม่
              </p>
            ) : (
              <QRCodeSVG value={token} size={260} level="M" />
            )}
            {!expired && <strong>เหลือ {remaining} วินาที</strong>}
            <p>หมดอายุ {clock(expires)} น.</p>
            <small>เมื่อหมดอายุ ให้กดสร้าง QR ใหม่</small>
          </div>
        )}
      </Panel>
    </>
  );
}
