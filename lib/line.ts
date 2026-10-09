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
                "เชื่อมต่อ LINE ใช้เวลานานเกินไป กรุณาตรวจอินเทอร์เน็ตและ LIFF Endpoint แล้วโหลดหน้าใหม่",
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
  await initialization.promise;
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
