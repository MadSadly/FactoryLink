import { useEffect, useState } from "react";
import { ENV } from "../utils/env";

export function useKakaoMap() {
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    const apiKey = ENV.KAKAO_MAP_KEY;
    if (!apiKey) {
      return;
    }

    if (window.kakao?.maps) {
      window.kakao.maps.load(() => setIsLoaded(true));
      return;
    }

    if (document.getElementById("kakao-map-sdk")) {
      const id = window.setInterval(() => {
        if (window.kakao?.maps) {
          window.clearInterval(id);
          window.kakao.maps.load(() => setIsLoaded(true));
        }
      }, 50);
      return () => {
        window.clearInterval(id);
      };
    }

    const script = document.createElement("script");
    script.id = "kakao-map-sdk";
    script.src = `//dapi.kakao.com/v2/maps/sdk.js?appkey=${apiKey}&autoload=false&libraries=services`;
    script.onload = () => {
      window.kakao.maps.load(() => setIsLoaded(true));
    };
    document.head.appendChild(script);
  }, []);

  return isLoaded;
}
