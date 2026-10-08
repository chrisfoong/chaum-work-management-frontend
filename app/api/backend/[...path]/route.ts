import { allowed, backendURL } from "@/lib/proxy";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
async function handle(
  request: Request,
  context: { params: Promise<{ path: string[] }> },
) {
  const { path } = await context.params;
  const error = (status: number, message: string) =>
    Response.json(
      { error: { message } },
      { status, headers: { "Cache-Control": "no-store" } },
    );
  if (!allowed(request.method, path)) return error(404, "ไม่พบ API นี้");
  const authorization = request.headers.get("authorization");
  if (
    !authorization ||
    !/^Bearer [^\s]+$/.test(authorization) ||
    authorization.length > 16384
  )
    return error(401, "กรุณาเข้าสู่ระบบ LINE");
  const base = backendURL(process.env.BACKEND_URL);
  if (!base) return error(503, "ยังไม่ได้ตั้งค่าการเชื่อมต่อ Backend");
  const target = new URL(`/api/${path.join("/")}`, base);
  target.search = new URL(request.url).search;
  const headers = new Headers({ Authorization: authorization });
  const type = request.headers.get("content-type");
  if (type) headers.set("Content-Type", type);
  let body: Uint8Array | undefined;
  if (request.method !== "GET" && request.method !== "HEAD") {
    const reader = request.body?.getReader();
    const chunks: Uint8Array[] = [];
    let size = 0;
    if (reader) {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        size += value.byteLength;
        if (size > 6 * 1024 * 1024) {
          await reader.cancel();
          return error(413, "ไฟล์มีขนาดใหญ่เกินกำหนด");
        }
        chunks.push(value);
      }
    }
    body = new Uint8Array(size);
    let offset = 0;
    for (const chunk of chunks) {
      body.set(chunk, offset);
      offset += chunk.length;
    }
  }
  try {
    const upstream = await fetch(target, {
      method: request.method,
      headers,
      body: body as BodyInit | undefined,
      cache: "no-store",
      redirect: "error",
      signal: AbortSignal.timeout(45000),
    });
    const responseHeaders = new Headers({
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
    });
    for (const key of ["content-type", "content-disposition", "x-request-id"]) {
      const value = upstream.headers.get(key);
      if (value) responseHeaders.set(key, value);
    }
    return new Response(upstream.body, {
      status: upstream.status,
      headers: responseHeaders,
    });
  } catch {
    return error(502, "เชื่อมต่อ Backend ไม่สำเร็จ กรุณาลองใหม่");
  }
}
export const GET = handle;
export const POST = handle;
export const PATCH = handle;
