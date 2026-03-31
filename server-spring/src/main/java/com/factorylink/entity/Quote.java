package com.factorylink.entity;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import lombok.Data;

@Data
public class Quote {
  private Long id;
  private Long requesterCompanyId;
  private Long targetCompanyId;
  /** JSON 문자열 */
  private String itemsJson;
  private String rawInput;
  private String parsedRequirements;
  private String quoteHtml;
  private String quoteText;
  private BigDecimal totalAmount;
  private LocalDate deadline;
  private LocalDate validUntil;
  private String notes;
  private String status;
  private String pdfPath;
  private LocalDateTime createdAt;
  private LocalDateTime updatedAt;
}
