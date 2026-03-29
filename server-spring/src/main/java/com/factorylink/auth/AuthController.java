package com.factorylink.auth;

import com.factorylink.auth.AuthService.AuthResponse;
import com.factorylink.auth.AuthService.LoginRequest;
import com.factorylink.auth.AuthService.SignupRequest;
import java.util.Map;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

  private final AuthService authService;

  public AuthController(AuthService authService) {
    this.authService = authService;
  }

  @PostMapping("/signup")
  public AuthResponse signup(@RequestBody SignupRequest request) {
    String role = (request.role() == null || request.role().isBlank()) ? "MEMBER" : request.role();
    SignupRequest normalized =
        new SignupRequest(
            request.email(), request.password(), request.name(), role, request.companyId());
    return authService.signup(normalized);
  }

  @PostMapping("/login")
  public AuthResponse login(@RequestBody LoginRequest request) {
    return authService.login(request);
  }

  @ExceptionHandler(IllegalArgumentException.class)
  public ResponseEntity<Map<String, String>> handleBadRequest(IllegalArgumentException exception) {
    return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of("message", exception.getMessage()));
  }
}
