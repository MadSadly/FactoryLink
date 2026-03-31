package com.factorylink.schedule;

import com.factorylink.service.GyeonggiFactrySyncService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

@Component
@ConditionalOnProperty(prefix = "app.gyeonggi.sync", name = "enabled", havingValue = "true")
public class GyeonggiSyncScheduler {

  private static final Logger log = LoggerFactory.getLogger(GyeonggiSyncScheduler.class);

  private final GyeonggiFactrySyncService syncService;

  public GyeonggiSyncScheduler(GyeonggiFactrySyncService syncService) {
    this.syncService = syncService;
  }

  @Scheduled(cron = "${app.gyeonggi.sync.cron}")
  public void run() {
    var r = syncService.sync();
    if (r.ok()) {
      log.info("Scheduled Gyeonggi sync: pages={}, rows={}", r.pagesFetched(), r.rowsUpserted());
    } else {
      log.warn("Scheduled Gyeonggi sync finished with issue: {}", r.errorMessage());
    }
  }
}
