package com.factorylink.mapper;

import com.factorylink.entity.Contract;
import java.util.List;
import org.apache.ibatis.annotations.Param;

public interface ContractMapper {

  List<Contract> selectByCompany(@Param("companyId") Long companyId);

  Contract selectById(Long id);

  int insert(Contract contract);

  int updateContractText(@Param("id") Long id, @Param("contractText") String contractText);

  int updateStatus(@Param("id") Long id, @Param("status") String status);
}
