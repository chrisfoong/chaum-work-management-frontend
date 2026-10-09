"use client";
import { useState } from "react";
import {
  CalendarDays,
  CalendarCheck,
  Download,
  RefreshCw,
  Send,
  Users,
  Wallet,
} from "lucide-react";
import { useSession } from "./auth";
import {
  ActionForm,
  AddButton,
  Button,
  ErrorBox,
  Field,
  Heading,
  Inputs,
  Modal,
  Pager,
  Panel,
  Resource,
  Stat,
  Table,
  fdString,
  options,
  useData,
} from "./ui";
import { DateFilters } from "./schedule";
import {
  decimal,
  dateThai,
  money,
  period,
  satang,
  todayBangkok,
} from "@/lib/domain";
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
  const summary = payrollSummary(resource.data || []);
  const ready = !resource.loading && !resource.error;
  const visible = (resource.data || []).slice(offset, offset + 50);
  return (
    <>
      <Heading
        eyebrow="PAYROLL · 4S / 5S"
        title="ค่าจ้างและเงินหัก"
        description="ประมวลผลการเข้างานก่อนสรุปค่าจ้าง ยอดสุทธิไม่ต่ำกว่า 0"
        action={
          <Button onClick={() => setAction("process")}>
            <Wallet size={18} />
            ประมวลผลรอบนี้
          </Button>
        }
      />
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
function PayrollDetail({
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
export function Finance() {
  const { list, api, get } = useSession();
  const [tab, setTab] = useState("report");
  const [financialRow, setFinancialRow] = useState<Row | null>(null);
  const [start, setStart] = useState(todayBangkok().slice(0, 8) + "01");
  const [end, setEnd] = useState(todayBangkok());
  const [tor, setTor] = useState("");
  const [action, setAction] = useState("");
  const [selected, setSelected] = useState<Row | null>(null);
  const [error, setError] = useState("");
  const contracts = useData(
    (signal) => list("contracts?limit=100", signal),
    [],
  );
  const query = `period_start=${start}&period_end=${end}${tor ? `&tor_id=${tor}` : ""}`;
  const report = useData(
    (signal) =>
      tab === "report"
        ? get(`reports/profit?${query}`, signal)
        : Promise.resolve(null),
    [tab, start, end, tor],
  );
  const invoices = useData(
    (signal) =>
      tab === "invoices"
        ? list("invoices?limit=100", signal)
        : Promise.resolve([]),
    [tab],
  );
  const data = rows(report.data);
  const totals = { revenue: 0n, labor: 0n, materials: 0n, profit: 0n };
  for (const r of data) {
    for (const [key, aliases] of Object.entries({
      revenue: ["revenue", "total_revenue"],
      labor: ["labor", "labor_cost"],
      materials: ["material", "material_cost"],
      profit: ["net_profit", "profit"],
    })) {
      const value = aliases.map((k) => str(r, k)).find(Boolean) || "0";
      try {
        totals[key as keyof typeof totals] += satang(value);
      } catch {
        /* backend may return negative profit */ if (
          key === "profit" &&
          /^-[0-9]+(\.[0-9]{1,2})?$/.test(value)
        )
          totals.profit -= satang(value.slice(1));
      }
    }
  }
  return (
    <>
      <Heading
        eyebrow="FINANCE · 6S"
        title="ต้นทุนและกำไร"
        description="รายรับเงินจริง ค่าแรงที่จ่าย และค่าใช้จ่ายจัดซื้อ ตามช่วงที่เลือก"
      />
      <div className="tabs">
        <button
          className={tab === "report" ? "active" : ""}
          onClick={() => setTab("report")}
        >
          ผลประกอบการ
        </button>
        <button
          className={tab === "invoices" ? "active" : ""}
          onClick={() => setTab("invoices")}
        >
          ใบวางบิลและรับเงิน
        </button>
      </div>
      {tab === "report" ? (
        <>
          <div className="toolbar">
            <Field label="โครงการ">
              <select
                aria-label="โครงการรายงาน"
                value={tor}
                onChange={(e) => setTor(e.target.value)}
              >
                <option value="">ทุกโครงการ</option>
                {contracts.data?.map((r) => (
                  <option key={str(r, "tor_id")} value={str(r, "tor_id")}>
                    {str(r, "project_name")}
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
          {contracts.error && (
            <ErrorBox error={contracts.error} retry={contracts.refresh} />
          )}
          <Resource {...report} retry={report.refresh}>
            <div className="stats-grid">
              <Stat label="รายรับจริง" value={money(decimal(totals.revenue))} />
              <Stat label="ต้นทุนค่าแรง" value={money(decimal(totals.labor))} />
              <Stat
                label="ต้นทุนจัดซื้อ"
                value={money(decimal(totals.materials))}
              />
              <Stat label="กำไรสุทธิ" value={money(decimal(totals.profit))} />
            </div>
            <Panel title="รายละเอียดรายโครงการ">
              <Table
                data={data}
                columns={[
                  { key: "project_name", label: "โครงการ" },
                  { key: "revenue", label: "รายรับ", format: "money" },
                  { key: "labor", label: "ค่าแรง", format: "money" },
                  { key: "material", label: "จัดซื้อ", format: "money" },
                  { key: "profit", label: "กำไรสุทธิ", format: "money" },
                ]}
                onRow={setFinancialRow}
              />
              <p className="notice">
                ค่าแรงจัดสรรตามวันทำงาน เป็นยอดประมาณการ ไม่รวม fund_transfer
                ซ้ำเป็นต้นทุน รายงานเปลี่ยนตามการแก้ข้อมูลย้อนหลัง
              </p>
              <div className="action-bar">
                <Button
                  variant="secondary"
                  onClick={() =>
                    api
                      .download(
                        `reports/profit.pdf?${query}`,
                        "chaum-profit.pdf",
                      )
                      .catch((e) => setError(e.message))
                  }
                >
                  <Download size={17} />
                  Export PDF
                </Button>
                <Button
                  variant="secondary"
                  onClick={() =>
                    api
                      .download(
                        `reports/profit.csv?${query}`,
                        "chaum-profit.csv",
                      )
                      .catch((e) => setError(e.message))
                  }
                >
                  Export CSV
                </Button>
                <Button
                  variant="secondary"
                  disabled={!tor}
                  onClick={() => setAction("confirm")}
                >
                  ตรวจสอบผลประกอบการ
                </Button>
                <Button disabled={!tor} onClick={() => setAction("notify")}>
                  <Send size={17} />
                  แจ้งผลสรุปให้ผู้ดูแลงาน
                </Button>
              </div>
              {error && <ErrorBox error={error} />}
            </Panel>
          </Resource>
        </>
      ) : (
        <Panel
          title="ใบวางบิล"
          action={
            <AddButton onClick={() => setAction("invoice")}>
              สร้างใบวางบิล
            </AddButton>
          }
        >
          <Resource {...invoices} retry={invoices.refresh}>
            <Table
              data={invoices.data || []}
              columns={[
                {
                  key: "project_name",
                  label: "โครงการ",
                  format: (r) =>
                    str(
                      contracts.data?.find((c) => c.tor_id === r.tor_id),
                      "project_name",
                    ) || str(r, "tor_id"),
                },
                { key: "billing_month", label: "เดือนวางบิล" },
                { key: "expected_amount", label: "ยอดวางบิล", format: "money" },
                { key: "net_received", label: "รับจริง", format: "money" },
                {
                  key: "is_paid",
                  label: "รับเงินแล้ว",
                  format: (r) =>
                    r.status === "paid" ? "รับแล้ว" : "ยังไม่รับ",
                },
              ]}
              onRow={setSelected}
            />
          </Resource>
        </Panel>
      )}
      {financialRow && (
        <Modal
          title={`รายละเอียดต้นทุน ${str(financialRow, "project_name")}`}
          onClose={() => setFinancialRow(null)}
        >
          <h3>ค่าแรงจัดสรรตามวันทำงาน</h3>
          <Table
            data={rows(financialRow.labor_details)}
            columns={[
              { key: "payroll_id", label: "สลิป" },
              { key: "workdays", label: "วันทำงาน" },
              {
                key: "allocated_net_wage",
                label: "ค่าแรงจัดสรร",
                format: "money",
              },
            ]}
          />
          <h3>ค่าใช้จ่ายจัดซื้อจริง</h3>
          <Table
            data={rows(financialRow.material_details)}
            columns={[
              { key: "requisition_id", label: "ใบคำขอ" },
              { key: "created_at", label: "วันที่", format: "date" },
              { key: "amount", label: "ยอด", format: "money" },
            ]}
          />
        </Modal>
      )}
      {action === "invoice" && (
        <ActionForm
          title="สร้างใบวางบิล"
          onClose={() => setAction("")}
          onDone={invoices.refresh}
          submit={(fd) =>
            api.post("invoices", {
              tor_id: fdString(fd, "tor"),
              billing_month: fdString(fd, "month"),
              expected_amount: fdString(fd, "amount"),
              exat_deduction_amount: fdString(fd, "deduction") || "0.00",
              deduction_reason: fdString(fd, "reason"),
            })
          }
        >
          <Inputs
            fields={[
              {
                name: "tor",
                label: "โครงการ",
                options: options(
                  contracts.data || [],
                  "tor_id",
                  "project_name",
                ),
              },
              {
                name: "month",
                label: "เดือนวางบิล",
                type: "month",
                value: todayBangkok().slice(0, 7),
              },
              {
                name: "amount",
                label: "ยอดวางบิล (บาท)",
                pattern: "[0-9]+(\\.[0-9]{1,2})?",
              },
              {
                name: "deduction",
                label: "ยอดหักจากหน่วยงาน (บาท)",
                value: "0.00",
                pattern: "[0-9]+(\\.[0-9]{1,2})?",
              },
              {
                name: "reason",
                label: "เหตุผลเงินหัก",
                type: "textarea",
                required: false,
              },
            ]}
          />
        </ActionForm>
      )}
      {selected && (
        <ActionForm
          title="บันทึกรับเงินจากหน่วยงาน"
          onClose={() => setSelected(null)}
          onDone={invoices.refresh}
          submit={(fd) =>
            api.post(`invoices/${str(selected, "invoice_id")}/mark-paid`, {
              net_received: fdString(fd, "amount"),
            })
          }
        >
          <p>
            {str(selected, "project_name")} · {str(selected, "billing_month")}
          </p>
          <Inputs
            fields={[
              {
                name: "amount",
                label: "ยอดรับเงินจริง (บาท)",
                pattern: "[0-9]+(\\.[0-9]{1,2})?",
              },
            ]}
          />
          <label className="checkbox-line">
            <input type="checkbox" required /> ตรวจสอบเงินเข้าจริงเรียบร้อยแล้ว
          </label>
        </ActionForm>
      )}
      {["confirm", "notify"].includes(action) && (
        <ActionForm
          title={
            action === "notify"
              ? "แจ้งผลสรุปให้ผู้ดูแลงาน"
              : "ตรวจสอบผลประกอบการ"
          }
          onClose={() => setAction("")}
          onDone={report.refresh}
          submit={() =>
            action === "notify"
              ? api.post(`contracts/${tor}/operations-summary/notify`, {
                  period_start: start,
                  period_end: end,
                  supervisor_reviewed: true,
                })
              : api.post("reports/profit/confirm", {
                  tor_id: tor,
                  period_start: start,
                  period_end: end,
                })
          }
        >
          <p>
            รอบ {start} ถึง {end}
          </p>
          <label className="checkbox-line">
            <input type="checkbox" required /> ตรวจสอบผลประมวลผล 5S
            และผลประกอบการ 6S แล้ว
          </label>
          <p className="notice">
            {action === "notify"
              ? "ส่งเฉพาะข้อความสั้นและลิงก์ไปหน้า Assistant ไม่มีตัวเลขการเงิน ไม่มีประวัติส่ง/อ่าน"
              : "คำนวณข้อมูลปัจจุบัน ไม่บันทึก Snapshot และไม่สิ้นสุดสัญญา"}
          </p>
        </ActionForm>
      )}
    </>
  );
}
