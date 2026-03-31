package com.factorylink.dto;

import jakarta.validation.constraints.NotNull;

public record RecommendFeedbackRequest(
    @NotNull Long queryCompanyId,
    @NotNull Long recommendedCompanyId,
    Double score,
    @NotNull String action) {}
