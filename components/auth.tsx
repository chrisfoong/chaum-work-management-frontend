"use client";
import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { ArrowRight, ShieldCheck } from "lucide-react";
import { useRouter } from "next/navigation";
import {
  initializeLIFF,
  startLINELogin,
  isLocalLINEEntry,
  lineEntryURL,
} from "@/lib/line";
import { verifiedUser } from "@/lib/session";
import { API } from "@/lib/api";
import { object, roleName, type Role, type User } from "@/lib/types";
import { InvitationPage } from "./invitation";
import {
  captureInvitation,
  invitationPlatformFromURL,
  clearInvitation,
  invitationLoginRedirect,
} from "@/lib/invitation";
import { previewList, previewUser, previewGet } from "@/lib/preview";
import { Brand, Button, ErrorBox, Loading } from "./ui";
type Session = {
  user: User;
  api: API;
  preview: boolean;
  list: (
    path: string,
    signal?: AbortSignal,
  ) => Promise<ReturnType<typeof object>[]>;
  get: (path: string, signal?: AbortSignal) => Promise<unknown>;
  logout: () => void;
};
const Context = createContext<Session | null>(null);
export function useSession() {
  const value = useContext(Context);
  if (!value) throw new Error("Session unavailable");
  return value;
}
function platformID(platform: "web" | "worker") {
  return platform === "web"
    ? process.env.NEXT_PUBLIC_LINE_WEB_LIFF_ID
    : process.env.NEXT_PUBLIC_LINE_WORKER_LIFF_ID;
}
export function AuthProvider({
  children,
  previewRole,
  entryPlatform,
}: {
  children: ReactNode;
  previewRole?: Role;
  entryPlatform?: "web" | "worker";
}) {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(
    previewRole ? previewUser(previewRole) : null,
  );
  const [api, setAPI] = useState<API | null>(
    previewRole ? new API(previewRole, () => null, true) : null,
  );
  const [onboarding, setOnboarding] = useState<{
    api: API;
    token: string | null;
  } | null>(null);
  const [loading, setLoading] = useState(!previewRole);
  const [error, setError] = useState("");
  useEffect(() => {
    if (previewRole) return;
    let alive = true;
    (async () => {
      if (isLocalLINEEntry(window.location.href)) return;
      const platform =
        entryPlatform || sessionStorage.getItem("chaum-platform");
      if (platform !== "web" && platform !== "worker") {
        if (alive) setLoading(false);
        return;
      }
      const id = platformID(platform);
      sessionStorage.setItem("chaum-platform", platform);
      if (!id)
        throw new Error(
          "ช่องทางเข้าสู่ระบบนี้ยังไม่พร้อมใช้งาน กรุณาติดต่อผู้ดูแลระบบ",
        );
      captureInvitation();
      const liff = await initializeLIFF(id);
      if (!liff.isLoggedIn()) {
        if (alive) setLoading(false);
        return;
      }
      const token = () => liff.getIDToken();
      if (!token())
        throw new Error(
          "ช่องทางเข้าสู่ระบบนี้ยังไม่พร้อมใช้งาน กรุณาติดต่อผู้ดูแลระบบ",
        );
      const client = new API(
        platform === "worker" ? "worker" : "supervisor",
        token,
      );
      const invitation = captureInvitation();
      const state = object(await client.get("onboarding"));
      if (state.status === "inactive")
        throw new Error("บัญชีถูกระงับ กรุณาติดต่อผู้ควบคุมงาน");
      if (state.status === "unregistered") {
        if (alive) setOnboarding({ api: client, token: invitation });
        return;
      }
      if (state.status !== "registered")
        throw new Error("ตรวจสถานะบัญชีไม่สำเร็จ กรุณาลองใหม่");
      if (invitation) {
        clearInvitation();
        window.history.replaceState(null, "", window.location.pathname);
      }
      const destination = state.platform;
      if (
        (destination === "worker" || destination === "web") &&
        destination !== platform
      ) {
        const destinationID = platformID(destination);
        if (!destinationID)
          throw new Error("ช่องทางเข้าสู่ระบบยังไม่พร้อมใช้งาน");
        sessionStorage.setItem("chaum-platform", destination);
        window.location.replace(
          destination === "worker"
            ? `https://miniapp.line.me/${destinationID}`
            : `https://liff.line.me/${destinationID}`,
        );
        return;
      }
      const me = verifiedUser(await client.get("me"), platform);
      client.role = me.role;
      if (alive) {
        setUser(me);
        setAPI(client);
      }
    })()
      .catch((e) => {
        if (alive)
          setError(e instanceof Error ? e.message : "เข้าสู่ระบบไม่สำเร็จ");
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [previewRole, entryPlatform]);
  const value = useMemo<Session | null>(
    () =>
      user && api
        ? {
            user,
            api,
            preview: !!previewRole,
            list: (path, signal) =>
              previewRole
                ? Promise.resolve(previewList(path, previewRole))
                : new URLSearchParams(path.split("?")[1]).get("limit") === "100"
                  ? api.all(path, signal)
                  : api.list(path, signal),
            get: (path, signal) =>
              previewRole
                ? Promise.resolve(previewGet(path))
                : api.get(path, signal),
            logout: () => {
              if (previewRole) {
                router.replace("/");
                return;
              }
              import("@line/liff").then(({ default: liff }) => {
                liff.logout();
                clearInvitation();
                sessionStorage.removeItem("chaum-platform");
                router.replace("/");
              });
            },
          }
        : null,
    [user, api, previewRole, router],
  );
  if (loading)
    return (
      <main className="auth-loading-screen" aria-label="กำลังเข้าสู่ระบบ">
        <div className="auth-loading-content">
          <Brand />
          <Loading />
        </div>
      </main>
    );
  if (onboarding)
    return <InvitationPage api={onboarding.api} token={onboarding.token} />;
  if (!value) return <Login error={error} defaultPlatform={entryPlatform} />;
  return <Context.Provider value={value}>{children}</Context.Provider>;
}
export function Login({
  error: initial = "",
  defaultPlatform = "web",
}: {
  error?: string;
  defaultPlatform?: "web" | "worker";
}) {
  const [platform, setPlatform] = useState<"web" | "worker">(defaultPlatform);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(initial);
  useEffect(() => {
    if (isLocalLINEEntry(window.location.href)) return;
    const params = new URLSearchParams(window.location.search);
    if (!params.has("liff.state") && !params.has("liffClientId")) return;
    let alive = true;
    const invitedPlatform = invitationPlatformFromURL(window.location.href);
    const stored = invitedPlatform || sessionStorage.getItem("chaum-platform");
    captureInvitation();
    const callbackChannel = params.get("liffClientId");
    const workerChannel = platformID("worker")?.split("-")[0];
    const webChannel = platformID("web")?.split("-")[0];
    const callbackPlatform =
      callbackChannel === workerChannel
        ? "worker"
        : callbackChannel === webChannel
          ? "web"
          : stored === "worker"
            ? "worker"
            : defaultPlatform;
    sessionStorage.setItem("chaum-platform", callbackPlatform);
    const id = platformID(callbackPlatform);
    if (!id) return;
    initializeLIFF(id)
      .then((liff) => {
        if (alive) setPlatform(callbackPlatform);
        captureInvitation();
        if (alive && liff.isLoggedIn())
          window.location.replace(
            callbackPlatform === "worker" ? "/worker" : "/web",
          );
      })
      .catch((e) => {
        if (alive)
          setError(e instanceof Error ? e.message : "เชื่อมต่อ LINE ไม่สำเร็จ");
      })
      .finally(() => {
        if (alive) setBusy(false);
      });
    return () => {
      alive = false;
    };
  }, [defaultPlatform]);
  async function login() {
    setBusy(true);
    setError("");
    try {
      const id = platformID(platform);
      if (!id)
        throw new Error(
          "ช่องทางเข้าสู่ระบบนี้ยังไม่พร้อมใช้งาน กรุณาติดต่อผู้ดูแลระบบ",
        );
      sessionStorage.setItem("chaum-platform", platform);
      if (isLocalLINEEntry(window.location.href)) {
        window.location.assign(lineEntryURL(id, platform, captureInvitation()));
        return;
      }
      const liff = await initializeLIFF(id);
      startLINELogin(
        liff,
        invitationLoginRedirect(
          window.location.origin,
          platform,
          captureInvitation(),
        ),
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "เชื่อมต่อ LINE ไม่สำเร็จ");
      setBusy(false);
    }
  }
  return (
    <main className="login-entry-screen">
      <section className="login-entry-panel" aria-labelledby="login-title">
        <Brand />
        <div className="login-entry-heading">
          <span className="eyebrow">ยินดีต้อนรับ</span>
          <h1 id="login-title">เข้าสู่ระบบชะอุ่ม</h1>
          <p>
            จัดการงานและพื้นที่สีเขียวของคุณ
            <br />
            เข้าสู่ระบบด้วยบัญชี LINE เพื่อเริ่มใช้งาน
          </p>
        </div>
        {error && <ErrorBox error={error} />}
        <Button disabled={busy} onClick={login}>
          {busy ? "กำลังเชื่อมต่อ LINE…" : "เข้าสู่ระบบด้วย LINE"}
          {!busy && <ArrowRight size={18} />}
        </Button>
        <p className="login-entry-note">
          <ShieldCheck size={16} />
          สิทธิ์การใช้งานตามบัญชีที่ได้รับเชิญ
        </p>
      </section>
      <small className="login-entry-footer">© 2026 Chaum Work Management</small>
    </main>
  );
}

export function PreviewPicker({
  role,
  setRole,
}: {
  role: Role;
  setRole: (r: Role) => void;
}) {
  return (
    <div className="preview-banner">
      <span>ตัวอย่างหน้าจอ — ไม่บันทึกข้อมูล</span>
      <select
        aria-label="บทบาทตัวอย่าง"
        value={role}
        onChange={(e) => setRole(e.target.value as Role)}
      >
        {(["supervisor", "assistant", "worker"] as Role[]).map((r) => (
          <option key={r} value={r}>
            {roleName(r)}
          </option>
        ))}
      </select>
    </div>
  );
}
