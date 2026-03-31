package com.factorylink.controller;

import com.factorylink.dto.ApiResponse;
import com.factorylink.dto.ParseRequirementsRequest;
import com.factorylink.service.DocumentService;
import jakarta.validation.Valid;
import java.util.Map;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/ai")
public class AiParseController {

  private final DocumentService documentService;

  public AiParseController(DocumentService documentService) {
    this.documentService = documentService;
  }

  @PostMapping("/parse-requirements")
  public ResponseEntity<ApiResponse<Map<String, Object>>> parse(
      @Valid @RequestBody ParseRequirementsRequest request) {
    try {
      return ResponseEntity.ok(
          ApiResponse.ok(documentService.parseRequirements(request.rawInput()), "분석 완료"));
    } catch (Exception e) {
      throw e;
    }
  }
}
