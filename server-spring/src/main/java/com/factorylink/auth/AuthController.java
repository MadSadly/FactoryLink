package com.factorylink.auth;

import com.factorylink.auth.AuthService.AuthResponse;
import com.factorylink.auth.AuthService.LoginRequest;
import com.factorylink.auth.MockBusinessNumberVerifier.VerificationResult;
import java.util.Map;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

  private final AuthService authService;
  private final MockBusinessNumberVerifier businessNumberVerifier;

  public AuthController(AuthService authService, MockBusinessNumberVerifier businessNumberVerifier) {
    this.authService = authService;
    this.businessNumberVerifier = businessNumberVerifier;
  }

  /**
   * 사업자등록번호 모의 인증. 실제 행정 API 대신 형식·마스터 번호만 검사합니다.
   */
  @PostMapping("/verify-business-number")
  public Map<String, Object> verifyBusinessNumber(@RequestBody Map<String, String> body) {
    String input = body == null ? null : body.get("businessNumber");
    VerificationResult result = businessNumberVerifier.verify(input);
    return Map.of("success", result.success(), "message", result.message());
  }

  @PostMapping("/signup")
  public AuthResponse signup(@RequestBody SignupRequest request) {
    String role = (request.role() == null || request.role().isBlank()) ? "MEMBER" : request.role();
    SignupRequest normalized =
        new SignupRequest(
            request.email(),
            request.password(),
            request.name(),
            role,
            request.companyId(),
            request.businessNumber());
    return authService.signup(normalized);
  }

  @PostMapping("/login")
  public AuthResponse login(@RequestBody LoginRequest request) {
    return authService.login(request);
  }

  @PutMapping("/profile")
  public Map<String, Object> updateProfile(
      @RequestBody UpdateProfileRequest request, Authentication authentication) {
    if (!(authentication.getPrincipal() instanceof JwtUserPrincipal principal)) {
      throw new IllegalArgumentException("인증이 필요합니다.");
    }
    authService.updateProfile(principal.getUserId(), request);
    return Map.of("success", true, "message", "저장되었습니다.");
  }

  @ExceptionHandler(IllegalArgumentException.class)
  public ResponseEntity<Map<String, String>> handleBadRequest(IllegalArgumentException exception) {
    return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of("message", exception.getMessage()));
  }
}
