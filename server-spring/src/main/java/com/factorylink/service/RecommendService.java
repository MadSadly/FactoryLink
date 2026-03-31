package com.factorylink.service;

import com.factorylink.dto.HybridRecommendItem;
import com.factorylink.entity.Part;
import com.factorylink.mapper.PartMapper;
import com.factorylink.util.SecurityUtils;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClientException;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.server.ResponseStatusException;

/** AI 서버 하이브리드 추천(/ai/recommend) 호출 */
@Service
public class RecommendService {

  private static final Logger log = LoggerFactory.getLogger(RecommendService.class);

  private final RestTemplate restTemplate;
  private final PartMapper partMapper;

  @Value("${app.ai.server.url:http://localhost:8000}")
  private String aiServerUrl;

  public RecommendService(RestTemplate restTemplate, PartMapper partMapper) {
    this.restTemplate = restTemplate;
    this.partMapper = partMapper;
  }

  public List<HybridRecommendItem> recommend(
      List<String> queryItems, String region, int topK) {
    var principal = SecurityUtils.requirePrincipal();
    Long companyId = principal.getCompanyId();
    if (companyId == null) {
      throw new ResponseStatusException(
          org.springframework.http.HttpStatus.BAD_REQUEST, "소속 업체 정보가 없습니다.");
    }

    List<String> items = new ArrayList<>();
    if (queryItems != null) {
      for (String s : queryItems) {
        if (s != null && !s.isBlank()) {
          items.add(s.trim());
        }
      }
    }
    if (items.isEmpty()) {
      List<Part> parts = partMapper.selectByCompanyId(companyId);
      if (parts != null) {
        for (Part p : parts) {
          if (p.getName() != null && !p.getName().isBlank()) {
            items.add(p.getName().trim());
          }
          if (p.getCategory() != null && !p.getCategory().isBlank()) {
            items.add(p.getCategory().trim());
          }
        }
      }
    }
    if (items.isEmpty()) {
      items.add("제조 부품");
    }

    int k = topK > 0 && topK <= 50 ? topK : 10;
    String url = aiServerUrl.replaceAll("/$", "") + "/ai/recommend";
    Map<String, Object> body = new HashMap<>();
    body.put("query_items", items);
    body.put("query_company_id", companyId.intValue());
    body.put("region", region);
    body.put("top_k", k);

    HttpHeaders headers = new HttpHeaders();
    headers.setContentType(MediaType.APPLICATION_JSON);
    HttpEntity<Map<String, Object>> entity = new HttpEntity<>(body, headers);

    try {
      ResponseEntity<List<HybridRecommendItem>> resp =
          restTemplate.exchange(
              url,
              HttpMethod.POST,
              entity,
              new ParameterizedTypeReference<List<HybridRecommendItem>>() {});
      List<HybridRecommendItem> data = resp.getBody();
      return data != null ? data : List.of();
    } catch (RestClientException e) {
      log.warn("AI recommend failed: {}", e.getMessage());
      throw new ResponseStatusException(
          org.springframework.http.HttpStatus.BAD_GATEWAY,
          "추천 서비스에 연결하지 못했습니다. 잠시 후 다시 시도해 주세요.");
    }
  }
}
