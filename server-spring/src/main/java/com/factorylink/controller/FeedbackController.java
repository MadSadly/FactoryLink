package com.factorylink.controller;

import com.factorylink.dto.ApiResponse;
import com.factorylink.dto.RecommendFeedbackRequest;
import com.factorylink.mapper.RecommendMapper;
import com.factorylink.util.SecurityUtils;
import jakarta.validation.Valid;
import java.math.BigDecimal;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequestMapping("/api/recommend")
public class FeedbackController {

  private final RecommendMapper recommendMapper;

  public FeedbackController(RecommendMapper recommendMapper) {
    this.recommendMapper = recommendMapper;
  }

  @PostMapping("/feedback")
  public ResponseEntity<ApiResponse<Void>> feedback(@Valid @RequestBody RecommendFeedbackRequest request) {
    try {
      var principal = SecurityUtils.requirePrincipal();
      if (principal.getCompanyId() == null
          || !principal.getCompanyId().equals(request.queryCompanyId())) {
        throw new ResponseStatusException(
            org.springframework.http.HttpStatus.FORBIDDEN, "본인 소속 업체 피드백만 등록할 수 있습니다.");
      }
      BigDecimal score =
          request.score() != null ? BigDecimal.valueOf(request.score()) : null;
      recommendMapper.insertFeedback(
          request.queryCompanyId(),
          request.recommendedCompanyId(),
          score,
          request.action());
      return ResponseEntity.ok(ApiResponse.ok(null, "피드백이 저장되었습니다."));
    } catch (ResponseStatusException e) {
      throw e;
    } catch (Exception e) {
      throw new ResponseStatusException(
          org.springframework.http.HttpStatus.INTERNAL_SERVER_ERROR,
          "피드백 저장 중 오류가 발생했습니다.");
    }
  }
}
