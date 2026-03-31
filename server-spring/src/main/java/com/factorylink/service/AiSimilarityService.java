package com.factorylink.service;

import com.factorylink.dto.CompanyListItem;
import com.factorylink.entity.Company;
import com.factorylink.entity.Part;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.LinkedHashSet;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClientException;
import org.springframework.web.client.RestTemplate;
import com.factorylink.mapper.PartMapper;

/**
 * 업체 프로필 유사도 (server-ai /api/similarity/companies).
 *
 * 실패 시 빈 맵 → 호출부에서 규칙 기반 점수로 폴백.
 */
@Service
public class AiSimilarityService {

  private static final Logger log = LoggerFactory.getLogger(AiSimilarityService.class);

  // 예시: "가죽 공장"은 "신발/의류" 업체와도 매칭되도록 연관 카테고리를 anchor 쪽 텍스트에 함께 넣습니다.
  // 필요하면 parts.category 실제 값에 맞춰 이 맵만 확장하면 됩니다.
  private static final Map<String, List<String>> RELATED_CATEGORY_MAP =
      Map.of(
          "가죽", List.of("신발", "의류"),
          "신발", List.of("가죽", "의류"),
          "의류", List.of("가죽", "신발"));

  private final RestTemplate restTemplate;
  private final PartMapper partMapper;

  @Value("${app.ai.server.url:http://localhost:8000}")
  private String aiServerUrl;

  @Value("${app.ai.embedding.enabled:true}")
  private boolean embeddingEnabled;

  public AiSimilarityService(RestTemplate restTemplate, PartMapper partMapper) {
    this.restTemplate = restTemplate;
    this.partMapper = partMapper;
  }

  private String baseProfileText(String name, String region, String address, String type) {
    return String.format(
        "업체명: %s. 지역: %s. 주소: %s. 유형: %s.",
        nz(name), nz(region), nz(address), nz(type));
  }

  private static String nz(String s) {
    return s == null ? "" : s.trim();
  }

  private List<String> categoryListByCompanyId(Long companyId) {
    if (companyId == null) {
      return List.of();
    }
    List<Part> parts = partMapper.selectByCompanyId(companyId);
    if (parts == null || parts.isEmpty()) {
      return List.of();
    }
    Set<String> uniq =
        parts.stream()
            .map(Part::getCategory)
            .filter(cat -> cat != null && !cat.trim().isEmpty())
            .map(String::trim)
            .collect(Collectors.toSet());
    return new ArrayList<>(uniq);
  }

  private static List<String> expandRelatedCategories(List<String> baseCategories) {
    if (baseCategories == null || baseCategories.isEmpty()) {
      return List.of();
    }
    Set<String> out = new LinkedHashSet<>();
    out.addAll(baseCategories);
    for (String cat : baseCategories) {
      if (cat == null) {
        continue;
      }
      String key = cat.trim();
      if (key.isEmpty()) {
        continue;
      }
      List<String> related = RELATED_CATEGORY_MAP.get(key);
      if (related != null && !related.isEmpty()) {
        out.addAll(related);
      }
    }
    return new ArrayList<>(out);
  }

  private String profileText(Company c, List<String> categories) {
    if (c == null) {
      return "";
    }
    String base =
        baseProfileText(c.getName(), c.getRegion(), c.getAddress(), c.getType());
    if (categories == null || categories.isEmpty()) {
      return base;
    }
    return base + " 부품 카테고리: " + String.join(", ", categories) + ".";
  }

  private String profileText(CompanyListItem c, List<String> categories) {
    if (c == null) {
      return "";
    }
    String base =
        baseProfileText(c.getName(), c.getRegion(), c.getAddress(), c.getType());
    if (categories == null || categories.isEmpty()) {
      return base;
    }
    return base + " 부품 카테고리: " + String.join(", ", categories) + ".";
  }

  /**
   * @return companyId → 점수 0~100, 실패 시 빈 맵
   */
  @SuppressWarnings("unchecked")
  public Map<Long, Integer> scoreCompanies(Company anchor, List<CompanyListItem> others) {
    if (!embeddingEnabled || anchor == null || others == null || others.isEmpty()) {
      return Map.of();
    }
    List<String> anchorCategories = categoryListByCompanyId(anchor.getId());
    List<String> expandedAnchorCategories = expandRelatedCategories(anchorCategories);
    String anchorText =
        profileText(anchor, expandedAnchorCategories);
    if (anchorText.isBlank()) {
      return Map.of();
    }

    List<Map<String, Object>> candidates = new ArrayList<>();
    int candidatesWithCats = 0;
    for (CompanyListItem o : others) {
      if (o.getId() == null) {
        continue;
      }
      List<String> candidateCategories = categoryListByCompanyId(o.getId());
      if (candidateCategories != null && !candidateCategories.isEmpty()) {
        candidatesWithCats++;
      }
      String text = profileText(o, candidateCategories);
      if (text.isBlank()) {
        text = "업체명: " + nz(o.getName());
      }
      Map<String, Object> row = new HashMap<>();
      row.put("id", o.getId());
      row.put("text", text);
      candidates.add(row);
    }
    log.info(
        "AI similarity payload built: anchorCats={}, anchorExpandedCats={}, candidatesWithCats={}, candidates={}",
        anchorCategories.size(),
        expandedAnchorCategories.size(),
        candidatesWithCats,
        candidates.size());
    if (candidates.isEmpty()) {
      return Map.of();
    }

    String url = aiServerUrl.replaceAll("/$", "") + "/api/similarity/companies";
    Map<String, Object> body = new HashMap<>();
    body.put("anchor_text", anchorText);
    body.put("candidates", candidates);

    HttpHeaders headers = new HttpHeaders();
    headers.setContentType(MediaType.APPLICATION_JSON);
    HttpEntity<Map<String, Object>> entity = new HttpEntity<>(body, headers);

    try {
      ResponseEntity<Map> response = restTemplate.exchange(url, HttpMethod.POST, entity, Map.class);
      Map<?, ?> resp = response.getBody();
      if (resp == null || !Boolean.TRUE.equals(resp.get("success"))) {
        log.warn("AI similarity response not successful: {}", resp);
        return Map.of();
      }
      Object data = resp.get("data");
      if (!(data instanceof List<?> list)) {
        return Map.of();
      }
      Map<Long, Integer> out = new HashMap<>();
      for (Object item : list) {
        if (item instanceof Map<?, ?> m) {
          Object id = m.get("id");
          Object score = m.get("score");
          if (id instanceof Number n && score instanceof Number s) {
            out.put(n.longValue(), Math.max(0, Math.min(100, s.intValue())));
          }
        }
      }
      return out;
    } catch (RestClientException e) {
      log.warn("AI similarity call failed (fallback to rule score): {}", e.getMessage());
      return Map.of();
    }
  }
}
