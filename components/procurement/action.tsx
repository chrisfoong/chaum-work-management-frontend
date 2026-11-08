"use client";
import { useState } from "react";
import { useSession } from "../auth";
import {
  ActionForm,
  Badge,
  Field,
  Inputs,
  Resource,
  fdNumber,
  fdString,
  fileFrom,
  itemRows,
  useData,
} from "../ui";
import { retryOptions, procurementNextStep } from "@/lib/procurement-guidance";
import { satang } from "@/lib/domain";
import { num, str, type Row } from "@/lib/types";
import { PurchaseForm } from "./purchase";

export type Action =
  | "survey"
  | "decision"
  | "review"
  | "fund"
  | "purchase"
  | "delivery"
  | "retry"
  | "";

export function ProcurementAction({
  action,
  row,
  delivered = false,
  onClose,
  onDone,
}: {
  action: Action;
  row: Row;
  delivered?: boolean;
  onClose: () => void;
  onDone: () => void;
}) {
  const { api, list, user } = useSession();
  const allowedRetries = retryOptions(row, user.user_id, delivered);
  const [selectedRetry, setSelectedRetry] = useState("");
  const retryKind = allowedRetries.some(
    (option) => option.value === selectedRetry,
  )
    ? selectedRetry
    : allowedRetries[0]?.value || "";
  const nextStep = procurementNextStep(row, delivered);
  const id = str(row, "requisition_id");
  const items = itemRows(row);
  const schedules = useData(
    (signal) =>
      action === "delivery"
        ? list(`requisitions/${id}/delivery-schedules`, signal)
        : Promise.resolve([]),
    [action, id],
  );
  const [decision, setDecision] = useState(
    action === "review" ? "approve" : "purchase",
  );
  if (action === "purchase")
    return <PurchaseForm row={row} onClose={onClose} onDone={onDone} />;
  const titles: Record<string, string> = {
    survey: "บันทึกสำรวจอุปกรณ์",
    decision: "พิจารณาคำขออุปกรณ์",
    review: "อนุมัติจัดซื้อเพิ่มเติม",
    fund: "บันทึกหลักฐานโอนเงิน",
    delivery: "บันทึกการส่งมอบ",
    retry: "ส่งแจ้งเตือน LINE ใหม่",
  };
  return (
    <ActionForm
      title={titles[action] || ""}
      onClose={onClose}
      onDone={onDone}
      submitDisabled={action === "retry" && allowedRetries.length === 0}
      submitLabel={action === "retry" ? "ส่งแจ้งเตือนอีกครั้ง" : "ยืนยันบันทึก"}
      submit={async (fd) => {
        const base = `requisitions/${id}`;
        if (action === "survey")
          return api.post(`${base}/survey`, {
            items: items.map((it) => ({
              item_id: str(it, "item_id"),
              existing_qty: fdNumber(fd, str(it, "item_id")),
            })),
          });
        if (action === "decision")
          return api.post(`${base}/decision`, {
            decision,
            reason: fdString(fd, "reason"),
          });
        if (action === "review")
          return api.post(`${base}/review`, {
            decision,
            reason: fdString(fd, "reason"),
          });
        if (action === "fund") {
          satang(fdString(fd, "amount"));
          const path = await fileFrom(fd, "receipt", api, [
            "image/jpeg",
            "image/png",
            "application/pdf",
          ]);
          return api.post(`${base}/fund-transfers`, {
            amount: fdString(fd, "amount"),
            transfer_ref_no: fdString(fd, "reference"),
            receipt_path: path,
          });
        }
        if (action === "delivery") {
          const files = fd
            .getAll("photos")
            .filter((f): f is File => f instanceof File && f.size > 0);
          if (!files.length || files.length > 20)
            throw new Error("แนบรูปภาพ 1–20 รูป");
          const paths: string[] = [];
          for (const f of files) paths.push(await api.upload(f));
          return api.post(`${base}/delivery`, {
            schedule_id: fdString(fd, "schedule"),
            description: fdString(fd, "description"),
            photo_paths: paths,
          });
        }
        if (!retryKind) throw new Error(nextStep);
        try {
          return await api.post(`notifications/${id}/retry`, {
            kind: retryKind,
            reason: fdString(fd, "reason"),
          });
        } catch (error) {
          if (
            error instanceof Error &&
            error.message.includes(
              "notification does not match committed business state",
            )
          ) {
            onDone();
            throw new Error(
              "ยังส่งเหตุการณ์นี้ไม่ได้ หรือสถานะคำขอเปลี่ยนแล้ว กรุณาปิดหน้าต่าง ตรวจสถานะล่าสุด และดำเนินการตามขั้นตอนที่แสดง",
            );
          }
          throw error;
        }
      }}
    >
      {action === "survey" && (
        <>
          <p>กรอกจำนวนที่มีอยู่จริง ระบบคำนวณยอดขาดเอง</p>
          <Inputs
            fields={items.map((it) => ({
              name: str(it, "item_id"),
              label: str(it, "equipment_name"),
              type: "number",
              min: 0,
              max: 1000000,
              value: String(num(it, "existing_qty")),
            }))}
          />
        </>
      )}
      {action === "decision" && (
        <>
          <Field label="ผลตรวจสอบ">
            <select
              aria-label="ผลตรวจสอบ"
              value={decision}
              onChange={(e) => setDecision(e.target.value)}
            >
              <option value="purchase">
                ต้องจัดซื้อเพิ่มเติม → ผู้ควบคุมงาน
              </option>
              <option value="no_purchase">ไม่ต้องจัดซื้อ → แจ้งพนักงาน</option>
            </select>
          </Field>
          <Inputs
            fields={[
              {
                name: "reason",
                label: "เหตุผล / แนวทาง",
                type: "textarea",
                maxLength: 1000,
              },
            ]}
          />
        </>
      )}
      {action === "review" && (
        <>
          <Field label="ผลพิจารณา">
            <select
              aria-label="ผลพิจารณาจัดซื้อ"
              value={decision}
              onChange={(e) => setDecision(e.target.value)}
            >
              <option value="approve">อนุมัติ</option>
              <option value="reject">ไม่อนุมัติ</option>
            </select>
          </Field>
          <Inputs
            fields={[
              {
                name: "reason",
                label: "เหตุผล (บังคับเมื่อไม่อนุมัติ)",
                type: "textarea",
                required: decision === "reject",
                maxLength: 1000,
              },
            ]}
          />
        </>
      )}
      {action === "fund" && (
        <>
          <Inputs
            fields={[
              {
                name: "amount",
                label: "ยอดเงินโอน (บาท)",
                pattern: "[0-9]+(\\.[0-9]{1,2})?",
              },
              { name: "reference", label: "เลขอ้างอิงการโอน", maxLength: 100 },
            ]}
          />
          <Field label="สลิปโอนเงิน JPG / PNG / PDF ≤5 MB">
            <input
              type="file"
              aria-label="สลิปโอนเงิน"
              name="receipt"
              accept="image/jpeg,image/png,application/pdf"
              required
            />
          </Field>
          <p className="notice">
            บันทึกหลักฐานเท่านั้น ไม่ได้โอนเงินผ่านธนาคาร
          </p>
        </>
      )}
      {action === "delivery" && (
        <>
          <Resource {...schedules} retry={schedules.refresh}>
            <Inputs
              fields={[
                {
                  name: "schedule",
                  label: "กะของผู้รับเดิม",
                  options: (schedules.data || []).map((s) => ({
                    value: str(s, "schedule_id"),
                    label: `${str(s, "first_name")} ${str(s, "last_name")} · ${str(s, "work_date")} · ${str(s, "location_name")}`,
                  })),
                },
                {
                  name: "description",
                  label: "รายละเอียดส่งมอบ",
                  type: "textarea",
                  maxLength: 1000,
                },
              ]}
            />
          </Resource>
          <Field label="รูปหลักฐานส่งมอบ 1–20 รูป ≤5 MB ต่อรูป">
            <input
              type="file"
              aria-label="รูปส่งมอบ"
              name="photos"
              multiple
              accept="image/jpeg,image/png"
              required
            />
          </Field>
          <p className="notice">
            ส่งมอบทั้งรายการให้ผู้ขอเดิมในพื้นที่เดียวกัน
            เมื่อบันทึกแล้วระบบแจ้ง LINE แบบ best effort
          </p>
        </>
      )}
      {action === "retry" && (
        <>
          <div className="notice" role="status" style={{ display: "block" }}>
            <p>
              <strong>สถานะคำขอปัจจุบัน</strong> <Badge value={row.status} />
            </p>
            <p>{nextStep}</p>
          </div>
          {allowedRetries.length > 0 ? (
            <>
              <Field label="เหตุการณ์ที่ส่งซ้ำได้ตอนนี้">
                <select
                  aria-label="เหตุการณ์ที่ส่งซ้ำได้ตอนนี้"
                  value={retryKind}
                  onChange={(e) => setSelectedRetry(e.target.value)}
                >
                  {allowedRetries.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </Field>
              {retryKind === "no_purchase" && (
                <Inputs
                  fields={[
                    {
                      name: "reason",
                      label: "เหตุผลเดิมที่ไม่จัดซื้อ",
                      type: "textarea",
                      required: true,
                      maxLength: 1000,
                    },
                  ]}
                />
              )}
              <p className="muted">
                ส่งเฉพาะข้อความ LINE อีกครั้ง ไม่บันทึกจัดซื้อหรือส่งมอบซ้ำ
              </p>
            </>
          ) : (
            <p role="alert">
              ยังไม่มีเหตุการณ์ที่ส่งซ้ำได้ กรุณาดำเนินการขั้นตอนข้างต้นก่อน
            </p>
          )}
        </>
      )}
    </ActionForm>
  );
}
