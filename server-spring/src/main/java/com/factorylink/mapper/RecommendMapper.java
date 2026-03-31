package com.factorylink.mapper;

import java.math.BigDecimal;
import org.apache.ibatis.annotations.Param;

public interface RecommendMapper {

  int insertFeedback(
      @Param("queryCompanyId") long queryCompanyId,
      @Param("recommendedCompanyId") long recommendedCompanyId,
      @Param("score") BigDecimal score,
      @Param("action") String action);
}
