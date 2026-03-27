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

export function getRoleFromToken(token) {
  const payload = decodeJwtPayload(token);
  if (!payload) return "GUEST";
  return payload.role || payload.auth || "USER";
}
