/* 카카오맵: 앱 설정에서 JavaScript 키·허용 도메인을 등록하세요.
 * 주소→좌표는 SDK Geocoder 대신 Spring 프록시(/api/kakao/local/search/address)를 사용합니다.
 * (브라우저에서 dapi 직접 호출 시 CORS 차단) */

import { useEffect, useRef } from "react";
import { apiClient } from "../api/client";

const GEO_DELAY_MS = 160;
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const REGION_CENTER = {
  SEOUL: { lat: 37.5665, lng: 126.978 },
  GYEONGGI: { lat: 37.4138, lng: 127.5183 },
  GYEONGNAM: { lat: 35.4606, lng: 128.2132 },
  GYEONGBUK: { lat: 36.4919, lng: 128.8889 },
  BUSAN: { lat: 35.1796, lng: 129.0756 },
  INCHEON: { lat: 37.4563, lng: 126.7052 },
  DAEJEON: { lat: 36.3504, lng: 127.3845 },
  GWANGJU: { lat: 35.1595, lng: 126.8526 },
  OTHER: { lat: 36.5, lng: 127.5 },
};

const DEFAULT_CENTER = { lat: 36.5, lng: 127.5 };
const MAP_LEVEL = 8;

function markerColor(type) {
  if (type === "SELLER") {
    return "#e53935";
  }
  if (type === "BUYER") {
    return "#1e88e5";
  }
  return "#8e24aa";
}

function pinDataUri(hex) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="28" height="40" viewBox="0 0 28 40"><path fill="${hex}" stroke="#333" stroke-width="1" d="M14 1C7 1 2 6.5 2 13c0 10 12 26 12 26s12-16 12-26C26 6.5 21 1 14 1z"/><circle fill="#fff" cx="14" cy="13" r="5"/></svg>`;
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}

function typeLabel(type) {
  if (type === "SELLER") {
    return "공급사";
  }
  if (type === "BUYER") {
    return "구매사";
  }
  if (type === "BOTH") {
    return "구매+공급";
  }
  return type || "-";
}

export default function KakaoMap({
  companies = [],
  onMarkerClick,
  height = "500px",
  sdkReady = true,
  /** 지역 코드(예: SEOUL) — 바뀌면 지도 중심을 해당 권역으로 이동 */
  regionFocus = "",
}) {
  const containerRef = useRef(null);
  const mapRef = useRef(null);
  const markersRef = useRef([]);
  const overlaysRef = useRef([]);

  useEffect(() => {
    if (!sdkReady || !containerRef.current || !window.kakao?.maps) {
      return;
    }

    let cancelled = false;
    const el = containerRef.current;
    el.innerHTML = "";

    const kakao = window.kakao;
    const center = new kakao.maps.LatLng(DEFAULT_CENTER.lat, DEFAULT_CENTER.lng);
    const map = new kakao.maps.Map(el, {
      center,
      level: MAP_LEVEL,
      scrollwheel: true,
    });
    mapRef.current = map;

    // 일부 카카오맵 JS 빌드에서 ScaleControl 등이 생성자로 없어 예외가 납니다. MapType/Zoom만 안전하게 추가합니다.
    try {
      const MC = kakao.maps.MapTypeControl;
      const ZC = kakao.maps.ZoomControl;
      if (typeof MC === "function") {
        map.addControl(new MC(), kakao.maps.ControlPosition.TOPRIGHT);
      }
      if (typeof ZC === "function") {
        map.addControl(new ZC(), kakao.maps.ControlPosition.RIGHT);
      }
    } catch (e) {
      console.warn("Kakao map controls:", e);
    }

    const clearLayers = () => {
      markersRef.current.forEach((m) => m.setMap(null));
      overlaysRef.current.forEach((o) => o.setMap(null));
      markersRef.current = [];
      overlaysRef.current = [];
    };

    const placeMarker = (company, latlng) => {
      const color = markerColor(company.type);
      const imageSrc = pinDataUri(color);
      const imageSize = new kakao.maps.Size(28, 40);
      const imageOption = { offset: new kakao.maps.Point(14, 40) };
      const markerImage = new kakao.maps.MarkerImage(imageSrc, imageSize, imageOption);

      const marker = new kakao.maps.Marker({
        position: latlng,
        map,
        image: markerImage,
        title: company.name,
      });

      const content = document.createElement("div");
      content.style.cssText =
        "padding:10px 12px;min-width:180px;background:#fff;border-radius:10px;box-shadow:0 4px 16px rgba(0,0,0,.18);font-size:13px;";
      content.innerHTML = `
        <div style="font-weight:700;margin-bottom:6px;">${company.name}</div>
        <div style="margin-bottom:8px;">
          <span style="display:inline-block;padding:2px 8px;border-radius:999px;background:${color};color:#fff;font-size:11px;font-weight:600;">${typeLabel(company.type)}</span>
        </div>
        <button type="button" class="fl-kakao-detail" style="width:100%;padding:8px;border-radius:8px;border:none;background:#111827;color:#fff;font-weight:600;cursor:pointer;">자세히 보기</button>
      `;

      const overlay = new kakao.maps.CustomOverlay({
        position: latlng,
        content,
        yAnchor: 1.35,
        clickable: true,
      });

      kakao.maps.event.addListener(marker, "click", () => {
        overlaysRef.current.forEach((o) => o.setMap(null));
        overlay.setMap(map);
        const btn = content.querySelector(".fl-kakao-detail");
        if (btn && onMarkerClick) {
          btn.onclick = () => onMarkerClick(company);
        }
      });

      markersRef.current.push(marker);
      overlaysRef.current.push(overlay);
    };

    const resolveLatLngAsync = async (company) => {
      const regionKey = company.region && REGION_CENTER[company.region] ? company.region : "OTHER";
      const fallback = REGION_CENTER[regionKey] || REGION_CENTER.OTHER;
      const addr = (company.address || "").trim();
      if (!addr) {
        return new kakao.maps.LatLng(fallback.lat, fallback.lng);
      }
      try {
        const { data } = await apiClient.get("/kakao/local/search/address", {
          params: { query: addr, page: 1, size: 10 },
        });
        const inner = data?.success ? data.data : data;
        const docs = inner?.documents;
        if (Array.isArray(docs) && docs[0]) {
          return new kakao.maps.LatLng(Number(docs[0].y), Number(docs[0].x));
        }
      } catch (e) {
        console.warn("주소 좌표 변환 실패:", e?.response?.status ?? e);
      }
      return new kakao.maps.LatLng(fallback.lat, fallback.lng);
    };

    clearLayers();
    if (companies.length === 0) {
      return () => {
        clearLayers();
        mapRef.current = null;
      };
    }

    (async () => {
      for (let i = 0; i < companies.length; i++) {
        if (cancelled) {
          return;
        }
        const company = companies[i];
        const latlng = await resolveLatLngAsync(company);
        if (cancelled) {
          return;
        }
        placeMarker(company, latlng);
        if (i < companies.length - 1) {
          await sleep(GEO_DELAY_MS);
        }
      }
      if (cancelled) {
        return;
      }
      if (markersRef.current.length > 0) {
        const bounds = new kakao.maps.LatLngBounds();
        markersRef.current.forEach((m) => bounds.extend(m.getPosition()));
        map.setBounds(bounds);
      }
    })();

    return () => {
      cancelled = true;
      clearLayers();
      mapRef.current = null;
    };
  }, [sdkReady, companies, onMarkerClick]);

  useEffect(() => {
    if (!sdkReady || !regionFocus || !mapRef.current || !window.kakao?.maps) return;
    const kakao = window.kakao;
    const c = REGION_CENTER[regionFocus];
    if (!c) return;
    mapRef.current.setCenter(new kakao.maps.LatLng(c.lat, c.lng));
    mapRef.current.setLevel(7);
  }, [regionFocus, sdkReady]);

  return (
    <div
      ref={containerRef}
      className="w-full overflow-hidden rounded-xl border border-gray-700 bg-gray-900"
      style={{ height }}
    />
  );
}
