"use client";
import { useState } from "react";
import { useSession } from "../auth";
import {
  Badge,
  Empty,
  Field,
  Heading,
  Panel,
  Resource,
  Table,
  useData,
} from "../ui";
import { dateThai, money, todayBangkok } from "@/lib/domain";
import { rows, str } from "@/lib/types";

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
