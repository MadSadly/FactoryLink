package com.factorylink.service;

import com.factorylink.dto.AiContractGenerateResponse;
import com.factorylink.dto.AiQuoteGenerateResponse;
import com.factorylink.dto.ContractDraftCreateRequest;
import com.factorylink.dto.QuoteGenerateRequest;
import com.factorylink.util.SecurityUtils;
import java.util.HashMap;
import java.util.Map;
import java.util.stream.Collectors;
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

/** AI 서버 견적·계약 초안·자연어 분석 호출 */
@Service
public class DocumentService {

  private static final Logger log = LoggerFactory.getLogger(DocumentService.class);

  private final RestTemplate restTemplate;

  @Value("${app.ai.server.url:http://localhost:8000}")
  private String aiServerUrl;

  public DocumentService(RestTemplate restTemplate) {
    this.restTemplate = restTemplate;
  }

  private String base() {
    return aiServerUrl.replaceAll("/$", "");
  }

  public Map<String, Object> parseRequirements(String rawInput) {
    SecurityUtils.requirePrincipal();
    String url = base() + "/ai/parse-requirements";
    Map<String, String> body = Map.of("raw_input", rawInput);
    try {
      ResponseEntity<Map<String, Object>> resp =
          restTemplate.exchange(
              url,
              HttpMethod.POST,
              new HttpEntity<>(body, jsonHeaders()),
              new ParameterizedTypeReference<Map<String, Object>>() {});
      Map<String, Object> data = resp.getBody();
      return data != null ? data : Map.of();
    } catch (RestClientException e) {
      log.warn("parse-requirements: {}", e.getMessage());
      throw new ResponseStatusException(
          org.springframework.http.HttpStatus.BAD_GATEWAY,
          "요구사항 분석 서비스에 연결하지 못했습니다.");
    }
  }

  public AiQuoteGenerateResponse generateQuote(QuoteGenerateRequest request) {
    var principal = SecurityUtils.requirePrincipal();
    Long requesterId = principal.getCompanyId();
    if (requesterId == null) {
      throw new ResponseStatusException(
          org.springframework.http.HttpStatus.BAD_REQUEST, "소속 업체 정보가 없습니다.");
    }

    String url = base() + "/ai/generate-quote";
    Map<String, Object> body = new HashMap<>();
    body.put("requester_company_id", requesterId.intValue());
    body.put("target_company_id", request.targetCompanyId().intValue());
    body.put(
        "items",
        request.items().stream()
            .map(
                i -> {
                  Map<String, Object> m = new HashMap<>();
                  if (i.partId() != null) {
                    m.put("part_id", i.partId());
                  }
                  m.put("name", i.name());
                  m.put("quantity", i.quantity());
                  m.put("unit", i.unit() != null ? i.unit() : "개");
                  m.put("unit_price", i.unitPrice() != null ? i.unitPrice() : 0);
                  m.put("amount", i.amount() != null ? i.amount() : 0);
                  return m;
                })
            .collect(Collectors.toList()));
    body.put("deadline", request.deadline());
    body.put("valid_until", request.validUntil());
    body.put("notes", request.notes() != null ? request.notes() : "");

    try {
      ResponseEntity<AiQuoteGenerateResponse> resp =
          restTemplate.exchange(
              url,
              HttpMethod.POST,
              new HttpEntity<>(body, jsonHeaders()),
              AiQuoteGenerateResponse.class);
      AiQuoteGenerateResponse data = resp.getBody();
      if (data == null) {
        throw new ResponseStatusException(
            org.springframework.http.HttpStatus.BAD_GATEWAY, "견적서 응답이 비어 있습니다.");
      }
      return data;
    } catch (RestClientException e) {
      log.warn("generate-quote: {}", e.getMessage());
      throw new ResponseStatusException(
          org.springframework.http.HttpStatus.BAD_GATEWAY, "견적서 생성 서비스에 연결하지 못했습니다.");
    }
  }

  public AiContractGenerateResponse createContractDraft(ContractDraftCreateRequest request) {
    String url = base() + "/ai/generate-contract";
    Map<String, Object> body = new HashMap<>();
    body.put("quote_id", request.quoteId());
    body.put("payment_terms", request.paymentTerms() != null ? request.paymentTerms() : "");
    body.put("warranty_months", request.warrantyMonths() != null ? request.warrantyMonths() : 12);
    body.put("special_terms", request.specialTerms() != null ? request.specialTerms() : "");

    try {
      ResponseEntity<AiContractGenerateResponse> resp =
          restTemplate.exchange(
              url,
              HttpMethod.POST,
              new HttpEntity<>(body, jsonHeaders()),
              AiContractGenerateResponse.class);
      AiContractGenerateResponse data = resp.getBody();
      if (data == null) {
        throw new ResponseStatusException(
            org.springframework.http.HttpStatus.BAD_GATEWAY, "계약서 응답이 비어 있습니다.");
      }
      return data;
    } catch (RestClientException e) {
      log.warn("generate-contract: {}", e.getMessage());
      throw new ResponseStatusException(
          org.springframework.http.HttpStatus.BAD_GATEWAY, "계약서 생성 서비스에 연결하지 못했습니다.");
    }
  }

  public byte[] exportPdf(String htmlContent, String filename, String type, Long quoteId, Long draftId) {
    String url = base() + "/ai/export-pdf";
    Map<String, Object> body = new HashMap<>();
    body.put("html_content", htmlContent);
    body.put("filename", filename);
    body.put("type", type);
    if (quoteId != null) {
      body.put("quote_id", quoteId);
    }
    if (draftId != null) {
      body.put("draft_id", draftId);
    }

    try {
      ResponseEntity<byte[]> resp =
          restTemplate.exchange(
              url,
              HttpMethod.POST,
              new HttpEntity<>(body, jsonHeaders()),
              byte[].class);
      byte[] data = resp.getBody();
      if (data == null || data.length == 0) {
        throw new ResponseStatusException(
            org.springframework.http.HttpStatus.BAD_GATEWAY, "PDF 데이터가 비어 있습니다.");
      }
      return data;
    } catch (RestClientException e) {
      log.warn("export-pdf: {}", e.getMessage());
      throw new ResponseStatusException(
          org.springframework.http.HttpStatus.BAD_GATEWAY, "PDF 변환 서비스에 연결하지 못했습니다.");
    }
  }

  private HttpHeaders jsonHeaders() {
    HttpHeaders headers = new HttpHeaders();
    headers.setContentType(MediaType.APPLICATION_JSON);
    return headers;
  }
}
