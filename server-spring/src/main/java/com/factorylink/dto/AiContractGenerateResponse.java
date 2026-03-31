package com.factorylink.dto;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;

@JsonIgnoreProperties(ignoreUnknown = true)
public record AiContractGenerateResponse(
    @JsonProperty("draft_id") long draftId,
    @JsonProperty("contract_html") String contractHtml,
    @JsonProperty("contract_text") String contractText) {}
