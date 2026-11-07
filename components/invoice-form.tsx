"use client";
import { useState } from "react";
import { useSession } from "./auth";
import {
  ActionForm,
  Button,
  ErrorBox,
  Field,
  Inputs,
  Table,
  fdString,
  useData,
} from "./ui";
import { object, rows, str, type Row } from "@/lib/types";
import { money, todayBangkok } from "@/lib/domain";
export function InvoiceCreateForm({
  contracts,
  onClose,
  onDone,
}: {
  contracts: Row[];
  onClose: () => void;
  onDone: () => void;
}) {
  const { get, api } = useSession();
  const [tor, setTor] = useState("");
  const [month, setMonth] = useState(todayBangkok().slice(0, 7));
  const source = useData(
    (signal) =>
      tor && month
        ? get(
            `invoices/deduction-preview?tor_id=${tor}&billing_month=${month}`,
            signal,
          )
        : Promise.resolve(null),
    [tor, month],
  );
  const preview = object(source.data);
  const pending = Number(preview.pending_payroll || 0);
  return (
    <ActionForm
      title="สร้างใบวางบิล"
      onClose={onClose}
      onDone={onDone}
      submitDisabled={
        !tor || !source.data || source.loading || !!source.error || pending > 0
      }
      submit={(fd) =>
        api.post("invoices", {
          tor_id: tor,
          billing_month: month,
          expected_amount: fdString(fd, "amount"),
          auto_deduction: true,
          deduction_reason:
            fdString(fd, "reason") ||
            "ยอดหักค่าจ้างพนักงานตามโครงการและเดือนที่เลือก",
        })
      }
    >
      <div className="form-grid">
        <Field label="โครงการ">
          <select
            aria-label="โครงการวางบิล"
            required
            value={tor}
            onChange={(e) => setTor(e.target.value)}
          >
            <option value="">เลือกโครงการ</option>
            {contracts.map((r) => (
              <option key={str(r, "tor_id")} value={str(r, "tor_id")}>
                {str(r, "project_name")}
              </option>
            ))}
          </select>
        </Field>
        <Field label="เดือนวางบิล">
          <input
            aria-label="เดือนวางบิล"
            type="month"
            required
            value={month}
            onChange={(e) => setMonth(e.target.value)}
          />
        </Field>
        <Inputs
          fields={[
            {
              name: "amount",
              label: "ยอดวางบิลก่อนหัก (บาท)",
              pattern: "[0-9]+(\\.[0-9]{1,2})?",
            },
          ]}
        />
        <Field label="ยอดหักอัตโนมัติตามโครงการ/เดือน (บาท)">
          <input
            aria-label="ยอดหักอัตโนมัติ"
            readOnly
            value={
              source.loading
                ? "กำลังคำนวณ…"
                : source.data
                  ? money(str(preview, "deduction_amount"))
                  : "—"
            }
          />
        </Field>
      </div>
      {!!source.data && tor && !source.loading && (
        <p className="notice">
          มูลค่าสัญญา {money(str(preview, "contract_value"))} บาท · วางบิลแล้ว{" "}
          {money(str(preview, "billed_amount"))} บาท · คงเหลือ{" "}
          {money(str(preview, "remaining_amount"))} บาท —
          ยอดวางบิลสะสมต้องไม่เกินมูลค่าสัญญา
        </p>
      )}
      {source.error && <ErrorBox error={source.error} retry={source.refresh} />}
      {pending > 0 && (
        <p className="notice">
          ยังมีกะงาน {pending} รายการที่ไม่มีสลิปค่าจ้าง
          ต้องปิดงวดและประมวลผลให้ครบก่อน
          จึงจะได้ยอดหักที่สมบูรณ์และสร้างใบวางบิลได้
        </p>
      )}
      <p className="notice">
        ใช้ยอดหักจริงจากค่าจ้างที่ประมวลผลแล้วเฉพาะโครงการ/เดือนนี้
        หากพนักงานทำหลายโครงการ ระบบกระจายเงินหักตามสัดส่วน
        โดยไม่เกินยอดหักจริงในสลิป รวมสลิปทั้งที่จ่ายแล้วและยังไม่จ่าย
      </p>
      {!!source.data && (
        <>
          <Button variant="secondary" onClick={source.refresh}>
            อัปเดตยอดหัก
          </Button>
          <Table
            data={rows(preview.lines)}
            columns={[
              { key: "work_date", label: "วันที่", format: "date" },
              { key: "worker_name", label: "พนักงาน" },
              { key: "reason", label: "เหตุผล" },
              { key: "amount", label: "ยอดหักที่จัดสรร", format: "money" },
            ]}
          />
        </>
      )}
      <Inputs
        fields={[
          {
            name: "reason",
            label: "หมายเหตุ",
            type: "textarea",
            required: false,
          },
        ]}
      />
    </ActionForm>
  );
}
