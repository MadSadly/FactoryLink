package com.factorylink.auth;

import com.factorylink.auth.AuthService.AuthResponse;
import com.factorylink.auth.AuthService.LoginRequest;
import com.factorylink.auth.AuthService.SignupRequest;
import java.util.Map;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

@Service
public class AuthService {

  private final JdbcTemplate jdbcTemplate;
  private final PasswordEncoder passwordEncoder;
  private final JwtTokenProvider jwtTokenProvider;

  public AuthService(
      JdbcTemplate jdbcTemplate, PasswordEncoder passwordEncoder, JwtTokenProvider jwtTokenProvider) {
    this.jdbcTemplate = jdbcTemplate;
    this.passwordEncoder = passwordEncoder;
    this.jwtTokenProvider = jwtTokenProvider;
  }

  public AuthResponse signup(SignupRequest request) {
    if (request.companyId() == null) {
      throw new IllegalArgumentException("회사 ID(companyId)가 필요합니다.");
    }
    Integer companyExists =
        jdbcTemplate.queryForObject(
            "SELECT COUNT(1) FROM companies WHERE id = ?", Integer.class, request.companyId());
    if (companyExists == null || companyExists == 0) {
      throw new IllegalArgumentException("유효하지 않은 회사입니다.");
    }

    Integer exists =
        jdbcTemplate.queryForObject(
            "SELECT COUNT(1) FROM users WHERE email = ?", Integer.class, request.email());

    if (exists != null && exists > 0) {
      throw new IllegalArgumentException("이미 등록된 이메일입니다.");
    }

    String role =
        (request.role() == null || request.role().isBlank()) ? "MEMBER" : request.role();
    if (!"ADMIN".equals(role) && !"MEMBER".equals(role)) {
      role = "MEMBER";
    }

    String encodedPassword = passwordEncoder.encode(request.password());
    jdbcTemplate.update(
        "INSERT INTO users (company_id, email, password_hash, name, role) VALUES (?, ?, ?, ?, ?)",
        request.companyId(),
        request.email(),
        encodedPassword,
        request.name(),
        role);

    Map<String, Object> user =
        jdbcTemplate.queryForMap(
            "SELECT id, email, role, company_id FROM users WHERE email = ?", request.email());
    Long userId = ((Number) user.get("id")).longValue();
    String email = String.valueOf(user.get("email"));
    String storedRole = String.valueOf(user.get("role"));
    Long companyId =
        user.get("company_id") == null ? null : ((Number) user.get("company_id")).longValue();

    String token = jwtTokenProvider.createToken(userId, email, storedRole, companyId);
    return new AuthResponse(token, userId, email, storedRole);
  }

  public AuthResponse login(LoginRequest request) {
    java.util.List<Map<String, Object>> rows =
        jdbcTemplate.queryForList(
            "SELECT id, email, password_hash, role, company_id FROM users WHERE email = ?",
            request.email());

    if (rows.isEmpty()) {
      throw new IllegalArgumentException("이메일 또는 비밀번호가 올바르지 않습니다.");
    }

    Map<String, Object> user = rows.get(0);
    String passwordHash = String.valueOf(user.get("password_hash"));

    if (!passwordEncoder.matches(request.password(), passwordHash)) {
      throw new IllegalArgumentException("이메일 또는 비밀번호가 올바르지 않습니다.");
    }

    Long userId = ((Number) user.get("id")).longValue();
    String email = String.valueOf(user.get("email"));
    String role = String.valueOf(user.get("role"));
    Long companyId =
        user.get("company_id") == null ? null : ((Number) user.get("company_id")).longValue();
    String token = jwtTokenProvider.createToken(userId, email, role, companyId);

    return new AuthResponse(token, userId, email, role);
  }

  public record SignupRequest(
      String email, String password, String name, String role, Long companyId) {}

  public record LoginRequest(String email, String password) {}

  public record AuthResponse(String token, Long userId, String email, String role) {}
}
