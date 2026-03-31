package com.factorylink.controller;

import com.factorylink.dto.AiContractGenerateResponse;
import com.factorylink.dto.ApiResponse;
import com.factorylink.dto.ContractDraftCreateRequest;
import com.factorylink.entity.ContractDraft;
import com.factorylink.entity.Quote;
import com.factorylink.mapper.ContractDraftMapper;
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

/** AI 생성 계약 초안(contract_drafts). 기존 채팅 계약(contracts)과 별도 */
@RestController
@RequestMapping("/api/contracts")
public class ContractDraftController {

  private final DocumentService documentService;
  private final QuoteMapper quoteMapper;
  private final ContractDraftMapper contractDraftMapper;

  public ContractDraftController(
      DocumentService documentService,
      QuoteMapper quoteMapper,
      ContractDraftMapper contractDraftMapper) {
    this.documentService = documentService;
    this.quoteMapper = quoteMapper;
    this.contractDraftMapper = contractDraftMapper;
  }

  @PostMapping("/draft")
  public ResponseEntity<ApiResponse<AiContractGenerateResponse>> createDraft(
      @Valid @RequestBody ContractDraftCreateRequest request) {
    try {
      Quote q = quoteMapper.selectById(request.quoteId());
      if (q == null) {
        throw new ResponseStatusException(org.springframework.http.HttpStatus.NOT_FOUND, "견적을 찾을 수 없습니다.");
      }
      var principal = SecurityUtils.requirePrincipal();
      Long cid = principal.getCompanyId();
      if (cid == null
          || (!cid.equals(q.getRequesterCompanyId()) && !cid.equals(q.getTargetCompanyId()))) {
        throw new ResponseStatusException(org.springframework.http.HttpStatus.FORBIDDEN, "권한이 없습니다.");
      }
      AiContractGenerateResponse created = documentService.createContractDraft(request);
      return ResponseEntity.status(HttpStatus.CREATED)
          .body(ApiResponse.ok(created, "계약서 초안이 생성되었습니다."));
    } catch (ResponseStatusException e) {
      throw e;
    } catch (Exception e) {
      throw new ResponseStatusException(
          org.springframework.http.HttpStatus.INTERNAL_SERVER_ERROR, "계약서 생성 중 오류가 발생했습니다.");
    }
  }

  @GetMapping("/draft/{id}")
  public ResponseEntity<ApiResponse<ContractDraft>> getDraftById(@PathVariable long id) {
    try {
      ContractDraft d = contractDraftMapper.selectById(id);
      if (d == null) {
        throw new ResponseStatusException(
            org.springframework.http.HttpStatus.NOT_FOUND, "계약 초안을 찾을 수 없습니다.");
      }
      Quote q = quoteMapper.selectById(d.getQuoteId());
      if (q == null) {
        throw new ResponseStatusException(org.springframework.http.HttpStatus.NOT_FOUND, "연결된 견적을 찾을 수 없습니다.");
      }
      var principal = SecurityUtils.requirePrincipal();
      Long cid = principal.getCompanyId();
      if (cid == null
          || (!cid.equals(q.getRequesterCompanyId()) && !cid.equals(q.getTargetCompanyId()))) {
        throw new ResponseStatusException(org.springframework.http.HttpStatus.FORBIDDEN, "조회 권한이 없습니다.");
      }
      return ResponseEntity.ok(ApiResponse.ok(d, "조회 완료"));
    } catch (ResponseStatusException e) {
      throw e;
    } catch (Exception e) {
      throw new ResponseStatusException(
          org.springframework.http.HttpStatus.INTERNAL_SERVER_ERROR, "조회 중 오류가 발생했습니다.");
    }
  }
}
