package com.factorylink.dto;

import java.util.List;

public record CompanyCatalogPage(
    List<CompanyListItem> content,
    long totalElements,
    int totalPages,
    int page,
    int size) {}
