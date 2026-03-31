package com.factorylink.mapper;

import com.factorylink.entity.ContractDraft;
import org.apache.ibatis.annotations.Param;

public interface ContractDraftMapper {

  ContractDraft selectById(@Param("id") long id);

  int updatePdfPath(@Param("id") long id, @Param("pdfPath") String pdfPath);
}
