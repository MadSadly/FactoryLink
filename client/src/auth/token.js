export function decodeJwtPayload(token) {
  try {
    const payloadPart = token.split(".")[1];
    if (!payloadPart) return null;
    const base64 = payloadPart.replace(/-/g, "+").replace(/_/g, "/");
    const json = atob(base64);
    return JSON.parse(json);
  } catch {
    return null;
  }
}

/** exp 클레임 기준. 없으면 만료로 보지 않음(서버 검증에 맡김). */
export function isJwtExpired(token) {
  if (!token) return true;
  const payload = decodeJwtPayload(token);
  if (!payload?.exp) return false;
  const expSec = Number(payload.exp);
  if (!Number.isFinite(expSec)) return false;
  return Date.now() / 1000 >= expSec;
}

export function getRoleFromToken(token) {
  const payload = decodeJwtPayload(token);
  if (!payload) return "GUEST";
  return payload.role || payload.auth || "USER";
}

/** JWT subject(일반적으로 이메일) */
export function getEmailFromToken(token) {
  const payload = decodeJwtPayload(token);
  if (!payload?.sub) return "";
  return String(payload.sub);
}

/** Spring JWT claim `companyId` */
export function getCompanyIdFromToken(token) {
  const payload = decodeJwtPayload(token);
  if (payload?.companyId == null) return null;
  const v = payload.companyId;
  if (typeof v === "number") return v;
  if (typeof v === "string") {
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

/** Spring JWT claim `userId` */
export function getUserIdFromToken(token) {
  const payload = decodeJwtPayload(token);
  if (payload?.userId == null) return null;
  const v = payload.userId;
  if (typeof v === "number") return v;
  if (typeof v === "string") {
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}
