"use client";
import { useEffect, useRef, useState } from "react";
import { Camera, Check, MapPin, QrCode } from "lucide-react";
import { gpsProblem, qrExpiry } from "@/lib/attendance";
import { useSession } from "../auth";
import { Button, ErrorBox, Field, Modal } from "../ui";
import { clock, distanceMeters, safeQR } from "@/lib/domain";
import { str, type Row } from "@/lib/types";

export function CheckIn({
  row,
  onClose,
  onDone,
}: {
  row: Row;
  onClose: () => void;
  onDone: () => void;
}) {
  const { api } = useSession();
  const [position, setPosition] = useState<GeolocationCoordinates | null>(null);
  const [qr, setQR] = useState("");
  const [error, setError] = useState("");
  const [gpsBusy, setGPSBusy] = useState(false);
  const [scanning, setScanning] = useState(false);
  const video = useRef<HTMLVideoElement>(null);
  const controls = useRef<{ stop: () => void } | null>(null);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [expires, setExpires] = useState<number | null>(null);
  const [tick, setTick] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setTick(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);
  useEffect(() => {
    if (!scanning) return;
    let active = true;
    const element = video.current;
    (async () => {
      if (!element) return;
      const { BrowserQRCodeReader } = await import("@zxing/browser");
      const reader = new BrowserQRCodeReader();
      const control = await reader.decodeFromVideoDevice(
        undefined,
        element,
        (result) => {
          if (result && active) {
            try {
              setQR(safeQR(result.getText()));
              setExpires(qrExpiry(result.getText()));
              setScanning(false);
            } catch (e) {
              setError(e instanceof Error ? e.message : "อ่าน QR ไม่สำเร็จ");
            }
          }
        },
      );
      if (active) controls.current = control;
      else control.stop();
    })().catch(() => {
      if (active) {
        setError("เปิดกล้องไม่ได้ กรุณาอนุญาตกล้องหรือวาง QR ที่ได้รับ");
        setScanning(false);
      }
    });
    return () => {
      active = false;
      controls.current?.stop();
      controls.current = null;
      const stream = element?.srcObject;
      if (stream instanceof MediaStream)
        stream.getTracks().forEach((t) => t.stop());
    };
  }, [scanning]);
  const lat = str(row, "latitude"),
    lng = str(row, "longitude");
  const distance =
    position && lat !== "" && lng !== ""
      ? distanceMeters(
          position.latitude,
          position.longitude,
          Number(lat),
          Number(lng),
        )
      : null;
  const gpsError = gpsProblem(position, lat, lng);
  const ready = !gpsError && !!qr && (!expires || expires > tick);
  return (
    <Modal title="ยืนยันและเช็กอิน" onClose={onClose} busy={busy}>
      {done ? (
        <div className="success">
          <Check size={42} />
          <h3>เช็กอินเรียบร้อยแล้ว</h3>
          <p>บันทึกเวลาจาก Server แล้ว</p>
          <Button
            onClick={() => {
              onDone();
              onClose();
            }}
          >
            เสร็จสิ้น
          </Button>
        </div>
      ) : (
        <>
          <div className="notice">
            {str(row, "location_name")} · {clock(str(row, "shift_start_at"))}–
            {clock(str(row, "shift_end_at"))}
          </div>
          <div className="check-step">
            <span className={`step-icon ${position ? "complete" : ""}`}>
              <MapPin />
            </span>
            <div>
              <h3>1. ตรวจสอบ GPS</h3>
              <p>
                {position
                  ? `ความแม่นยำ ±${Math.round(position.accuracy)} เมตร${distance === null ? "" : ` · ห่างพื้นที่ ${Math.round(distance)} เมตร`}`
                  : "ต้องอยู่ในรัศมี 200 เมตรจากพื้นที่ TOR"}
              </p>
            </div>
          </div>
          <Button
            variant="secondary"
            disabled={gpsBusy || busy}
            onClick={() => {
              if (!navigator.geolocation) {
                setError("อุปกรณ์นี้ไม่รองรับ GPS");
                return;
              }
              setGPSBusy(true);
              setError("");
              navigator.geolocation.getCurrentPosition(
                (p) => {
                  setPosition(p.coords);
                  setGPSBusy(false);
                },
                () => {
                  setError(
                    "อ่าน GPS ไม่ได้ กรุณาเปิดตำแหน่งและอนุญาตเบราว์เซอร์",
                  );
                  setGPSBusy(false);
                },
                { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 },
              );
            }}
          >
            {gpsBusy
              ? "กำลังอ่านพิกัด…"
              : position
                ? "อ่าน GPS ใหม่"
                : "ตรวจสอบตำแหน่ง"}
          </Button>
          {position && gpsError && (
            <p role="alert" className="error-box">
              {gpsError}
            </p>
          )}
          <div className="check-step">
            <span className={`step-icon ${qr ? "complete" : ""}`}>
              <QrCode />
            </span>
            <div>
              <h3>2. สแกน QR ของพื้นที่</h3>
              <p>
                {qr
                  ? "ได้รับ QR แล้ว ระบบจะตรวจลายเซ็น พื้นที่ กะงาน และ GPS"
                  : "สแกนป้าย QR ที่ติดไว้ในพื้นที่ปฏิบัติงาน"}
              </p>
            </div>
          </div>
          {scanning ? (
            <>
              <video
                ref={video}
                autoPlay
                muted
                playsInline
                className="scanner-video"
              />
              <Button variant="secondary" onClick={() => setScanning(false)}>
                หยุดกล้อง
              </Button>
            </>
          ) : (
            <Button
              variant="secondary"
              onClick={() => setScanning(true)}
              disabled={busy}
            >
              <Camera size={18} />
              เปิดกล้องสแกน QR
            </Button>
          )}
          <Field label="หรือวางรหัส QR ที่ได้รับ">
            <input
              aria-label="รหัส QR"
              value={qr}
              maxLength={2048}
              onChange={(e) => {
                setQR(e.target.value);
                setExpires(qrExpiry(e.target.value));
              }}
              autoComplete="off"
              spellCheck={false}
            />
          </Field>
          {expires && expires <= tick && (
            <p className="error-box">
              QR รุ่นเดิมหมดอายุแล้ว กรุณาสแกนป้าย QR ประจำพื้นที่
            </p>
          )}
          {error && <ErrorBox error={error} />}
          <div className="modal-footer">
            <Button
              onClick={async () => {
                setBusy(true);
                setError("");
                try {
                  if (!position || gpsError)
                    throw new Error(gpsError || "กรุณาตรวจ GPS");
                  if (expires !== null && expires <= Date.now())
                    throw new Error(
                      "QR รุ่นเดิมหมดอายุแล้ว กรุณาสแกนป้าย QR ประจำพื้นที่",
                    );
                  await api.post("attendance/check-in", {
                    schedule_id: str(row, "schedule_id"),
                    latitude: position.latitude,
                    longitude: position.longitude,
                    accuracy_m: position.accuracy,
                    qr_token: safeQR(qr),
                  });
                  setDone(true);
                } catch (e) {
                  setError(e instanceof Error ? e.message : "เช็กอินไม่สำเร็จ");
                } finally {
                  setBusy(false);
                }
              }}
              disabled={!ready || busy || (distance !== null && distance > 200)}
            >
              {busy ? "กำลังเช็กอิน…" : "ยืนยัน GPS + QR และเช็กอิน"}
            </Button>
          </div>
          <p className="muted">
            เวลาทำงานใช้ Server ในเขต Asia/Bangkok
            การตรวจพิกัดบนหน้านี้เป็นข้อมูลเบื้องต้น
          </p>
        </>
      )}
    </Modal>
  );
}
