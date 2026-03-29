package com.factorylink.dto;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import lombok.Data;

@Data
public class PartDetailDto {
  private Long id;
  private Long companyId;
  private String companyName;
  private String name;
  private String category;
  private BigDecimal unitPrice;
  private Integer stockQuantity;
  private String unit;
  private String description;
  private String region;
  private LocalDateTime createdAt;
  private LocalDateTime updatedAt;
}
