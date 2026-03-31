package com.factorylink.controller;

import com.factorylink.entity.ContractDraft;
import com.factorylink.entity.Quote;
import com.factorylink.mapper.ContractDraftMapper;
import com.factorylink.mapper.QuoteMapper;
import com.factorylink.service.DocumentService;
import com.factorylink.util.SecurityUtils;
import java.nio.charset.StandardCharsets;
import org.springframework.http.ContentDisposition;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequestMapping("/api/pdf")
public class PdfController {

  private final DocumentService documentService;
  private final QuoteMapper quoteMapper;
  private final ContractDraftMapper contractDraftMapper;

  public PdfController(
      DocumentService documentService,
      QuoteMapper quoteMapper,
      ContractDraftMapper contractDraftMapper) {
    this.documentService = documentService;
    this.quoteMapper = quoteMapper;
    this.contractDraftMapper = contractDraftMapper;
  }

  @GetMapping("/quote/{id}")
  public ResponseEntity<byte[]> quotePdf(@PathVariable long id) {
    try {
      var principal = SecurityUtils.requirePrincipal();
      Long cid = principal.getCompanyId();
      Quote q = quoteMapper.selectById(id);
      if (q == null) {
        throw new ResponseStatusException(org.springframework.http.HttpStatus.NOT_FOUND, "견적을 찾을 수 없습니다.");
      }
      if (cid == null
          || (!cid.equals(q.getRequesterCompanyId()) && !cid.equals(q.getTargetCompanyId()))) {
        throw new ResponseStatusException(org.springframework.http.HttpStatus.FORBIDDEN, "권한이 없습니다.");
      }
      String html = q.getQuoteHtml();
      if (html == null || html.isBlank()) {
        throw new ResponseStatusException(
            org.springframework.http.HttpStatus.BAD_REQUEST, "저장된 견적서 HTML이 없습니다.");
      }
      String filename = "견적서_" + id;
      byte[] pdf =
          documentService.exportPdf(html, filename, "quote", id, null);
      return pdfResponse(pdf, "quote-" + id + ".pdf");
    } catch (ResponseStatusException e) {
      throw e;
    } catch (Exception e) {
      throw new ResponseStatusException(
          org.springframework.http.HttpStatus.INTERNAL_SERVER_ERROR, "PDF 생성 중 오류가 발생했습니다.");
    }
  }

  @GetMapping("/contract/{id}")
  public ResponseEntity<byte[]> contractPdf(@PathVariable long id) {
    try {
      var principal = SecurityUtils.requirePrincipal();
      Long cid = principal.getCompanyId();
      ContractDraft d = contractDraftMapper.selectById(id);
      if (d == null) {
        throw new ResponseStatusException(
            org.springframework.http.HttpStatus.NOT_FOUND, "계약 초안을 찾을 수 없습니다.");
      }
      Quote q = quoteMapper.selectById(d.getQuoteId());
      if (q == null) {
        throw new ResponseStatusException(org.springframework.http.HttpStatus.NOT_FOUND, "연결된 견적을 찾을 수 없습니다.");
      }
      if (cid == null
          || (!cid.equals(q.getRequesterCompanyId()) && !cid.equals(q.getTargetCompanyId()))) {
        throw new ResponseStatusException(org.springframework.http.HttpStatus.FORBIDDEN, "권한이 없습니다.");
      }
      String html = d.getContractHtml();
      if (html == null || html.isBlank()) {
        throw new ResponseStatusException(
            org.springframework.http.HttpStatus.BAD_REQUEST, "저장된 계약서 HTML이 없습니다.");
      }
      String filename = "계약서_" + id;
      byte[] pdf =
          documentService.exportPdf(html, filename, "contract", null, id);
      return pdfResponse(pdf, "contract-" + id + ".pdf");
    } catch (ResponseStatusException e) {
      throw e;
    } catch (Exception e) {
      throw new ResponseStatusException(
          org.springframework.http.HttpStatus.INTERNAL_SERVER_ERROR, "PDF 생성 중 오류가 발생했습니다.");
    }
  }

  private static ResponseEntity<byte[]> pdfResponse(byte[] pdf, String downloadName) {
    HttpHeaders headers = new HttpHeaders();
    headers.setContentType(MediaType.APPLICATION_PDF);
    headers.setContentDisposition(
        ContentDisposition.attachment()
            .filename(downloadName, StandardCharsets.UTF_8)
            .build());
    return ResponseEntity.ok().headers(headers).body(pdf);
  }
}
