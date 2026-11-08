"use client";
import { useState } from "react";
import { useSession } from "../auth";
import { Badge, Button, ErrorBox, Field, Modal, Table, itemRows } from "../ui";
import { decimal, money, satang } from "@/lib/domain";
import { num, object, rows, str, type Row } from "@/lib/types";

export function PurchaseForm({
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
            ตรวจสอบจำนวนและค่าใช้จ่ายก่อนยืนยันการจัดซื้อ
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
                          value={quantities[id] ?? "0"}
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
                          value={prices[id] ?? "0.00"}
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
