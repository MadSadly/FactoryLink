package com.factorylink.dto;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class ReviewCreateRequest {

  @NotNull private Long contractId;

  @NotNull
  @Min(1)
  @Max(5)
  private Integer rating;

  private String comment;
}
