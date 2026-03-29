package com.factorylink.dto;

import com.factorylink.entity.Company;
import com.factorylink.entity.Part;
import java.util.List;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class CompanyDetailData {
  private Company company;
  private List<Part> parts;
}
