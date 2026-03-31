import { useEffect, useState } from "react";
import { ENV } from "../utils/env";

const SDK_TIMEOUT_MS = 20000;

function removeKakaoSdkFromPage() {
  const el = document.getElementById("kakao-map-sdk");
  if (el?.parentNode) {
    el.parentNode.removeChild(el);
  }
  try {
    delete window.kakao;
  } catch {
    window.kakao = undefined;
  }
}

/**
 * Loads Kakao Maps JS SDK. Re-loads when VITE_KAKAO_MAP_KEY changes (restart `npm run dev` after editing .env).
 * @returns {{ isLoaded: boolean, loadError: string | null }}
 */
export function useKakaoMap() {
  const [isLoaded, setIsLoaded] = useState(false);
  const [loadError, setLoadError] = useState(null);
  const apiKey = ENV.KAKAO_MAP_KEY;

  useEffect(() => {
    if (!apiKey) {
      setIsLoaded(false);
      setLoadError(null);
      return;
    }

    let cancelled = false;
    let timeoutId;

    const clearTimer = () => {
      if (timeoutId) {
        window.clearTimeout(timeoutId);
        timeoutId = undefined;
      }
    };

    const fail = (message) => {
      clearTimer();
      if (!cancelled) {
        setLoadError(message);
        setIsLoaded(false);
      }
    };

    const succeed = () => {
      if (!cancelled) {
        clearTimer();
        setLoadError(null);
        setIsLoaded(true);
      }
    };

    const runLoaded = () => {
      if (!window.kakao?.maps) {
        fail("카카오 지도 SDK를 초기화할 수 없습니다.");
        return;
      }
      try {
        window.kakao.maps.load(() => succeed());
      } catch {
        fail("카카오 지도 SDK 초기화 중 오류가 발생했습니다.");
      }
    };

    removeKakaoSdkFromPage();
    setLoadError(null);
    setIsLoaded(false);

    const script = document.createElement("script");
    script.id = "kakao-map-sdk";
    script.async = true;
    script.src = `https://dapi.kakao.com/v2/maps/sdk.js?appkey=${encodeURIComponent(apiKey)}&autoload=false&libraries=services`;
    script.onload = () => {
      runLoaded();
    };
    script.onerror = () => {
      fail("지도 SDK를 불러오지 못했습니다. 네트워크와 JavaScript 키를 확인하세요.");
    };
    timeoutId = window.setTimeout(() => {
      if (!cancelled && !window.kakao?.maps) {
        fail("지도 SDK 응답이 없습니다. 카카오 개발자 콘솔에서 키와 사이트 도메인을 확인하세요.");
      }
    }, SDK_TIMEOUT_MS);
    document.head.appendChild(script);

    return () => {
      cancelled = true;
      clearTimer();
    };
  }, [apiKey]);

  return { isLoaded, loadError };
}
