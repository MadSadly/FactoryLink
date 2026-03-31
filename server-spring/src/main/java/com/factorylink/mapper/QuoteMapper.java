package com.factorylink.mapper;

import com.factorylink.entity.Quote;
import org.apache.ibatis.annotations.Param;

public interface QuoteMapper {

  Quote selectById(@Param("id") long id);

  int updatePdfPath(@Param("id") long id, @Param("pdfPath") String pdfPath);
}
