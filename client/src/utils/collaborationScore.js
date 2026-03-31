/** 클라이언트 측 협업 적합도(폴백). 서버 추천(sort=recommend)은 OpenAI 임베딩 우선, 실패 시 이 규칙과 동일 로직(Java) 사용 */
export function collaborationScore(my, other) {
  if (!my || !other || other.id === my.id) return -1;
  let s = 0.42;
  if (other.region === my.region) s += 0.28;
  const a = my.type;
  const b = other.type;
  if (a === "BUYER" && (b === "SELLER" || b === "BOTH")) s += 0.18;
  else if (a === "SELLER" && (b === "BUYER" || b === "BOTH")) s += 0.18;
  else if (a === "BOTH" && b === "BOTH") s += 0.1;
  else if (a === "BOTH") s += 0.08;
  const noise = ((Number(other.id) * 7919 + Number(my.id || 1) * 104729) % 7) / 100;
  s += noise;
  return Math.min(98, Math.round(s * 100));
}
