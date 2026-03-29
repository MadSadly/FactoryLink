package com.factorylink.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.math.BigDecimal;
import lombok.Data;

@Data
public class PartCreateRequest {
  @NotBlank private String name;
  private String category;
  @NotNull private BigDecimal unitPrice;
  private Integer stockQuantity;
  private String unit;
  private String description;
  @NotNull private Long companyId;
}
