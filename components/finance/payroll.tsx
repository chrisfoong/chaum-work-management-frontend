"use client";
import { useState } from "react";
import {
  CalendarDays,
  CalendarCheck,
  RefreshCw,
  Users,
  Wallet,
} from "lucide-react";
import { useSession } from "../auth";
import {
  ActionForm,
  Button,
  ErrorBox,
  Field,
  Heading,
  Modal,
  Pager,
  Panel,
  Resource,
  Stat,
  Table,
  useData,
} from "../ui";
import { decimal, dateThai, money, period, todayBangkok } from "@/lib/domain";
import { payrollForPeriod, payrollSummary } from "@/lib/payroll";
import { rows, str, type Row } from "@/lib/types";

export function Payroll() {
  const { api, list } = useSession();
  const [month, setMonth] = useState(todayBangkok().slice(0, 7));
  const [half, setHalf] = useState<1 | 2>(1);
  const [offset, setOffset] = useState(0);
  const [action, setAction] = useState("");
  const [selected, setSelected] = useState<Row | null>(null);
  const range = period(month, half);
  const periodClosed = todayBangkok() > range.period_end;
  const opens = new Date(
    Date.parse(`${range.period_end}T00:00:00+07:00`) + 86400000,
  ).toISOString();
  const people = useData((signal) => list("users?limit=100", signal), []);
  const resource = useData(
    async (signal) => {
      const result = await list(
        `payroll?period_month=${month}&limit=100`,
        signal,
      );
      return payrollForPeriod(result, range);
    },
    [month, half],
  );
  const attendance = useData(
    (signal) =>
      list(
        `attendance?period_start=${range.period_start}&period_end=${range.period_end}&limit=100`,
        signal,
      ),
    [month, half],
  );
  const summary = payrollSummary(resource.data || []);
  const ready = !resource.loading && !resource.error;
  const visible = (resource.data || []).slice(offset, offset + 50);
  return (
    <>
      <Heading
        eyebrow="PAYROLL"
        title="ค่าจ้างและเงินหัก"
        description="ประมวลผลการเข้างานก่อนสรุปค่าจ้าง ยอดสุทธิไม่ต่ำกว่า 0"
        action={
          <Button disabled={!periodClosed} onClick={() => setAction("process")}>
            <Wallet size={18} />
            ประมวลผลรอบนี้
          </Button>
        }
      />
      {!periodClosed && (
        <p className="notice" role="status">
          งวดนี้ยังไม่สิ้นสุด ประมวลผลได้ตั้งแต่ {dateThai(opens)}{" "}
          โดยต้องตรวจการเข้างานและเช็กเอาท์ให้ครบก่อน
        </p>
      )}
      <Panel title="การเข้างานในงวด (ก่อนออกสลิป)">
        <p className="notice">
          แสดงเวลาที่พนักงานเช็กอินจริง การมาสายยังไม่ใช่สลิปค่าจ้าง
          ต้องสรุปการเข้างานและประมวลผลหลังสิ้นงวดก่อน
        </p>
        <Resource {...attendance} retry={attendance.refresh}>
          <Table
            data={attendance.data || []}
            columns={[
              { key: "first_name", label: "พนักงาน" },
              { key: "work_date", label: "วันที่", format: "date" },
              { key: "status", label: "สถานะ", format: "status" },
              {
                key: "checkout_review_required",
                label: "การจบงาน",
                format: (r) =>
                  r.checkout_review_required
                    ? "ขาดการเช็กเอาท์—รอตรวจสอบ"
                    : r.check_out
                      ? "เช็กเอาท์แล้ว"
                      : "—",
              },
              {
                key: "check_in",
                label: "เวลาเช็กอิน",
                format: (r) =>
                  !str(r, "check_in")
                    ? "—"
                    : new Date(str(r, "check_in")).toLocaleTimeString("th-TH", {
                        timeZone: "Asia/Bangkok",
                      }),
              },
            ]}
          />
        </Resource>
      </Panel>
      <div className="toolbar">
        <Field label="เดือน">
          <input
            aria-label="เดือนค่าจ้าง"
            type="month"
            value={month}
            onChange={(e) => {
              if (e.target.value) setMonth(e.target.value);
              setOffset(0);
            }}
          />
        </Field>
        <Field label="รอบค่าจ้าง">
          <select
            aria-label="รอบค่าจ้าง"
            value={half}
            onChange={(e) => {
              setHalf(Number(e.target.value) as 1 | 2);
              setOffset(0);
            }}
          >
            <option value="1">วันที่ 1–15</option>
            <option value="2">วันที่ 16–สิ้นเดือน</option>
          </select>
        </Field>
        <Button
          variant="secondary"
          disabled={resource.loading}
          onClick={resource.refresh}
        >
          <RefreshCw size={17} /> รีเฟรชข้อมูล
        </Button>
      </div>
      <div className="stats-grid">
        <Stat
          label="พนักงานในรอบนี้"
          value={ready && summary.valid ? summary.employees : "—"}
          icon={<Users size={20} />}
          note="รวมทั้งรอบ ไม่ขึ้นกับหน้าตาราง"
        />
        <Stat
          label="ยอดสุทธิในรอบนี้"
          value={
            ready && summary.net !== null ? money(decimal(summary.net)) : "—"
          }
          icon={<Wallet size={20} />}
          note="บาท · รวมสลิปที่จ่ายแล้วและยังไม่จ่าย"
        />
        <Stat
          label="รอบเริ่ม"
          value={dateThai(range.period_start)}
          icon={<CalendarDays size={20} />}
        />
        <Stat
          label="รอบสิ้นสุด"
          value={dateThai(range.period_end)}
          icon={<CalendarCheck size={20} />}
        />
      </div>
      {ready && !summary.valid && (
        <ErrorBox
          error="ข้อมูลค่าจ้างบางรายการไม่ครบหรือยอดเงินไม่ถูกต้อง จึงยังสรุปยอดไม่ได้"
          retry={resource.refresh}
        />
      )}
      <Panel>
        <Resource {...resource} retry={resource.refresh}>
          {!resource.data?.length && (
            <p className="notice">
              ยังไม่มีข้อมูลค่าจ้างสำหรับรอบนี้ เลือกรอบอื่น
              หรือประมวลผลเมื่อรอบสิ้นสุดและข้อมูลเข้างานครบแล้ว
            </p>
          )}
          <Table
            data={visible}
            columns={[
              {
                key: "first_name",
                label: "พนักงาน",
                format: (r) => {
                  const person =
                    people.data?.find((p) => p.user_id === r.user_id) || r;
                  return (
                    `${str(person, "first_name")} ${str(person, "last_name")}`.trim() ||
                    str(r, "user_id")
                  );
                },
              },
              { key: "base_wage", label: "ค่าจ้างพื้นฐาน", format: "money" },
              { key: "total_deduction", label: "ยอดหักจริง", format: "money" },
              { key: "net_wage", label: "ยอดสุทธิ", format: "money" },
              {
                key: "is_paid",
                label: "สถานะจ่าย",
                format: (r) => (
                  <span className={`badge ${r.is_paid ? "green" : "amber"}`}>
                    {r.is_paid ? "จ่ายแล้ว" : "ยังไม่จ่าย"}
                  </span>
                ),
              },
            ]}
            onRow={(r) => {
              const person =
                people.data?.find((p) => p.user_id === r.user_id) || r;
              setSelected({
                ...r,
                first_name: person.first_name,
                last_name: person.last_name,
              });
            }}
          />
          <Pager
            offset={offset}
            count={visible.length}
            hasNext={offset + 50 < (resource.data?.length || 0)}
            onChange={setOffset}
          />
        </Resource>
      </Panel>
      {action === "process" && (
        <ActionForm
          title="ประมวลผลค่าจ้างทั้งรอบ"
          submitDisabled={!periodClosed}
          onClose={() => setAction("")}
          onDone={resource.refresh}
          submit={async () => {
            await api.post("attendance/finalize");
            return api.post("payroll/batch", range);
          }}
        >
          <p>
            รอบ {range.period_start} ถึง {range.period_end}
          </p>
          <p className="notice">
            ระบบตรวจเวลาปิดรอบและการเข้างานก่อนประมวลผล
            การประมวลผลซ้ำใช้สลิปเดิม ไม่ได้โอนเงินเข้าธนาคาร
          </p>
        </ActionForm>
      )}
      {selected && (
        <PayrollDetail
          row={selected}
          onClose={() => setSelected(null)}
          onDone={resource.refresh}
        />
      )}
    </>
  );
}

export function PayrollDetail({
  row,
  onClose,
  onDone,
}: {
  row: Row;
  onClose: () => void;
  onDone: () => void;
}) {
  const { api } = useSession();
  const [paid, setPaid] = useState(false);
  return paid ? (
    <ActionForm
      title="ยืนยันจ่ายค่าจ้างแล้ว"
      onClose={() => setPaid(false)}
      onDone={() => {
        onDone();
        onClose();
      }}
      submit={() => api.post(`payroll/${str(row, "payroll_id")}/mark-paid`)}
    >
      <h3>
        {str(row, "first_name")} {str(row, "last_name")}
      </h3>
      <p>ยอด {money(str(row, "net_wage"))}</p>
      <label className="checkbox-line">
        <input type="checkbox" required />{" "}
        ฉันตรวจสอบแล้วว่าโอนเงินให้พนักงานจริง
      </label>
      <p className="notice">
        คำสั่งนี้บันทึกสถานะการจ่ายเท่านั้น ไม่ได้โอนเงิน
      </p>
    </ActionForm>
  ) : (
    <Modal title="รายละเอียดค่าจ้าง" onClose={onClose}>
      <h3>
        {str(row, "first_name")} {str(row, "last_name")}
      </h3>
      <p className="muted">
        {str(row, "period_start")} – {str(row, "period_end")}
      </p>
      <div className="payslip-lines">
        <span>
          ค่าจ้างพื้นฐาน<strong>{money(str(row, "base_wage"))}</strong>
        </span>
        <span>
          ยอดหักจริง<strong>{money(str(row, "total_deduction"))}</strong>
        </span>
        <span className="net">
          ยอดสุทธิ<strong>{money(str(row, "net_wage"))}</strong>
        </span>
      </div>
      <Table
        data={rows(row.deductions || row.calculated_penalties)}
        columns={[
          { key: "work_date", label: "วันที่", format: "date" },
          { key: "reason", label: "สาเหตุ" },
          { key: "penalty_amount", label: "เงินหัก", format: "money" },
        ]}
      />
      {!row.is_paid && (
        <div className="modal-footer">
          <Button onClick={() => setPaid(true)}>ยืนยันจ่ายแล้ว</Button>
        </div>
      )}
    </Modal>
  );
}
