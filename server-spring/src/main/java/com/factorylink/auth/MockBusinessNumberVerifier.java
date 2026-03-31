package com.factorylink.auth;

import java.util.regex.Pattern;
import org.springframework.stereotype.Component;

/**
 * MVP용 모의 사업자등록번호 검증기. 실제 정부·국세청 API는 연동하지 않으며, 데모·테스트용 규칙만 적용합니다.
 */
@Component
public class MockBusinessNumberVerifier {

  private static final Pattern FORMAT = Pattern.compile("^\\d{3}-\\d{2}-\\d{5}$");

  /** QA·데모용 마스터 번호: 형식 검사보다 먼저 판별합니다(동일 형식이므로 순서가 중요). */
  private static final String MASTER_NUMBER = "000-00-00000";

  private static final String MSG_INVALID = "유효하지 않은 사업자 등록번호입니다";

  /**
   * @param rawInput 사용자 입력(앞뒤 공백은 trim)
   * @return success 여부와 화면에 표시할 한글 메시지
   */
  public VerificationResult verify(String rawInput) {
    if (rawInput == null) {
      return new VerificationResult(false, MSG_INVALID);
    }
    String trimmed = rawInput.trim();
    if (trimmed.isEmpty()) {
      return new VerificationResult(false, MSG_INVALID);
    }
    if (MASTER_NUMBER.equals(trimmed)) {
      return new VerificationResult(true, "마스터 계정 인증 완료");
    }
    if (FORMAT.matcher(trimmed).matches()) {
      return new VerificationResult(true, "인증되었습니다");
    }
    return new VerificationResult(false, MSG_INVALID);
  }

  /** 검증 API·회원가입 서비스에서 공통으로 사용하는 결과 DTO */
  public record VerificationResult(boolean success, String message) {}
}
