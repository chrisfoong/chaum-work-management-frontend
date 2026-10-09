export const METHODS: Record<string, string[]> = {
  me: ["GET"],
  dashboard: ["GET"],
  schedules: ["GET", "POST"],
  "leave-requests": ["GET", "POST"],
  attendance: ["GET"],
  equipment: ["GET", "POST"],
  requisitions: ["GET", "POST"],
  contracts: ["GET"],
  assignments: ["GET"],
  users: ["GET", "POST"],
  files: ["GET", "POST"],
  payroll: ["GET", "POST"],
  invoices: ["GET", "POST"],
  locations: ["GET", "POST"],
  "contracts/info": ["POST"],
  "contracts/scope": ["POST"],
  "contracts/confirm": ["POST"],
  "workers/available": ["GET"],
  "attendance/finalize": ["POST"],
  "attendance/check-in": ["POST"],
  "attendance/check-out": ["POST"],
  "payroll/batch": ["POST"],
  "payroll/preview": ["POST"],
  "reports/profit": ["GET"],
  "reports/profit.csv": ["GET"],
  "reports/profit.pdf": ["GET"],
  "reports/profit/confirm": ["POST"],
};
export function allowed(method: string, parts: string[]): boolean {
  const [platform, ...rest] = parts;
  if (
    !["web", "liff"].includes(platform) ||
    rest.some((p) => !/^[a-zA-Z0-9.-]+$/.test(p) || p === "." || p === "..")
  )
    return false;
  const path = rest.join("/");
  if (METHODS[path]?.includes(method)) return true;
  const uuid =
    "[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}";
  const patterns: [string, string][] = [
    ["GET", `requisitions/${uuid}`],
    ["GET", `contracts/${uuid}`],
    ["PATCH", `(contracts|users|locations|equipment)/${uuid}`],
    ["GET", `leave-requests/${uuid}(/candidates)?`],
    ["POST", `leave-requests/${uuid}/(review|replacement)`],
    [
      "POST",
      `requisitions/${uuid}/(survey|review|fund-transfers|purchase|purchase/preview|decision|delivery)`,
    ],
    ["GET", `requisitions/${uuid}/(inspection|deliveries|delivery-schedules)`],
    ["POST", `assignments/${uuid}/qr`],
    ["GET", `assignments/${uuid}/(continuation|operations-summary)`],
    ["GET", `contracts/${uuid}/continuation`],
    ["POST", `contracts/${uuid}/operations-summary/notify`],
    ["POST", `notifications/${uuid}/retry`],
    ["POST", `(payroll|invoices)/${uuid}/mark-paid`],
  ];
  return patterns.some(
    ([m, p]) => m === method && new RegExp(`^${p}$`).test(path),
  );
}
export function backendURL(value: string | undefined): URL | null {
  try {
    const url = new URL(value || "");
    if (
      url.username ||
      url.password ||
      url.search ||
      url.hash ||
      url.pathname !== "/"
    )
      return null;
    if (
      url.protocol !== "https:" &&
      !(
        url.protocol === "http:" &&
        ["127.0.0.1", "localhost", "[::1]"].includes(url.hostname)
      )
    )
      return null;
    return url;
  } catch {
    return null;
  }
}
