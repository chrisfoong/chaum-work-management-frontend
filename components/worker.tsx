"use client";
import { useEffect, useRef, useState } from "react";
import {
  CalendarDays,
  Camera,
  Check,
  MapPin,
  Package,
  QrCode,
  ShieldCheck,
  Wallet,
} from "lucide-react";
import { useSession } from "./auth";
import {
  ActionForm,
  Badge,
  Button,
  Empty,
  ErrorBox,
  Field,
  Heading,
  Inputs,
  Modal,
  Panel,
  Resource,
  Table,
  fdString,
  fileFrom,
  useData,
} from "./ui";
import { ScheduleCard } from "./schedule";
import {
  clock,
  dateThai,
  distanceMeters,
  money,
  safeQR,
  todayBangkok,
} from "@/lib/domain";
import { rows, str, type Row } from "@/lib/types";
export function WorkerHome({
  navigate,
}: {
  navigate: (s: "schedule" | "payroll") => void;
}) {
  const { user, list } = useSession();
  const resource = useData(
    async (signal) => ({
      schedules: await list(
        `schedules?period_start=${todayBangkok()}&period_end=${todayBangkok()}&limit=50`,
        signal,
      ),
      attendance: await list(
        `attendance?period_start=${todayBangkok()}&period_end=${todayBangkok()}&limit=50`,
        signal,
      ),
    }),
    [],
  );
  const [action, setAction] = useState("");
  const [selected, setSelected] = useState<Row | null>(null);
  const done = () => {
    resource.refresh();
    setSelected(null);
    setAction("");
  };
  return (
    <>
      <div className="worker-greeting">
        <span>{dateThai(todayBangkok(), true)}</span>
        <h1>สวัสดี {user.first_name} 🌿</h1>
        <p>พร้อมดูแลพื้นที่สีเขียววันนี้แล้วหรือยัง?</p>
      </div>
      <Resource {...resource} retry={resource.refresh}>
        {resource.data?.schedules.length ? (
          resource.data.schedules.map((r) => {
            const att = resource.data?.attendance.find(
              (a) => a.schedule_id === r.schedule_id,
            );
            return (
              <div key={str(r, "schedule_id")}>
                <div className="map-preview">
                  <MapPin size={34} />
                  <span>{str(r, "location_name")}</span>
                  <small>พิกัดจริงตรวจเมื่อเช็คอิน</small>
                </div>
                <ScheduleCard
                  row={r}
                  onCheckIn={
                    att?.check_in
                      ? undefined
                      : () => {
                          setSelected(r);
                          setAction("in");
                        }
                  }
                  onCheckout={
                    !att?.check_in || att?.check_out
                      ? undefined
                      : () => {
                          setSelected(r);
                          setAction("out");
                        }
                  }
                />
                {att && (
                  <div className="notice">
                    สถานะวันนี้ <Badge value={att.status} /> · เช็คอิน{" "}
                    {clock(str(att, "check_in"))}
                  </div>
                )}
              </div>
            );
          })
        ) : (
          <Panel>
            <Empty
              text="วันนี้ยังไม่มีกะงาน"
              detail="ตรวจสอบกะถัดไปในตารางงานของคุณ"
            />
          </Panel>
        )}
      </Resource>
      <div className="worker-shortcuts">
        <button onClick={() => setAction("leave")}>
          <CalendarDays />
          <strong>แจ้งลา</strong>
          <small>ระบุวันและเหตุผล</small>
        </button>
        <button onClick={() => setAction("shortage")}>
          <Package />
          <strong>อุปกรณ์ไม่พอ</strong>
          <small>แจ้งผู้ดูแลงาน</small>
        </button>
      </div>
      <Panel title="งานและค่าจ้างของฉัน">
        <div className="worker-links">
          <button onClick={() => navigate("schedule")}>
            <CalendarDays size={19} />
            <span>ดูตารางงานทั้งหมด</span>→
          </button>
          <button onClick={() => navigate("payroll")}>
            <Wallet size={19} />
            <span>ดูสลิปค่าจ้าง</span>→
          </button>
        </div>
      </Panel>
      <p className="worker-note">
        <ShieldCheck size={16} /> เช็คอินต้องผ่านทั้ง GPS ในระยะ 200 เมตร และ QR
        ของพื้นที่
      </p>
      {action === "leave" && (
        <WorkerLeave onClose={() => setAction("")} onDone={done} />
      )}{" "}
      {action === "shortage" && (
        <Shortage onClose={() => setAction("")} onDone={done} />
      )}{" "}
      {selected &&
        (action === "in" ? (
          <CheckIn
            row={selected}
            onClose={() => setSelected(null)}
            onDone={done}
          />
        ) : (
          <Checkout
            row={selected}
            onClose={() => setSelected(null)}
            onDone={done}
          />
        ))}
    </>
  );
}
export function CheckIn({
  row,
  onClose,
  onDone,
}: {
  row: Row;
  onClose: () => void;
  onDone: () => void;
}) {
  const { api } = useSession();
  const [position, setPosition] = useState<GeolocationCoordinates | null>(null);
  const [qr, setQR] = useState("");
  const [error, setError] = useState("");
  const [gpsBusy, setGPSBusy] = useState(false);
  const [scanning, setScanning] = useState(false);
  const video = useRef<HTMLVideoElement>(null);
  const controls = useRef<{ stop: () => void } | null>(null);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [expires, setExpires] = useState<number | null>(null);
  const [tick, setTick] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setTick(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);
  useEffect(() => {
    if (!scanning) return;
    let active = true;
    const element = video.current;
    (async () => {
      if (!element) return;
      const { BrowserQRCodeReader } = await import("@zxing/browser");
      const reader = new BrowserQRCodeReader();
      const control = await reader.decodeFromVideoDevice(
        undefined,
        element,
        (result) => {
          if (result && active) {
            try {
              setQR(safeQR(result.getText()));
              setExpires(Date.now() + 60000);
              setScanning(false);
            } catch (e) {
              setError(e instanceof Error ? e.message : "อ่าน QR ไม่สำเร็จ");
            }
          }
        },
      );
      if (active) controls.current = control;
      else control.stop();
    })().catch(() => {
      if (active) {
        setError("เปิดกล้องไม่ได้ กรุณาอนุญาตกล้องหรือวาง QR ที่ได้รับ");
        setScanning(false);
      }
    });
    return () => {
      active = false;
      controls.current?.stop();
      controls.current = null;
      const stream = element?.srcObject;
      if (stream instanceof MediaStream)
        stream.getTracks().forEach((t) => t.stop());
    };
  }, [scanning]);
  const lat = str(row, "latitude"),
    lng = str(row, "longitude");
  const distance =
    position && lat !== "" && lng !== ""
      ? distanceMeters(
          position.latitude,
          position.longitude,
          Number(lat),
          Number(lng),
        )
      : null;
  const ready = !!position && !!qr && (!expires || expires > tick);
  return (
    <Modal title="ยืนยันและเช็คอิน" onClose={onClose} busy={busy}>
      {done ? (
        <div className="success">
          <Check size={42} />
          <h3>เช็คอินเรียบร้อยแล้ว</h3>
          <p>บันทึกเวลาจาก Server แล้ว</p>
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
        <>
          <div className="notice">
            {str(row, "location_name")} · {clock(str(row, "shift_start_at"))}–
            {clock(str(row, "shift_end_at"))}
          </div>
          <div className="check-step">
            <span className={`step-icon ${position ? "complete" : ""}`}>
              <MapPin />
            </span>
            <div>
              <h3>1. ตรวจสอบ GPS</h3>
              <p>
                {position
                  ? `ความแม่นยำ ±${Math.round(position.accuracy)} เมตร${distance === null ? "" : ` · ห่างพื้นที่ ${Math.round(distance)} เมตร`}`
                  : "ต้องอยู่ในรัศมี 200 เมตรจากพื้นที่ TOR"}
              </p>
            </div>
          </div>
          <Button
            variant="secondary"
            disabled={gpsBusy || busy}
            onClick={() => {
              if (!navigator.geolocation) {
                setError("อุปกรณ์นี้ไม่รองรับ GPS");
                return;
              }
              setGPSBusy(true);
              setError("");
              navigator.geolocation.getCurrentPosition(
                (p) => {
                  setPosition(p.coords);
                  setGPSBusy(false);
                },
                () => {
                  setError(
                    "อ่าน GPS ไม่ได้ กรุณาเปิดตำแหน่งและอนุญาตเบราว์เซอร์",
                  );
                  setGPSBusy(false);
                },
                { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 },
              );
            }}
          >
            {gpsBusy
              ? "กำลังอ่านพิกัด…"
              : position
                ? "อ่าน GPS ใหม่"
                : "ตรวจสอบตำแหน่ง"}
          </Button>
          {distance !== null && distance > 200 && (
            <p className="error-box">
              พิกัดอยู่นอกรัศมี 200 เมตร กรุณาเข้าใกล้พื้นที่และอ่านใหม่
            </p>
          )}
          <div className="check-step">
            <span className={`step-icon ${qr ? "complete" : ""}`}>
              <QrCode />
            </span>
            <div>
              <h3>2. สแกน QR ของพื้นที่</h3>
              <p>
                {qr
                  ? "ได้รับ QR แล้ว ระบบจะตรวจลายเซ็น พื้นที่ และเวลาหมดอายุ"
                  : "ขอ QR ปัจจุบันจากผู้ดูแลงาน"}
              </p>
            </div>
          </div>
          {scanning ? (
            <>
              <video
                ref={video}
                autoPlay
                muted
                playsInline
                className="scanner-video"
              />
              <Button variant="secondary" onClick={() => setScanning(false)}>
                หยุดกล้อง
              </Button>
            </>
          ) : (
            <Button
              variant="secondary"
              onClick={() => setScanning(true)}
              disabled={busy}
            >
              <Camera size={18} />
              เปิดกล้องสแกน QR
            </Button>
          )}
          <Field label="หรือวางรหัส QR ที่ได้รับ">
            <input
              aria-label="รหัส QR"
              value={qr}
              maxLength={2048}
              onChange={(e) => {
                setQR(e.target.value);
                setExpires(null);
              }}
              autoComplete="off"
              spellCheck={false}
            />
          </Field>
          {expires && expires <= tick && (
            <p className="error-box">QR อาจหมดอายุแล้ว กรุณาสแกนใหม่</p>
          )}
          {error && <ErrorBox error={error} />}
          <div className="modal-footer">
            <Button
              onClick={async () => {
                setBusy(true);
                setError("");
                try {
                  if (!position) throw new Error("กรุณาตรวจ GPS");
                  await api.post("attendance/check-in", {
                    schedule_id: str(row, "schedule_id"),
                    latitude: position.latitude,
                    longitude: position.longitude,
                    accuracy_m: position.accuracy,
                    qr_token: safeQR(qr),
                  });
                  setDone(true);
                } catch (e) {
                  setError(e instanceof Error ? e.message : "เช็คอินไม่สำเร็จ");
                } finally {
                  setBusy(false);
                }
              }}
              disabled={!ready || busy || (distance !== null && distance > 200)}
            >
              {busy ? "กำลังเช็คอิน…" : "ยืนยัน GPS + QR และเช็คอิน"}
            </Button>
          </div>
          <p className="muted">
            เวลาทำงานใช้ Server ในเขต Asia/Bangkok
            การตรวจพิกัดบนหน้านี้เป็นข้อมูลเบื้องต้น
          </p>
        </>
      )}
    </Modal>
  );
}
export function Checkout({
  row,
  onClose,
  onDone,
}: {
  row: Row;
  onClose: () => void;
  onDone: () => void;
}) {
  const { api } = useSession();
  return (
    <ActionForm
      title="ส่งผลงานและเช็คเอาท์"
      onClose={onClose}
      onDone={onDone}
      submit={async (fd) => {
        const photo = await fileFrom(fd, "photo", api);
        return api.post("attendance/check-out", {
          schedule_id: str(row, "schedule_id"),
          description: fdString(fd, "description"),
          photo_path: photo,
        });
      }}
    >
      <p>
        {str(row, "project_name")} · {str(row, "location_name")}
      </p>
      <Inputs
        fields={[
          {
            name: "description",
            label: "รายละเอียดงานที่ทำ",
            type: "textarea",
            maxLength: 1000,
          },
        ]}
      />
      <Field label="รูปผลงาน JPG / PNG ≤5 MB">
        <input
          name="photo"
          aria-label="รูปผลงาน"
          type="file"
          accept="image/jpeg,image/png"
          capture="environment"
          required
        />
      </Field>
      <p className="notice">
        ระบบบันทึกเวลาจบงานจาก Server ต้องเช็คอินก่อนส่งผลงาน
      </p>
    </ActionForm>
  );
}
function WorkerLeave({
  onClose,
  onDone,
}: {
  onClose: () => void;
  onDone: () => void;
}) {
  const { api, list } = useSession();
  const resource = useData((signal) => list("schedules?limit=100", signal), []);
  const dates = [
    ...new Set(
      (resource.data || [])
        .filter((r) => r.shift_status !== "cancelled")
        .map((r) => str(r, "work_date").slice(0, 10)),
    ),
  ];
  return (
    <ActionForm
      title="แจ้งลา"
      onClose={onClose}
      onDone={onDone}
      submit={(fd) =>
        api.post("leave-requests", {
          leave_date: fdString(fd, "date"),
          reason: fdString(fd, "reason"),
        })
      }
    >
      <Resource {...resource} retry={resource.refresh}>
        <Inputs
          fields={[
            {
              name: "date",
              label: "วันที่มีกะงาน",
              options: dates.map((d) => ({ value: d, label: dateThai(d) })),
            },
            {
              name: "reason",
              label: "เหตุผลการลา",
              type: "textarea",
              maxLength: 500,
            },
          ]}
        />
      </Resource>
      <p className="notice">
        วันอนาคตเป็นลาล่วงหน้า วันปัจจุบันเป็นลาฉุกเฉิน
        ผู้ดูแลงานจะพิจารณาและจัดคนแทน
      </p>
    </ActionForm>
  );
}
function Shortage({
  onClose,
  onDone,
}: {
  onClose: () => void;
  onDone: () => void;
}) {
  const { api, list } = useSession();
  const resource = useData(
    async (signal) => ({
      equipment: await list("equipment?limit=100", signal),
      schedules: await list(
        `schedules?period_start=${todayBangkok()}&period_end=${todayBangkok()}&limit=50`,
        signal,
      ),
    }),
    [],
  );
  const [items, setItems] = useState([{ key: 1, equipment: "", qty: "1" }]);
  return (
    <ActionForm
      title="แจ้งอุปกรณ์ไม่พอ"
      onClose={onClose}
      onDone={onDone}
      submit={(fd) => {
        const selected = new Set(items.map((i) => i.equipment));
        if (selected.size !== items.length)
          throw new Error("กรุณาเลือกอุปกรณ์แต่ละชนิดเพียงครั้งเดียว");
        return api.post("requisitions", {
          assignment_id: fdString(fd, "assignment"),
          reason: fdString(fd, "reason"),
          items: items.map((i) => ({
            equipment_id: i.equipment,
            required_qty: Number(i.qty),
            remark: "",
          })),
        });
      }}
    >
      <Resource {...resource} retry={resource.refresh}>
        <Inputs
          fields={[
            {
              name: "assignment",
              label: "พื้นที่กะวันนี้",
              options: [
                ...new Map(
                  (resource.data?.schedules || []).map((r) => [
                    str(r, "assignment_id"),
                    {
                      value: str(r, "assignment_id"),
                      label: str(r, "location_name"),
                    },
                  ]),
                ).values(),
              ],
            },
          ]}
        />
        {items.map((it, index) => (
          <div className="item-editor" key={it.key}>
            <select
              aria-label={`อุปกรณ์ ${index + 1}`}
              required
              value={it.equipment}
              onChange={(e) =>
                setItems((v) =>
                  v.map((r, i) =>
                    i === index ? { ...r, equipment: e.target.value } : r,
                  ),
                )
              }
            >
              <option value="">เลือกอุปกรณ์</option>
              {resource.data?.equipment
                .filter((r) => r.is_active !== false)
                .map((r) => (
                  <option
                    key={str(r, "equipment_id")}
                    value={str(r, "equipment_id")}
                  >
                    {str(r, "equipment_name")}
                  </option>
                ))}
            </select>
            <input
              aria-label={`จำนวน ${index + 1}`}
              type="number"
              min="1"
              max="1000000"
              required
              value={it.qty}
              onChange={(e) =>
                setItems((v) =>
                  v.map((r, i) =>
                    i === index ? { ...r, qty: e.target.value } : r,
                  ),
                )
              }
            />
            {items.length > 1 && (
              <button
                type="button"
                aria-label="ลบรายการ"
                onClick={() => setItems((v) => v.filter((_, i) => i !== index))}
              >
                ×
              </button>
            )}
          </div>
        ))}
        <Button
          variant="secondary"
          onClick={() =>
            setItems((v) => [
              ...v,
              { key: Date.now(), equipment: "", qty: "1" },
            ])
          }
        >
          + เพิ่มอุปกรณ์
        </Button>
        <Inputs
          fields={[
            {
              name: "reason",
              label: "เหตุผลความจำเป็น",
              type: "textarea",
              maxLength: 500,
            },
          ]}
        />
      </Resource>
      <p className="notice">
        ต้องเช็คอินในพื้นที่ก่อนส่งคำขอ ผลพิจารณาจะแจ้งผ่าน LINE Chat
      </p>
    </ActionForm>
  );
}
export function WorkerPayslips() {
  const { list } = useSession();
  const [month, setMonth] = useState(todayBangkok().slice(0, 7));
  const resource = useData(
    (signal) => list(`payroll?period_month=${month}&limit=100`, signal),
    [month],
  );
  return (
    <>
      <Heading
        eyebrow="DIGITAL PAYSLIP"
        title="ค่าจ้างของฉัน"
        description="แสดงเฉพาะสลิปของคุณที่ยืนยันจ่ายแล้ว"
      />
      <Field label="เดือน">
        <input
          aria-label="เดือนสลิป"
          type="month"
          value={month}
          onChange={(e) => {
            if (e.target.value) setMonth(e.target.value);
          }}
        />
      </Field>
      <Resource {...resource} retry={resource.refresh}>
        {resource.data?.length ? (
          resource.data.map((r) => (
            <Panel
              key={str(r, "payroll_id")}
              title={`${dateThai(str(r, "period_start"))} – ${dateThai(str(r, "period_end"))}`}
              action={<Badge value="completed" />}
            >
              <div className="payslip-lines">
                <span>
                  รายรับค่าจ้าง<strong>{money(str(r, "base_wage"))}</strong>
                </span>
                <span>
                  เงินหักจริง<strong>{money(str(r, "total_deduction"))}</strong>
                </span>
                <span className="net">
                  ยอดรับสุทธิ<strong>{money(str(r, "net_wage"))}</strong>
                </span>
              </div>
              <Table
                data={rows(r.deductions || r.calculated_penalties)}
                columns={[
                  { key: "work_date", label: "วันที่", format: "date" },
                  { key: "reason", label: "เหตุผล" },
                  { key: "penalty_amount", label: "เงินหัก", format: "money" },
                ]}
              />
            </Panel>
          ))
        ) : (
          <Panel>
            <Empty text="ยังไม่มีสลิปที่จ่ายแล้วในเดือนนี้" />
          </Panel>
        )}
      </Resource>
    </>
  );
}
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
