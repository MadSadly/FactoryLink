package com.factorylink.entity;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import lombok.Data;

@Data
public class Contract {
  private Long id;
  private Long roomId;
  private Long buyerCompanyId;
  private Long sellerCompanyId;
  private Long partId;
  private Integer quantity;
  private BigDecimal unitPrice;
  private BigDecimal totalPrice;
  private String contractText;
  private String status;
  private LocalDateTime createdAt;
}
