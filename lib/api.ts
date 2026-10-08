import { object, rows, type Role, type Row } from "./types";
import { verifyFile } from "./domain";
export class APIError extends Error {
  constructor(
    message: string,
    public status: number,
    public requestID?: string,
  ) {
    super(message);
  }
}
export class API {
  constructor(
    public role: Role,
    private token: () => string | null,
    public preview = false,
  ) {}
  private prefix() {
    return this.role === "worker" ? "liff" : "web";
  }
  async response(path: string, init: RequestInit = {}): Promise<Response> {
    if (this.preview)
      throw new APIError("โหมดตัวอย่างดูหน้าจอเท่านั้น ไม่บันทึกข้อมูล", 403);
    const token = this.token();
    if (!token) throw new APIError("กรุณาเข้าสู่ระบบ LINE ใหม่", 401);
    const headers = new Headers(init.headers);
    headers.set("Authorization", `Bearer ${token}`);
    if (typeof init.body === "string")
      headers.set("Content-Type", "application/json");
    let response: Response;
    try {
      response = await fetch(`/api/backend/${this.prefix()}/${path}`, {
        ...init,
        headers,
        cache: "no-store",
        credentials: "omit",
      });
    } catch {
      throw new APIError("เชื่อมต่อระบบไม่ได้ กรุณาลองใหม่", 0);
    }
    if (!response.ok) {
      const data = object(await response.json().catch(() => ({})));
      const error = object(data.error);
      const defaultMessage =
        response.status === 401
          ? "การเข้าสู่ระบบหมดอายุ กรุณาเข้าสู่ระบบ LINE ใหม่"
          : response.status === 403
            ? "บัญชีนี้ไม่มีสิทธิ์ทำรายการ"
            : "ทำรายการไม่สำเร็จ";
      const fields = Array.isArray(error.fields)
        ? error.fields
            .map((f) => {
              const detail = object(f);
              return `${String(detail.field || "")}: ${String(detail.message || "")}`;
            })
            .join(" · ")
        : "";
      throw new APIError(
        `${String(error.message || defaultMessage)}${fields ? ` — ${fields}` : ""}`,
        response.status,
        String(error.request_id || response.headers.get("X-Request-ID") || ""),
      );
    }
    return response;
  }
  async get(path: string, signal?: AbortSignal): Promise<unknown> {
    return (await this.response(path, { signal })).json();
  }
  async list(path: string, signal?: AbortSignal): Promise<Row[]> {
    return rows(await this.get(path, signal));
  }
  async all(path: string, signal?: AbortSignal): Promise<Row[]> {
    if (path.split("?")[0] === "locations") return this.list(path, signal);
    const [route, query] = path.split("?");
    const params = new URLSearchParams(query);
    params.set("limit", "100");
    const result: Row[] = [];
    for (let offset = 0; offset <= 100000; offset += 100) {
      params.set("offset", String(offset));
      const page = await this.list(`${route}?${params}`, signal);
      result.push(...page);
      if (page.length < 100) return result;
    }
    throw new APIError("ข้อมูลมีจำนวนมาก กรุณาจำกัดช่วงเวลา", 422);
  }
  async post(path: string, body: unknown = {}): Promise<unknown> {
    return (
      await this.response(path, { method: "POST", body: JSON.stringify(body) })
    ).json();
  }
  async patch(path: string, body: unknown): Promise<unknown> {
    return (
      await this.response(path, { method: "PATCH", body: JSON.stringify(body) })
    ).json();
  }
  async upload(
    file: File,
    types = ["image/jpeg", "image/png"],
  ): Promise<string> {
    verifyFile(file, types);
    const result = object(
      await (
        await this.response("files", {
          method: "POST",
          headers: { "Content-Type": file.type },
          body: file,
        })
      ).json(),
    );
    const path = result.path || result.object_path;
    if (typeof path !== "string")
      throw new APIError("ระบบไม่คืนเส้นทางไฟล์", 502);
    return path;
  }
  async download(path: string, name: string): Promise<void> {
    const blob = await (await this.response(path)).blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = name;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 3000);
  }
}
