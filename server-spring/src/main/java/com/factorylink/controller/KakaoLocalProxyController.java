package com.factorylink.controller;

import com.factorylink.dto.ApiResponse;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.nio.charset.StandardCharsets;
import java.util.Map;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.util.UriComponentsBuilder;

/**
 * 카카오 로컬 주소 검색 프록시. 브라우저에서 dapi.kakao.com 직접 호출 시 CORS로 차단되므로 서버에서 전달합니다.
 *
 * <p>환경 변수: KAKAO_REST_API_KEY (카카오 개발자 콘솔의 REST API 키 — JavaScript 키와 별도로 표시됨)
 */
@RestController
@RequestMapping("/api/kakao")
public class KakaoLocalProxyController {

  private static final String KAKAO_ADDRESS_URL = "https://dapi.kakao.com/v2/local/search/address.json";

  private final RestTemplate restTemplate;
  private final ObjectMapper objectMapper;

  @Value("${app.kakao.rest-api-key:}")
  private String kakaoRestApiKey;

  public KakaoLocalProxyController(RestTemplate restTemplate, ObjectMapper objectMapper) {
    this.restTemplate = restTemplate;
    this.objectMapper = objectMapper;
  }

  @GetMapping("/local/search/address")
  public ResponseEntity<ApiResponse<Map<String, Object>>> searchAddress(
      @RequestParam String query,
      @RequestParam(defaultValue = "1") int page,
      @RequestParam(defaultValue = "10") int size) {
    if (kakaoRestApiKey == null || kakaoRestApiKey.isBlank()) {
      return ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE)
          .body(ApiResponse.fail("KAKAO_REST_API_KEY가 설정되어 있지 않습니다."));
    }
    String q = query == null ? "" : query.trim();
    if (q.isEmpty()) {
      return ResponseEntity.badRequest().body(ApiResponse.fail("query가 비어 있습니다."));
    }

    var uri =
        UriComponentsBuilder.fromHttpUrl(KAKAO_ADDRESS_URL)
            .queryParam("query", q)
            .queryParam("page", page)
            .queryParam("size", Math.min(Math.max(size, 1), 30))
            .encode(StandardCharsets.UTF_8)
            .build()
            .toUri();

    HttpHeaders headers = new HttpHeaders();
    headers.set("Authorization", "KakaoAK " + kakaoRestApiKey.trim());
    HttpEntity<Void> entity = new HttpEntity<>(headers);

    try {
      ResponseEntity<String> resp =
          restTemplate.exchange(uri, HttpMethod.GET, entity, String.class);
      String body = resp.getBody();
      if (body == null || body.isBlank()) {
        return ResponseEntity.status(HttpStatus.BAD_GATEWAY)
            .body(ApiResponse.fail("카카오 API 응답이 비어 있습니다."));
      }
      Map<String, Object> map =
          objectMapper.readValue(body, new TypeReference<Map<String, Object>>() {});
      return ResponseEntity.ok(ApiResponse.ok(map, "조회 완료"));
    } catch (org.springframework.web.client.HttpStatusCodeException e) {
      String detail = e.getResponseBodyAsString();
      String msg = "카카오 주소 검색 오류: HTTP " + e.getStatusCode().value();
      if (detail != null && !detail.isBlank() && detail.length() < 800) {
        msg += " — " + detail.trim();
      } else if (e.getStatusCode().value() == 401) {
        msg += " (REST API 키를 확인하세요. 카카오 개발자 콘솔의 REST API 키가 app.kakao.rest-api-key / KAKAO_REST_API_KEY에 설정되어야 합니다.)";
      }
      return ResponseEntity.status(HttpStatus.BAD_GATEWAY).body(ApiResponse.fail(msg));
    } catch (Exception e) {
      return ResponseEntity.status(HttpStatus.BAD_GATEWAY)
          .body(ApiResponse.fail("카카오 주소 검색 처리 중 오류가 발생했습니다."));
    }
  }
}
