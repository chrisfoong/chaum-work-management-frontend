"use client";
import { useState } from "react";
import { Package, RefreshCw } from "lucide-react";
import { useSession } from "./auth";
import {
  ActionForm,
  Back,
  Badge,
  Button,
  Empty,
  ErrorBox,
  Field,
  Heading,
  Inputs,
  Modal,
  Pager,
  Panel,
  Resource,
  Table,
  fdNumber,
  fdString,
  fileFrom,
  itemRows,
  useData,
} from "./ui";
import { decimal, money, satang } from "@/lib/domain";
import { num, object, rows, str, type Row } from "@/lib/types";
type Action =
  | "survey"
  | "decision"
  | "review"
  | "fund"
  | "purchase"
  | "delivery"
  | "retry"
  | "";
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
function RequisitionDetail({ row, onBack }: { row: Row; onBack: () => void }) {
  const { user, get, list, api } = useSession();
  const id = str(row, "requisition_id");
  const resource = useData((signal) => get(`requisitions/${id}`, signal), [id]);
  const r = object(resource.data);
  const [action, setAction] = useState<Action>("");
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
                  รายละเอียดการตรวจสอบอ้างอิงรายการ TOR จาก Backend
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
function ProcurementAction({
  action,
  row,
  onClose,
  onDone,
}: {
  action: Action;
  row: Row;
  onClose: () => void;
  onDone: () => void;
}) {
  const { api, list } = useSession();
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
        return api.post(`notifications/${id}/retry`, {
          kind: fdString(fd, "kind"),
          reason: fdString(fd, "reason"),
        });
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
          <Inputs
            fields={[
              {
                name: "kind",
                label: "เหตุการณ์แจ้งเตือน",
                options: [
                  { value: "no_purchase", label: "ไม่ต้องจัดซื้อ" },
                  { value: "delivery", label: "ส่งมอบแล้ว" },
                  { value: "approval_needed", label: "รออนุมัติ" },
                  { value: "purchase_funding", label: "รอเงินจัดซื้อ" },
                ],
              },
              {
                name: "reason",
                label: "เหตุผลเดิม (กรณีไม่ซื้อ)",
                type: "textarea",
                required: false,
                maxLength: 1000,
              },
            ]}
          />
          <p className="notice">
            ไม่บันทึกงานซ้ำ และไม่มีประวัติส่ง/อ่านถาวร การตอบรับจาก LINE
            ไม่ใช่หลักฐานว่าผู้รับอ่านแล้ว
          </p>
        </>
      )}
    </ActionForm>
  );
}
function PurchaseForm({
  row,
  onClose,
  onDone,
}: {
  row: Row;
  onClose: () => void;
  onDone: () => void;
}) {
  const { api } = useSession();
  const items = itemRows(row);
  const [payload, setPayload] = useState<Row | null>(null);
  const [review, setReview] = useState<Row | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);
  const [quantities, setQuantities] = useState<Record<string, string>>({});
  const [prices, setPrices] = useState<Record<string, string>>({});
  let total = 0n;
  for (const it of items) {
    const id = str(it, "item_id");
    try {
      total += satang(prices[id] || "0") * BigInt(quantities[id] || "0");
    } catch {
      /* partial input is not a total */
    }
  }
  return (
    <Modal title="บันทึกจัดหาอุปกรณ์" onClose={onClose} busy={busy}>
      {done ? (
        <div className="success">
          <h3>บันทึกการจัดซื้อแล้ว</h3>
          <Button
            onClick={() => {
              onDone();
              onClose();
            }}
          >
            เสร็จสิ้น
          </Button>
        </div>
      ) : review && payload ? (
        <>
          <p className="notice">
            ตรวจสอบยอดก่อนยืนยัน ระบบยังไม่ได้บันทึกค่าใช้จ่าย
          </p>
          <Table
            data={rows(review.items)}
            columns={[
              {
                key: "item_id",
                label: "อุปกรณ์",
                format: (r) =>
                  str(
                    items.find((it) => it.item_id === r.item_id) || {},
                    "equipment_name",
                  ),
              },
              { key: "new_actual_qty", label: "ซื้อสะสมใหม่" },
              { key: "remaining_qty", label: "ขาด" },
              {
                key: "new_actual_price",
                label: "ราคาที่เก็บ",
                format: "money",
              },
              { key: "round_cost", label: "ค่าใช้จ่ายรอบนี้", format: "money" },
            ]}
          />
          <h3>รวม {money(str(review, "round_total"))}</h3>
          <Badge value={review.next_status} />
          {error && <ErrorBox error={error} />}
          <div className="modal-footer">
            <Button
              variant="secondary"
              disabled={busy}
              onClick={() => {
                setReview(null);
                setPayload(null);
              }}
            >
              แก้ไข
            </Button>
            <Button
              disabled={busy}
              onClick={async () => {
                setBusy(true);
                setError("");
                try {
                  await api.post(
                    `requisitions/${str(row, "requisition_id")}/purchase`,
                    payload,
                  );
                  setDone(true);
                } catch (e) {
                  setError(e instanceof Error ? e.message : "บันทึกไม่สำเร็จ");
                } finally {
                  setBusy(false);
                }
              }}
            >
              {busy ? "กำลังบันทึก…" : "ยืนยันจัดซื้อ"}
            </Button>
          </div>
        </>
      ) : (
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            setBusy(true);
            setError("");
            const fd = new FormData(e.currentTarget);
            try {
              const file = fd.get("receipt");
              const receipt =
                file instanceof File && file.size ? await api.upload(file) : "";
              if (total > 0n && !receipt)
                throw new Error("ยอดซื้อเกิน 0 ต้องแนบใบเสร็จ");
              const p = {
                items: items.map((it) => {
                  const id = str(it, "item_id");
                  satang(prices[id] || "0");
                  return {
                    item_id: id,
                    actual_qty: Number(quantities[id] || 0),
                    actual_price: prices[id] || "0.00",
                    expected_actual_qty: num(it, "actual_qty"),
                  };
                }),
                receipt_path: receipt,
              };
              const result = object(
                await api.post(
                  `requisitions/${str(row, "requisition_id")}/purchase/preview`,
                  p,
                ),
              );
              setPayload(p);
              setReview(result);
            } catch (e) {
              setError(e instanceof Error ? e.message : "ตรวจข้อมูลไม่สำเร็จ");
            } finally {
              setBusy(false);
            }
          }}
        >
          <fieldset disabled={busy}>
            <p>จำนวนที่ซื้อในรอบนี้ ใช้ราคาต่อหน่วยที่ซื้อจริง</p>
            <div className="purchase-items">
              {items.map((it) => {
                const id = str(it, "item_id");
                return (
                  <div key={id}>
                    <h4>{str(it, "equipment_name")}</h4>
                    <small>
                      ซื้อแล้ว {num(it, "actual_qty")} · ขาด{" "}
                      {Math.max(
                        0,
                        num(it, "to_buy_qty") - num(it, "actual_qty"),
                      )}
                    </small>
                    <div className="form-grid">
                      <Field label="ซื้อรอบนี้ (ชิ้น)">
                        <input
                          aria-label={`จำนวนซื้อ ${str(it, "equipment_name")}`}
                          type="number"
                          min="0"
                          max={Math.max(
                            0,
                            num(it, "to_buy_qty") - num(it, "actual_qty"),
                          )}
                          required
                          value={quantities[id] || "0"}
                          onChange={(e) =>
                            setQuantities((v) => ({
                              ...v,
                              [id]: e.target.value,
                            }))
                          }
                        />
                      </Field>
                      <Field label="ราคาต่อหน่วย (บาท)">
                        <input
                          aria-label={`ราคา ${str(it, "equipment_name")}`}
                          inputMode="decimal"
                          pattern="[0-9]+(\.[0-9]{1,2})?"
                          required
                          value={prices[id] || "0.00"}
                          onChange={(e) =>
                            setPrices((v) => ({ ...v, [id]: e.target.value }))
                          }
                        />
                      </Field>
                    </div>
                  </div>
                );
              })}
            </div>
            <h3>รวมรอบนี้ {money(decimal(total))}</h3>
            <Field label="ใบเสร็จ JPG / PNG ≤5 MB">
              <input
                aria-label="ใบเสร็จ"
                type="file"
                name="receipt"
                accept="image/jpeg,image/png"
                required={total > 0n}
              />
            </Field>
            <p className="notice">
              {row.requisition_type === "tor_base"
                ? "2A เก็บราคาต่อหน่วยล่าสุด"
                : "7A เก็บราคาเฉลี่ยถ่วงน้ำหนัก"}{" "}
              · ปริมาณคงเหลือถูกตรวจซ้ำเมื่อยืนยัน
            </p>
          </fieldset>
          {error && <ErrorBox error={error} />}
          <div className="modal-footer">
            <Button variant="secondary" onClick={onClose} disabled={busy}>
              ยกเลิก
            </Button>
            <Button type="submit" disabled={busy}>
              {busy ? "กำลังตรวจสอบ…" : "ตรวจสอบก่อนบันทึก"}
            </Button>
          </div>
        </form>
      )}
    </Modal>
  );
}
