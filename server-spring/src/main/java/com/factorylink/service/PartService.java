package com.factorylink.service;

import com.factorylink.dto.PartCreateRequest;
import com.factorylink.dto.PartDetailDto;
import com.factorylink.dto.PartUpdateRequest;
import com.factorylink.entity.Company;
import com.factorylink.entity.Part;
import com.factorylink.mapper.CompanyMapper;
import com.factorylink.mapper.PartMapper;
import com.factorylink.util.SecurityUtils;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
public class PartService {

  private final PartMapper partMapper;
  private final CompanyMapper companyMapper;

  public PartService(PartMapper partMapper, CompanyMapper companyMapper) {
    this.partMapper = partMapper;
    this.companyMapper = companyMapper;
  }

  public List<Part> list(String region, String category, String sort) {
    try {
      return partMapper.selectList(region, category, sort);
    } catch (Exception e) {
      throw new ResponseStatusException(
          HttpStatus.INTERNAL_SERVER_ERROR, "부품 목록 조회 중 오류가 발생했습니다.");
    }
  }

  public PartDetailDto getById(Long id) {
    try {
      PartDetailDto dto = partMapper.selectDetailById(id);
      if (dto == null) {
        throw new ResponseStatusException(HttpStatus.NOT_FOUND, "부품을 찾을 수 없습니다.");
      }
      return dto;
    } catch (ResponseStatusException e) {
      throw e;
    } catch (Exception e) {
      throw new ResponseStatusException(
          HttpStatus.INTERNAL_SERVER_ERROR, "부품 조회 중 오류가 발생했습니다.");
    }
  }

  @Transactional
  public Part create(PartCreateRequest request) {
    try {
      var principal = SecurityUtils.requirePrincipal();
      SecurityUtils.requireCompany(principal, request.getCompanyId());

      Company company = companyMapper.selectById(request.getCompanyId());
      if (company == null) {
        throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "유효하지 않은 회사입니다.");
      }

      Part part = new Part();
      part.setCompanyId(request.getCompanyId());
      part.setName(request.getName());
      part.setCategory(request.getCategory());
      part.setUnitPrice(request.getUnitPrice());
      part.setStockQuantity(
          request.getStockQuantity() == null ? 0 : request.getStockQuantity());
      part.setUnit(request.getUnit());
      part.setDescription(request.getDescription());
      part.setRegion(company.getRegion());

      partMapper.insert(part);
      return partMapper.selectById(part.getId());
    } catch (ResponseStatusException e) {
      throw e;
    } catch (Exception e) {
      throw new ResponseStatusException(
          HttpStatus.INTERNAL_SERVER_ERROR, "부품 등록 중 오류가 발생했습니다.");
    }
  }

  @Transactional
  public Part update(Long id, PartUpdateRequest request) {
    try {
      var principal = SecurityUtils.requirePrincipal();
      Part existing = partMapper.selectById(id);
      if (existing == null) {
        throw new ResponseStatusException(HttpStatus.NOT_FOUND, "부품을 찾을 수 없습니다.");
      }
      SecurityUtils.requireCompany(principal, existing.getCompanyId());

      Part patch = new Part();
      patch.setId(id);
      if (request.getName() != null) {
        patch.setName(request.getName());
      }
      if (request.getCategory() != null) {
        patch.setCategory(request.getCategory());
      }
      if (request.getUnitPrice() != null) {
        patch.setUnitPrice(request.getUnitPrice());
      }
      if (request.getStockQuantity() != null) {
        patch.setStockQuantity(request.getStockQuantity());
      }
      if (request.getUnit() != null) {
        patch.setUnit(request.getUnit());
      }
      if (request.getDescription() != null) {
        patch.setDescription(request.getDescription());
      }

      if (request.getName() == null
          && request.getCategory() == null
          && request.getUnitPrice() == null
          && request.getStockQuantity() == null
          && request.getUnit() == null
          && request.getDescription() == null) {
        return existing;
      }

      partMapper.update(patch);
      return partMapper.selectById(id);
    } catch (ResponseStatusException e) {
      throw e;
    } catch (Exception e) {
      throw new ResponseStatusException(
          HttpStatus.INTERNAL_SERVER_ERROR, "부품 수정 중 오류가 발생했습니다.");
    }
  }

  @Transactional
  public void delete(Long id) {
    try {
      var principal = SecurityUtils.requirePrincipal();
      Part existing = partMapper.selectById(id);
      if (existing == null) {
        throw new ResponseStatusException(HttpStatus.NOT_FOUND, "부품을 찾을 수 없습니다.");
      }
      SecurityUtils.requireCompany(principal, existing.getCompanyId());
      partMapper.delete(id);
    } catch (ResponseStatusException e) {
      throw e;
    } catch (Exception e) {
      throw new ResponseStatusException(
          HttpStatus.INTERNAL_SERVER_ERROR, "부품 삭제 중 오류가 발생했습니다.");
    }
  }
}
