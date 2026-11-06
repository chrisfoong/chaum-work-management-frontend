"use client";
import { useState } from "react";
import { useSession } from "./auth";
import {
  ActionForm,
  Button,
  Field,
  Inputs,
  Resource,
  fdString,
  fdNumber,
  fileFrom,
  useData,
} from "./ui";
import { str, rows, object, type Row } from "@/lib/types";

export function ContractDetailsEditor({
  row,
  onClose,
  onDone,
}: {
  row: Row;
  onClose: () => void;
  onDone: () => void;
}) {
  const { api } = useSession();
  return (
    <ActionForm
      title="แก้ไขรายละเอียดสัญญา"
      onClose={onClose}
      onDone={onDone}
      submit={async (fd) => {
        const file = fd.get("file");
        const path =
          file instanceof File && file.size > 0
            ? await fileFrom(fd, "file", api, ["image/png"])
            : "";
        return api.patch(`contracts/${str(row, "tor_id")}/details`, {
          project_name: fdString(fd, "project_name"),
          partner_agency: fdString(fd, "partner_agency"),
          start_date: fdString(fd, "start_date"),
          end_date: fdString(fd, "end_date"),
          contract_value: fdString(fd, "contract_value"),
          contract_file_path: path,
          expected_updated_at: str(row, "updated_at"),
        });
      }}
    >
      <Inputs
        fields={[
          {
            name: "project_name",
            label: "ชื่อโครงการ",
            value: str(row, "project_name"),
          },
          {
            name: "partner_agency",
            label: "หน่วยงาน",
            value: str(row, "partner_agency"),
          },
          {
            name: "start_date",
            label: "วันที่เริ่ม",
            type: "date",
            value: str(row, "start_date"),
          },
          {
            name: "end_date",
            label: "วันที่สิ้นสุด",
            type: "date",
            value: str(row, "end_date"),
          },
          {
            name: "contract_value",
            label: "มูลค่าสัญญา (บาท)",
            value: str(row, "contract_value"),
            pattern: "[0-9]+(\\.[0-9]{1,2})?",
          },
        ]}
      />
      <Field label="เปลี่ยนหลักฐานสัญญา PNG ไม่เกิน 5 MB (ถ้ามี)">
        <input name="file" type="file" accept="image/png" />
      </Field>
      <p className="notice">
        เลขสัญญาคงเดิม ช่วงวันที่ต้องครอบคลุมกะและใบวางบิลเดิม
        มูลค่าเปลี่ยนได้ก่อนมีธุรกรรมการเงินเท่านั้น
      </p>
    </ActionForm>
  );
}

export function AssignmentEditor({
  torID,
  area,
  onClose,
  onDone,
}: {
  torID: string;
  area?: Row;
  onClose: () => void;
  onDone: () => void;
}) {
  const { api, list } = useSession();
  const resource = useData(
    async (signal) => ({
      initial: area
        ? object(
            await api.get(
              `assignments/${str(area, "assignment_id")}/scope`,
              signal,
            ),
          )
        : { location_id: "", required_workers: 1, items: [] },
      locations: await list("locations", signal),
      equipment: await list("equipment?limit=100", signal),
    }),
    [torID, str(area, "assignment_id")],
  );
  return (
    <Resource {...resource} retry={resource.refresh}>
      {resource.data && (
        <AssignmentFields
          torID={torID}
          area={area}
          initial={resource.data.initial}
          locations={resource.data.locations}
          equipment={resource.data.equipment}
          onClose={onClose}
          onDone={onDone}
        />
      )}
    </Resource>
  );
}

function AssignmentFields({
  torID,
  area,
  initial,
  locations,
  equipment,
  onClose,
  onDone,
}: {
  torID: string;
  area?: Row;
  initial: Row;
  locations: Row[];
  equipment: Row[];
  onClose: () => void;
  onDone: () => void;
}) {
  const { api } = useSession();
  const originals = rows(initial.items);
  const [items, setItems] = useState(() =>
    originals.length
      ? originals.map((r, i) => ({
          key: i,
          equipment: str(r, "equipment_id"),
          qty: str(r, "required_qty"),
          original: true,
        }))
      : [{ key: 0, equipment: "", qty: "1", original: false }],
  );
  return (
    <ActionForm
      title={area ? "แก้ไขขอบเขตพื้นที่ TOR" : "เพิ่มพื้นที่ใน TOR"}
      onClose={onClose}
      onDone={onDone}
      submit={(fd) => {
        if (
          items.some((i) => !i.equipment) ||
          new Set(items.map((i) => i.equipment)).size !== items.length
        )
          throw new Error("เลือกรายการอุปกรณ์ให้ครบและไม่ซ้ำ");
        const body = {
          location_id: fdString(fd, "location_id"),
          required_workers: fdNumber(fd, "required_workers"),
          expected_required_workers: area
            ? Number(initial.required_workers)
            : undefined,
          expected_items: area
            ? originals.map((r) => ({
                equipment_id: str(r, "equipment_id"),
                required_qty: Number(r.required_qty),
              }))
            : undefined,
          items: items.map((i) => ({
            equipment_id: i.equipment,
            required_qty: Number(i.qty),
          })),
        };
        return area
          ? api.patch(`assignments/${str(area, "assignment_id")}/scope`, body)
          : api.post(`contracts/${torID}/assignments`, body);
      }}
    >
      <Field label="สถานที่">
        <select
          name="location_id"
          required
          defaultValue={str(initial, "location_id")}
        >
          <option value="">เลือกสถานที่</option>
          {locations.map((r) => (
            <option key={str(r, "location_id")} value={str(r, "location_id")}>
              {str(r, "location_name")}
            </option>
          ))}
        </select>
      </Field>
      <Inputs
        fields={[
          {
            name: "required_workers",
            label: "คนงานขั้นต่ำ",
            type: "number",
            value: str(initial, "required_workers") || "1",
          },
        ]}
      />
      <Field label="อุปกรณ์ตั้งต้น">
        {items.map((item) => (
          <div className="toolbar" key={item.key}>
            <select
              aria-label="อุปกรณ์ตั้งต้น"
              required
              disabled={item.original}
              value={item.equipment}
              onChange={(e) =>
                setItems(
                  items.map((x) =>
                    x.key === item.key
                      ? { ...x, equipment: e.target.value }
                      : x,
                  ),
                )
              }
            >
              <option value="">เลือกอุปกรณ์</option>
              {equipment
                .filter(
                  (r) =>
                    r.is_active !== false &&
                    !items.some(
                      (other) =>
                        other.key !== item.key &&
                        other.equipment === str(r, "equipment_id"),
                    ),
                )
                .map((r) => (
                  <option
                    key={str(r, "equipment_id")}
                    value={str(r, "equipment_id")}
                  >
                    {str(r, "equipment_name")}
                  </option>
                ))}
            </select>
            <input
              aria-label="จำนวนอุปกรณ์ตั้งต้น"
              type="number"
              required
              min={1}
              max={1000000}
              value={item.qty}
              onChange={(e) =>
                setItems(
                  items.map((x) =>
                    x.key === item.key ? { ...x, qty: e.target.value } : x,
                  ),
                )
              }
            />
            {!item.original && items.length > 1 && (
              <Button
                variant="secondary"
                onClick={() =>
                  setItems(items.filter((x) => x.key !== item.key))
                }
              >
                ลบแถว
              </Button>
            )}
          </div>
        ))}
        <Button
          variant="secondary"
          disabled={items.length >= 100 || items.some((x) => !x.equipment)}
          onClick={() =>
            setItems([
              ...items,
              {
                key: Math.max(...items.map((x) => x.key)) + 1,
                equipment: "",
                qty: "1",
                original: false,
              },
            ])
          }
        >
          เพิ่มรายการอุปกรณ์
        </Button>
      </Field>
      <p className="notice">
        แก้พื้นที่เดิมได้ก่อนมีกะงานและก่อนสำรวจหรือจัดซื้อ
        ห้ามลบรายการอุปกรณ์เดิม
        หากต้องการสถานที่หรืออุปกรณ์ใหม่ให้เพิ่มในข้อมูลหลักก่อน
      </p>
    </ActionForm>
  );
}

export function InvoiceEditor({
  row,
  onClose,
  onDone,
}: {
  row: Row;
  onClose: () => void;
  onDone: () => void;
}) {
  const { api } = useSession();
  return (
    <ActionForm
      title="แก้ไขใบวางบิลที่ยังไม่รับเงิน"
      onClose={onClose}
      onDone={onDone}
      submit={(fd) =>
        api.patch(`invoices/${str(row, "invoice_id")}`, {
          expected_amount: fdString(fd, "expected_amount"),
          exat_deduction_amount: fdString(fd, "exat_deduction_amount"),
          deduction_reason: fdString(fd, "deduction_reason"),
          previous_expected_amount: str(row, "expected_amount"),
        })
      }
    >
      <Inputs
        fields={[
          {
            name: "expected_amount",
            label: "ยอดวางบิล (บาท)",
            value: str(row, "expected_amount"),
            pattern: "[0-9]+(\\.[0-9]{1,2})?",
          },
          {
            name: "exat_deduction_amount",
            label: "ยอดหักจากหน่วยงาน (บาท)",
            value: str(row, "exat_deduction_amount") || "0.00",
            pattern: "[0-9]+(\\.[0-9]{1,2})?",
          },
          {
            name: "deduction_reason",
            label: "เหตุผลเงินหัก",
            value: str(row, "deduction_reason"),
            required: false,
            type: "textarea",
          },
        ]}
      />
      <p className="notice">
        แก้ได้เฉพาะใบวางบิล pending หลังรับเงินจริงแล้วไม่สามารถเขียนทับยอดเดิม
      </p>
    </ActionForm>
  );
}
