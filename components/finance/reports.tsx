"use client";
import { useState } from "react";
import { Download, Send } from "lucide-react";
import { useSession } from "../auth";
import { InvoiceEditor } from "../editing";
import { InvoiceCreateForm } from "../invoice-form";
import {
  ActionForm,
  AddButton,
  Button,
  ErrorBox,
  Field,
  Heading,
  Inputs,
  Modal,
  Panel,
  Resource,
  Stat,
  Table,
  fdString,
  useData,
} from "../ui";
import { DateFilters } from "../schedule";
import { decimal, money, satang, todayBangkok } from "@/lib/domain";
import { rows, str, type Row } from "@/lib/types";

export function Finance() {
  const { list, api, get } = useSession();
  const [tab, setTab] = useState("report");
  const [financialRow, setFinancialRow] = useState<Row | null>(null);
  const [start, setStart] = useState(todayBangkok().slice(0, 8) + "01");
  const [end, setEnd] = useState(todayBangkok());
  const [tor, setTor] = useState("");
  const [action, setAction] = useState("");
  const [selected, setSelected] = useState<Row | null>(null);
  const [invoiceEdit, setInvoiceEdit] = useState<Row | null>(null);
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
  const data = [...rows(report.data)].sort((a, b) => {
    const active = (r: Row) =>
      ["revenue", "labor", "material"].some((key) => Number(str(r, key)) !== 0);
    return Number(active(b)) - Number(active(a));
  });
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
        eyebrow="FINANCE"
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
          <div className="toolbar finance-report-filters">
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
              <Stat
                label="กำไรสุทธิ"
                value={money(decimal(totals.profit))}
                note="รายรับที่รับเงินจริง หักค่าแรงและต้นทุนจัดซื้อในช่วงที่เลือก"
              />
            </div>
            {totals.profit < 0n && totals.revenue === 0n && (
              <p className="notice">
                มีค่าใช้จ่ายแล้ว แต่ยังไม่มีรายรับที่ยืนยันรับเงินจริงในช่วงนี้
                กำไรจึงติดลบ ตรวจรายการในแท็บใบวางบิลและรับเงิน
                โดยไม่ใช้มูลค่าสัญญาแทนยอดรับจริง
              </p>
            )}
            <Panel title="รายละเอียดรายโครงการ">
              <p className="notice">
                แสดงโครงการที่มีรายรับหรือต้นทุนก่อน ยอด 0
                หมายถึงยังไม่มีรายการที่เข้าเงื่อนไขในช่วงที่เลือก: รับเงินแล้ว
                จ่ายค่าจ้างแล้ว หรือบันทึกค่าใช้จ่ายจัดซื้อจริง
              </p>
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
                ค่าแรงเป็นยอดประมาณการตามวันทำงาน
                รายงานอัปเดตตามข้อมูลการรับเงิน การจ่ายค่าจ้าง
                และค่าใช้จ่ายจัดซื้อ
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
                  key: "edit",
                  label: "แก้ไข",
                  format: (r) =>
                    r.status === "pending" ? (
                      <Button
                        variant="secondary"
                        onClick={() => setInvoiceEdit(r)}
                      >
                        แก้ไขใบวางบิล
                      </Button>
                    ) : (
                      "—"
                    ),
                },
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
      {invoiceEdit && (
        <InvoiceEditor
          row={invoiceEdit}
          onClose={() => setInvoiceEdit(null)}
          onDone={() => {
            setInvoiceEdit(null);
            invoices.refresh();
          }}
        />
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
        <InvoiceCreateForm
          contracts={contracts.data || []}
          onClose={() => setAction("")}
          onDone={invoices.refresh}
        />
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
            <input type="checkbox" required /> ตรวจสอบค่าจ้างและผลประกอบการแล้ว
          </label>
          <p className="notice">
            {action === "notify"
              ? "แจ้งผู้ดูแลงานผ่าน LINE พร้อมลิงก์สรุปการดำเนินงาน"
              : "ยืนยันการตรวจสอบผลประกอบการจากข้อมูลล่าสุด"}
          </p>
        </ActionForm>
      )}
    </>
  );
}
