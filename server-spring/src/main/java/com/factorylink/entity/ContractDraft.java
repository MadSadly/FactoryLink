package com.factorylink.entity;

import java.time.LocalDateTime;
import lombok.Data;

@Data
public class ContractDraft {
  private Long id;
  private Long quoteId;
  private String contractHtml;
  private String contractText;
  private String paymentTerms;
  private Integer warrantyMonths;
  private String specialTerms;
  private String pdfPath;
  private String status;
  private LocalDateTime createdAt;
}
