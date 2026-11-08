"use client";
import { useEffect, useState } from "react";
import { Package } from "lucide-react";
import { useSession } from "../auth";
import {
  Back,
  Badge,
  Button,
  Empty,
  ErrorBox,
  Panel,
  Resource,
  Table,
  itemRows,
  useData,
} from "../ui";
import { object, rows, str, type Row } from "@/lib/types";
import { type Action } from "./action";
import { ProcurementAction } from "./action";

export function RequisitionDetail({
  row,
  onBack,
}: {
  row: Row;
  onBack: () => void;
}) {
  const { user, get, list, api } = useSession();
  const id = str(row, "requisition_id");
  const resource = useData((signal) => get(`requisitions/${id}`, signal), [id]);
  const [action, setAction] = useState<Action>("");
  useEffect(() => {
    const refresh = () => {
      if (!document.hidden && !action) resource.refresh();
    };
    const timer = window.setInterval(refresh, 15000);
    window.addEventListener("focus", refresh);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener("focus", refresh);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, action]);
  const r = object(resource.data);
  const [downloadError, setDownloadError] = useState("");
  const extra = r.requisition_type === "additional";
  const status = str(r, "status");
  const assistant = user.role === "assistant";
  const deliveries = useData(
    (signal) =>
      assistant && extra && status === "completed"
        ? list(`requisitions/${id}/deliveries`, signal)
        : Promise.resolve([]),
    [id, assistant, extra, status],
  );
  const inspection = useData(
    (signal) =>
      assistant && extra && status === "pending_survey"
        ? get(`requisitions/${id}/inspection`, signal)
        : Promise.resolve(null),
    [id, assistant, extra, status],
  );
  return (
    <>
      <Back onClick={onBack} />
      <Resource {...resource} retry={resource.refresh}>
        <Panel
          title={str(r, "requisition_no")}
          action={<Badge value={status} />}
        >
          <div className="detail-meta">
            <span>
              <Package size={18} />
              {extra ? "คำขอเพิ่มเติม" : "อุปกรณ์ TOR ตั้งต้น"}
            </span>
            <span>{str(r, "project_name")}</span>
            <span>{str(r, "location_name")}</span>
          </div>
          <p>{str(r, "reason")}</p>
          <Table
            data={itemRows(r)}
            columns={[
              { key: "equipment_name", label: "อุปกรณ์" },
              { key: "required_qty", label: "ต้องการ" },
              { key: "existing_qty", label: "มีอยู่" },
              { key: "to_buy_qty", label: "ต้องจัดหา" },
              { key: "actual_qty", label: "ซื้อสะสม" },
              { key: "actual_price", label: "ราคาต่อหน่วย", format: "money" },
            ]}
          />
          <div className="action-bar">
            {assistant && status === "pending_survey" && (
              <Button onClick={() => setAction(extra ? "decision" : "survey")}>
                {extra ? "ตรวจและพิจารณาคำขอ" : "กรอกผลสำรวจ"}
              </Button>
            )}
            {!assistant && extra && status === "pending_approval" && (
              <Button onClick={() => setAction("review")}>
                พิจารณาอนุมัติจัดซื้อ
              </Button>
            )}
            {!assistant && status === "pending_fund" && (
              <Button onClick={() => setAction("fund")}>บันทึกโอนเงิน</Button>
            )}
            {assistant && status === "pending_procurement" && (
              <Button onClick={() => setAction("purchase")}>
                บันทึกจัดหาอุปกรณ์
              </Button>
            )}
            {assistant && extra && status === "completed" && (
              <Button onClick={() => setAction("delivery")}>
                บันทึกการส่งมอบ
              </Button>
            )}
            {assistant && (
              <Button variant="secondary" onClick={() => setAction("retry")}>
                ลองส่งแจ้งเตือน LINE ใหม่
              </Button>
            )}
          </div>
        </Panel>
        {assistant && extra && status === "pending_survey" && (
          <Panel title="ข้อมูลเทียบกับ TOR">
            <Resource {...inspection} retry={inspection.refresh}>
              <Table
                data={rows(object(inspection.data).tor_requirements)}
                columns={[
                  {
                    key: "equipment_name",
                    label: "อุปกรณ์ TOR",
                    format: (requirement) =>
                      str(
                        itemRows(r).find(
                          (i) => i.equipment_id === requirement.equipment_id,
                        ),
                        "equipment_name",
                      ) || str(requirement, "equipment_id"),
                  },
                  { key: "required_qty", label: "กำหนด" },
                  { key: "actual_qty", label: "จัดหาแล้ว" },
                ]}
              />
              <h3>คำขอค้างที่มีอุปกรณ์ชนิดเดียวกัน</h3>
              <Table
                data={rows(object(inspection.data).other_pending_requests)}
                columns={[
                  { key: "requisition_id", label: "ใบคำขอ" },
                  {
                    key: "equipment_id",
                    label: "อุปกรณ์",
                    format: (requirement) =>
                      str(
                        itemRows(r).find(
                          (i) => i.equipment_id === requirement.equipment_id,
                        ),
                        "equipment_name",
                      ) || str(requirement, "equipment_id"),
                  },
                  { key: "status", label: "สถานะ", format: "status" },
                  { key: "remaining_qty", label: "ยอดขาด" },
                ]}
              />
              {!rows(object(inspection.data).tor_requirements).length && (
                <p className="muted">
                  เปรียบเทียบรายการที่ขอกับอุปกรณ์ตามสัญญา
                </p>
              )}
            </Resource>
          </Panel>
        )}
        {assistant && extra && status === "completed" && (
          <Panel title="หลักฐานการส่งมอบ">
            {downloadError && <ErrorBox error={downloadError} />}
            <Resource {...deliveries} retry={deliveries.refresh}>
              <div className="evidence-list">
                {deliveries.data?.map((d, i) => (
                  <div key={str(d, "evidence_id") || i}>
                    <p>{str(d, "description")}</p>
                    {str(d, "photo_url") && (
                      <Button
                        variant="secondary"
                        onClick={() =>
                          api
                            .download(
                              `files?path=${encodeURIComponent(str(d, "photo_url"))}`,
                              "delivery.jpg",
                            )
                            .catch((e) => setDownloadError(e.message))
                        }
                      >
                        เปิดภาพหลักฐาน
                      </Button>
                    )}
                  </div>
                ))}
                {!deliveries.data?.length && (
                  <Empty text="ยังไม่มีหลักฐานการส่งมอบ" />
                )}
              </div>
            </Resource>
          </Panel>
        )}
      </Resource>
      {action && (
        <ProcurementAction
          action={action}
          row={r}
          delivered={
            !deliveries.loading &&
            !deliveries.error &&
            !!deliveries.data?.length
          }
          onClose={() => setAction("")}
          onDone={() => {
            resource.refresh();
            deliveries.refresh();
          }}
        />
      )}
    </>
  );
}
