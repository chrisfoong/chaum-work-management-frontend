import { period, todayBangkok } from "./domain";
import type { Row, Role, User } from "./types";
const uuid = (n: number) =>
  `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
export const previewUser = (role: Role): User => ({
  user_id: uuid(1),
  role,
  is_active: true,
  first_name: "สมชาย",
  last_name: "ใจดี",
});
export const previewData: Record<string, Row[]> = {
  contracts: [
    {
      tor_id: uuid(2),
      contract_no: "2569000001",
      project_name: "สวนสาธารณะเฉลิมพระเกียรติ",
      partner_agency: "เทศบาลเมือง",
      start_date: "2026-01-01",
      end_date: "2026-12-31",
      status: "active",
      workflow_status: "active",
      can_operate: true,
    },
    {
      tor_id: uuid(3),
      contract_no: "2569000002",
      project_name: "ภูมิทัศน์อาคารสำนักงาน",
      partner_agency: "สำนักงานจังหวัด",
      status: "registered",
      workflow_status: "registered",
    },
  ],
  schedules: [
    {
      schedule_id: uuid(4),
      assignment_id: uuid(5),
      project_name: "สวนสาธารณะเฉลิมพระเกียรติ",
      location_name: "สวนโซน A",
      address: "ถนนสุขุมวิท กรุงเทพมหานคร",
      work_date: todayBangkok(),
      shift_start_time: "08:00:00",
      shift_start_at: `${todayBangkok()}T08:00:00+07:00`,
      shift_end_at: `${todayBangkok()}T16:00:00+07:00`,
      status: "scheduled",
      shift_status: "scheduled",
      first_name: "สมชาย",
      last_name: "ใจดี",
    },
  ],
  assignments: [
    {
      assignment_id: uuid(5),
      tor_id: uuid(2),
      project_name: "สวนสาธารณะเฉลิมพระเกียรติ",
      location_name: "สวนโซน A",
      required_workers: 3,
      can_schedule: true,
    },
  ],
  requisitions: [
    {
      requisition_id: uuid(6),
      requisition_no: "REQ-2026-001",
      project_name: "สวนสาธารณะเฉลิมพระเกียรติ",
      location_name: "สวนโซน A",
      requisition_type: "tor_base",
      status: "pending_survey",
    },
    {
      requisition_id: uuid(7),
      requisition_no: "REQ-2026-002",
      project_name: "ภูมิทัศน์อาคารสำนักงาน",
      location_name: "หน้าอาคาร",
      requisition_type: "additional",
      status: "pending_approval",
    },
  ],
  attendance: [
    {
      schedule_id: uuid(4),
      first_name: "สมชาย",
      last_name: "ใจดี",
      location_name: "สวนโซน A",
      work_date: todayBangkok(),
      status: "on_time",
      check_in: `${todayBangkok()}T07:58:00+07:00`,
    },
  ],
  "leave-requests": [
    {
      request_id: uuid(8),
      leave_request_id: uuid(8),
      first_name: "วิชัย",
      last_name: "สุขใจ",
      leave_date: todayBangkok(),
      reason: "ไปพบแพทย์",
      status: "pending",
    },
  ],
  payroll: [
    {
      payroll_id: uuid(9),
      first_name: "สมชาย",
      last_name: "ใจดี",
      user_id: uuid(1),
      ...period(todayBangkok().slice(0, 7), 1),
      base_wage: "6000.00",
      total_deduction: "300.00",
      net_wage: "5700.00",
      is_paid: true,
      calculated_penalties: [
        {
          work_date: todayBangkok().slice(0, 8) + "01",
          reason: "late",
          penalty_amount: "300.00",
        },
      ],
    },
    {
      payroll_id: uuid(30),
      user_id: uuid(1),
      first_name: "สมชาย",
      last_name: "ใจดี",
      ...period(todayBangkok().slice(0, 7), 2),
      base_wage: "6400.00",
      total_deduction: "0.00",
      net_wage: "6400.00",
      is_paid: false,
    },
  ],
  equipment: [
    {
      equipment_id: uuid(10),
      equipment_name: "เครื่องตัดหญ้า",
      is_active: true,
    },
    {
      equipment_id: uuid(11),
      equipment_name: "กรรไกรตัดกิ่ง",
      is_active: true,
    },
  ],
  users: [
    {
      user_id: uuid(1),
      first_name: "สมชาย",
      last_name: "ใจดี",
      role: "worker",
      is_active: true,
      daily_wage: "400.00",
    },
  ],
  invoices: [],
  locations: [],
};
export function previewGet(path: string): unknown {
  if (path === "dashboard")
    return {
      open_contracts: 2,
      pending_leave: 1,
      open_requisitions: 2,
      upcoming_schedules: 1,
      contracts: previewData.contracts,
    };
  if (path.startsWith("reports/profit"))
    return {
      data: [
        {
          tor_id: uuid(2),
          project_name: "สวนสาธารณะเฉลิมพระเกียรติ",
          revenue: "120000.00",
          labor: "42000.00",
          material: "8500.00",
          profit: "69500.00",
        },
      ],
    };
  if (path.includes("/operations-summary"))
    return {
      project_name: "สวนสาธารณะเฉลิมพระเกียรติ",
      has_data: true,
      can_continue: true,
      persisted: false,
      attendance: {
        on_time: 24,
        late: 2,
        absent: 1,
        leave: 1,
        awaiting_attendance: 3,
      },
      procurement: [
        {
          status: "completed",
          request_count: 2,
          required_qty: 12,
          existing_qty: 3,
          acquired_qty: 9,
          remaining_qty: 0,
        },
      ],
    };
  if (path.startsWith("requisitions/"))
    return {
      ...previewData.requisitions.find(
        (r) => r.requisition_id === path.split("/")[1],
      ),
      items: [
        {
          item_id: uuid(20),
          equipment_name: "เครื่องตัดหญ้า",
          required_qty: 3,
          existing_qty: 1,
          to_buy_qty: 2,
          actual_qty: 0,
          actual_price: "0.00",
        },
      ],
    };
  if (path.startsWith("contracts/"))
    return (
      previewData.contracts.find((r) => r.tor_id === path.split("/")[1]) || {}
    );
  if (path.startsWith("leave-requests/"))
    return {
      ...previewData["leave-requests"][0],
      schedule_id: uuid(4),
      location_name: "สวนโซน A",
      project_name: "สวนสาธารณะเฉลิมพระเกียรติ",
      shift_start_time: "08:00",
    };
  return {};
}

export function previewList(path: string, role?: Role): Row[] {
  const [name, query] = path.split("?");
  const source = previewData[name] || [];
  const data =
    name === "payroll" && role === "worker"
      ? source.filter(
          (row) =>
            row.is_paid === true && row.user_id === previewUser(role).user_id,
        )
      : source;
  if (name === "payroll") {
    const month = new URLSearchParams(query).get("period_month");
    return month
      ? data.filter((row) => String(row.period_start).slice(0, 7) === month)
      : data;
  }
  return data;
}
