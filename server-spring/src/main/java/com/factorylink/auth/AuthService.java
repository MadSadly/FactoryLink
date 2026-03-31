package com.factorylink.auth;

import com.factorylink.auth.MockBusinessNumberVerifier.VerificationResult;
import java.util.List;
import java.util.Map;
import org.springframework.util.StringUtils;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class AuthService {

  private final JdbcTemplate jdbcTemplate;
  private final PasswordEncoder passwordEncoder;
  private final JwtTokenProvider jwtTokenProvider;
  private final MockBusinessNumberVerifier businessNumberVerifier;

  public AuthService(
      JdbcTemplate jdbcTemplate,
      PasswordEncoder passwordEncoder,
      JwtTokenProvider jwtTokenProvider,
      MockBusinessNumberVerifier businessNumberVerifier) {
    this.jdbcTemplate = jdbcTemplate;
    this.passwordEncoder = passwordEncoder;
    this.jwtTokenProvider = jwtTokenProvider;
    this.businessNumberVerifier = businessNumberVerifier;
  }

  @Transactional
  public AuthResponse signup(SignupRequest request) {
    if (request.companyId() == null) {
      throw new IllegalArgumentException("회사 ID(companyId)가 필요합니다.");
    }
    if (request.businessNumber() == null || request.businessNumber().isBlank()) {
      throw new IllegalArgumentException("사업자등록번호는 필수입니다. 인증하기를 눌러 검증을 완료한 뒤 가입해 주세요.");
    }
    VerificationResult bnCheck = businessNumberVerifier.verify(request.businessNumber());
    if (!bnCheck.success()) {
      throw new IllegalArgumentException(bnCheck.message());
    }
    String normalizedBusinessNumber = request.businessNumber().trim();

    Integer companyExists =
        jdbcTemplate.queryForObject(
            "SELECT COUNT(1) FROM companies WHERE id = ?", Integer.class, request.companyId());
    if (companyExists == null || companyExists == 0) {
      throw new IllegalArgumentException("유효하지 않은 회사입니다.");
    }

    String companyType =
        jdbcTemplate.queryForObject("SELECT type FROM companies WHERE id = ?", String.class, request.companyId());
    if ("BUYER".equals(companyType)) {
      throw new IllegalArgumentException(
          "공장·제조 소속(공급사) 가입만 허용합니다. 선택한 업체는 구매 전용으로 등록되어 있습니다.");
    }
    if (companyType != null && !"SELLER".equals(companyType) && !"BOTH".equals(companyType)) {
      throw new IllegalArgumentException("소속 업체 유형을 확인할 수 없습니다.");
    }

    Integer usersInCompany =
        jdbcTemplate.queryForObject(
            "SELECT COUNT(1) FROM users WHERE company_id = ?", Integer.class, request.companyId());
    if (usersInCompany != null && usersInCompany > 0) {
      throw new IllegalArgumentException(
          "해당 소속 업체에는 이미 가입된 계정이 있습니다. 사업장당 하나의 회원 계정만 허용됩니다.");
    }

    List<Map<String, Object>> companyRow =
        jdbcTemplate.queryForList(
            "SELECT business_number FROM companies WHERE id = ?", request.companyId());
    if (!companyRow.isEmpty()) {
      Object cur = companyRow.get(0).get("business_number");
      String currentBn = cur == null ? "" : String.valueOf(cur).trim();
      if (!currentBn.isEmpty() && !currentBn.equals(normalizedBusinessNumber)) {
        throw new IllegalArgumentException("선택한 회사에 이미 다른 사업자등록번호가 등록되어 있습니다.");
      }
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

    try {
      jdbcTemplate.update(
          "UPDATE companies SET business_number = ? WHERE id = ?",
          normalizedBusinessNumber,
          request.companyId());
    } catch (DataIntegrityViolationException e) {
      throw new IllegalArgumentException("이미 다른 회사에서 사용 중인 사업자등록번호입니다.");
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

  @Transactional
  public void updateProfile(Long userId, UpdateProfileRequest req) {
    if (req == null) {
      throw new IllegalArgumentException("요청 본문이 필요합니다.");
    }
    boolean changeEmail = StringUtils.hasText(req.email());
    boolean changePw = StringUtils.hasText(req.newPassword());
    if (!changeEmail && !changePw) {
      throw new IllegalArgumentException("변경할 이메일 또는 새 비밀번호를 입력하세요.");
    }
    if (!StringUtils.hasText(req.currentPassword())) {
      throw new IllegalArgumentException("현재 비밀번호를 입력하세요.");
    }
    List<Map<String, Object>> rows =
        jdbcTemplate.queryForList("SELECT id, email, password_hash FROM users WHERE id = ?", userId);
    if (rows.isEmpty()) {
      throw new IllegalArgumentException("사용자를 찾을 수 없습니다.");
    }
    String passwordHash = String.valueOf(rows.get(0).get("password_hash"));
    if (!passwordEncoder.matches(req.currentPassword(), passwordHash)) {
      throw new IllegalArgumentException("현재 비밀번호가 올바르지 않습니다.");
    }
    if (changeEmail) {
      String newEmail = req.email().trim();
      Integer dup =
          jdbcTemplate.queryForObject(
              "SELECT COUNT(1) FROM users WHERE email = ? AND id <> ?", Integer.class, newEmail, userId);
      if (dup != null && dup > 0) {
        throw new IllegalArgumentException("이미 사용 중인 이메일입니다.");
      }
      jdbcTemplate.update("UPDATE users SET email = ? WHERE id = ?", newEmail, userId);
    }
    if (changePw) {
      String np = req.newPassword();
      if (np.length() < 8) {
        throw new IllegalArgumentException("새 비밀번호는 8자 이상이어야 합니다.");
      }
      jdbcTemplate.update(
          "UPDATE users SET password_hash = ? WHERE id = ?",
          passwordEncoder.encode(np),
          userId);
    }
  }

  public AuthResponse login(LoginRequest request) {
    List<Map<String, Object>> rows =
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

  public record LoginRequest(String email, String password) {}

  public record AuthResponse(String token, Long userId, String email, String role) {}
}
