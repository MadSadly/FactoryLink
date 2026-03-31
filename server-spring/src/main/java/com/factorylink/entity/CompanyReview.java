package com.factorylink.entity;

import java.time.LocalDateTime;
import lombok.Data;

@Data
public class CompanyReview {
  private Long id;
  private Long contractId;
  private Long reviewerCompanyId;
  private Long reviewedCompanyId;
  private Integer rating;
  private String comment;
  private LocalDateTime createdAt;
}
