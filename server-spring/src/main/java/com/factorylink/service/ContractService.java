package com.factorylink.service;

import com.factorylink.dto.ContractCreateRequest;
import com.factorylink.entity.Company;
import com.factorylink.entity.Contract;
import com.factorylink.entity.Part;
import com.factorylink.mapper.CompanyMapper;
import com.factorylink.mapper.ContractMapper;
import com.factorylink.mapper.PartMapper;
import com.factorylink.auth.JwtUserPrincipal;
import com.factorylink.util.SecurityUtils;
import java.math.BigDecimal;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.client.RestClientException;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.server.ResponseStatusException;

@Service
public class ContractService {

  private static final String AI_FAIL_PLACEHOLDER = "계약서 생성 실패 - 수동 작성 필요";

  private final ContractMapper contractMapper;
  private final CompanyMapper companyMapper;
  private final PartMapper partMapper;
  private final RestTemplate restTemplate;

  @Value("${app.ai.server.url}")
  private String aiServerUrl;

  public ContractService(
      ContractMapper contractMapper,
      CompanyMapper companyMapper,
      PartMapper partMapper,
      RestTemplate restTemplate) {
    this.contractMapper = contractMapper;
    this.companyMapper = companyMapper;
    this.partMapper = partMapper;
    this.restTemplate = restTemplate;
  }

  public List<Contract> list(Long companyId) {
    try {
      var principal = SecurityUtils.requirePrincipal();
      SecurityUtils.requireCompany(principal, companyId);
      return contractMapper.selectByCompany(companyId);
    } catch (ResponseStatusException e) {
      throw e;
    } catch (Exception e) {
      throw new ResponseStatusException(
          HttpStatus.INTERNAL_SERVER_ERROR, "계약 목록 조회 중 오류가 발생했습니다.");
    }
  }

  public Contract getById(Long id) {
    try {
      var principal = SecurityUtils.requirePrincipal();
      Contract contract = contractMapper.selectById(id);
      if (contract == null) {
        throw new ResponseStatusException(HttpStatus.NOT_FOUND, "계약을 찾을 수 없습니다.");
      }
      requireParty(principal, contract);
      return contract;
    } catch (ResponseStatusException e) {
      throw e;
    } catch (Exception e) {
      throw new ResponseStatusException(
          HttpStatus.INTERNAL_SERVER_ERROR, "계약 조회 중 오류가 발생했습니다.");
    }
  }

  @Transactional
  public Contract create(ContractCreateRequest request) {
    try {
      var principal = SecurityUtils.requirePrincipal();
      Long cid = principal.getCompanyId();
      if (cid == null
          || (!cid.equals(request.getBuyerCompanyId()) && !cid.equals(request.getSellerCompanyId()))) {
        throw new ResponseStatusException(HttpStatus.FORBIDDEN, "권한이 없습니다.");
      }

      Part part = partMapper.selectById(request.getPartId());
      if (part == null) {
        throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "유효하지 않은 부품입니다.");
      }
      Company buyer = companyMapper.selectById(request.getBuyerCompanyId());
      Company seller = companyMapper.selectById(request.getSellerCompanyId());
      if (buyer == null || seller == null) {
        throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "유효하지 않은 업체입니다.");
      }

      BigDecimal total =
          request.getUnitPrice().multiply(BigDecimal.valueOf(request.getQuantity()));

      Contract contract = new Contract();
      contract.setRoomId(request.getRoomId());
      contract.setBuyerCompanyId(request.getBuyerCompanyId());
      contract.setSellerCompanyId(request.getSellerCompanyId());
      contract.setPartId(request.getPartId());
      contract.setQuantity(request.getQuantity());
      contract.setUnitPrice(request.getUnitPrice());
      contract.setTotalPrice(total);
      contract.setContractText("");
      contract.setStatus("DRAFT");

      contractMapper.insert(contract);

      String generated =
          callGenerateContract(
              part.getName(),
              request.getQuantity(),
              request.getUnitPrice(),
              buyer.getName(),
              seller.getName());

      contractMapper.updateContractText(contract.getId(), generated);
      return contractMapper.selectById(contract.getId());
    } catch (ResponseStatusException e) {
      throw e;
    } catch (Exception e) {
      throw new ResponseStatusException(
          HttpStatus.INTERNAL_SERVER_ERROR, "계약 생성 중 오류가 발생했습니다.");
    }
  }

  @Transactional
  public Contract finalize(Long id) {
    try {
      var principal = SecurityUtils.requirePrincipal();
      Contract contract = contractMapper.selectById(id);
      if (contract == null) {
        throw new ResponseStatusException(HttpStatus.NOT_FOUND, "계약을 찾을 수 없습니다.");
      }
      requireParty(principal, contract);
      contractMapper.updateStatus(id, "FINALIZED");
      return contractMapper.selectById(id);
    } catch (ResponseStatusException e) {
      throw e;
    } catch (Exception e) {
      throw new ResponseStatusException(
          HttpStatus.INTERNAL_SERVER_ERROR, "계약 확정 처리 중 오류가 발생했습니다.");
    }
  }

  /** 확정(FINALIZED)된 계약을 거래 완료(COMPLETED)로 바꿉니다. 이후 상대방에 대한 리뷰 작성이 가능합니다. */
  @Transactional
  public Contract complete(Long id) {
    try {
      var principal = SecurityUtils.requirePrincipal();
      Contract contract = contractMapper.selectById(id);
      if (contract == null) {
        throw new ResponseStatusException(HttpStatus.NOT_FOUND, "계약을 찾을 수 없습니다.");
      }
      requireParty(principal, contract);
      if (!"FINALIZED".equals(contract.getStatus())) {
        throw new ResponseStatusException(
            HttpStatus.BAD_REQUEST, "확정된 계약만 거래 완료 처리할 수 있습니다.");
      }
      contractMapper.updateStatus(id, "COMPLETED");
      return contractMapper.selectById(id);
    } catch (ResponseStatusException e) {
      throw e;
    } catch (Exception e) {
      throw new ResponseStatusException(
          HttpStatus.INTERNAL_SERVER_ERROR, "거래 완료 처리 중 오류가 발생했습니다.");
    }
  }

  private static void requireParty(JwtUserPrincipal principal, Contract c) {
    Long cid = principal.getCompanyId();
    if (cid == null
        || (!cid.equals(c.getBuyerCompanyId()) && !cid.equals(c.getSellerCompanyId()))) {
      throw new ResponseStatusException(HttpStatus.FORBIDDEN, "권한이 없습니다.");
    }
  }

  @SuppressWarnings("unchecked")
  private String callGenerateContract(
      String partName,
      int quantity,
      BigDecimal unitPrice,
      String buyerName,
      String sellerName) {
    String url = aiServerUrl.replaceAll("/$", "") + "/api/generate-contract";
    Map<String, Object> body = new HashMap<>();
    body.put("part_name", partName);
    body.put("quantity", quantity);
    body.put("unit_price", unitPrice.doubleValue());
    body.put("buyer_name", buyerName);
    body.put("seller_name", sellerName);
    body.put("special_conditions", "없음");

    HttpHeaders headers = new HttpHeaders();
    headers.setContentType(MediaType.APPLICATION_JSON);
    HttpEntity<Map<String, Object>> entity = new HttpEntity<>(body, headers);

    try {
      ResponseEntity<Map> response =
          restTemplate.exchange(url, HttpMethod.POST, entity, Map.class);
      Map<String, Object> respBody = response.getBody();
      if (respBody != null && Boolean.TRUE.equals(respBody.get("success"))) {
        Object data = respBody.get("data");
        if (data instanceof Map<?, ?> map) {
          Object text = map.get("contract_text");
          if (text != null) {
            return String.valueOf(text);
          }
        }
      }
      return AI_FAIL_PLACEHOLDER;
    } catch (RestClientException ex) {
      return AI_FAIL_PLACEHOLDER;
    } catch (Exception ex) {
      return AI_FAIL_PLACEHOLDER;
    }
  }
}
