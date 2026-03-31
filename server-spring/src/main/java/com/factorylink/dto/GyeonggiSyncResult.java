package com.factorylink.dto;

/** 경기도 FACTRYREGISTTM 동기화 결과 */
public record GyeonggiSyncResult(int pagesFetched, int rowsUpserted, String errorMessage) {

  public boolean ok() {
    return errorMessage == null || errorMessage.isBlank();
  }
}
