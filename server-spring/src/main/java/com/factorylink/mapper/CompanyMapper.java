package com.factorylink.mapper;

import com.factorylink.entity.Company;
import java.util.List;
import org.apache.ibatis.annotations.Param;

public interface CompanyMapper {

  List<Company> selectList(@Param("region") String region, @Param("type") String type);

  Company selectById(Long id);

  int update(Company company);
}
