package com.factorylink.mapper;

import com.factorylink.entity.CompanyReview;
import java.util.List;
import org.apache.ibatis.annotations.Param;

public interface CompanyReviewMapper {

  int insert(CompanyReview review);

  CompanyReview selectById(Long id);

  List<CompanyReview> selectByReviewedCompanyId(@Param("reviewedCompanyId") Long reviewedCompanyId);

  int countByContractAndReviewer(
      @Param("contractId") Long contractId, @Param("reviewerCompanyId") Long reviewerCompanyId);
}
