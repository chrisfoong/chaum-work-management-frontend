"use client";
import { useState, type ReactNode } from "react";
import { useSession } from "./auth";
import {
  ActionForm,
  Button,
  Field,
  Inputs,
  Modal,
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
  const { list, api } = useSession();
  const [remove, setRemove] = useState<Row | null>(null);
  const [section, setSection] = useState("contract");
  const [selected, setSelected] = useState<Row | "new" | null>(null);
  const [location, setLocation] = useState<Row | null>(null);
  const id = str(row, "tor_id");
  const resource = useData(
    (signal) => list(`assignments?tor_id=${id}&limit=100`, signal),
    [id],
  );
  const navigation = (
    <div className="tabs" aria-label="ส่วนที่แก้ไข">
      <button
        type="button"
        className={section === "contract" ? "active" : ""}
        onClick={() => {
          setSection("contract");
          setSelected(null);
        }}
      >
        ข้อมูลสัญญา
      </button>
      <button
        type="button"
        className={section === "areas" ? "active" : ""}
        onClick={() => {
          setSection("areas");
          setSelected(null);
        }}
      >
        พื้นที่และอุปกรณ์
      </button>
    </div>
  );
  if (remove)
    return (
      <ActionForm
        title="ลบพื้นที่ออกจาก TOR"
        onClose={() => setRemove(null)}
        onDone={() => {
          setRemove(null);
          resource.refresh();
          onDone();
        }}
        submit={() =>
          api.response(`assignments/${str(remove, "assignment_id")}`, {
            method: "DELETE",
            body: "{}",
          })
        }
      >
        <p>ยืนยันลบพื้นที่ {str(remove, "location_name")} ออกจากสัญญานี้?</p>
        <p className="notice">
          ลบได้เฉพาะพื้นที่ที่ยังไม่มีกะงาน การสำรวจ หรือรายการจัดซื้อ
          โดยไม่ลบสถานที่ในข้อมูลหลัก
        </p>
      </ActionForm>
    );
  if (section === "contract")
    return (
      <ContractInfoEditor
        row={row}
        onClose={onClose}
        onDone={onDone}
        navigation={navigation}
      />
    );
  if (location)
    return (
      <ContractLocationEditor
        area={location}
        onClose={() => setLocation(null)}
        onDone={() => {
          setLocation(null);
          resource.refresh();
        }}
      />
    );
  if (selected)
    return (
      <AssignmentEditor
        torID={id}
        area={selected === "new" ? undefined : selected}
        onClose={() => setSelected(null)}
        onDone={() => {
          setSelected(null);
          resource.refresh();
        }}
        navigation={navigation}
      />
    );
  return (
    <Modal title="แก้ไขรายละเอียดสัญญา" onClose={onClose}>
      {navigation}
      <Resource {...resource} retry={resource.refresh}>
        <div className="toolbar">
          <Button variant="secondary" onClick={() => setSelected("new")}>
            เพิ่มพื้นที่ใน TOR
          </Button>
        </div>
        {(resource.data || []).map((area) => (
          <section className="area-editor" key={str(area, "assignment_id")}>
            <h3>{str(area, "location_name")}</h3>
            <p className="muted">{str(area, "address")}</p>
            <p>คนงานขั้นต่ำ {str(area, "required_workers")} คน</p>
            <div className="toolbar">
              <Button variant="secondary" onClick={() => setSelected(area)}>
                แก้ไขพื้นที่และอุปกรณ์
              </Button>
              <Button variant="secondary" onClick={() => setLocation(area)}>
                แก้ไขชื่อ ที่อยู่ และพิกัด
              </Button>
              <Button variant="secondary" onClick={() => setRemove(area)}>
                ลบพื้นที่
              </Button>
            </div>
          </section>
        ))}
        {!resource.data?.length && (
          <p className="muted">ยังไม่มีพื้นที่ในสัญญานี้</p>
        )}
      </Resource>
      <div className="modal-footer">
        <Button variant="secondary" onClick={onClose}>
          ปิด
        </Button>
      </div>
    </Modal>
  );
}

function ContractLocationEditor({
  area,
  onClose,
  onDone,
}: {
  area: Row;
  onClose: () => void;
  onDone: () => void;
}) {
  const { list, api } = useSession();
  const id = str(area, "location_id");
  const resource = useData(
    async (signal) =>
      (await list("locations?limit=100", signal)).find(
        (location) => str(location, "location_id") === id,
      ),
    [id],
  );
  if (!resource.data)
    return (
      <Modal title="แก้ไขข้อมูลสถานที่" onClose={onClose}>
        <Resource {...resource} retry={resource.refresh}>
          <p>ไม่พบข้อมูลสถานที่ กรุณารีเฟรชรายการแล้วลองใหม่</p>
        </Resource>
        <div className="modal-footer">
          <Button variant="secondary" onClick={onClose}>
            กลับรายการพื้นที่
          </Button>
        </div>
      </Modal>
    );
  return (
    <Resource {...resource} retry={resource.refresh}>
      {resource.data && (
        <ActionForm
          title="แก้ไขข้อมูลสถานที่"
          onClose={onClose}
          onDone={onDone}
          submit={(fd) =>
            api.patch(`locations/${id}`, {
              location_name: fdString(fd, "location_name"),
              address: fdString(fd, "address"),
              latitude: fdNumber(fd, "latitude"),
              longitude: fdNumber(fd, "longitude"),
            })
          }
        >
          <Inputs
            fields={[
              {
                name: "location_name",
                label: "ชื่อพื้นที่",
                value: str(resource.data, "location_name"),
                maxLength: 255,
              },
              {
                name: "address",
                label: "ที่อยู่",
                value: str(resource.data, "address"),
              },
              {
                name: "latitude",
                label: "ละติจูด",
                value: str(resource.data, "latitude"),
                pattern: "-?[0-9]+(\\.[0-9]+)?",
              },
              {
                name: "longitude",
                label: "ลองจิจูด",
                value: str(resource.data, "longitude"),
                pattern: "-?[0-9]+(\\.[0-9]+)?",
              },
            ]}
          />
          <p className="notice">
            การแก้ชื่อและที่อยู่มีผลกับทุกสัญญาที่อ้างถึงสถานที่นี้
            พื้นที่ที่มีกะงานแล้วไม่สามารถเปลี่ยนพิกัดย้อนหลังได้
          </p>
        </ActionForm>
      )}
    </Resource>
  );
}

function ContractInfoEditor({
  row,
  onClose,
  onDone,
  navigation,
}: {
  row: Row;
  onClose: () => void;
  onDone: () => void;
  navigation?: ReactNode;
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
      {navigation}
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
  navigation,
}: {
  torID: string;
  area?: Row;
  onClose: () => void;
  onDone: () => void;
  navigation?: ReactNode;
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
          navigation={navigation}
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
  navigation,
}: {
  torID: string;
  area?: Row;
  initial: Row;
  locations: Row[];
  equipment: Row[];
  onClose: () => void;
  onDone: () => void;
  navigation?: ReactNode;
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
      {navigation}
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
  const { api, get } = useSession();
  const deductionSource = useData(
    (signal) =>
      get(
        `invoices/deduction-preview?tor_id=${str(row, "tor_id")}&billing_month=${str(row, "billing_month")}`,
        signal,
      ),
    [row.tor_id, row.billing_month],
  );
  const calculated = object(deductionSource.data);

  return (
    <ActionForm
      title="แก้ไขใบวางบิลที่ยังไม่รับเงิน"
      onClose={onClose}
      onDone={onDone}
      submitDisabled={
        deductionSource.loading ||
        !!deductionSource.error ||
        !deductionSource.data ||
        Number(calculated.pending_payroll || 0) > 0
      }
      submit={(fd) =>
        api.patch(`invoices/${str(row, "invoice_id")}`, {
          expected_amount: fdString(fd, "expected_amount"),
          auto_deduction: true,
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
            name: "deduction_reason",
            label: "เหตุผลเงินหัก",
            value: str(row, "deduction_reason"),
            required: false,
            type: "textarea",
          },
        ]}
      />
      <Field label="ยอดหักอัตโนมัติ (บาท)">
        <input
          aria-label="ยอดหักอัตโนมัติ"
          readOnly
          value={
            deductionSource.loading
              ? "กำลังคำนวณ…"
              : str(calculated, "deduction_amount") || "—"
          }
        />
      </Field>
      {deductionSource.error && <p role="alert">{deductionSource.error}</p>}
      {Number(calculated.pending_payroll || 0) > 0 && (
        <p className="notice">ยังประมวลผลค่าจ้างของโครงการ/เดือนนี้ไม่ครบ</p>
      )}
      <p className="notice">
        แก้ได้เฉพาะใบวางบิล pending หลังรับเงินจริงแล้วไม่สามารถเขียนทับยอดเดิม
      </p>
    </ActionForm>
  );
}
