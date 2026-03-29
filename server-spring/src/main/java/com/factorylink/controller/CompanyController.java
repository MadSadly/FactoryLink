package com.factorylink.controller;

import com.factorylink.dto.ApiResponse;
import com.factorylink.dto.CompanyDetailData;
import com.factorylink.dto.CompanyUpdateRequest;
import com.factorylink.entity.Company;
import com.factorylink.service.CompanyService;
import java.util.List;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/companies")
public class CompanyController {

  private final CompanyService companyService;

  public CompanyController(CompanyService companyService) {
    this.companyService = companyService;
  }

  @GetMapping
  public ResponseEntity<ApiResponse<List<Company>>> list(
      @RequestParam(required = false) String region,
      @RequestParam(required = false) String type) {
    try {
      return ResponseEntity.ok(ApiResponse.ok(companyService.list(region, type), "조회 완료"));
    } catch (Exception e) {
      throw e;
    }
  }

  @GetMapping("/{id}")
  public ResponseEntity<ApiResponse<CompanyDetailData>> getById(@PathVariable Long id) {
    try {
      return ResponseEntity.ok(ApiResponse.ok(companyService.getById(id), "조회 완료"));
    } catch (Exception e) {
      throw e;
    }
  }

  @PutMapping("/{id}")
  public ResponseEntity<ApiResponse<Company>> update(
      @PathVariable Long id, @RequestBody CompanyUpdateRequest request) {
    try {
      return ResponseEntity.ok(ApiResponse.ok(companyService.update(id, request), "수정 완료"));
    } catch (Exception e) {
      throw e;
    }
  }
}
