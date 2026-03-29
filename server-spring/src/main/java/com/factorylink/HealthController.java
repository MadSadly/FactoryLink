package com.factorylink;

import java.util.LinkedHashMap;
import java.util.Map;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api")
public class HealthController {

  @GetMapping("/health")
  public ResponseEntity<Map<String, Object>> health() {
    Map<String, Object> data = new LinkedHashMap<>();
    data.put("status", "ok");
    data.put("service", "factory-link-spring");
    Map<String, Object> body = new LinkedHashMap<>();
    body.put("success", true);
    body.put("data", data);
    body.put("message", "서버가 정상 작동 중입니다");
    return ResponseEntity.ok(body);
  }
}
