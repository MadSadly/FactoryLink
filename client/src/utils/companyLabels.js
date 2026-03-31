/** API ENUM → 화면용 한글 (지역·업체 유형) */

const REGION_LABELS = {
  SEOUL: "서울",
  GYEONGGI: "경기",
  GYEONGNAM: "경남",
  GYEONGBUK: "경북",
  BUSAN: "부산",
  INCHEON: "인천",
  DAEJEON: "대전",
  GWANGJU: "광주",
  OTHER: "기타",
};

const TYPE_LABELS = {
  BUYER: "구매사",
  SELLER: "공급사",
  BOTH: "구매·공급",
};

export function regionKo(region) {
  if (region == null || region === "") {
    return "-";
  }
  const key = String(region).trim();
  return REGION_LABELS[key] ?? key;
}

export function typeKo(type) {
  if (type == null || type === "") {
    return "-";
  }
  const key = String(type).trim();
  return TYPE_LABELS[key] ?? key;
}
