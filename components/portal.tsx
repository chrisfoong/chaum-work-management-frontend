"use client";
import { useState } from "react";
import {
  CalendarDays,
  ClipboardCheck,
  FileText,
  Home,
  LayoutDashboard,
  Leaf,
  LogOut,
  Menu,
  Package,
  PieChart,
  QrCode,
  Settings,
  ShieldCheck,
  Users,
  Wallet,
  X,
} from "lucide-react";
import { useSession } from "./auth";
import {
  Badge,
  Brand,
  Button,
  Heading,
  Panel,
  Resource,
  Stat,
  Table,
  useData,
} from "./ui";
import { Contracts, Catalog } from "./tor";
import { Schedules, Leaves, Attendance, Operations, StaffQR } from "./schedule";
import { Requisitions } from "./procurement";
import { Payroll, Finance } from "./finance";
import { WorkerHome, WorkerPayslips, Profile } from "./worker";
import { roleName, str, num, object, rows } from "@/lib/types";
import { dateThai, todayBangkok } from "@/lib/domain";
type Section =
  | "home"
  | "contracts"
  | "schedule"
  | "leave"
  | "procurement"
  | "attendance"
  | "payroll"
  | "finance"
  | "operations"
  | "qr"
  | "catalog"
  | "profile";
const menu = {
  supervisor: [
    ["home", "ภาพรวม", LayoutDashboard],
    ["contracts", "สัญญาและพื้นที่", FileText],
    ["procurement", "อนุมัติจัดซื้อ", Package],
    ["attendance", "การเข้างาน", ClipboardCheck],
    ["payroll", "ค่าจ้างและเงินหัก", Wallet],
    ["finance", "ต้นทุนและกำไร", PieChart],
    ["qr", "QR เข้างาน", QrCode],
    ["catalog", "ข้อมูลหลัก", Settings],
  ],
  assistant: [
    ["home", "งานวันนี้", LayoutDashboard],
    ["schedule", "จัดตารางคนงาน", CalendarDays],
    ["leave", "แจ้งลา / หาคนแทน", Users],
    ["procurement", "อุปกรณ์และจัดซื้อ", Package],
    ["operations", "สรุปการดำเนินงาน", PieChart],
    ["qr", "QR เข้างาน", QrCode],
  ],
  worker: [
    ["home", "หน้าหลัก", Home],
    ["schedule", "ตารางงาน", CalendarDays],
    ["payroll", "ค่าจ้าง", Wallet],
    ["profile", "โปรไฟล์", Users],
  ],
} as const;
export function Portal() {
  const { user, logout, preview } = useSession();
  const [section, setSection] = useState<Section>(() =>
    user.role === "assistant" &&
    typeof window !== "undefined" &&
    new URLSearchParams(window.location.search).has("tor_id")
      ? "operations"
      : "home",
  );
  const [open, setOpen] = useState(false);
  const worker = user.role === "worker";
  const title = menu[user.role].find((m) => m[0] === section)?.[1] || "ชะอุ่ม";
  const navigate = (next: Section) => {
    setSection(next);
    setOpen(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };
  const content =
    section === "home" ? (
      worker ? (
        <WorkerHome navigate={navigate} />
      ) : (
        <Dashboard navigate={navigate} />
      )
    ) : section === "contracts" ? (
      <Contracts />
    ) : section === "schedule" ? (
      <Schedules worker={worker} />
    ) : section === "leave" ? (
      <Leaves />
    ) : section === "procurement" ? (
      <Requisitions />
    ) : section === "attendance" ? (
      <Attendance />
    ) : section === "payroll" ? (
      worker ? (
        <WorkerPayslips />
      ) : (
        <Payroll />
      )
    ) : section === "finance" ? (
      <Finance />
    ) : section === "operations" ? (
      <Operations />
    ) : section === "qr" ? (
      <StaffQR />
    ) : section === "catalog" ? (
      <Catalog />
    ) : (
      <Profile />
    );
  return (
    <div className={worker ? "worker-shell" : "app-shell"}>
      {!worker && (
        <>
          <div
            className={`sidebar-shade ${open ? "show" : ""}`}
            onClick={() => setOpen(false)}
          />
          <aside className={`sidebar ${open ? "open" : ""}`}>
            <Brand />
            <div className="sidebar-label">WORKSPACE</div>
            <nav aria-label="เมนูหลัก">
              {menu[user.role].map(([key, label, Icon]) => (
                <button
                  key={key}
                  className={section === key ? "active" : ""}
                  onClick={() => navigate(key)}
                >
                  <Icon size={20} />
                  {label}
                </button>
              ))}
            </nav>
            <div className="sidebar-bottom">
              <div className="sidebar-help">
                <Leaf size={20} />
                <span>พื้นที่สีเขียว เติบโตไปด้วยกัน</span>
              </div>
              <button className="account" onClick={() => navigate("profile")}>
                <span className="avatar">
                  {user.first_name?.slice(0, 1) || "ช"}
                </span>
                <div>
                  <strong>
                    {user.first_name} {user.last_name}
                  </strong>
                  <small>{roleName(user.role)}</small>
                </div>
              </button>
              <button className="text-button" onClick={logout}>
                <LogOut size={16} />
                ออกจากระบบ
              </button>
            </div>
          </aside>
        </>
      )}
      <div className="main-shell">
        <header className="topbar">
          {worker ? (
            <Brand small />
          ) : (
            <>
              <button
                className="mobile-menu"
                aria-label="เปิดเมนู"
                onClick={() => setOpen(!open)}
              >
                {open ? <X /> : <Menu />}
              </button>
              <div className="breadcrumb">
                พื้นที่ทำงาน <span>/</span> <strong>{title}</strong>
              </div>
            </>
          )}
          <div className="topbar-right">
            {worker ? (
              <span className="worker-header-title">{title}</span>
            ) : (
              <span className="today">
                <CalendarDays size={16} />
                {dateThai(todayBangkok())}
              </span>
            )}
            <button
              aria-label="โปรไฟล์"
              className="avatar"
              onClick={() => navigate("profile")}
            >
              {user.first_name?.slice(0, 1) || "ช"}
            </button>
          </div>
        </header>
        <main className="main-content">
          {preview && (
            <div className="preview-note">
              หน้าตาตัวอย่างจาก Figma — ปุ่มบันทึกไม่เชื่อมฐานข้อมูล
            </div>
          )}
          {content}
        </main>
        {!worker && (
          <footer className="app-footer">
            © 2026 ชะอุ่ม · ระบบจัดการงานและพื้นที่สีเขียว{" "}
            <span>
              <ShieldCheck size={14} /> {roleName(user.role)}
            </span>
          </footer>
        )}
      </div>
      {worker && (
        <nav className="bottom-nav" aria-label="เมนูพนักงาน">
          {menu.worker.map(([key, label, Icon]) => (
            <button
              key={key}
              className={section === key ? "active" : ""}
              onClick={() => navigate(key)}
            >
              <Icon size={23} />
              <span>{label}</span>
            </button>
          ))}
        </nav>
      )}
    </div>
  );
}
function Dashboard({ navigate }: { navigate: (s: Section) => void }) {
  const { user, get, list } = useSession();
  const resource = useData(
    async (signal) => ({
      stats: object(await get("dashboard", signal)),
      requests: await list("requisitions?limit=5", signal),
    }),
    [user.role],
  );
  const stats = resource.data?.stats || {};
  return (
    <>
      <Heading
        eyebrow="WORKSPACE OVERVIEW"
        title={`สวัสดี ${user.first_name} 👋`}
        description={
          user.role === "supervisor"
            ? "ภาพรวมโครงการและงานที่รอคุณพิจารณาวันนี้"
            : "ดูแลงานประจำวัน จัดคน และติดตามความพร้อมของพื้นที่"
        }
      />
      <Resource {...resource} retry={resource.refresh}>
        <div className="stats-grid">
          <Stat
            label="สัญญาที่กำลังดำเนินงาน"
            value={num(stats, "open_contracts")}
            icon={<FileText size={21} />}
            note="ข้อมูลปัจจุบันจากระบบ"
          />
          <Stat
            label="คำขอลารอพิจารณา"
            value={num(stats, "pending_leave")}
            icon={<CalendarDays size={21} />}
            note="ผู้ดูแลงานพิจารณาและจัดคนแทน"
          />
          <Stat
            label="คำขออุปกรณ์ค้างดำเนินงาน"
            value={num(stats, "open_requisitions")}
            icon={<Package size={21} />}
            note="ติดตามความพร้อมของแต่ละพื้นที่"
          />
          <Stat
            label="บทบาทของคุณ"
            value={roleName(user.role)}
            icon={<Users size={21} />}
            note="สิทธิ์ตรวจสอบจากฐานข้อมูล"
          />
        </div>
        <div className="dashboard-columns">
          <Panel
            title="งานที่รอดำเนินการ"
            action={
              <button
                className="text-button"
                onClick={() => navigate("procurement")}
              >
                ดูทั้งหมด →
              </button>
            }
          >
            <div className="task-list">
              {(resource.data?.requests || []).map((r) => (
                <button
                  key={str(r, "requisition_id")}
                  onClick={() => navigate("procurement")}
                >
                  <span className="task-icon">
                    <Package size={20} />
                  </span>
                  <div>
                    <strong>{str(r, "requisition_no")}</strong>
                    <small>
                      {str(r, "project_name")} · {str(r, "location_name")}
                    </small>
                  </div>
                  <Badge value={r.status} />
                </button>
              ))}
              {!resource.data?.requests.length && (
                <p className="muted padded">ไม่มีคำขออุปกรณ์ค้างในรายการนี้</p>
              )}
            </div>
          </Panel>
          <Panel title="ทางลัด">
            <div className="quick-grid">
              {user.role === "supervisor" ? (
                <>
                  <Button
                    variant="secondary"
                    onClick={() => navigate("contracts")}
                  >
                    <FileText />
                    สร้างสัญญา TOR
                  </Button>
                  <Button
                    variant="secondary"
                    onClick={() => navigate("payroll")}
                  >
                    <Wallet />
                    ประมวลผลค่าจ้าง
                  </Button>
                </>
              ) : (
                <>
                  <Button
                    variant="secondary"
                    onClick={() => navigate("schedule")}
                  >
                    <CalendarDays />
                    จัดตารางงาน
                  </Button>
                  <Button variant="secondary" onClick={() => navigate("leave")}>
                    <Users />
                    พิจารณาใบลา
                  </Button>
                </>
              )}
              <Button variant="secondary" onClick={() => navigate("qr")}>
                <QrCode />
                ออก QR พื้นที่
              </Button>
              <Button
                variant="secondary"
                onClick={() =>
                  navigate(
                    user.role === "supervisor" ? "finance" : "operations",
                  )
                }
              >
                <PieChart />
                ดูผลสรุป
              </Button>
            </div>
          </Panel>
        </div>
        <Panel title="สถานะสัญญา">
          <Table
            data={rows(stats.contracts)}
            columns={[
              { key: "project_name", label: "โครงการ" },
              { key: "contract_no", label: "เลขที่สัญญา" },
              {
                key: "workflow_status",
                label: "สถานะ",
                format: (r) => <Badge value={r.workflow_status || r.status} />,
              },
              { key: "end_date", label: "สิ้นสุด", format: "date" },
            ]}
          />
        </Panel>
      </Resource>
    </>
  );
}
