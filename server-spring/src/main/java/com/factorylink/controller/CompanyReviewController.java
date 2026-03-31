package com.factorylink.controller;

import com.factorylink.dto.ApiResponse;
import com.factorylink.dto.ReviewCreateRequest;
import com.factorylink.entity.CompanyReview;
import com.factorylink.service.CompanyReviewService;
import jakarta.validation.Valid;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/companies")
public class CompanyReviewController {

  private final CompanyReviewService companyReviewService;

  public CompanyReviewController(CompanyReviewService companyReviewService) {
    this.companyReviewService = companyReviewService;
  }

  @GetMapping("/{reviewedCompanyId}/reviews")
  public ResponseEntity<ApiResponse<List<CompanyReview>>> list(@PathVariable Long reviewedCompanyId) {
    return ResponseEntity.ok(
        ApiResponse.ok(companyReviewService.listByReviewedCompany(reviewedCompanyId), "조회 완료"));
  }

  @PostMapping("/{reviewedCompanyId}/reviews")
  public ResponseEntity<ApiResponse<CompanyReview>> create(
      @PathVariable Long reviewedCompanyId, @Valid @RequestBody ReviewCreateRequest request) {
    CompanyReview created = companyReviewService.create(reviewedCompanyId, request);
    return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.ok(created, "리뷰가 등록되었습니다."));
  }
}
