export type Role = "supervisor" | "assistant" | "worker";
export type Row = Record<string, unknown>;
export type User = Row & {
  user_id: string;
  role: Role;
  is_active: boolean;
  first_name: string;
  last_name: string;
};
export const object = (value: unknown): Row =>
  value && typeof value === "object" && !Array.isArray(value)
    ? (value as Row)
    : {};
export const rows = (value: unknown): Row[] => {
  const v = Array.isArray(value) ? value : object(value).data;
  return Array.isArray(v) ? v.map(object) : [];
};
export const str = (value: unknown, key?: string): string => {
  const v = key ? object(value)[key] : value;
  return v === null || v === undefined ? "" : String(v);
};
export const num = (value: unknown, key?: string): number =>
  Number(key ? object(value)[key] : value) || 0;
const roleLabels: Record<Role, string> = {
  supervisor: "ผู้ควบคุมงาน",
  assistant: "ผู้ดูแลงาน",
  worker: "พนักงาน",
};
export const roleName = (role: Role) => roleLabels[role];
