package com.factorylink.entity;

import com.fasterxml.jackson.annotation.JsonIgnore;
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

  /** 사업자등록번호(XXX-XX-XXXXX). 회원가입 모의 인증 후 저장. */
  private String businessNumber;

  /** 공공 API 동기화 행만 설정. API JSON 응답에는 포함하지 않음. */
  @JsonIgnore
  private String externalSource;

  @JsonIgnore
  private String externalKey;

  private LocalDateTime createdAt;
  private LocalDateTime updatedAt;
}
