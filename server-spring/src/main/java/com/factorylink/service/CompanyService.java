package com.factorylink.service;

import com.factorylink.dto.CompanyCatalogPage;
import com.factorylink.dto.CompanyDetailData;
import com.factorylink.dto.CompanyListItem;
import com.factorylink.dto.CompanyUpdateRequest;
import com.factorylink.entity.Company;
import com.factorylink.mapper.CompanyMapper;
import com.factorylink.mapper.PartMapper;
import com.factorylink.util.CollaborationScoreUtil;
import com.factorylink.util.SecurityUtils;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
public class CompanyService {

  private static final Logger log = LoggerFactory.getLogger(CompanyService.class);

  private final CompanyMapper companyMapper;
  private final PartMapper partMapper;
  private final AiSimilarityService aiSimilarityService;

  public CompanyService(
      CompanyMapper companyMapper, PartMapper partMapper, AiSimilarityService aiSimilarityService) {
    this.companyMapper = companyMapper;
    this.partMapper = partMapper;
    this.aiSimilarityService = aiSimilarityService;
  }

  public List<Company> list(String region, String type) {
    try {
      return companyMapper.selectList(region, type);
    } catch (Exception e) {
      log.error("Company list query failed (check MariaDB is running and schema/seed applied)", e);
      throw new ResponseStatusException(
          HttpStatus.INTERNAL_SERVER_ERROR, "업체 목록 조회 중 오류가 발생했습니다.");
    }
  }

  /**
   * 업체 카탈로그 페이징. {@code sort=recommend} 는 로그인(소속 companyId) 시 협업 점수순, 미로그인 시 리뷰순과
   * 동일하게 처리합니다.
   */
  public CompanyCatalogPage listCatalog(
      int page, int size, String sort, String region, String type, Long myCompanyId) {
    try {
      int safeSize = size > 0 ? Math.min(size, 100) : 9;
      int safePage = Math.max(0, page);
      boolean wantRecommend = sort != null && "recommend".equalsIgnoreCase(sort.trim());
      if (wantRecommend && myCompanyId != null) {
        Company my = companyMapper.selectById(myCompanyId);
        if (my != null) {
          return listCatalogByRecommend(safePage, safeSize, region, type, myCompanyId, my);
        }
      }
      return listCatalogByReview(safePage, safeSize, region, type);
    } catch (ResponseStatusException e) {
      throw e;
    } catch (Exception e) {
      log.error("Company catalog query failed", e);
      throw new ResponseStatusException(
          HttpStatus.INTERNAL_SERVER_ERROR, "업체 목록 조회 중 오류가 발생했습니다.");
    }
  }

  private CompanyCatalogPage listCatalogByReview(int page, int size, String region, String type) {
    long total = companyMapper.countCatalog(region, type);
    int totalPages = total == 0 ? 0 : (int) Math.ceil(total / (double) size);
    int offset = page * size;
    List<CompanyListItem> content = companyMapper.selectCatalogPageByReview(offset, size, region, type);
    return new CompanyCatalogPage(content, total, totalPages, page, size);
  }

  private CompanyCatalogPage listCatalogByRecommend(
      int page, int size, String region, String type, long myCompanyId, Company my) {
    List<CompanyListItem> all = companyMapper.selectCatalogWithStats(region, type);
    List<CompanyListItem> pool = new ArrayList<>();
    for (CompanyListItem row : all) {
      if (row.getId() == null || row.getId().equals(myCompanyId)) {
        continue;
      }
      pool.add(row);
    }

    Map<Long, Integer> aiScores = aiSimilarityService.scoreCompanies(my, pool);

    List<CompanyListItem> scored = new ArrayList<>();
    for (CompanyListItem row : pool) {
      Integer ai = aiScores.get(row.getId());
      if (ai != null) {
        row.setRecommendScore(ai);
      } else {
        Company other = new Company();
        other.setId(row.getId());
        other.setRegion(row.getRegion());
        other.setType(row.getType());
        int sc = CollaborationScoreUtil.score(myCompanyId, my, other);
        if (sc < 0) {
          continue;
        }
        row.setRecommendScore(sc);
      }
      scored.add(row);
    }
    scored.sort(
        Comparator.comparing(CompanyListItem::getRecommendScore, Comparator.nullsLast(Integer::compareTo))
            .reversed());
    long total = scored.size();
    int totalPages = total == 0 ? 0 : (int) Math.ceil(total / (double) size);
    int from = page * size;
    if (from >= total) {
      return new CompanyCatalogPage(List.of(), total, totalPages, page, size);
    }
    int to = (int) Math.min((long) from + size, total);
    return new CompanyCatalogPage(scored.subList(from, to), total, totalPages, page, size);
  }

  public CompanyDetailData getById(Long id) {
    try {
      Company company = companyMapper.selectById(id);
      if (company == null) {
        throw new ResponseStatusException(HttpStatus.NOT_FOUND, "업체를 찾을 수 없습니다.");
      }
      return new CompanyDetailData(company, partMapper.selectByCompanyId(id));
    } catch (ResponseStatusException e) {
      throw e;
    } catch (Exception e) {
      throw new ResponseStatusException(
          HttpStatus.INTERNAL_SERVER_ERROR, "업체 조회 중 오류가 발생했습니다.");
    }
  }

  @Transactional
  public Company update(Long id, CompanyUpdateRequest request) {
    try {
      var principal = SecurityUtils.requirePrincipal();
      SecurityUtils.requireCompany(principal, id);

      Company existing = companyMapper.selectById(id);
      if (existing == null) {
        throw new ResponseStatusException(HttpStatus.NOT_FOUND, "업체를 찾을 수 없습니다.");
      }

      Company patch = new Company();
      patch.setId(id);
      if (request.getName() != null) {
        patch.setName(request.getName());
      }
      if (request.getAddress() != null) {
        patch.setAddress(request.getAddress());
      }
      if (request.getContactEmail() != null) {
        patch.setContactEmail(request.getContactEmail());
      }
      if (request.getContactPhone() != null) {
        patch.setContactPhone(request.getContactPhone());
      }
      if (request.getType() != null) {
        patch.setType(request.getType());
      }

      if (request.getName() == null
          && request.getAddress() == null
          && request.getContactEmail() == null
          && request.getContactPhone() == null
          && request.getType() == null) {
        return existing;
      }

      companyMapper.update(patch);
      return companyMapper.selectById(id);
    } catch (ResponseStatusException e) {
      throw e;
    } catch (Exception e) {
      throw new ResponseStatusException(
          HttpStatus.INTERNAL_SERVER_ERROR, "업체 수정 중 오류가 발생했습니다.");
    }
  }
}
