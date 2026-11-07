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
import {
  equipmentOptions,
  canAddEquipment,
  checkoutTimeReached,
} from "@/lib/worker-actions";
import { eligibleLeaveDates, leaveForSchedule } from "@/lib/leave";
import { gpsProblem, qrExpiry } from "@/lib/attendance";
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
import { ScheduleCard } from "./schedule-card";
import { useCurrentTime } from "@/lib/use-current-time";
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
        `schedules?period_end=${todayBangkok()}&limit=100`,
        signal,
      ),
      leaves: await list(
        `leave-requests?period_start=${todayBangkok(new Date(Date.now() - 86400000))}&period_end=${todayBangkok()}&limit=100`,
        signal,
      ),
      attendance: await list(
        `attendance?period_start=${todayBangkok(new Date(Date.now() - 86400000))}&period_end=${todayBangkok()}&limit=100`,
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
        <h1>สวัสดี {user.first_name}</h1>
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
                <ScheduleCard
                  row={r}
                  attendance={att}
                  leave={leaveForSchedule(r, resource.data?.leaves || [])}
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
                    สถานะวันนี้ <Badge value={att.status} /> · เช็กอิน{" "}
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
        <ShieldCheck size={16} /> เช็กอินต้องผ่านทั้ง GPS ในระยะ 200 เมตร และ QR
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
              setExpires(qrExpiry(result.getText()));
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
  const gpsError = gpsProblem(position, lat, lng);
  const ready = !gpsError && !!qr && (!expires || expires > tick);
  return (
    <Modal title="ยืนยันและเช็กอิน" onClose={onClose} busy={busy}>
      {done ? (
        <div className="success">
          <Check size={42} />
          <h3>เช็กอินเรียบร้อยแล้ว</h3>
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
          {position && gpsError && (
            <p role="alert" className="error-box">
              {gpsError}
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
                  ? "ได้รับ QR แล้ว ระบบจะตรวจลายเซ็น พื้นที่ กะงาน และ GPS"
                  : "สแกนป้าย QR ที่ติดไว้ในพื้นที่ปฏิบัติงาน"}
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
                setExpires(qrExpiry(e.target.value));
              }}
              autoComplete="off"
              spellCheck={false}
            />
          </Field>
          {expires && expires <= tick && (
            <p className="error-box">
              QR รุ่นเดิมหมดอายุแล้ว กรุณาสแกนป้าย QR ประจำพื้นที่
            </p>
          )}
          {error && <ErrorBox error={error} />}
          <div className="modal-footer">
            <Button
              onClick={async () => {
                setBusy(true);
                setError("");
                try {
                  if (!position || gpsError)
                    throw new Error(gpsError || "กรุณาตรวจ GPS");
                  if (expires !== null && expires <= Date.now())
                    throw new Error(
                      "QR รุ่นเดิมหมดอายุแล้ว กรุณาสแกนป้าย QR ประจำพื้นที่",
                    );
                  await api.post("attendance/check-in", {
                    schedule_id: str(row, "schedule_id"),
                    latitude: position.latitude,
                    longitude: position.longitude,
                    accuracy_m: position.accuracy,
                    qr_token: safeQR(qr),
                  });
                  setDone(true);
                } catch (e) {
                  setError(e instanceof Error ? e.message : "เช็กอินไม่สำเร็จ");
                } finally {
                  setBusy(false);
                }
              }}
              disabled={!ready || busy || (distance !== null && distance > 200)}
            >
              {busy ? "กำลังเช็กอิน…" : "ยืนยัน GPS + QR และเช็กอิน"}
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
  const now = useCurrentTime();
  const timeReached = checkoutTimeReached(row, now);
  return (
    <ActionForm
      title="ส่งผลงานและเช็กเอาท์"
      onClose={onClose}
      onDone={onDone}
      submitDisabled={!timeReached}
      submit={async (fd) => {
        if (!checkoutTimeReached(row, Date.now()))
          throw new Error("ยังไม่ถึงเวลาจบกะ กรุณาเช็กเอาท์ตามเวลาที่แสดง");
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
      {!timeReached && (
        <p className="notice" role="alert">
          ยังไม่ถึงเวลาจบกะ เช็กเอาท์ได้เวลา {clock(str(row, "shift_end_at"))} ·{" "}
          {dateThai(str(row, "shift_end_at"))}
        </p>
      )}
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
        ระบบบันทึกเวลาจบงานจาก Server ต้องเช็กอินก่อนส่งผลงาน
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
  const resource = useData(async (signal) => {
    const [schedules, leaves] = await Promise.all([
      list("schedules?limit=100", signal),
      list(`leave-requests?period_start=${todayBangkok()}&limit=100`, signal),
    ]);
    return { schedules, leaves };
  }, []);
  const dates = eligibleLeaveDates(
    resource.data?.schedules || [],
    resource.data?.leaves || [],
    todayBangkok(),
  );

  return (
    <ActionForm
      title="แจ้งลา"
      onClose={onClose}
      onDone={onDone}
      submitDisabled={!resource.data || dates.length === 0}
      submit={async (fd) => {
        const date = fdString(fd, "date");
        if (!dates.includes(date))
          throw new Error("วันที่นี้ยื่นใบลาแล้ว หรือไม่มีกะงานที่แจ้งลาได้");
        try {
          return await api.post("leave-requests", {
            leave_date: date,
            reason: fdString(fd, "reason"),
          });
        } catch (error) {
          if (
            error instanceof Error &&
            error.message.includes("leave already exists for date")
          ) {
            resource.refresh();
            throw new Error("คุณยื่นใบลาสำหรับวันนี้แล้ว ไม่สามารถยื่นซ้ำได้");
          }
          throw error;
        }
      }}
    >
      <Resource {...resource} retry={resource.refresh}>
        {dates.length > 0 ? (
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
        ) : (
          <Empty
            text="ไม่มีกะงานที่แจ้งลาได้"
            detail="วันที่ยื่นใบลาแล้วจะไม่แสดงให้ยื่นซ้ำ แม้คำขอถูกปฏิเสธ"
          />
        )}
        {resource.data?.leaves.length ? (
          <div className="notice">
            <strong>ใบลาที่ส่งแล้ว</strong>
            {resource.data.leaves.map((leave) => (
              <p key={str(leave, "request_id")}>
                {dateThai(str(leave, "leave_date"))} ·{" "}
                <Badge value={leave.status} />
              </p>
            ))}
          </div>
        ) : null}
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
      schedules: await list(
        `schedules?period_start=${todayBangkok()}&period_end=${todayBangkok()}&limit=50`,
        signal,
      ),
    }),
    [],
  );
  const [items, setItems] = useState([{ key: 1, equipment: "", qty: "1" }]);
  const [selectedAssignment, setSelectedAssignment] = useState("");
  const assignment =
    selectedAssignment || str(resource.data?.schedules[0], "assignment_id");
  const equipment = useData(
    async (signal) => ({
      assignment,
      items: assignment
        ? await list(`equipment?assignment_id=${assignment}&limit=100`, signal)
        : [],
    }),
    [assignment],
  );
  const available =
    equipment.data?.assignment === assignment ? equipment.data.items : [];

  return (
    <ActionForm
      title="แจ้งอุปกรณ์ไม่พอ"
      onClose={onClose}
      onDone={onDone}
      submitDisabled={
        !assignment ||
        equipment.loading ||
        !!equipment.error ||
        available.length === 0
      }
      submit={(fd) => {
        if (
          equipment.loading ||
          equipment.error ||
          items.some(
            (item) =>
              !available.some(
                (row) => str(row, "equipment_id") === item.equipment,
              ),
          )
        )
          throw new Error("กรุณาเลือกอุปกรณ์ใน TOR ของพื้นที่นี้");
        const selected = new Set(items.map((i) => i.equipment));
        if (selected.size !== items.length)
          throw new Error("กรุณาเลือกอุปกรณ์แต่ละชนิดเพียงครั้งเดียว");
        return api.post("requisitions", {
          assignment_id: assignment,
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
        <Field label="พื้นที่กะวันนี้">
          <select
            name="assignment"
            aria-label="พื้นที่กะวันนี้"
            required
            value={assignment}
            onChange={(event) => {
              setSelectedAssignment(event.target.value);
              setItems([{ key: 1, equipment: "", qty: "1" }]);
            }}
          >
            <option value="">เลือกพื้นที่</option>
            {[
              ...new Map(
                (resource.data?.schedules || []).map((r) => [
                  str(r, "assignment_id"),
                  r,
                ]),
              ).values(),
            ].map((r) => (
              <option
                key={str(r, "assignment_id")}
                value={str(r, "assignment_id")}
              >
                {str(r, "project_name")} · {str(r, "location_name")}
              </option>
            ))}
          </select>
        </Field>
        {equipment.error && <ErrorBox error={equipment.error} />}
        <p className="muted">
          {equipment.loading
            ? "กำลังโหลดอุปกรณ์ของ TOR…"
            : "แสดงเฉพาะอุปกรณ์ใน TOR ของพื้นที่ที่เลือก"}
        </p>
        {!equipment.loading &&
          assignment &&
          available.length === 0 &&
          !equipment.error && <Empty text="ยังไม่มีอุปกรณ์ใน TOR นี้" />}
        {items.map((it, index) => (
          <div className="item-editor" key={it.key}>
            <select
              aria-label={`อุปกรณ์ ${index + 1}`}
              required
              disabled={
                equipment.loading || !!equipment.error || available.length === 0
              }
              value={it.equipment}
              onChange={(e) => {
                const value = e.target.value;
                setItems((v) =>
                  v.some(
                    (item, i) =>
                      i !== index && value !== "" && item.equipment === value,
                  )
                    ? v
                    : v.map((r, i) =>
                        i === index ? { ...r, equipment: value } : r,
                      ),
                );
              }}
            >
              <option value="">เลือกอุปกรณ์</option>
              {equipmentOptions(available, items, index).map((r) => (
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
          disabled={
            equipment.loading ||
            !!equipment.error ||
            !canAddEquipment(available, items)
          }
          onClick={() =>
            setItems((v) =>
              canAddEquipment(available, v)
                ? [...v, { key: Date.now(), equipment: "", qty: "1" }]
                : v,
            )
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
        ต้องเช็กอินในพื้นที่ก่อนส่งคำขอ ผลพิจารณาจะแจ้งผ่าน LINE Chat
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
