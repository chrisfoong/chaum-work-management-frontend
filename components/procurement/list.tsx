"use client";
import { useState } from "react";
import { RefreshCw } from "lucide-react";
import { useSession } from "../auth";
import { Button, Heading, Pager, Panel, Resource, Table, useData } from "../ui";
import { type Row } from "@/lib/types";
import { RequisitionDetail } from "./detail";

export function Requisitions() {
  const { user, list } = useSession();
  const [status, setStatus] = useState("");
  const [type, setType] = useState("");
  const [offset, setOffset] = useState(0);
  const [selected, setSelected] = useState<Row | null>(null);
  const resource = useData(
    (signal) =>
      list(
        `requisitions?limit=50&offset=${offset}${status ? `&status=${status}` : ""}${type ? `&requisition_type=${type}` : ""}`,
        signal,
      ),
    [offset, status, type],
  );
  return (
    <>
      <Heading
        eyebrow="EQUIPMENT & PROCUREMENT"
        title={
          user.role === "supervisor"
            ? "อนุมัติจัดซื้อและโอนเงิน"
            : "อุปกรณ์และจัดซื้อ"
        }
        description="ติดตามตั้งแต่สำรวจ จัดหา จนถึงส่งมอบอุปกรณ์"
      />
      {selected ? (
        <RequisitionDetail
          row={selected}
          onBack={() => {
            setSelected(null);
            resource.refresh();
          }}
        />
      ) : (
        <Panel>
          <div className="toolbar">
            <select
              aria-label="ประเภทคำขอ"
              value={type}
              onChange={(e) => {
                setType(e.target.value);
                setOffset(0);
              }}
            >
              <option value="">ทุกประเภท</option>
              <option value="tor_base">อุปกรณ์ TOR ตั้งต้น</option>
              <option value="additional">อุปกรณ์เพิ่มเติม</option>
            </select>
            <select
              aria-label="สถานะคำขอ"
              value={status}
              onChange={(e) => {
                setStatus(e.target.value);
                setOffset(0);
              }}
            >
              <option value="">ทุกสถานะ</option>
              {[
                "pending_survey",
                "pending_approval",
                "pending_fund",
                "pending_procurement",
                "completed",
                "rejected",
              ].map((s) => (
                <option key={s} value={s}>
                  {
                    (
                      {
                        pending_survey: "รอสำรวจ",
                        pending_approval: "รออนุมัติ",
                        pending_fund: "รอเงินจัดซื้อ",
                        pending_procurement: "รอจัดหา",
                        completed: "เสร็จสิ้น",
                        rejected: "ไม่อนุมัติ",
                      } as Record<string, string>
                    )[s]
                  }
                </option>
              ))}
            </select>
            <Button variant="secondary" onClick={resource.refresh}>
              <RefreshCw size={16} />
              รีเฟรช
            </Button>
          </div>
          <Resource {...resource} retry={resource.refresh}>
            <Table
              data={resource.data || []}
              columns={[
                { key: "requisition_no", label: "เลขที่คำขอ" },
                { key: "project_name", label: "โครงการ" },
                { key: "location_name", label: "พื้นที่" },
                {
                  key: "requisition_type",
                  label: "ประเภท",
                  format: (r) =>
                    r.requisition_type === "tor_base"
                      ? "ตั้งต้น TOR"
                      : "เพิ่มเติม",
                },
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
      )}
    </>
  );
}
