/** 사업자등록번호: 숫자 10자리 → 표시 xxx-xx-xxxxx */
export function formatBusinessNumberDigits(digits) {
  const d = String(digits || "").replace(/\D/g, "").slice(0, 10);
  if (d.length <= 3) return d;
  if (d.length <= 5) return `${d.slice(0, 3)}-${d.slice(3)}`;
  return `${d.slice(0, 3)}-${d.slice(3, 5)}-${d.slice(5)}`;
}

/** 휴대폰/일반 전화: 숫자만 최대 11자 → 000-0000-0000 형태 표시 */
export function formatPhoneDigits(digits) {
  const d = String(digits || "").replace(/\D/g, "").slice(0, 11);
  if (d.length <= 3) return d;
  if (d.length <= 7) return `${d.slice(0, 3)}-${d.slice(3)}`;
  return `${d.slice(0, 3)}-${d.slice(3, 7)}-${d.slice(7)}`;
}
