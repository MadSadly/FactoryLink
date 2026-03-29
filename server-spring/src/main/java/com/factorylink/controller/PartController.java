package com.factorylink.controller;

import com.factorylink.dto.ApiResponse;
import com.factorylink.dto.PartCreateRequest;
import com.factorylink.dto.PartDetailDto;
import com.factorylink.dto.PartUpdateRequest;
import com.factorylink.entity.Part;
import com.factorylink.service.PartService;
import jakarta.validation.Valid;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/parts")
public class PartController {

  private final PartService partService;

  public PartController(PartService partService) {
    this.partService = partService;
  }

  @GetMapping
  public ResponseEntity<ApiResponse<List<Part>>> list(
      @RequestParam(required = false) String region,
      @RequestParam(required = false) String category,
      @RequestParam(required = false) String sort) {
    try {
      return ResponseEntity.ok(
          ApiResponse.ok(partService.list(region, category, sort), "조회 완료"));
    } catch (Exception e) {
      throw e;
    }
  }

  @GetMapping("/{id}")
  public ResponseEntity<ApiResponse<PartDetailDto>> getById(@PathVariable Long id) {
    try {
      return ResponseEntity.ok(ApiResponse.ok(partService.getById(id), "조회 완료"));
    } catch (Exception e) {
      throw e;
    }
  }

  @PostMapping
  public ResponseEntity<ApiResponse<Part>> create(@Valid @RequestBody PartCreateRequest request) {
    try {
      Part created = partService.create(request);
      return ResponseEntity.status(HttpStatus.CREATED)
          .body(ApiResponse.ok(created, "등록 완료"));
    } catch (Exception e) {
      throw e;
    }
  }

  @PutMapping("/{id}")
  public ResponseEntity<ApiResponse<Part>> update(
      @PathVariable Long id, @RequestBody PartUpdateRequest request) {
    try {
      return ResponseEntity.ok(ApiResponse.ok(partService.update(id, request), "수정 완료"));
    } catch (Exception e) {
      throw e;
    }
  }

  @DeleteMapping("/{id}")
  public ResponseEntity<ApiResponse<Void>> delete(@PathVariable Long id) {
    try {
      partService.delete(id);
      return ResponseEntity.ok(ApiResponse.ok(null, "삭제 완료"));
    } catch (Exception e) {
      throw e;
    }
  }
}
