package com.factorylink.dto;

import jakarta.validation.constraints.NotNull;
import java.math.BigDecimal;
import lombok.Data;

@Data
public class ContractCreateRequest {
  @NotNull private Long buyerCompanyId;
  @NotNull private Long sellerCompanyId;
  @NotNull private Long partId;
  @NotNull private Integer quantity;
  @NotNull private BigDecimal unitPrice;
  private Long roomId;
}
