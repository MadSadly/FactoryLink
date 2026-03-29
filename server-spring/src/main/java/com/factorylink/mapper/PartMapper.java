package com.factorylink.mapper;

import com.factorylink.dto.PartDetailDto;
import com.factorylink.entity.Part;
import java.util.List;
import org.apache.ibatis.annotations.Param;

public interface PartMapper {

  List<Part> selectList(
      @Param("region") String region,
      @Param("category") String category,
      @Param("sort") String sort);

  Part selectById(Long id);

  PartDetailDto selectDetailById(Long id);

  int insert(Part part);

  int update(Part part);

  int delete(Long id);

  List<Part> selectByCompanyId(Long companyId);
}
