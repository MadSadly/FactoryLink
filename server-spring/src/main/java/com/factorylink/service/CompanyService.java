package com.factorylink.service;

import com.factorylink.dto.CompanyDetailData;
import com.factorylink.dto.CompanyUpdateRequest;
import com.factorylink.entity.Company;
import com.factorylink.mapper.CompanyMapper;
import com.factorylink.mapper.PartMapper;
import com.factorylink.util.SecurityUtils;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
public class CompanyService {

  private final CompanyMapper companyMapper;
  private final PartMapper partMapper;

  public CompanyService(CompanyMapper companyMapper, PartMapper partMapper) {
    this.companyMapper = companyMapper;
    this.partMapper = partMapper;
  }

  public List<Company> list(String region, String type) {
    try {
      return companyMapper.selectList(region, type);
    } catch (Exception e) {
      throw new ResponseStatusException(
          HttpStatus.INTERNAL_SERVER_ERROR, "업체 목록 조회 중 오류가 발생했습니다.");
    }
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
