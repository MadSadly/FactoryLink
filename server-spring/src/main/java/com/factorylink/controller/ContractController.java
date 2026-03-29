package com.factorylink.controller;

import com.factorylink.dto.ApiResponse;
import com.factorylink.dto.ContractCreateRequest;
import com.factorylink.entity.Contract;
import com.factorylink.service.ContractService;
import jakarta.validation.Valid;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/contracts")
public class ContractController {

  private final ContractService contractService;

  public ContractController(ContractService contractService) {
    this.contractService = contractService;
  }

  @GetMapping
  public ResponseEntity<ApiResponse<List<Contract>>> list(
      @RequestParam("companyId") Long companyId) {
    try {
      return ResponseEntity.ok(
          ApiResponse.ok(contractService.list(companyId), "조회 완료"));
    } catch (Exception e) {
      throw e;
    }
  }

  @GetMapping("/{id}")
  public ResponseEntity<ApiResponse<Contract>> getById(@PathVariable Long id) {
    try {
      return ResponseEntity.ok(ApiResponse.ok(contractService.getById(id), "조회 완료"));
    } catch (Exception e) {
      throw e;
    }
  }

  @PostMapping
  public ResponseEntity<ApiResponse<Contract>> create(
      @Valid @RequestBody ContractCreateRequest request) {
    try {
      Contract created = contractService.create(request);
      return ResponseEntity.status(HttpStatus.CREATED)
          .body(ApiResponse.ok(created, "계약 초안이 생성되었습니다."));
    } catch (Exception e) {
      throw e;
    }
  }

  @PatchMapping("/{id}/finalize")
  public ResponseEntity<ApiResponse<Contract>> finalize(@PathVariable Long id) {
    try {
      return ResponseEntity.ok(
          ApiResponse.ok(contractService.finalize(id), "계약이 확정되었습니다."));
    } catch (Exception e) {
      throw e;
    }
  }
}
