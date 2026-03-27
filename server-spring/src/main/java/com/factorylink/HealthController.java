package com.factorylink;

import java.util.List;
import java.util.Map;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api")
public class HealthController {

  @GetMapping("/health")
  public Map<String, String> health() {
    return Map.of("status", "ok", "service", "server-spring");
  }

  @GetMapping("/parts")
  public List<Map<String, Object>> parts() {
    // 초기 화면 연동을 위한 샘플 데이터
    return List.of(
      Map.of("id", 1, "name", "Hydraulic Valve", "category", "Fluid", "stock", 120),
      Map.of("id", 2, "name", "Bearing Unit", "category", "Mechanical", "stock", 340)
    );
  }
}
