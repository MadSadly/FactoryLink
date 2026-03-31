package com.factorylink.dto;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;
import java.util.List;

/** AI /ai/recommend 응답 한 행 */
@JsonIgnoreProperties(ignoreUnknown = true)
public record HybridRecommendItem(
    @JsonProperty("company_id") long companyId,
    @JsonProperty("company_name") String companyName,
    double score,
    String reason,
    @JsonProperty("matched_parts") List<String> matchedParts,
    String region,
    String address) {}
