import { distanceMeters } from "./domain";

// These checks are user feedback only; Backend validates signature, area and server time.
export function qrExpiry(token: string): number | null {
  try {
    if (token.length > 2048 || token.split(".").length !== 2) return null;
    const payload = token.split(".")[0];
    const text = atob(
      payload
        .replace(/-/g, "+")
        .replace(/_/g, "/")
        .padEnd(Math.ceil(payload.length / 4) * 4, "="),
    );
    const claims = JSON.parse(text);
    if (
      !Number.isSafeInteger(claims.exp) ||
      !Number.isSafeInteger(claims.iat) ||
      claims.exp - claims.iat !== 60 ||
      typeof claims.assignment_id !== "string"
    )
      return null;
    return claims.exp * 1000;
  } catch {
    return null;
  }
}

export function gpsProblem(
  position: Pick<
    GeolocationCoordinates,
    "latitude" | "longitude" | "accuracy"
  > | null,
  latitude: string,
  longitude: string,
): string | null {
  if (!position) return "กรุณาตรวจสอบ GPS ก่อน";
  const { latitude: a, longitude: b, accuracy } = position;
  if (
    ![a, b, accuracy].every(Number.isFinite) ||
    Math.abs(a) > 90 ||
    Math.abs(b) > 180 ||
    accuracy < 0
  )
    return "พิกัด GPS ไม่ถูกต้อง กรุณาอ่านใหม่";
  if (accuracy > 50)
    return "GPS ต้องแม่นยำไม่เกิน ±50 เมตร กรุณาอ่านใหม่ในที่โล่ง";
  const lat = Number(latitude),
    lng = Number(longitude);
  if (
    !latitude.trim() ||
    !longitude.trim() ||
    !Number.isFinite(lat) ||
    !Number.isFinite(lng) ||
    Math.abs(lat) > 90 ||
    Math.abs(lng) > 180
  )
    return "พื้นที่ยังไม่มีพิกัดที่ถูกต้อง กรุณาติดต่อผู้ดูแลงาน";
  if (distanceMeters(a, b, lat, lng) > 200)
    return "พิกัดอยู่นอกรัศมี 200 เมตร กรุณาเข้าใกล้พื้นที่และอ่านใหม่";
  return null;
}
