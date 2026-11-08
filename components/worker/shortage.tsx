"use client";
import { useState } from "react";
import { equipmentOptions, canAddEquipment } from "@/lib/worker-actions";
import { useSession } from "../auth";
import {
  ActionForm,
  Button,
  Empty,
  ErrorBox,
  Field,
  Inputs,
  Resource,
  fdString,
  useData,
} from "../ui";
import { todayBangkok } from "@/lib/domain";
import { str } from "@/lib/types";

export function Shortage({
  onClose,
  onDone,
}: {
  onClose: () => void;
  onDone: () => void;
}) {
  const { api, list } = useSession();
  const resource = useData(
    async (signal) => ({
      schedules: await list(
        `schedules?period_start=${todayBangkok()}&period_end=${todayBangkok()}&limit=50`,
        signal,
      ),
    }),
    [],
  );
  const [items, setItems] = useState([{ key: 1, equipment: "", qty: "1" }]);
  const [selectedAssignment, setSelectedAssignment] = useState("");
  const assignment =
    selectedAssignment || str(resource.data?.schedules[0], "assignment_id");
  const equipment = useData(
    async (signal) => ({
      assignment,
      items: assignment
        ? await list(`equipment?assignment_id=${assignment}&limit=100`, signal)
        : [],
    }),
    [assignment],
  );
  const available =
    equipment.data?.assignment === assignment ? equipment.data.items : [];

  return (
    <ActionForm
      title="แจ้งอุปกรณ์ไม่พอ"
      onClose={onClose}
      onDone={onDone}
      submitDisabled={
        !assignment ||
        equipment.loading ||
        !!equipment.error ||
        available.length === 0
      }
      submit={(fd) => {
        if (
          equipment.loading ||
          equipment.error ||
          items.some(
            (item) =>
              !available.some(
                (row) => str(row, "equipment_id") === item.equipment,
              ),
          )
        )
          throw new Error("กรุณาเลือกอุปกรณ์ใน TOR ของพื้นที่นี้");
        const selected = new Set(items.map((i) => i.equipment));
        if (selected.size !== items.length)
          throw new Error("กรุณาเลือกอุปกรณ์แต่ละชนิดเพียงครั้งเดียว");
        return api.post("requisitions", {
          assignment_id: assignment,
          reason: fdString(fd, "reason"),
          items: items.map((i) => ({
            equipment_id: i.equipment,
            required_qty: Number(i.qty),
            remark: "",
          })),
        });
      }}
    >
      <Resource {...resource} retry={resource.refresh}>
        <Field label="พื้นที่กะวันนี้">
          <select
            name="assignment"
            aria-label="พื้นที่กะวันนี้"
            required
            value={assignment}
            onChange={(event) => {
              setSelectedAssignment(event.target.value);
              setItems([{ key: 1, equipment: "", qty: "1" }]);
            }}
          >
            <option value="">เลือกพื้นที่</option>
            {[
              ...new Map(
                (resource.data?.schedules || []).map((r) => [
                  str(r, "assignment_id"),
                  r,
                ]),
              ).values(),
            ].map((r) => (
              <option
                key={str(r, "assignment_id")}
                value={str(r, "assignment_id")}
              >
                {str(r, "project_name")} · {str(r, "location_name")}
              </option>
            ))}
          </select>
        </Field>
        {equipment.error && <ErrorBox error={equipment.error} />}
        <p className="muted">
          {equipment.loading
            ? "กำลังโหลดอุปกรณ์ของ TOR…"
            : "แสดงเฉพาะอุปกรณ์ใน TOR ของพื้นที่ที่เลือก"}
        </p>
        {!equipment.loading &&
          assignment &&
          available.length === 0 &&
          !equipment.error && <Empty text="ยังไม่มีอุปกรณ์ใน TOR นี้" />}
        {items.map((it, index) => (
          <div className="item-editor" key={it.key}>
            <select
              aria-label={`อุปกรณ์ ${index + 1}`}
              required
              disabled={
                equipment.loading || !!equipment.error || available.length === 0
              }
              value={it.equipment}
              onChange={(e) => {
                const value = e.target.value;
                setItems((v) =>
                  v.some(
                    (item, i) =>
                      i !== index && value !== "" && item.equipment === value,
                  )
                    ? v
                    : v.map((r, i) =>
                        i === index ? { ...r, equipment: value } : r,
                      ),
                );
              }}
            >
              <option value="">เลือกอุปกรณ์</option>
              {equipmentOptions(available, items, index).map((r) => (
                <option
                  key={str(r, "equipment_id")}
                  value={str(r, "equipment_id")}
                >
                  {str(r, "equipment_name")}
                </option>
              ))}
            </select>
            <input
              aria-label={`จำนวน ${index + 1}`}
              type="number"
              min="1"
              max="1000000"
              required
              value={it.qty}
              onChange={(e) =>
                setItems((v) =>
                  v.map((r, i) =>
                    i === index ? { ...r, qty: e.target.value } : r,
                  ),
                )
              }
            />
            {items.length > 1 && (
              <button
                type="button"
                aria-label="ลบรายการ"
                onClick={() => setItems((v) => v.filter((_, i) => i !== index))}
              >
                ×
              </button>
            )}
          </div>
        ))}
        <Button
          variant="secondary"
          disabled={
            equipment.loading ||
            !!equipment.error ||
            !canAddEquipment(available, items)
          }
          onClick={() =>
            setItems((v) =>
              canAddEquipment(available, v)
                ? [...v, { key: Date.now(), equipment: "", qty: "1" }]
                : v,
            )
          }
        >
          + เพิ่มอุปกรณ์
        </Button>
        <Inputs
          fields={[
            {
              name: "reason",
              label: "เหตุผลความจำเป็น",
              type: "textarea",
              maxLength: 500,
            },
          ]}
        />
      </Resource>
      <p className="notice">
        ต้องเช็กอินในพื้นที่ก่อนส่งคำขอ ผลพิจารณาจะแจ้งผ่าน LINE Chat
      </p>
    </ActionForm>
  );
}
