package com.factorylink.service;

import com.factorylink.config.GyeonggiSyncProperties;
import com.factorylink.dto.GyeonggiSyncResult;
import com.factorylink.entity.Company;
import com.factorylink.mapper.CompanyMapper;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.ArrayList;
import java.util.List;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;
import org.springframework.web.client.RestClient;

@Service
public class GyeonggiFactrySyncService {

  private static final Logger log = LoggerFactory.getLogger(GyeonggiFactrySyncService.class);
  private static final String EXTERNAL_SOURCE = "GG_FACTRYREGISTTM";

  private final GyeonggiSyncProperties props;
  private final CompanyMapper companyMapper;
  private final ObjectMapper objectMapper;
  private final RestClient ggClient = RestClient.builder().baseUrl("https://openapi.gg.go.kr").build();

  public GyeonggiFactrySyncService(
      GyeonggiSyncProperties props, CompanyMapper companyMapper, ObjectMapper objectMapper) {
    this.props = props;
    this.companyMapper = companyMapper;
    this.objectMapper = objectMapper;
  }

  /**
   * 경기도 공장등록 OPEN API를 페이지 단위로 호출해 companies에 upsert합니다.
   * 멱등 키: 출처 + 업체명 + 도로명주소(없으면 지번)의 SHA-256 hex.
   */
  @Transactional
  public GyeonggiSyncResult sync() {
    if (!StringUtils.hasText(props.apiKey())) {
      log.warn("Gyeonggi FACTRYREGISTTM sync skipped: app.gyeonggi.sync.api-key / GYEONGGI_OPENAPI_KEY empty");
      return new GyeonggiSyncResult(0, 0, "skipped: API key not configured");
    }

    int pageSize = Math.min(1000, Math.max(1, props.pageSize()));
    int maxRows = Math.max(1, props.maxRowsPerRun());
    int pagesFetched = 0;
    int rowsUpserted = 0;
    int pIndex = 1;

    try {
      while (rowsUpserted < maxRows) {
        final int page = pIndex;
        String body =
            ggClient
                .get()
                .uri(
                    uriBuilder ->
                        uriBuilder
                            .path("/FACTRYREGISTTM")
                            .queryParam("KEY", props.apiKey())
                            .queryParam("Type", "json")
                            .queryParam("pIndex", page)
                            .queryParam("pSize", pageSize)
                            .build())
                .retrieve()
                .body(String.class);

        JsonNode root = objectMapper.readTree(body);
        String apiErr = apiErrorFromBody(root);
        if (apiErr != null) {
          return new GyeonggiSyncResult(pagesFetched, rowsUpserted, "API: " + apiErr);
        }

        List<JsonNode> rowNodes = extractRows(root);
        pagesFetched++;
        if (rowNodes.isEmpty()) {
          break;
        }

        for (JsonNode row : rowNodes) {
          if (rowsUpserted >= maxRows) {
            break;
          }
          Company c = toCompany(row);
          if (c == null) {
            continue;
          }
          companyMapper.upsertByExternalKey(c);
          rowsUpserted++;
        }

        if (rowNodes.size() < pageSize) {
          break;
        }
        pIndex++;
      }

      log.info("Gyeonggi FACTRYREGISTTM sync done: pages={}, rowsUpserted={}", pagesFetched, rowsUpserted);
      return new GyeonggiSyncResult(pagesFetched, rowsUpserted, null);
    } catch (Exception e) {
      log.error("Gyeonggi FACTRYREGISTTM sync failed", e);
      return new GyeonggiSyncResult(pagesFetched, rowsUpserted, e.getMessage());
    }
  }

  /** 최상위 RESULT 또는 FACTRYREGISTTM[].head.RESULT 의 비정상 코드 */
  private String apiErrorFromBody(JsonNode root) {
    if (root.has("RESULT")) {
      String code = root.path("RESULT").path("CODE").asText("");
      if (!code.isEmpty() && !"INFO-000".equals(code)) {
        return root.path("RESULT").path("MESSAGE").asText(code);
      }
    }
    JsonNode wrap = root.get("FACTRYREGISTTM");
    if (wrap == null) {
      return null;
    }
    JsonNode block = wrap.isArray() ? wrap.get(0) : wrap;
    if (block == null) {
      return null;
    }
    JsonNode head = block.get("head");
    if (head != null) {
      String code = head.path("RESULT").path("CODE").asText("");
      if (!code.isEmpty() && !"INFO-000".equals(code)) {
        return head.path("RESULT").path("MESSAGE").asText(code);
      }
    }
    return null;
  }

  /**
   * FACTRYREGISTTM 이 단일 객체 { head, row } 이거나, 배열 [ { head… }, { row… } ] 로 오는 경우 모두 처리.
   */
  private List<JsonNode> extractRows(JsonNode root) {
    JsonNode wrap = root.get("FACTRYREGISTTM");
    if (wrap == null) {
      return List.of();
    }
    List<JsonNode> out = new ArrayList<>();
    if (wrap.isArray()) {
      for (JsonNode part : wrap) {
        if (part == null || !part.isObject()) {
          continue;
        }
        JsonNode row = part.get("row");
        if (row == null || row.isNull()) {
          continue;
        }
        if (row.isArray()) {
          row.forEach(out::add);
        } else {
          out.add(row);
        }
      }
    } else {
      JsonNode row = wrap.get("row");
      if (row == null || row.isNull()) {
        return List.of();
      }
      if (row.isArray()) {
        row.forEach(out::add);
      } else {
        out.add(row);
      }
    }
    return out;
  }

  private Company toCompany(JsonNode row) {
    String name = text(row, "COMPNY_GRP_NM");
    String road = text(row, "REFINE_ROADNM_ADDR");
    String lot = text(row, "REFINE_LOTNO_ADDR");
    String addr = StringUtils.hasText(road) ? road : lot;
    if (!StringUtils.hasText(name) && !StringUtils.hasText(addr)) {
      return null;
    }
    if (!StringUtils.hasText(name)) {
      name = "이름미상";
    }
    name = name.length() > 100 ? name.substring(0, 100) : name;
    addr = StringUtils.hasText(addr) ? (addr.length() > 255 ? addr.substring(0, 255) : addr) : "";

    String phone = text(row, "TELNO").replaceAll("\\s+", "");
    if (phone.length() > 20) {
      phone = phone.substring(0, 20);
    }

    String keyMaterial = EXTERNAL_SOURCE + "|" + name.trim() + "|" + addr.trim();
    String externalKey = sha256Hex(keyMaterial);

    Company c = new Company();
    c.setName(name);
    c.setRegion("GYEONGGI");
    c.setAddress(addr);
    c.setContactEmail(null);
    c.setContactPhone(StringUtils.hasText(phone) ? phone : null);
    c.setType("SELLER");
    c.setExternalSource(EXTERNAL_SOURCE);
    c.setExternalKey(externalKey);
    return c;
  }

  private static String text(JsonNode row, String field) {
    JsonNode n = row.get(field);
    return n == null || n.isNull() ? "" : n.asText("").trim();
  }

  private static String sha256Hex(String s) {
    try {
      MessageDigest md = MessageDigest.getInstance("SHA-256");
      byte[] d = md.digest(s.getBytes(StandardCharsets.UTF_8));
      StringBuilder sb = new StringBuilder(64);
      for (byte b : d) {
        sb.append(String.format("%02x", b));
      }
      return sb.toString();
    } catch (NoSuchAlgorithmException e) {
      throw new IllegalStateException(e);
    }
  }
}
