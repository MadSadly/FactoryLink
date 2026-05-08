package com.factorylink.dto;

import com.fasterxml.jackson.annotation.JsonAlias;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import java.util.List;

/** AI /ai/recommend 응답 한 행 (브라우저에는 camelCase로 직렬화, Python snake_case 는 별칭으로 역직렬화) */
@JsonIgnoreProperties(ignoreUnknown = true)
public record HybridRecommendItem(
    @JsonAlias({"company_id"}) long companyId,
    @JsonAlias({"company_name"}) String companyName,
    double score,
    String reason,
    @JsonAlias({"matched_parts"}) List<String> matchedParts,
    String region,
    String address) {}
