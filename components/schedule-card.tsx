"use client";
import { Clock, MapPin } from "lucide-react";
import { Badge, Button } from "./ui";
import { clock, dateThai, todayBangkok } from "@/lib/domain";
import { str, type Row } from "@/lib/types";
import { leaveStatusText } from "@/lib/leave";
import { attendanceActions, checkoutTimeReached } from "@/lib/worker-actions";
import { useCurrentTime } from "@/lib/use-current-time";

export function ScheduleCard({
  row,
  leave,
  attendance,
  onCheckIn,
  onCheckout,
}: {
  row: Row;
  leave?: Row;
  attendance?: Row;
  onCheckIn?: () => void;
  onCheckout?: () => void;
}) {
  const today = str(row, "work_date").slice(0, 10) === todayBangkok();
  const cancelled = row.shift_status === "cancelled";
  const { checkedIn, checkedOut } = attendanceActions(attendance);
  const now = useCurrentTime();
  const timeReached = checkoutTimeReached(row, now);
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
      {leave && (
        <p className="notice" role="status">
          <strong>{leaveStatusText(leave.status)}</strong>
          <br />
          {leave.is_advance_notice === true ? "ลาล่วงหน้า" : "ลาฉุกเฉิน"} ·{" "}
          {dateThai(str(leave, "leave_date"))}
        </p>
      )}
      {checkedIn && (
        <p className="notice" role="status">
          เช็กอินแล้ว {clock(str(attendance, "check_in"))}
          {checkedOut
            ? ` · เช็กเอาท์แล้ว ${clock(str(attendance, "check_out"))}`
            : " · กำลังปฏิบัติงาน"}
        </p>
      )}
      {checkedIn && !checkedOut && !timeReached && (
        <p className="muted">
          เช็กเอาท์ได้หลังจบกะ {clock(str(row, "shift_end_at"))} ·{" "}
          {dateThai(str(row, "shift_end_at"))}
        </p>
      )}
      {(today || (checkedIn && !checkedOut)) &&
        !cancelled &&
        leave?.status !== "approved" && (
          <div className="shift-actions">
            <Button
              onClick={onCheckIn}
              disabled={checkedIn || checkedOut || !onCheckIn}
            >
              {checkedIn ? "เช็กอินแล้ว" : "เช็กอิน"}
            </Button>
            <Button
              variant="secondary"
              onClick={onCheckout}
              disabled={!checkedIn || checkedOut || !onCheckout || !timeReached}
            >
              {checkedOut ? "เช็กเอาท์แล้ว" : "ส่งผลงาน / เช็กเอาท์"}
            </Button>
          </div>
        )}
    </section>
  );
}
