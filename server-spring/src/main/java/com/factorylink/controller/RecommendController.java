package com.factorylink.controller;

import com.factorylink.dto.ApiResponse;
import com.factorylink.dto.HybridRecommendItem;
import com.factorylink.service.RecommendService;
import java.util.List;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/companies")
public class RecommendController {

  private final RecommendService recommendService;

  public RecommendController(RecommendService recommendService) {
    this.recommendService = recommendService;
  }

  /** 하이브리드 AI 추천 (로그인 사용자 company_id 기준) */
  @GetMapping("/recommend")
  public ResponseEntity<ApiResponse<List<HybridRecommendItem>>> recommend(
      @RequestParam(required = false) List<String> queryItems,
      @RequestParam(required = false) String region,
      @RequestParam(required = false, defaultValue = "10") int topK) {
    try {
      return ResponseEntity.ok(
          ApiResponse.ok(recommendService.recommend(queryItems, region, topK), "추천 조회 완료"));
    } catch (Exception e) {
      throw e;
    }
  }
}
