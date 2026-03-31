package com.factorylink.controller;

import com.factorylink.dto.ApiResponse;
import com.factorylink.dto.GyeonggiSyncResult;
import com.factorylink.service.GyeonggiFactrySyncService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/admin/sync")
public class AdminGyeonggiSyncController {

  private final GyeonggiFactrySyncService syncService;

  public AdminGyeonggiSyncController(GyeonggiFactrySyncService syncService) {
    this.syncService = syncService;
  }

  /** ADMIN JWT 필요. 수동으로 경기 공장등록 API 동기화 한 번 실행. */
  @PostMapping("/gyeonggi-factories")
  public ResponseEntity<ApiResponse<GyeonggiSyncResult>> syncNow() {
    GyeonggiSyncResult r = syncService.sync();
    if (!r.ok()) {
      HttpStatus st =
          r.errorMessage() != null && r.errorMessage().startsWith("skipped:")
              ? HttpStatus.BAD_REQUEST
              : HttpStatus.BAD_GATEWAY;
      return ResponseEntity.status(st).body(ApiResponse.fail(r.errorMessage()));
    }
    return ResponseEntity.ok(
        ApiResponse.ok(
            r,
            String.format("pages=%d, rowsUpserted=%d", r.pagesFetched(), r.rowsUpserted())));
  }
}
