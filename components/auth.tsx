"use client";
import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { ArrowRight, Monitor, ShieldCheck, Smartphone } from "lucide-react";
import { useRouter } from "next/navigation";
import { verifiedUser } from "@/lib/session";
import { API } from "@/lib/api";
import { object, roleName, type Role, type User } from "@/lib/types";
import { previewData, previewUser, previewGet } from "@/lib/preview";
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
  const [loading, setLoading] = useState(!previewRole);
  const [error, setError] = useState("");
  useEffect(() => {
    if (previewRole) return;
    let alive = true;
    (async () => {
      const platform =
        entryPlatform || sessionStorage.getItem("chaum-platform");
      if (platform !== "web" && platform !== "worker") {
        if (alive) setLoading(false);
        return;
      }
      const id = platformID(platform);
      sessionStorage.setItem("chaum-platform", platform);
      if (!id) throw new Error("ยังไม่ได้ตั้งค่า LIFF ID สำหรับช่องทางนี้");
      const { default: liff } = await import("@line/liff");
      await liff.init({ liffId: id });
      if (!liff.isLoggedIn()) {
        if (alive) setLoading(false);
        return;
      }
      const token = () => liff.getIDToken();
      if (!token())
        throw new Error(
          "ไม่พบ LINE ID token กรุณาเปิด scope openid ใน LIFF และเข้าสู่ระบบใหม่",
        );
      const client = new API(
        platform === "worker" ? "worker" : "supervisor",
        token,
      );
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
                ? Promise.resolve(previewData[path.split("?")[0]] || [])
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
      <div className="login-screen">
        <Brand />
        <Loading />
      </div>
    );
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
  const router = useRouter();
  const [platform, setPlatform] = useState<"web" | "worker">(defaultPlatform);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(initial);
  async function login() {
    setBusy(true);
    setError("");
    try {
      const id = platformID(platform);
      if (!id)
        throw new Error(
          "ยังไม่ได้ตั้งค่า LIFF ID กรุณาให้ผู้ดูแลตั้งค่าระบบก่อน",
        );
      sessionStorage.setItem("chaum-platform", platform);
      const { default: liff } = await import("@line/liff");
      await liff.init({ liffId: id });
      const route = platform === "worker" ? "/worker" : "/web";
      if (liff.isLoggedIn()) router.push(route);
      else liff.login({ redirectUri: `${window.location.origin}${route}` });
    } catch (e) {
      setError(e instanceof Error ? e.message : "เชื่อมต่อ LINE ไม่สำเร็จ");
      setBusy(false);
    }
  }
  return (
    <main className="login-screen">
      <div className="login-art">
        <div className="orb one" />
        <div className="orb two" />
        <Brand />
        <div>
          <span className="eyebrow">ดูแลงาน ดูแลคน ดูแลพื้นที่สีเขียว</span>
          <h1>
            ทุกงานเติบโต
            <br />
            ด้วยการดูแลที่ดี
          </h1>
          <p>
            จัดการทีมงานและพื้นที่ของคุณ
            <br />
            ในระบบเดียวกับชะอุ่ม
          </p>
        </div>
        <small>CHAUM · WORK MANAGEMENT</small>
      </div>
      <section className="login-form">
        <Brand />
        <div className="login-card">
          <span className="eyebrow">ยินดีต้อนรับ</span>
          <h1>เข้าสู่ระบบชะอุ่ม</h1>
          <p>เลือกช่องทางเพื่อเข้าสู่ระบบด้วยบัญชี LINE</p>
          <div className="platform-options">
            <button
              className={platform === "web" ? "selected" : ""}
              onClick={() => setPlatform("web")}
            >
              <Monitor />
              <strong>ผู้ควบคุม / ผู้ดูแลงาน</strong>
              <span>Web Application</span>
            </button>
            <button
              className={platform === "worker" ? "selected" : ""}
              onClick={() => setPlatform("worker")}
            >
              <Smartphone />
              <strong>พนักงาน</strong>
              <span>LINE Mini App</span>
            </button>
          </div>
          {error && <ErrorBox error={error} />}
          <Button disabled={busy} onClick={login}>
            {busy ? "กำลังเชื่อมต่อ…" : "เข้าสู่ระบบด้วย LINE"}
            <ArrowRight size={18} />
          </Button>
          <p className="secure-note">
            <ShieldCheck size={15} /> บทบาทและสิทธิ์ตรวจสอบจากระบบส่วนกลาง
          </p>
          <a className="text-button" href="/preview">
            ดูตัวอย่างหน้าจอ
          </a>
        </div>
        <small className="copyright">© 2026 Chaum Work Management</small>
      </section>
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
      <span>ตัวอย่างหน้าจอ · ข้อมูลสมมติ · ไม่บันทึกข้อมูล</span>
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
