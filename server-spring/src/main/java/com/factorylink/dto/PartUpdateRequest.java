package com.factorylink.dto;

import java.math.BigDecimal;
import lombok.Data;

@Data
public class PartUpdateRequest {
  private String name;
  private String category;
  private BigDecimal unitPrice;
  private Integer stockQuantity;
  private String unit;
  private String description;
}
