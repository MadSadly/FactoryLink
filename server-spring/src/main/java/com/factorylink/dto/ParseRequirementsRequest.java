package com.factorylink.dto;

import jakarta.validation.constraints.NotBlank;

public record ParseRequirementsRequest(@NotBlank String rawInput) {}
