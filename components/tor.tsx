"use client";
import { useState } from "react";
import { ContractEvidence } from "./contract-evidence";
import {
  contractInfoErrors,
  prepareContractEvidence,
  type ContractInfo,
} from "@/lib/contract-evidence";
import { FileText, MapPin, Plus, Trash2 } from "lucide-react";
import { useSession } from "./auth";
import { ContractDetailsEditor, AssignmentEditor } from "./editing";
import {
  InviteUserForm,
  RenewInvitationForm,
  CancelInvitationForm,
} from "./invitation";
import {
  ActionForm,
  AddButton,
  Back,
  Badge,
  Button,
  ErrorBox,
  Field,
  Heading,
  Inputs,
  Modal,
  Pager,
  Panel,
  Resource,
  RoleBadge,
  SearchBox,
  Table,
  fdNumber,
  fdString,
  useData,
} from "./ui";
import { dateThai, money, satang, todayBangkok } from "@/lib/domain";
import { str, object, type Row } from "@/lib/types";
export function Contracts() {
  const { list } = useSession();
  const [offset, setOffset] = useState(0);
  const [q, setQ] = useState("");
  const [selected, setSelected] = useState<Row | null>(null);
  const [create, setCreate] = useState(false);
  const resource = useData(
    (signal) => list(`contracts?limit=50&offset=${offset}`, signal),
    [offset],
  );
  const filtered = (resource.data || []).filter((r) =>
    `${str(r, "project_name")} ${str(r, "contract_no")}`.includes(q),
  );
  return (
    <>
      <Heading
        eyebrow="TOR & LOCATION"
        title="สัญญาและพื้นที่"
        description="จัดการสัญญา พื้นที่รับผิดชอบ และอุปกรณ์ตั้งต้น"
        action={
          <AddButton onClick={() => setCreate(true)}>สร้างสัญญา TOR</AddButton>
        }
      />
      {selected ? (
        <ContractDetail
          row={selected}
          onBack={() => {
            setSelected(null);
            resource.refresh();
          }}
        />
      ) : (
        <Panel>
          <div className="toolbar">
            <SearchBox value={q} onChange={setQ} />
            <span className="muted">ค้นหาในหน้าปัจจุบัน</span>
          </div>
          <Resource {...resource} retry={resource.refresh}>
            <Table
              data={filtered}
              columns={[
                { key: "contract_no", label: "เลขที่สัญญา" },
                { key: "project_name", label: "โครงการ" },
                { key: "partner_agency", label: "หน่วยงาน" },
                { key: "start_date", label: "เริ่ม", format: "date" },
                { key: "end_date", label: "สิ้นสุด", format: "date" },
                {
                  key: "workflow_status",
                  label: "สถานะ",
                  format: (r) => (
                    <Badge value={r.workflow_status || r.status} />
                  ),
                },
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
      {create && (
        <TORWizard onClose={() => setCreate(false)} onDone={resource.refresh} />
      )}
    </>
  );
}
function ContractDetail({ row, onBack }: { row: Row; onBack: () => void }) {
  const { get, list, api, user } = useSession();
  const id = str(row, "tor_id");
  const [tab, setTab] = useState("areas");
  const [edit, setEdit] = useState(false);
  const [downloadError, setDownloadError] = useState("");
  const [detailsEdit, setDetailsEdit] = useState(false);
  const [scopeEdit, setScopeEdit] = useState<Row | "new" | null>(null);
  const resource = useData(
    async (signal) => ({
      detail: object(await get(`contracts/${id}`, signal)),
      areas: await list(`assignments?tor_id=${id}&limit=100`, signal),
    }),
    [id],
  );
  const r = resource.data?.detail || row;
  return (
    <>
      <Back onClick={onBack} />
      <Panel
        title={str(r, "project_name")}
        action={
          <div className="toolbar">
            <Button variant="secondary" onClick={() => setEdit(true)}>
              เปลี่ยนสถานะ
            </Button>
            {user.role === "supervisor" && (
              <Button
                variant="secondary"
                disabled={
                  !str(r, "updated_at") ||
                  ["complete", "cancelled"].includes(str(r, "status"))
                }
                onClick={() => setDetailsEdit(true)}
              >
                แก้ไขรายละเอียด
              </Button>
            )}
          </div>
        }
      >
        <div className="contract-summary">
          <span>
            <FileText /> {str(r, "contract_no")}
          </span>
          <span>{str(r, "partner_agency")}</span>
          <Badge value={r.status} />
        </div>
        <div className="stats-grid">
          <div>
            <small>มูลค่าสัญญา</small>
            <h2>{money(str(r, "contract_value"))}</h2>
          </div>
          <div>
            <small>วันที่เริ่ม</small>
            <h3>{dateThai(str(r, "start_date"))}</h3>
          </div>
          <div>
            <small>วันที่สิ้นสุด</small>
            <h3>{dateThai(str(r, "end_date"))}</h3>
          </div>
        </div>
        {str(r, "contract_file_url") && (
          <Button
            variant="secondary"
            onClick={() =>
              api
                .download(
                  `files?path=${encodeURIComponent(str(r, "contract_file_url"))}`,
                  "contract.png",
                )
                .catch((e) => setDownloadError(e.message))
            }
          >
            ดาวน์โหลดหลักฐานสัญญา
          </Button>
        )}
      </Panel>
      {downloadError && <ErrorBox error={downloadError} />}
      {detailsEdit && (
        <ContractDetailsEditor
          row={r}
          onClose={() => {
            setDetailsEdit(false);
            resource.refresh();
          }}
          onDone={() => {
            setDetailsEdit(false);
            resource.refresh();
          }}
        />
      )}
      {scopeEdit && (
        <AssignmentEditor
          torID={id}
          area={scopeEdit === "new" ? undefined : scopeEdit}
          onClose={() => setScopeEdit(null)}
          onDone={() => {
            setScopeEdit(null);
            resource.refresh();
          }}
        />
      )}
      <div className="tabs">
        {[
          ["areas", "พื้นที่และคนงาน"],
          ["info", "ข้อมูลสัญญา"],
        ].map(([k, l]) => (
          <button
            key={k}
            className={tab === k ? "active" : ""}
            onClick={() => setTab(k)}
          >
            {l}
          </button>
        ))}
      </div>
      <Resource {...resource} retry={resource.refresh}>
        {tab === "areas" ? (
          <Panel
            action={
              user.role === "supervisor" &&
              !["complete", "cancelled"].includes(str(r, "status")) ? (
                <Button onClick={() => setScopeEdit("new")}>
                  เพิ่มพื้นที่ใน TOR
                </Button>
              ) : undefined
            }
          >
            <Table
              data={resource.data?.areas || []}
              onRow={
                user.role === "supervisor"
                  ? (area) => setScopeEdit(area)
                  : undefined
              }
              columns={[
                { key: "location_name", label: "พื้นที่" },
                { key: "required_workers", label: "คนงานขั้นต่ำ" },
                { key: "address", label: "ที่อยู่" },
                {
                  key: "can_schedule",
                  label: "จัดตารางได้",
                  format: (r) => (r.can_schedule ? "พร้อม" : "ยังไม่พร้อม"),
                },
              ]}
            />
          </Panel>
        ) : (
          <Panel title="เงื่อนไขการดำเนินงาน">
            <p>
              สัญญาต้องมีสถานะ active และอยู่ในช่วงวันที่เริ่ม–สิ้นสุด
              การจัดตารางต้องผ่านการจัดหาอุปกรณ์ตั้งต้นและจำนวนคนงานขั้นต่ำ
            </p>
          </Panel>
        )}
      </Resource>
      {edit && (
        <ActionForm
          title="เปลี่ยนสถานะสัญญา"
          onClose={() => setEdit(false)}
          onDone={resource.refresh}
          submit={(fd) =>
            api.patch(`contracts/${id}`, { status: fdString(fd, "status") })
          }
        >
          <Inputs
            fields={[
              {
                name: "status",
                label: "สถานะ",
                value: str(r, "status"),
                options: [
                  { value: "registered", label: "ลงทะเบียน" },
                  { value: "active", label: "ดำเนินงาน" },
                  { value: "complete", label: "สิ้นสุด" },
                  { value: "cancelled", label: "ยกเลิก" },
                ],
              },
            ]}
          />
          <p className="notice">
            การสิ้นสุดหรือยกเลิกสัญญาจะป้องกันการจัดตารางใหม่
          </p>
        </ActionForm>
      )}
    </>
  );
}
type Area = {
  key: number;
  location_id: string;
  new_name: string;
  address: string;
  latitude: string;
  longitude: string;
  required_workers: string;
  items: {
    key: number;
    equipment_name: string;
    required_qty: string;
    remark: string;
  }[];
};
function TORWizard({
  onClose,
  onDone,
}: {
  onClose: () => void;
  onDone: () => void;
}) {
  const { api } = useSession();
  const [step, setStep] = useState(1);
  const [info, setInfo] = useState<Row>({});
  const [draft, setDraft] = useState<ContractInfo>({
    start_date: todayBangkok(),
  });
  const [files, setFiles] = useState<File[]>([]);
  const [prepared, setPrepared] = useState<File | null>(null);
  const [uploaded, setUploaded] = useState<{ file: File; path: string } | null>(
    null,
  );
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const readDraft = (form: HTMLFormElement): ContractInfo => {
    const fd = new FormData(form);
    return Object.fromEntries(
      [
        "contract_no",
        "project_name",
        "partner_agency",
        "start_date",
        "end_date",
        "contract_value",
      ].map((key) => [key, fdString(fd, key)]),
    );
  };
  async function prepareEvidence() {
    if (prepared) return prepared;
    const file = await prepareContractEvidence(files);
    setPrepared(file);
    return file;
  }
  const [areas, setAreas] = useState<Area[]>([
    {
      key: 1,
      location_id: "new",
      new_name: "",
      address: "",
      latitude: "",
      longitude: "",
      required_workers: "1",
      items: [{ key: 1, equipment_name: "", required_qty: "1", remark: "" }],
    },
  ]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);
  const change = (index: number, patch: Partial<Area>) =>
    setAreas((a) => a.map((v, i) => (i === index ? { ...v, ...patch } : v)));
  return (
    <Modal title="สร้างสัญญา TOR" onClose={onClose} busy={busy}>
      {!done && (
        <div className="wizard-steps">
          <span className={step === 1 ? "active" : ""}>1 ข้อมูลสัญญา</span>
          <span className={step === 2 ? "active" : ""}>
            2 พื้นที่และอุปกรณ์
          </span>
        </div>
      )}
      {done ? (
        <div className="success">
          <h3>สร้างสัญญาเรียบร้อยแล้ว</h3>
          <Button
            onClick={() => {
              onDone();
              onClose();
            }}
          >
            กลับรายการ
          </Button>
        </div>
      ) : step === 1 ? (
        <form
          noValidate
          onInput={(e) => {
            const next = readDraft(e.currentTarget);
            setDraft(next);
            if (Object.values(fieldErrors).some(Boolean))
              setFieldErrors((previous) => ({
                ...contractInfoErrors(next),
                ...(previous.file ? { file: previous.file } : {}),
              }));
          }}
          onSubmit={async (e) => {
            e.preventDefault();
            const form = e.currentTarget;
            const data = readDraft(form);
            setDraft(data);
            const problems = contractInfoErrors(data);
            if (!files.length)
              problems.file = "กรุณาแนบภาพหลักฐานสัญญา PNG อย่างน้อย 1 ภาพ";
            setFieldErrors(problems);
            setError("");
            if (Object.keys(problems).length) {
              form
                .querySelector<HTMLElement>(
                  `[name="${Object.keys(problems)[0]}"]`,
                )
                ?.focus();
              return;
            }
            setBusy(true);
            try {
              await api.post("contracts/info", data);
              let file: File;
              try {
                file = await prepareEvidence();
              } catch (e) {
                setFieldErrors((previous) => ({
                  ...previous,
                  file:
                    e instanceof Error ? e.message : "ตรวจไฟล์หลักฐานไม่สำเร็จ",
                }));
                return;
              }
              const path =
                uploaded?.file === file
                  ? uploaded.path
                  : await api.upload(file, ["image/png"]);
              setUploaded({ file, path });
              setInfo({ ...data, contract_file_path: path });
              setStep(2);
            } catch (e) {
              const message =
                e instanceof Error
                  ? e.message
                  : "ตรวจข้อมูลไม่สำเร็จ กรุณาลองอีกครั้ง";
              if (/duplicate|contract.*exist|เลข.*สัญญา.*ซ้ำ/i.test(message))
                setFieldErrors((previous) => ({
                  ...previous,
                  contract_no:
                    "เลขที่สัญญานี้มีอยู่แล้ว กรุณาตรวจสอบหรือใช้เลขสัญญาอื่น",
                }));
              else setError(message);
            } finally {
              setBusy(false);
            }
          }}
        >
          <fieldset disabled={busy}>
            <Inputs
              errors={fieldErrors}
              fields={[
                {
                  name: "contract_no",
                  label: "เลขที่สัญญา",
                  pattern: "[0-9]{10}",
                  maxLength: 10,
                  hint: "ตัวเลข 10 หลัก",
                },
                { name: "project_name", label: "ชื่อโครงการ", maxLength: 255 },
                { name: "partner_agency", label: "หน่วยงาน", maxLength: 255 },
                {
                  name: "start_date",
                  label: "วันที่เริ่ม",
                  type: "date",
                  value: todayBangkok(),
                },
                { name: "end_date", label: "วันที่สิ้นสุด", type: "date" },
                {
                  name: "contract_value",
                  label: "มูลค่าสัญญา (บาท)",
                  pattern: "[0-9]+(\\.[0-9]{1,2})?",
                },
              ].map((field) => ({ ...field, value: draft[field.name] || "" }))}
            />
            <ContractEvidence
              files={files}
              onChange={(next) => {
                setFiles(next);
                setPrepared(null);
                setUploaded(null);
              }}
              error={fieldErrors.file}
              onError={(message) =>
                setFieldErrors((previous) => ({ ...previous, file: message }))
              }
              prepared={prepared}
              onPrepare={prepareEvidence}
            />
          </fieldset>
          {error && <ErrorBox error={error} />}
          <div className="modal-footer">
            <Button variant="secondary" onClick={onClose}>
              ยกเลิก
            </Button>
            <Button type="submit" disabled={busy}>
              {busy ? "กำลังตรวจสอบ…" : "ถัดไป →"}
            </Button>
          </div>
        </form>
      ) : (
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            setBusy(true);
            setError("");
            try {
              const scope = {
                areas: areas.map((a) => ({
                  ...(a.location_id && a.location_id !== "new"
                    ? { location_id: a.location_id }
                    : {
                        new_location: {
                          name: a.new_name,
                          address: a.address,
                          latitude: Number(a.latitude),
                          longitude: Number(a.longitude),
                        },
                      }),
                  required_workers: Number(a.required_workers),
                  items: a.items.map((it) => ({
                    equipment_name: it.equipment_name,
                    required_qty: Number(it.required_qty),
                    remark: it.remark,
                  })),
                })),
              };
              await api.post("contracts/scope", scope);
              await api.post("contracts/confirm", { contract: info, scope });
              setDone(true);
            } catch (e) {
              setError(e instanceof Error ? e.message : "สร้างสัญญาไม่สำเร็จ");
            } finally {
              setBusy(false);
            }
          }}
        >
          <fieldset disabled={busy}>
            {areas.map((a, i) => (
              <div className="area-editor" key={a.key}>
                <div className="panel-heading">
                  <h3>
                    <MapPin size={18} /> พื้นที่ {i + 1}
                  </h3>
                  {areas.length > 1 && (
                    <button
                      type="button"
                      aria-label="ลบพื้นที่"
                      onClick={() =>
                        setAreas((v) => v.filter((_, j) => i !== j))
                      }
                    >
                      <Trash2 size={17} />
                    </button>
                  )}
                </div>
                <>
                  <Field label="ชื่อพื้นที่">
                    <input
                      required
                      aria-label="ชื่อพื้นที่"
                      value={a.new_name}
                      onChange={(e) => change(i, { new_name: e.target.value })}
                    />
                  </Field>
                  <Field label="ที่อยู่">
                    <input
                      aria-label="ที่อยู่"
                      value={a.address}
                      onChange={(e) => change(i, { address: e.target.value })}
                    />
                  </Field>
                  <div className="form-grid">
                    <Field label="ละติจูด (Latitude)">
                      <input
                        aria-label="ละติจูด (Latitude)"
                        type="number"
                        step="any"
                        min="-90"
                        max="90"
                        required
                        value={a.latitude}
                        onChange={(e) =>
                          change(i, { latitude: e.target.value })
                        }
                      />
                    </Field>
                    <Field label="ลองจิจูด (Longitude)">
                      <input
                        aria-label="ลองจิจูด (Longitude)"
                        type="number"
                        step="any"
                        min="-180"
                        max="180"
                        required
                        value={a.longitude}
                        onChange={(e) =>
                          change(i, { longitude: e.target.value })
                        }
                      />
                    </Field>
                  </div>
                  <p className="muted">
                    พิกัดนี้ใช้ตรวจระยะ GPS เมื่อพนักงานเช็กอิน
                  </p>
                </>
                <Field label="จำนวนคนงานขั้นต่ำ">
                  <input
                    aria-label="จำนวนคนงานขั้นต่ำ"
                    type="number"
                    required
                    min="1"
                    max="1000"
                    value={a.required_workers}
                    onChange={(e) =>
                      change(i, { required_workers: e.target.value })
                    }
                  />
                </Field>
                <h4>อุปกรณ์ตั้งต้น</h4>
                {a.items.map((it, j) => (
                  <div className="item-editor" key={it.key}>
                    <input
                      aria-label={`ชื่ออุปกรณ์ ${j + 1}`}
                      placeholder="ชื่ออุปกรณ์"
                      value={it.equipment_name}
                      required
                      onChange={(e) =>
                        change(i, {
                          items: a.items.map((v, k) =>
                            k === j
                              ? { ...v, equipment_name: e.target.value }
                              : v,
                          ),
                        })
                      }
                    />
                    <input
                      aria-label={`จำนวนอุปกรณ์ ${j + 1}`}
                      type="number"
                      min="1"
                      max="1000000"
                      required
                      value={it.required_qty}
                      onChange={(e) =>
                        change(i, {
                          items: a.items.map((v, k) =>
                            k === j
                              ? { ...v, required_qty: e.target.value }
                              : v,
                          ),
                        })
                      }
                    />
                    {a.items.length > 1 && (
                      <button
                        type="button"
                        aria-label="ลบอุปกรณ์"
                        onClick={() =>
                          change(i, {
                            items: a.items.filter((_, k) => k !== j),
                          })
                        }
                      >
                        <Trash2 size={16} />
                      </button>
                    )}
                  </div>
                ))}
                <Button
                  variant="text"
                  onClick={() =>
                    change(i, {
                      items: [
                        ...a.items,
                        {
                          key: Date.now(),
                          equipment_name: "",
                          required_qty: "1",
                          remark: "",
                        },
                      ],
                    })
                  }
                >
                  <Plus size={16} />
                  เพิ่มอุปกรณ์
                </Button>
              </div>
            ))}
            <Button
              variant="secondary"
              onClick={() =>
                setAreas((v) => [
                  ...v,
                  {
                    key: Date.now(),
                    location_id: "new",
                    new_name: "",
                    address: "",
                    latitude: "",
                    longitude: "",
                    required_workers: "1",
                    items: [
                      {
                        key: 1,
                        equipment_name: "",
                        required_qty: "1",
                        remark: "",
                      },
                    ],
                  },
                ])
              }
            >
              <Plus size={16} />
              เพิ่มพื้นที่
            </Button>
          </fieldset>
          {error && <ErrorBox error={error} />}
          <div className="modal-footer">
            <Button
              variant="secondary"
              onClick={() => setStep(1)}
              disabled={busy}
            >
              ย้อนกลับ
            </Button>
            <Button type="submit" disabled={busy}>
              {busy ? "กำลังบันทึก…" : "ยืนยันสร้างสัญญา"}
            </Button>
          </div>
        </form>
      )}
    </Modal>
  );
}
export function Catalog() {
  const [createInvitation, setCreateInvitation] = useState(false);
  const [renewInvitation, setRenewInvitation] = useState<Row | null>(null);
  const [cancelInvitation, setCancelInvitation] = useState<Row | null>(null);
  const { list, api } = useSession();
  const [tab, setTab] = useState("equipment");
  const [edit, setEdit] = useState<Row | null>(null);
  const [create, setCreate] = useState(false);
  const [offset, setOffset] = useState(0);
  const resource = useData(
    (signal) => list(`${tab}?limit=50&offset=${offset}`, signal),
    [tab, offset],
  );
  const title =
    tab === "users" ? "บุคลากร" : tab === "locations" ? "สถานที่" : "อุปกรณ์";
  const r = edit || {};
  const unbound =
    r.invitation_pending === true || r.invitation_cancelled === true;
  const fields =
    tab === "equipment"
      ? [
          {
            name: "equipment_name",
            label: "ชื่ออุปกรณ์",
            value: str(r, "equipment_name"),
          },
        ]
      : tab === "locations"
        ? [
            {
              name: "location_name",
              label: "ชื่อสถานที่",
              value: str(r, "location_name"),
            },
            {
              name: "address",
              label: "ที่อยู่",
              required: false,
              value: str(r, "address"),
            },
            {
              name: "latitude",
              label: "ละติจูด",
              required: false,
              value: str(r, "latitude"),
            },
            {
              name: "longitude",
              label: "ลองจิจูด",
              required: false,
              value: str(r, "longitude"),
            },
          ]
        : [
            { name: "first_name", label: "ชื่อ", value: str(r, "first_name") },
            { name: "last_name", label: "นามสกุล", value: str(r, "last_name") },
            {
              name: "phone_number",
              label: "โทรศัพท์",
              value: str(r, "phone_number"),
              pattern: "[0-9]{10}",
            },
            { name: "bank_name", label: "ธนาคาร", value: str(r, "bank_name") },
            {
              name: "bank_account_no",
              label: "เลขบัญชี",
              value: str(r, "bank_account_no"),
            },
            {
              name: "daily_wage",
              label: "ค่าจ้างต่อวัน",
              value: str(r, "daily_wage") || "400.00",
            },
          ];
  return (
    <>
      <Heading
        title="ข้อมูลหลัก"
        description="ตั้งค่าอุปกรณ์ พิกัดพื้นที่ และบัญชีผู้ใช้"
        action={
          tab === "users" ? (
            <AddButton onClick={() => setCreateInvitation(true)}>
              เพิ่มบุคลากร
            </AddButton>
          ) : (
            <AddButton onClick={() => setCreate(true)}>เพิ่ม{title}</AddButton>
          )
        }
      />
      <div className="tabs">
        {[
          ["equipment", "อุปกรณ์"],
          ["locations", "สถานที่"],
          ["users", "บุคลากร"],
        ].map(([k, l]) => (
          <button
            key={k}
            className={tab === k ? "active" : ""}
            onClick={() => {
              setTab(k);
              setOffset(0);
            }}
          >
            {l}
          </button>
        ))}
      </div>
      {createInvitation && (
        <InviteUserForm
          onClose={() => setCreateInvitation(false)}
          onDone={resource.refresh}
        />
      )}
      {cancelInvitation && (
        <CancelInvitationForm
          user={cancelInvitation}
          onClose={() => setCancelInvitation(null)}
          onDone={resource.refresh}
        />
      )}
      {renewInvitation && (
        <RenewInvitationForm
          user={renewInvitation}
          onClose={() => setRenewInvitation(null)}
          onDone={resource.refresh}
        />
      )}
      <Panel>
        <Resource {...resource} retry={resource.refresh}>
          <Table
            data={resource.data || []}
            columns={
              tab === "users"
                ? [
                    {
                      key: "first_name",
                      label: "ชื่อ–นามสกุล",
                      format: (r) =>
                        [str(r, "first_name"), str(r, "last_name")]
                          .filter(Boolean)
                          .join(" ") || "—",
                    },
                    {
                      key: "role",
                      label: "บทบาท",
                      format: (r) => <RoleBadge value={r.role} />,
                    },
                    {
                      key: "daily_wage",
                      label: "ค่าจ้างต่อวัน (บาท)",
                      format: (r) =>
                        r.daily_wage == null
                          ? "—"
                          : money(str(r, "daily_wage")),
                    },
                    {
                      key: "is_active",
                      label: "สถานะบัญชี",
                      format: (r) => (
                        <span
                          className={`badge ${r.invitation_cancelled ? "neutral" : r.invitation_pending ? "amber" : r.is_active ? "green" : "red"}`}
                        >
                          {r.invitation_cancelled
                            ? "ยกเลิกลิงก์แล้ว"
                            : r.invitation_pending
                              ? "รอผูก LINE"
                              : r.is_active
                                ? "ใช้งาน"
                                : "ระงับ"}
                        </span>
                      ),
                    },
                    {
                      key: "invitation_pending",
                      label: "เชื่อมบัญชี LINE",
                      format: (r) =>
                        r.invitation_pending || r.invitation_cancelled ? (
                          <div className="invitation-actions">
                            <button
                              className="text-button"
                              onClick={() => setRenewInvitation(r)}
                            >
                              ออกลิงก์เชิญใหม่
                            </button>
                            {r.invitation_pending === true && (
                              <button
                                className="text-button danger-text"
                                onClick={() => setCancelInvitation(r)}
                              >
                                ยกเลิกลิงก์เชิญ
                              </button>
                            )}
                          </div>
                        ) : (
                          "เชื่อมแล้ว"
                        ),
                    },
                  ]
                : tab === "locations"
                  ? [
                      { key: "location_name", label: "สถานที่" },
                      { key: "address", label: "ที่อยู่" },
                      { key: "latitude", label: "ละติจูด" },
                      { key: "longitude", label: "ลองจิจูด" },
                    ]
                  : [
                      { key: "equipment_name", label: "อุปกรณ์" },
                      {
                        key: "is_active",
                        label: "สถานะ",
                        format: (r) => (r.is_active ? "ใช้งาน" : "ระงับ"),
                      },
                    ]
            }
            onRow={setEdit}
          />
          <Pager
            offset={offset}
            count={resource.data?.length || 0}
            onChange={setOffset}
          />
        </Resource>
      </Panel>
      {(create || edit) && (
        <ActionForm
          key={tab}
          title={`${edit ? "แก้ไข" : "เพิ่ม"}${title}`}
          onClose={() => {
            setCreate(false);
            setEdit(null);
          }}
          onDone={resource.refresh}
          submit={(fd) => {
            const data: Row = {};
            fields.forEach((f) => (data[f.name] = fdString(fd, f.name)));
            if (tab === "locations") {
              if (edit && (!data.latitude || !data.longitude))
                throw new Error(
                  "กรอกพิกัดทั้งสองช่องเพื่อยืนยันการแก้ไขสถานที่และป้องกันล้างพิกัดเดิม",
                );
              data.latitude =
                data.latitude === "" ? null : fdNumber(fd, "latitude");
              data.longitude =
                data.longitude === "" ? null : fdNumber(fd, "longitude");
            }
            if (tab === "users") satang(String(data.daily_wage));
            if (tab === "equipment" || (tab === "users" && edit && !unbound))
              data.is_active = fdString(fd, "is_active") !== "false";
            if (tab === "users" && edit && r.role === "worker" && !unbound)
              data.is_available = fdString(fd, "is_available") === "true";
            return edit
              ? api.patch(
                  `${tab}/${str(edit, tab === "users" ? "user_id" : tab === "locations" ? "location_id" : "equipment_id")}`,
                  data,
                )
              : api.post(tab, data);
          }}
        >
          <Inputs fields={fields} />
          {tab === "users" && edit && r.invitation_cancelled === true && (
            <p className="notice">
              ลิงก์เชิญถูกยกเลิกแล้ว กรุณาออกลิงก์ใหม่ให้เจ้าของบัญชีเพื่อผูก
              LINE
            </p>
          )}
          {tab === "users" && edit && r.invitation_pending === true && (
            <p className="notice">
              สถานะบัญชี: รอผูก LINE —
              บัญชีจะเปิดใช้งานอัตโนมัติเมื่อเจ้าของบัญชียืนยันลิงก์เชิญ
              ไม่ใช่บัญชีที่ถูกระงับ
            </p>
          )}
          {(tab === "equipment" || (tab === "users" && edit && !unbound)) && (
            <Inputs
              fields={[
                {
                  name: "is_active",
                  label: "สถานะใช้งาน",
                  value: r.is_active === false ? "false" : "true",
                  options: [
                    { value: "true", label: "ใช้งาน" },
                    { value: "false", label: "ระงับ" },
                  ],
                },
              ]}
            />
          )}
          {tab === "users" && edit && r.role === "worker" && !unbound && (
            <Inputs
              fields={[
                {
                  name: "is_available",
                  label: "พร้อมรับงาน",
                  value: r.is_available === false ? "false" : "true",
                  options: [
                    { value: "true", label: "พร้อม" },
                    { value: "false", label: "ไม่พร้อม" },
                  ],
                },
              ]}
            />
          )}
          {tab === "locations" && (
            <p className="notice">
              พิกัดใช้สำหรับตรวจ GPS รัศมี 200 เมตร
              กรอกละติจูดและลองจิจูดให้ครบทั้งคู่
            </p>
          )}
        </ActionForm>
      )}
    </>
  );
}
