package com.factorylink.entity;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import lombok.Data;

@Data
public class Part {
  private Long id;
  private Long companyId;
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
