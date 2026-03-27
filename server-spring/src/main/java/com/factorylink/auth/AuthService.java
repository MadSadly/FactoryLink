package com.factorylink.auth;

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
    Integer exists =
        jdbcTemplate.queryForObject(
            "SELECT COUNT(1) FROM USER_ACCOUNT WHERE email = ?",
            Integer.class,
            request.email());

    if (exists != null && exists > 0) {
      throw new IllegalArgumentException("이미 등록된 이메일입니다.");
    }

    String encodedPassword = passwordEncoder.encode(request.password());
    jdbcTemplate.update(
        "INSERT INTO USER_ACCOUNT (email, password_hash, name, role) VALUES (?, ?, ?, ?)",
        request.email(),
        encodedPassword,
        request.name(),
        request.role());

    Map<String, Object> user =
        jdbcTemplate.queryForMap(
            "SELECT id, email, role FROM USER_ACCOUNT WHERE email = ?", request.email());
    Long userId = ((Number) user.get("id")).longValue();
    String email = String.valueOf(user.get("email"));
    String role = String.valueOf(user.get("role"));

    String token = jwtTokenProvider.createToken(userId, email, role);
    return new AuthResponse(token, userId, email, role);
  }

  public AuthResponse login(LoginRequest request) {
    java.util.List<Map<String, Object>> rows =
        jdbcTemplate.queryForList(
            "SELECT id, email, password_hash, role FROM USER_ACCOUNT WHERE email = ?",
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
    String token = jwtTokenProvider.createToken(userId, email, role);

    return new AuthResponse(token, userId, email, role);
  }

  public record SignupRequest(String email, String password, String name, String role) {}

  public record LoginRequest(String email, String password) {}

  public record AuthResponse(String token, Long userId, String email, String role) {}
}
