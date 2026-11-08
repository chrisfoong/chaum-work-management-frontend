"use client";
import { useState } from "react";
import { CalendarDays, Package, ShieldCheck, Wallet } from "lucide-react";
import { leaveForSchedule } from "@/lib/leave";
import { useSession } from "../auth";
import { Badge, Empty, Panel, Resource, useData } from "../ui";
import { ScheduleCard } from "../schedule-card";
import { clock, dateThai, todayBangkok } from "@/lib/domain";
import { str, type Row } from "@/lib/types";
import { CheckIn } from "./check-in";
import { Checkout } from "./checkout";
import { WorkerLeave } from "./leave";
import { Shortage } from "./shortage";

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
