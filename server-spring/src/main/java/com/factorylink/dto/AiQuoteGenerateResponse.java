package com.factorylink.dto;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;

@JsonIgnoreProperties(ignoreUnknown = true)
public record AiQuoteGenerateResponse(
    @JsonProperty("quote_id") long quoteId,
    @JsonProperty("quote_html") String quoteHtml,
    @JsonProperty("quote_text") String quoteText) {}
