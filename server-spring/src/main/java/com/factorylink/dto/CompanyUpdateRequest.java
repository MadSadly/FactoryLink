package com.factorylink.dto;

import lombok.Data;

@Data
public class CompanyUpdateRequest {
  private String name;
  private String address;
  private String contactEmail;
  private String contactPhone;
  private String type;
}
