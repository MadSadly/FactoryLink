package com.factorylink.mapper;

import com.factorylink.dto.CompanyListItem;
import com.factorylink.entity.Company;
import java.util.List;
import org.apache.ibatis.annotations.Param;

/** companies 매핑. {@code business_number} 컬럼은 회원가입 모의 인증 후 저장됩니다. */
public interface CompanyMapper {

  List<Company> selectList(@Param("region") String region, @Param("type") String type);

  int countCatalog(@Param("region") String region, @Param("type") String type);

  List<CompanyListItem> selectCatalogWithStats(
      @Param("region") String region, @Param("type") String type);

  List<CompanyListItem> selectCatalogPageByReview(
      @Param("offset") int offset,
      @Param("limit") int limit,
      @Param("region") String region,
      @Param("type") String type);

  Company selectById(Long id);

  int update(Company company);

  /** 공공데이터 멱등 동기화: (external_source, external_key) 유니크 기준 upsert */
  int upsertByExternalKey(Company company);
}
