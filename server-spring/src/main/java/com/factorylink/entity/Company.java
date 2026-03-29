package com.factorylink.entity;

import java.time.LocalDateTime;
import lombok.Data;

@Data
public class Company {
  private Long id;
  private String name;
  private String region;
  private String address;
  private String contactEmail;
  private String contactPhone;
  private String type;
  private LocalDateTime createdAt;
  private LocalDateTime updatedAt;
}
