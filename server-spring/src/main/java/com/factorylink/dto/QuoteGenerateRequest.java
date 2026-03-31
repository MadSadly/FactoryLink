package com.factorylink.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;
import java.util.List;

public record QuoteGenerateRequest(
    @NotNull Long targetCompanyId,
    @Valid @NotNull List<QuoteLineItem> items,
    String deadline,
    String validUntil,
    String notes) {

  public record QuoteLineItem(
      Long partId,
      @NotNull String name,
      @NotNull Integer quantity,
      String unit,
      Double unitPrice,
      Double amount) {}
}
