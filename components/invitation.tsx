"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { API } from "@/lib/api";
import { clearInvitation } from "@/lib/invitation";
import { object, roleName, str, type Row } from "@/lib/types";
import { useSession } from "./auth";
import {
  Brand,
  Button,
  ErrorBox,
  Inputs,
  Loading,
  Modal,
  fdString,
} from "./ui";

export function InvitationPage({
  api,
  token,
}: {
  api: API;
  token: string | null;
}) {
  const router = useRouter();
  const [details, setDetails] = useState<Row | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(!!token);
  useEffect(() => {
    if (!token) return;
    let alive = true;
    api
      .post("invitation/preview", { token })
      .then((result) => {
        if (alive) setDetails(object(result));
      })
      .catch((e) => {
        if (alive)
          setError(e instanceof Error ? e.message : "ตรวจลิงก์เชิญไม่สำเร็จ");
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [api, token]);
  async function signOut() {
    const { default: liff } = await import("@line/liff");
    liff.logout();
    clearInvitation();
    sessionStorage.removeItem("chaum-platform");
    router.replace("/");
  }
  return (
    <main className="invitation-screen">
      <section className="invitation-card">
        <Brand />
        <h1>{token ? "เชื่อมบัญชี LINE" : "ยังไม่ได้รับเชิญเข้าใช้งาน"}</h1>
        {loading ? (
          <Loading />
        ) : details ? (
          <>
            <p>
              ตรวจว่าข้อมูลด้านล่างเป็นของคุณก่อนเชื่อมกับบัญชี LINE
              ที่กำลังใช้งาน
            </p>
            <dl className="invitation-person">
              <div>
                <dt>ชื่อ–นามสกุล</dt>
                <dd>
                  {str(details, "first_name")} {str(details, "last_name")}
                </dd>
              </div>
              <div>
                <dt>บทบาท</dt>
                <dd>
                  {["supervisor", "assistant", "worker"].includes(
                    str(details, "role"),
                  )
                    ? roleName(
                        str(details, "role") as
                          "supervisor" | "assistant" | "worker",
                      )
                    : "—"}
                </dd>
              </div>
            </dl>
            <Button
              disabled={busy}
              onClick={async () => {
                setBusy(true);
                setError("");
                try {
                  await api.post("invitation/claim", { token });
                  clearInvitation();
                  window.history.replaceState(
                    null,
                    "",
                    window.location.pathname,
                  );
                  window.location.reload();
                } catch (e) {
                  setError(
                    e instanceof Error ? e.message : "เชื่อมบัญชีไม่สำเร็จ",
                  );
                  setBusy(false);
                }
              }}
            >
              {busy
                ? "กำลังเชื่อมบัญชี…"
                : "ยืนยันว่าเป็นบัญชีของฉันและเชื่อม LINE"}
            </Button>
          </>
        ) : !token ? (
          <p>
            ขอลิงก์เชิญจากผู้ควบคุมงาน แล้วเปิดลิงก์นั้นด้วยบัญชี LINE ของคุณ
            ผู้ควบคุมงานจะกำหนดบทบาทไว้ให้
          </p>
        ) : null}
        {error && <ErrorBox error={error} />}
        <Button variant="secondary" disabled={busy} onClick={signOut}>
          ออกจากระบบ LINE
        </Button>
      </section>
    </main>
  );
}

function InvitationLink({ result }: { result: Row }) {
  const [copied, setCopied] = useState(false);
  const [copyError, setCopyError] = useState("");
  const id =
    result.platform === "worker"
      ? process.env.NEXT_PUBLIC_LINE_WORKER_LIFF_ID
      : process.env.NEXT_PUBLIC_LINE_WEB_LIFF_ID;
  const token = str(result, "token");
  const link =
    id && token
      ? `https://liff.line.me/${id}#${new URLSearchParams({ invite: token, platform: str(result, "platform") })}`
      : "";
  if (!link)
    return (
      <ErrorBox error="ช่องทาง LINE ยังไม่พร้อม กรุณาตั้ง LIFF ID แล้วออกลิงก์ใหม่" />
    );
  return (
    <div className="invitation-result">
      <h3>สร้างลิงก์เชิญแล้ว</h3>
      <p>
        ส่งให้เจ้าของบัญชีโดยตรง ลิงก์ใช้ได้ครั้งเดียวและหมดอายุภายใน 24 ชั่วโมง
      </p>
      <label htmlFor="invitation-link">ลิงก์เชิญ</label>
      <input
        id="invitation-link"
        readOnly
        value={link}
        onFocus={(event) => event.currentTarget.select()}
      />
      <Button
        onClick={async () => {
          try {
            await navigator.clipboard.writeText(link);
            setCopied(true);
            setCopyError("");
          } catch {
            setCopyError("เลือกข้อความในช่องลิงก์แล้วคัดลอกด้วยตนเอง");
          }
        }}
      >
        {copied ? "คัดลอกแล้ว" : "คัดลอกลิงก์เชิญ"}
      </Button>
      {copyError && <p role="status">{copyError}</p>}
      <p>
        หมดอายุ:{" "}
        {new Date(str(result, "expires_at")).toLocaleString("th-TH", {
          timeZone: "Asia/Bangkok",
        })}
      </p>
    </div>
  );
}

export function InviteUserForm({
  onClose,
  onDone,
}: {
  onClose: () => void;
  onDone: () => void;
}) {
  const { api } = useSession();
  const [result, setResult] = useState<Row | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  return (
    <Modal
      title="เพิ่มบุคลากรและสร้างลิงก์เชิญ"
      busy={busy}
      onClose={() => {
        if (!busy) onClose();
      }}
    >
      {result ? (
        <InvitationLink result={result} />
      ) : (
        <form
          onSubmit={async (event) => {
            event.preventDefault();
            const fd = new FormData(event.currentTarget);
            setBusy(true);
            setError("");
            try {
              const body: Row = {};
              for (const name of [
                "first_name",
                "last_name",
                "role",
                "phone_number",
                "bank_name",
                "bank_account_no",
                "daily_wage",
              ])
                body[name] = fdString(fd, name);
              setResult(object(await api.post("invitations", body)));
              onDone();
            } catch (e) {
              setError(e instanceof Error ? e.message : "สร้างลิงก์ไม่สำเร็จ");
            } finally {
              setBusy(false);
            }
          }}
        >
          <p>
            กำหนดบทบาทให้บุคลากร จากนั้นส่งลิงก์เพื่อให้เจ้าตัวผูกบัญชี LINE
            ไม่ต้องกรอก LINE User ID
          </p>
          <Inputs
            fields={[
              { name: "first_name", label: "ชื่อ", maxLength: 100 },
              { name: "last_name", label: "นามสกุล", maxLength: 100 },
              {
                name: "role",
                label: "บทบาท",
                options: [
                  { value: "worker", label: "พนักงาน" },
                  { value: "assistant", label: "ผู้ดูแลงาน" },
                  { value: "supervisor", label: "ผู้ควบคุมงาน" },
                ],
              },
              {
                name: "phone_number",
                label: "โทรศัพท์",
                pattern: "[0-9]{10}",
                maxLength: 10,
              },
              { name: "bank_name", label: "ธนาคาร", maxLength: 100 },
              { name: "bank_account_no", label: "เลขบัญชี", maxLength: 50 },
              {
                name: "daily_wage",
                label: "ค่าจ้างต่อวัน (บาท)",
                value: "400.00",
              },
            ]}
          />
          {error && <ErrorBox error={error} />}
          <div className="modal-footer">
            <Button type="submit" disabled={busy}>
              {busy ? "กำลังสร้าง…" : "สร้างลิงก์เชิญ"}
            </Button>
          </div>
        </form>
      )}
    </Modal>
  );
}

export function RenewInvitationForm({
  user,
  onClose,
  onDone,
}: {
  user: Row;
  onClose: () => void;
  onDone: () => void;
}) {
  const { api } = useSession();
  const [result, setResult] = useState<Row | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  return (
    <Modal
      title={`ลิงก์เชิญ ${str(user, "first_name")} ${str(user, "last_name")}`}
      busy={busy}
      onClose={() => {
        if (!busy) onClose();
      }}
    >
      {result ? (
        <InvitationLink result={result} />
      ) : (
        <>
          <p>ออกลิงก์เชิญใหม่ที่ใช้ได้ 24 ชั่วโมง ลิงก์เก่าจะใช้ไม่ได้ทันที</p>
          {error && <ErrorBox error={error} />}
          <Button
            disabled={busy}
            onClick={async () => {
              setBusy(true);
              setError("");
              try {
                setResult(
                  object(
                    await api.post(
                      `users/${str(user, "user_id")}/invitation`,
                      {},
                    ),
                  ),
                );
                onDone();
              } catch (e) {
                setError(
                  e instanceof Error ? e.message : "ออกลิงก์ใหม่ไม่สำเร็จ",
                );
              } finally {
                setBusy(false);
              }
            }}
          >
            {busy ? "กำลังสร้าง…" : "ออกลิงก์เชิญใหม่"}
          </Button>
        </>
      )}
    </Modal>
  );
}

export function CancelInvitationForm({
  user,
  onClose,
  onDone,
}: {
  user: Row;
  onClose: () => void;
  onDone: () => void;
}) {
  const { api } = useSession();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  return (
    <Modal
      title="ยกเลิกลิงก์เชิญ"
      busy={busy}
      onClose={() => {
        if (!busy) onClose();
      }}
    >
      <p>
        ยกเลิกลิงก์เชิญของ {str(user, "first_name")} {str(user, "last_name")}{" "}
        หรือไม่? ผู้รับจะใช้ลิงก์นี้ผูกบัญชีไม่ได้อีก ข้อมูลบุคลากรจะยังอยู่
        และคุณสามารถออกลิงก์ใหม่ได้
      </p>
      {error && <ErrorBox error={error} />}
      <div className="modal-footer">
        <Button variant="secondary" disabled={busy} onClick={onClose}>
          กลับ
        </Button>
        <Button
          disabled={busy}
          onClick={async () => {
            setBusy(true);
            setError("");
            try {
              await api.post(
                `users/${str(user, "user_id")}/invitation/cancel`,
                {},
              );
              onDone();
              onClose();
            } catch (e) {
              setError(e instanceof Error ? e.message : "ยกเลิกลิงก์ไม่สำเร็จ");
              setBusy(false);
            }
          }}
        >
          {busy ? "กำลังยกเลิก…" : "ยืนยันยกเลิกลิงก์"}
        </Button>
      </div>
    </Modal>
  );
}
