// Share initialization across React effects/login; never create a mock login fallback.
let initialization: { id: string; promise: Promise<void> } | null = null;
export async function withDeadline<T>(
  work: Promise<T>,
  milliseconds = 20000,
): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      work,
      new Promise<never>((_, reject) => {
        timer = setTimeout(
          () =>
            reject(
              new Error(
                "เชื่อมต่อ LINE ใช้เวลานานเกินไป กรุณาตรวจอินเทอร์เน็ตแล้วลองใหม่",
              ),
            ),
          milliseconds,
        );
      }),
    ]);
  } finally {
    clearTimeout(timer);
  }
}
export async function initializeLIFF(id: string) {
  const { default: liff } = await withDeadline(import("@line/liff"));
  if (!initialization || initialization.id !== id) {
    const promise = withDeadline(liff.init({ liffId: id }));
    initialization = { id, promise };
    promise.catch(() => {
      if (initialization?.promise === promise) initialization = null;
    });
  }
  try {
    await initialization.promise;
  } catch (error) {
    if (error instanceof TypeError && /fetch|network/i.test(error.message)) {
      throw new Error(
        "เชื่อมต่อ LINE ไม่สำเร็จ กรุณาตรวจอินเทอร์เน็ตแล้วเข้าสู่ระบบใหม่",
      );
    }
    throw error;
  }
  return liff;
}

// An explicit login action must renew a stale SDK session, not reuse its ID token.
export function startLINELogin(
  liff: {
    isLoggedIn: () => boolean;
    logout: () => void;
    login: (options: { redirectUri: string }) => void;
  },
  redirectUri: string,
) {
  if (liff.isLoggedIn()) liff.logout();
  liff.login({ redirectUri });
}

export function automaticLINELogin(
  liff: {
    isLoggedIn: () => boolean;
    isInClient: () => boolean;
    login: (options: { redirectUri: string }) => void;
  },
  redirectUri: string,
  storage: Pick<Storage, "getItem" | "setItem">,
  platform: "web" | "worker",
): "logged-in" | "redirecting" | "retry-required" | "open-in-line" {
  if (liff.isLoggedIn()) return "logged-in";
  if (liff.isInClient()) return "open-in-line";
  const key = `chaum-auto-login-${platform}`;
  if (storage.getItem(key)) return "retry-required";
  storage.setItem(key, "1");
  liff.login({ redirectUri });
  return "redirecting";
}

// Loopback pages may show Login/Preview, but LINE authentication starts at its registered endpoint.
export function isLocalLINEEntry(href: string): boolean {
  try {
    const host = new URL(href).hostname;
    return (
      host === "localhost" ||
      host.endsWith(".localhost") ||
      host === "127.0.0.1" ||
      host === "[::1]"
    );
  } catch {
    return false;
  }
}

export function lineEntryURL(
  id: string,
  platform: "web" | "worker",
  invitation: string | null,
): string {
  const liffID = id.trim();
  if (!/^\d+-[A-Za-z0-9_-]+$/.test(liffID))
    throw new Error("LIFF ID ไม่ถูกต้อง กรุณาตรวจการตั้งค่าช่องทางเข้าสู่ระบบ");
  const url = new URL(
    liffID,
    platform === "worker"
      ? "https://miniapp.line.me/"
      : "https://liff.line.me/",
  );
  if (invitation)
    url.hash = new URLSearchParams({ invite: invitation, platform }).toString();
  return url.href;
}
