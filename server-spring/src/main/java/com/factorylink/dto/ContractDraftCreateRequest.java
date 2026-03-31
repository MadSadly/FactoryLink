package com.factorylink.dto;

import jakarta.validation.constraints.NotNull;

public record ContractDraftCreateRequest(
    @NotNull Long quoteId,
    String paymentTerms,
    Integer warrantyMonths,
    String specialTerms) {}
