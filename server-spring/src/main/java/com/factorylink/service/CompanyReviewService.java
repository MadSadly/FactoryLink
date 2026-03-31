package com.factorylink.service;

import com.factorylink.dto.ReviewCreateRequest;
import com.factorylink.entity.CompanyReview;
import com.factorylink.entity.Contract;
import com.factorylink.mapper.CompanyReviewMapper;
import com.factorylink.mapper.ContractMapper;
import com.factorylink.util.SecurityUtils;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
public class CompanyReviewService {

  private final CompanyReviewMapper companyReviewMapper;
  private final ContractMapper contractMapper;

  public CompanyReviewService(
      CompanyReviewMapper companyReviewMapper, ContractMapper contractMapper) {
    this.companyReviewMapper = companyReviewMapper;
    this.contractMapper = contractMapper;
  }

  public List<CompanyReview> listByReviewedCompany(Long reviewedCompanyId) {
    try {
      return companyReviewMapper.selectByReviewedCompanyId(reviewedCompanyId);
    } catch (Exception e) {
      throw new ResponseStatusException(
          HttpStatus.INTERNAL_SERVER_ERROR, "리뷰 목록 조회 중 오류가 발생했습니다.");
    }
  }

  @Transactional
  public CompanyReview create(Long reviewedCompanyId, ReviewCreateRequest request) {
    var principal = SecurityUtils.requirePrincipal();
    Long reviewerId = principal.getCompanyId();
    if (reviewerId == null) {
      throw new ResponseStatusException(HttpStatus.FORBIDDEN, "소속 업체 정보가 없습니다.");
    }

    Contract c = contractMapper.selectById(request.getContractId());
    if (c == null) {
      throw new ResponseStatusException(HttpStatus.NOT_FOUND, "계약을 찾을 수 없습니다.");
    }
    if (!"COMPLETED".equals(c.getStatus())) {
      throw new ResponseStatusException(
          HttpStatus.BAD_REQUEST, "거래 완료된 계약에만 리뷰를 작성할 수 있습니다.");
    }
    if (!reviewerId.equals(c.getBuyerCompanyId()) && !reviewerId.equals(c.getSellerCompanyId())) {
      throw new ResponseStatusException(HttpStatus.FORBIDDEN, "해당 계약 당사자만 리뷰를 작성할 수 있습니다.");
    }
    long counterpart =
        reviewerId.equals(c.getBuyerCompanyId()) ? c.getSellerCompanyId() : c.getBuyerCompanyId();
    if (!reviewedCompanyId.equals(counterpart)) {
      throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "리뷰 대상 업체가 일치하지 않습니다.");
    }
    if (companyReviewMapper.countByContractAndReviewer(request.getContractId(), reviewerId) > 0) {
      throw new ResponseStatusException(HttpStatus.CONFLICT, "이미 해당 계약에 리뷰를 작성했습니다.");
    }

    CompanyReview row = new CompanyReview();
    row.setContractId(request.getContractId());
    row.setReviewerCompanyId(reviewerId);
    row.setReviewedCompanyId(reviewedCompanyId);
    row.setRating(request.getRating());
    row.setComment(request.getComment());

    companyReviewMapper.insert(row);
    if (row.getId() != null) {
      CompanyReview loaded = companyReviewMapper.selectById(row.getId());
      if (loaded != null) {
        return loaded;
      }
    }
    return row;
  }
}
