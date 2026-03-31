package com.factorylink.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "app.gyeonggi.sync")
public record GyeonggiSyncProperties(
    boolean enabled,
    String cron,
    int pageSize,
    int maxRowsPerRun,
    String apiKey) {}
