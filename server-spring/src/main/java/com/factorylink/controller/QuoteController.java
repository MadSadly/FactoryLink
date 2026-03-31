package com.factorylink.controller;

import com.factorylink.dto.AiQuoteGenerateResponse;
import com.factorylink.dto.ApiResponse;
import com.factorylink.dto.QuoteGenerateRequest;
import com.factorylink.entity.Quote;
import com.factorylink.mapper.QuoteMapper;
import com.factorylink.service.DocumentService;
import com.factorylink.util.SecurityUtils;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequestMapping("/api/quotes")
public class QuoteController {

  private final DocumentService documentService;
  private final QuoteMapper quoteMapper;

  public QuoteController(DocumentService documentService, QuoteMapper quoteMapper) {
    this.documentService = documentService;
    this.quoteMapper = quoteMapper;
  }

  @PostMapping
  public ResponseEntity<ApiResponse<AiQuoteGenerateResponse>> create(
      @Valid @RequestBody QuoteGenerateRequest request) {
    try {
      AiQuoteGenerateResponse created = documentService.generateQuote(request);
      return ResponseEntity.status(HttpStatus.CREATED)
          .body(ApiResponse.ok(created, "견적서 초안이 생성되었습니다."));
    } catch (Exception e) {
      throw e;
    }
  }

  @GetMapping("/{id}")
  public ResponseEntity<ApiResponse<Quote>> getById(@PathVariable long id) {
    try {
      var principal = SecurityUtils.requirePrincipal();
      Long cid = principal.getCompanyId();
      Quote q = quoteMapper.selectById(id);
      if (q == null) {
        throw new ResponseStatusException(org.springframework.http.HttpStatus.NOT_FOUND, "견적을 찾을 수 없습니다.");
      }
      if (cid == null
          || (!cid.equals(q.getRequesterCompanyId()) && !cid.equals(q.getTargetCompanyId()))) {
        throw new ResponseStatusException(org.springframework.http.HttpStatus.FORBIDDEN, "조회 권한이 없습니다.");
      }
      return ResponseEntity.ok(ApiResponse.ok(q, "조회 완료"));
    } catch (ResponseStatusException e) {
      throw e;
    } catch (Exception e) {
      throw new ResponseStatusException(
          org.springframework.http.HttpStatus.INTERNAL_SERVER_ERROR, "견적 조회 중 오류가 발생했습니다.");
    }
  }
}
