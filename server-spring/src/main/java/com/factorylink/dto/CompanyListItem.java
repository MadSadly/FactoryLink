package com.factorylink.dto;

import java.time.LocalDateTime;
import lombok.Data;

@Data
public class CompanyListItem {
  private Long id;
  private String name;
  private String region;
  private String address;
  private String contactEmail;
  private String contactPhone;
  private String type;
  private String businessNumber;
  private LocalDateTime createdAt;
  private LocalDateTime updatedAt;

  private Double avgRating;
  private Long reviewCount;

  /** sort=recommend 일 때만 설정 */
  private Integer recommendScore;
}
